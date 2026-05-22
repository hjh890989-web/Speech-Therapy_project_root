// FR-C-014 잔여 (#37) — PATCH /api/hitl/[id]/escalate (admin 수동 에스컬레이션) 단위 테스트.
//
// 검증 시나리오 (≥8):
//   1. 정상 escalate → 200 + DB update + Slack 호출 1회 + audit 호출 1회 + alreadyEscalated:false
//   2. 권한 부족 (parent role) → 403 + DB / Slack / audit 호출 0회
//   3. 이미 escalatedAt 설정 → 200 + alreadyEscalated:true + Slack 호출 0회 (멱등 + 어뷰징 방어)
//   4. queueId DB 부재 → 404 + Slack / audit 0회
//   5. rate-limit (6번째 호출) → 429 + retryAfterSec 노출
//   6. Slack 실패 (response.ok=false) → 200 + escalatedAt 설정 + warn log + audit 호출 OK
//   7. audit 실패 (예외) → 200 + escalatedAt 설정 + warn log (graceful)
//   8. reason enum 위반 (잘못된 값) → 400
//   9. 인증 없음 (auth.getUser 실패) → 401
//  10. (보너스) 동시 race — findUnique 후 updateMany count=0 → 200 + alreadyEscalated:true

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Prisma mock.
const hitlFindUniqueMock = vi.fn();
const hitlUpdateManyMock = vi.fn();
const txQueryRawMock = vi.fn();
// DB-011: lib/db/with-actor.ts 가 prisma.$transaction 으로 escalate updateMany 를 감쌈.
vi.mock("@/lib/db", () => ({
  prisma: {
    hITLQueue: {
      findUnique: (...args: unknown[]) => hitlFindUniqueMock(...args),
      updateMany: (...args: unknown[]) => hitlUpdateManyMock(...args),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: (...args: unknown[]) => txQueryRawMock(...args),
        hITLQueue: {
          updateMany: (...args: unknown[]) => hitlUpdateManyMock(...args),
        },
      };
      return fn(tx);
    },
  },
}));

// Supabase server mock.
const supabaseGetUserMock = vi.fn();
const userSelectMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: async () => supabaseGetUserMock() },
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: unknown) => ({
          maybeSingle: async () => userSelectMock(),
        }),
      }),
    }),
  }),
}));

// audit mock.
const recordAuditMock = vi.fn();
vi.mock("@/lib/audit", () => ({
  recordAudit: (...args: unknown[]) => recordAuditMock(...args),
}));

// slack mock — sendSlackMessage 직접 호출 위주.
const sendSlackMessageMock = vi.fn();
vi.mock("@/lib/notifications/slack", () => ({
  sendSlackMessage: (...args: unknown[]) => sendSlackMessageMock(...args),
}));

// imports — after vi.mock hoist.
import { PATCH } from "@/app/api/hitl/[id]/escalate/route";
import { __resetManualEscalateRateLimitForTest } from "@/lib/hitl/manual-escalate";

const QUEUE_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";
const ACTOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function makeRequest(body: unknown = {}): Request {
  const init: RequestInit = {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new Request(`http://localhost/api/hitl/${QUEUE_ID}/escalate`, init);
}

function makeContext(id: string = QUEUE_ID) {
  return { params: Promise.resolve({ id }) };
}

function mockAuthAsRole(role: string | null) {
  supabaseGetUserMock.mockResolvedValue({
    data: { user: { id: ACTOR_ID } },
    error: null,
  });
  userSelectMock.mockResolvedValue({
    data: role === null ? null : { role },
    error: null,
  });
}

beforeEach(() => {
  hitlFindUniqueMock.mockReset();
  hitlUpdateManyMock.mockReset();
  supabaseGetUserMock.mockReset();
  userSelectMock.mockReset();
  recordAuditMock.mockReset();
  sendSlackMessageMock.mockReset();
  __resetManualEscalateRateLimitForTest();
  // 기본: Slack 성공.
  sendSlackMessageMock.mockResolvedValue({ ok: true });
  // 기본: audit 성공.
  recordAuditMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// =============================================================================
// 시나리오 1 — 정상 escalate
// =============================================================================
describe("PATCH /api/hitl/[id]/escalate — 정상 흐름", () => {
  it("[시나리오 1] 정상 escalate → 200 + DB update + Slack 1회 + audit 1회 + alreadyEscalated:false", async () => {
    mockAuthAsRole("expert");
    hitlFindUniqueMock.mockResolvedValueOnce({
      id: QUEUE_ID,
      sessionId: SESSION_ID,
      escalatedAt: null,
    });
    hitlUpdateManyMock.mockResolvedValueOnce({ count: 1 });

    const res = await PATCH(makeRequest({ reason: "sla_at_risk" }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.alreadyEscalated).toBe(false);
    expect(body.queueId).toBe(QUEUE_ID);
    expect(body.slackNotified).toBe(true);
    expect(typeof body.escalatedAt).toBe("string");

    expect(hitlUpdateManyMock).toHaveBeenCalledTimes(1);
    const updateArg = hitlUpdateManyMock.mock.calls[0][0] as {
      where: { id: string; escalatedAt: null };
      data: { status: string; escalatedAt: Date; escalatedBy: string; escalationReason: string };
    };
    expect(updateArg.where.id).toBe(QUEUE_ID);
    expect(updateArg.where.escalatedAt).toBeNull();
    expect(updateArg.data.status).toBe("escalated");
    expect(updateArg.data.escalatedBy).toBe(ACTOR_ID);
    expect(updateArg.data.escalationReason).toBe("sla_at_risk");

    expect(sendSlackMessageMock).toHaveBeenCalledTimes(1);
    expect(recordAuditMock).toHaveBeenCalledTimes(1);
    const auditArg = recordAuditMock.mock.calls[0][0] as {
      actorId: string;
      action: string;
      target: { tableName: string; rowId: string };
      payload: { reason: string; actorRole: string };
    };
    expect(auditArg.action).toBe("hitl_manually_escalated");
    expect(auditArg.actorId).toBe(ACTOR_ID);
    expect(auditArg.target.tableName).toBe("HITLQueue");
    expect(auditArg.target.rowId).toBe(QUEUE_ID);
    expect(auditArg.payload.reason).toBe("sla_at_risk");
    expect(auditArg.payload.actorRole).toBe("expert");
  });

  it("[시나리오 1b] body 미제공 (빈 PATCH) → reason 폴백 'manual'", async () => {
    mockAuthAsRole("admin");
    hitlFindUniqueMock.mockResolvedValueOnce({
      id: QUEUE_ID,
      sessionId: SESSION_ID,
      escalatedAt: null,
    });
    hitlUpdateManyMock.mockResolvedValueOnce({ count: 1 });

    // body 빈 문자열 — text() 가 "" 반환 → JSON parse skip → reason "manual" 폴백.
    const req = new Request(`http://localhost/api/hitl/${QUEUE_ID}/escalate`, {
      method: "PATCH",
    });
    const res = await PATCH(req, makeContext());
    expect(res.status).toBe(200);

    const updateArg = hitlUpdateManyMock.mock.calls[0][0] as {
      data: { escalationReason: string };
    };
    expect(updateArg.data.escalationReason).toBe("manual");
  });
});

// =============================================================================
// 시나리오 2 — 권한 부족
// =============================================================================
describe("PATCH /api/hitl/[id]/escalate — RBAC", () => {
  it("[시나리오 2] role=parent → 403 + DB/Slack/audit 호출 0회", async () => {
    mockAuthAsRole("parent");
    const res = await PATCH(makeRequest({}), makeContext());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("FORBIDDEN");

    expect(hitlFindUniqueMock).not.toHaveBeenCalled();
    expect(hitlUpdateManyMock).not.toHaveBeenCalled();
    expect(sendSlackMessageMock).not.toHaveBeenCalled();
    expect(recordAuditMock).not.toHaveBeenCalled();
  });

  it("[시나리오 2b] role=teacher → 403", async () => {
    mockAuthAsRole("teacher");
    const res = await PATCH(makeRequest({}), makeContext());
    expect(res.status).toBe(403);
  });

  it("[시나리오 2c] role=null (User row 부재) → 403", async () => {
    mockAuthAsRole(null);
    const res = await PATCH(makeRequest({}), makeContext());
    expect(res.status).toBe(403);
  });
});

// =============================================================================
// 시나리오 3 — 이미 escalated (멱등)
// =============================================================================
describe("PATCH /api/hitl/[id]/escalate — 멱등성", () => {
  it("[시나리오 3] 이미 escalatedAt 설정 → 200 + alreadyEscalated:true + Slack 호출 0회", async () => {
    mockAuthAsRole("admin");
    hitlFindUniqueMock.mockResolvedValueOnce({
      id: QUEUE_ID,
      sessionId: SESSION_ID,
      escalatedAt: new Date("2026-05-22T10:00:00Z"),
    });

    const res = await PATCH(makeRequest({}), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.alreadyEscalated).toBe(true);

    // 멱등 — Slack/audit/updateMany 호출 0회.
    expect(hitlUpdateManyMock).not.toHaveBeenCalled();
    expect(sendSlackMessageMock).not.toHaveBeenCalled();
    expect(recordAuditMock).not.toHaveBeenCalled();
  });

  it("[시나리오 3b] 동시 race — findUnique 후 updateMany count=0 → 200 + alreadyEscalated:true", async () => {
    mockAuthAsRole("admin");
    hitlFindUniqueMock.mockResolvedValueOnce({
      id: QUEUE_ID,
      sessionId: SESSION_ID,
      escalatedAt: null,
    });
    hitlUpdateManyMock.mockResolvedValueOnce({ count: 0 });

    const res = await PATCH(makeRequest({}), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alreadyEscalated).toBe(true);

    // updateMany 시도는 하지만, Slack / audit 는 호출 안 함 (race 감지 후 skip).
    expect(hitlUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(sendSlackMessageMock).not.toHaveBeenCalled();
    expect(recordAuditMock).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 시나리오 4 — 404
// =============================================================================
describe("PATCH /api/hitl/[id]/escalate — 404", () => {
  it("[시나리오 4] queueId DB 부재 → 404 + Slack/audit 0회", async () => {
    mockAuthAsRole("admin");
    hitlFindUniqueMock.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest({}), makeContext());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("QUEUE_NOT_FOUND");

    expect(hitlUpdateManyMock).not.toHaveBeenCalled();
    expect(sendSlackMessageMock).not.toHaveBeenCalled();
    expect(recordAuditMock).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 시나리오 5 — Rate-limit
// =============================================================================
describe("PATCH /api/hitl/[id]/escalate — Rate Limit", () => {
  it("[시나리오 5] actor 1분 5건 초과 → 6번째 호출 429 + retryAfterSec", async () => {
    mockAuthAsRole("admin");
    // 6개 큐, 다 각각 정상 처리되어 카운터 5 → 6번째 차단.
    for (let i = 0; i < 5; i++) {
      hitlFindUniqueMock.mockResolvedValueOnce({
        id: `${QUEUE_ID}-${i}`,
        sessionId: `${SESSION_ID}-${i}`,
        escalatedAt: null,
      });
      hitlUpdateManyMock.mockResolvedValueOnce({ count: 1 });
    }
    // 5번 정상 처리 — rate-limit window 안에 5 entry 누적.
    for (let i = 0; i < 5; i++) {
      const res = await PATCH(
        new Request(`http://localhost/api/hitl/${QUEUE_ID}-${i}/escalate`, {
          method: "PATCH",
        }),
        { params: Promise.resolve({ id: `${QUEUE_ID}-${i}` }) },
      );
      expect(res.status).toBe(200);
    }
    // 6번째 호출 — rate-limit hit (recordManualEscalate 가 5회 호출됨).
    const blockedRes = await PATCH(
      new Request(`http://localhost/api/hitl/${QUEUE_ID}-final/escalate`, {
        method: "PATCH",
      }),
      { params: Promise.resolve({ id: `${QUEUE_ID}-final` }) },
    );
    expect(blockedRes.status).toBe(429);
    const body = await blockedRes.json();
    expect(body.error).toBe("RATE_LIMITED");
    expect(body.reason).toBe("ACTOR_RATE_LIMIT");
    expect(body.retryAfterSec).toBeGreaterThan(0);
    expect(blockedRes.headers.get("Retry-After")).toBe(String(body.retryAfterSec));
  });
});

// =============================================================================
// 시나리오 6 — Slack 실패 graceful
// =============================================================================
describe("PATCH /api/hitl/[id]/escalate — Slack 실패 graceful", () => {
  it("[시나리오 6] Slack ok=false → 200 + escalatedAt 설정 + slackNotified:false + audit 호출 OK", async () => {
    mockAuthAsRole("admin");
    hitlFindUniqueMock.mockResolvedValueOnce({
      id: QUEUE_ID,
      sessionId: SESSION_ID,
      escalatedAt: null,
    });
    hitlUpdateManyMock.mockResolvedValueOnce({ count: 1 });
    sendSlackMessageMock.mockResolvedValueOnce({
      ok: false,
      error: "HTTP 500",
    });

    const res = await PATCH(makeRequest({}), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.alreadyEscalated).toBe(false);
    expect(body.slackNotified).toBe(false);

    // DB update + audit 는 호출 OK (Slack 실패해도 진행).
    expect(hitlUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(recordAuditMock).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// 시나리오 7 — audit 실패 graceful
// =============================================================================
describe("PATCH /api/hitl/[id]/escalate — audit 실패 graceful", () => {
  it("[시나리오 7] audit throw → 200 + escalatedAt 설정 (main 흐름 보호)", async () => {
    mockAuthAsRole("admin");
    hitlFindUniqueMock.mockResolvedValueOnce({
      id: QUEUE_ID,
      sessionId: SESSION_ID,
      escalatedAt: null,
    });
    hitlUpdateManyMock.mockResolvedValueOnce({ count: 1 });
    recordAuditMock.mockRejectedValueOnce(new Error("audit DB error"));

    const res = await PATCH(makeRequest({}), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

// =============================================================================
// 시나리오 8 — Zod 검증
// =============================================================================
describe("PATCH /api/hitl/[id]/escalate — Zod 검증", () => {
  it("[시나리오 8] reason enum 위반 → 400", async () => {
    mockAuthAsRole("admin");
    const res = await PATCH(
      makeRequest({ reason: "not_a_real_reason" }),
      makeContext(),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("INVALID_INPUT");

    expect(hitlFindUniqueMock).not.toHaveBeenCalled();
  });

  it("[시나리오 8b] body 에 unknown key (strict mode) → 400", async () => {
    mockAuthAsRole("admin");
    const res = await PATCH(
      makeRequest({ reason: "duplicate", malicious: 1 }),
      makeContext(),
    );
    expect(res.status).toBe(400);
  });
});

// =============================================================================
// 시나리오 9 — 인증 없음
// =============================================================================
describe("PATCH /api/hitl/[id]/escalate — 인증 부재", () => {
  it("[시나리오 9] auth.getUser 실패 → 401", async () => {
    supabaseGetUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const res = await PATCH(makeRequest({}), makeContext());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("UNAUTHORIZED");
  });
});

// =============================================================================
// R4 / 금칙어 — 응답 본문 보호
// =============================================================================
describe("PATCH /api/hitl/[id]/escalate — R4 / 금칙어 보호", () => {
  it("[부록] 응답 / Slack 본문에 자녀 식별 정보 / 금칙어 0건", async () => {
    mockAuthAsRole("admin");
    hitlFindUniqueMock.mockResolvedValueOnce({
      id: QUEUE_ID,
      sessionId: SESSION_ID,
      escalatedAt: null,
    });
    hitlUpdateManyMock.mockResolvedValueOnce({ count: 1 });

    const res = await PATCH(makeRequest({ reason: "expert_judgment" }), makeContext());
    expect(res.status).toBe(200);
    const text = JSON.stringify(await res.json());

    // R4 — 응답엔 actorId / email / 자녀 이름 미포함.
    expect(text).not.toContain(ACTOR_ID);
    expect(text).not.toContain("email");

    // CON-04 — 금칙어 미포함.
    for (const forbidden of ["치료", "진단", "장애"]) {
      expect(text).not.toContain(forbidden);
    }

    // Slack 본문 검증 — sendSlackMessage 첫 인자 (text).
    const slackText = sendSlackMessageMock.mock.calls[0][0] as string;
    for (const forbidden of ["치료", "진단", "장애", ACTOR_ID, "email"]) {
      expect(slackText).not.toContain(forbidden);
    }
    expect(slackText).toContain(QUEUE_ID);
    expect(slackText).toContain(SESSION_ID);
    expect(slackText).toContain("expert_judgment");
  });
});

// FR-C-013 (#36) — PATCH /api/hitl/[id]/comment Route Handler 단위 테스트.
//
// 검증 시나리오 (≥ 8):
//   1. 정상 제출 → 200 + DB update + audit + telemetry log
//   2. 보정 점수 미포함 (코멘트만) → 200 + correctedScore: null + audit payload hadCorrection:false
//   3. validation fail — empty comment → 400
//   4. validation fail — correctedScore 범위 초과 → 400
//   5. queueId 부재 (Prisma P2025) → 404
//   6. 권한 부족 (parent role) → 403
//   7. 비로그인 (auth.getUser 실패) → 401
//   8. submitExpertComment throw (DB error) → 500
//   9. audit 실패 graceful — 200 + auditRecorded:false + 코멘트 저장됨
//  10. 중복 제출 (이미 reviewed) → 200 + overwrite (admin-actions 정책: 409 미반환)
//  11. CON-04 금칙어 — placeholder / 응답 본문에 "치료/진단/장애" 0건 (구조적 통과 확인)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mocks — Prisma + Supabase server client + recordAudit
// ============================================================================
const hitlUpdateMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    hITLQueue: {
      update: (...args: unknown[]) => hitlUpdateMock(...args),
    },
  },
}));

const getUserMock = vi.fn();
const fromMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  })),
}));

const recordAuditMock = vi.fn();
vi.mock("@/lib/audit", () => ({
  recordAudit: (...args: unknown[]) => recordAuditMock(...args),
}));

// PATCH 는 모듈 mock 정의 후 import.
import { PATCH } from "@/app/api/hitl/[id]/comment/route";

// ============================================================================
// 상수
// ============================================================================
const QUEUE_ID = "33333333-3333-4333-8333-333333333333";
const EXPERT_USER_ID = "44444444-4444-4444-8444-444444444444";
const REVIEWED_AT = new Date("2026-05-22T20:00:00Z");

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

// ============================================================================
// Helpers
// ============================================================================
function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost/api/hitl/${QUEUE_ID}/comment`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function mockAuthedAs(opts: { id?: string; role: string }) {
  getUserMock.mockResolvedValue({
    data: { user: { id: opts.id ?? EXPERT_USER_ID } },
    error: null,
  });
  // supabase.from("User").select("role").eq("id", id).maybeSingle()
  const maybeSingle = vi.fn().mockResolvedValue({ data: { role: opts.role }, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  fromMock.mockReturnValue({ select });
}

function mockAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

function defaultUpdateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: QUEUE_ID,
    expertComment: "조음 위치 보정 권고 — ㅅ 음소 혀끝 위치 안내 부탁드립니다.",
    correctedScore: 72,
    reviewedAt: REVIEWED_AT,
    reviewedBy: EXPERT_USER_ID,
    status: "completed" as const,
    ...overrides,
  };
}

// ============================================================================
// Lifecycle
// ============================================================================
beforeEach(() => {
  hitlUpdateMock.mockReset();
  getUserMock.mockReset();
  fromMock.mockReset();
  recordAuditMock.mockReset();
  recordAuditMock.mockResolvedValue(undefined);
  hitlUpdateMock.mockResolvedValue(defaultUpdateRow());
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// 시나리오
// ============================================================================

describe("PATCH /api/hitl/[id]/comment — 정상 흐름", () => {
  it("[시나리오 1] 정상 제출 → 200 + DB update + audit + telemetry log", async () => {
    mockAuthedAs({ role: "expert" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const res = await PATCH(
      makeRequest({
        expertComment: "조음 위치 보정 권고 — ㅅ 음소 혀끝 위치 안내 부탁드립니다.",
        correctedScore: 72,
      }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.queueId).toBe(QUEUE_ID);
    expect(body.status).toBe("completed");
    expect(body.correctedScore).toBe(72);
    expect(body.auditRecorded).toBe(true);

    // Prisma update — completed + reviewedAt + reviewedBy + correctedScore.
    expect(hitlUpdateMock).toHaveBeenCalledTimes(1);
    const updateCall = hitlUpdateMock.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: QUEUE_ID });
    expect(updateCall.data.expertComment).toContain("조음 위치 보정");
    expect(updateCall.data.correctedScore).toBe(72);
    expect(updateCall.data.status).toBe("completed");
    expect(updateCall.data.reviewedBy).toBe(EXPERT_USER_ID);
    expect(updateCall.data.reviewedAt).toBeInstanceOf(Date);
    expect(updateCall.data.completedAt).toBeInstanceOf(Date);

    // recordAudit — action / target / payload.
    expect(recordAuditMock).toHaveBeenCalledTimes(1);
    const auditCall = recordAuditMock.mock.calls[0][0];
    expect(auditCall.action).toBe("hitl_comment_added");
    expect(auditCall.actorId).toBe(EXPERT_USER_ID);
    expect(auditCall.target).toEqual({ tableName: "HITLQueue", rowId: QUEUE_ID });
    expect(auditCall.payload).toEqual({ hadCorrection: true, expertRole: "expert" });

    // 구조화 로그 — hitl_comment_submitted 1회.
    const hitlLogs = logSpy.mock.calls
      .map((c) => c[0])
      .filter((s): s is string => typeof s === "string")
      .map((s) => {
        try {
          return JSON.parse(s) as { event?: string; properties?: Record<string, unknown> };
        } catch {
          return null;
        }
      })
      .filter((o): o is { event: string; properties: Record<string, unknown> } =>
        o !== null && o.event === "hitl_comment_submitted",
      );
    expect(hitlLogs).toHaveLength(1);
    expect(hitlLogs[0].properties).toEqual({
      queueId: QUEUE_ID,
      hadCorrection: true,
      expertRole: "expert",
    });
  });

  it("[시나리오 2] 보정 점수 미포함 (코멘트만) → 200 + correctedScore null + hadCorrection:false", async () => {
    mockAuthedAs({ role: "expert" });
    hitlUpdateMock.mockResolvedValueOnce(
      defaultUpdateRow({
        correctedScore: null,
        expertComment: "코멘트만 작성합니다.",
      }),
    );

    const res = await PATCH(
      makeRequest({ expertComment: "코멘트만 작성합니다." }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.correctedScore).toBeNull();

    // Prisma data 에 correctedScore 키가 포함되면 안 됨 (undefined → 미수정).
    const updateData = hitlUpdateMock.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty("correctedScore");

    expect(recordAuditMock.mock.calls[0][0].payload).toEqual({
      hadCorrection: false,
      expertRole: "expert",
    });
  });
});

describe("PATCH /api/hitl/[id]/comment — Validation (400)", () => {
  it("[시나리오 3] 빈 코멘트 → 400 INVALID_INPUT, DB update 미발생", async () => {
    mockAuthedAs({ role: "expert" });

    const res = await PATCH(
      makeRequest({ expertComment: "" }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("INVALID_INPUT");
    expect(hitlUpdateMock).not.toHaveBeenCalled();
    expect(recordAuditMock).not.toHaveBeenCalled();
  });

  it("[시나리오 4a] correctedScore 범위 초과 (101) → 400", async () => {
    mockAuthedAs({ role: "expert" });

    const res = await PATCH(
      makeRequest({ expertComment: "ok", correctedScore: 101 }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(400);
    expect(hitlUpdateMock).not.toHaveBeenCalled();
  });

  it("[시나리오 4b] correctedScore 음수 → 400", async () => {
    mockAuthedAs({ role: "expert" });

    const res = await PATCH(
      makeRequest({ expertComment: "ok", correctedScore: -5 }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(400);
    expect(hitlUpdateMock).not.toHaveBeenCalled();
  });

  it("[시나리오 4c] 코멘트 2001자 초과 → 400", async () => {
    mockAuthedAs({ role: "expert" });

    const res = await PATCH(
      makeRequest({ expertComment: "x".repeat(2001) }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(400);
    expect(hitlUpdateMock).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/hitl/[id]/comment — 404", () => {
  it("[시나리오 5] queueId 부재 (Prisma P2025) → 404", async () => {
    mockAuthedAs({ role: "expert" });
    const notFoundError = Object.assign(new Error("Record not found"), { code: "P2025" });
    hitlUpdateMock.mockRejectedValueOnce(notFoundError);

    const res = await PATCH(
      makeRequest({ expertComment: "ok" }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("NOT_FOUND");
  });
});

describe("PATCH /api/hitl/[id]/comment — RBAC", () => {
  it("[시나리오 6a] parent role → 403 FORBIDDEN", async () => {
    mockAuthedAs({ role: "parent" });

    const res = await PATCH(
      makeRequest({ expertComment: "ok" }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(403);
    expect(hitlUpdateMock).not.toHaveBeenCalled();
    expect(recordAuditMock).not.toHaveBeenCalled();
  });

  it("[시나리오 6b] teacher role → 403 FORBIDDEN (admin/principal/expert 외 차단)", async () => {
    mockAuthedAs({ role: "teacher" });

    const res = await PATCH(
      makeRequest({ expertComment: "ok" }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(403);
  });

  it("[시나리오 6c] role null (DB 에 row 부재) → 403", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: EXPERT_USER_ID } },
      error: null,
    });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    fromMock.mockReturnValue({ select });

    const res = await PATCH(
      makeRequest({ expertComment: "ok" }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(403);
  });

  it("[시나리오 6d] admin role → 200 (화이트리스트 허용)", async () => {
    mockAuthedAs({ role: "admin" });

    const res = await PATCH(
      makeRequest({ expertComment: "ok" }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(200);
    expect(recordAuditMock.mock.calls[0][0].payload.expertRole).toBe("admin");
  });

  it("[시나리오 6e] principal role → 200", async () => {
    mockAuthedAs({ role: "principal" });

    const res = await PATCH(
      makeRequest({ expertComment: "ok" }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(200);
    expect(recordAuditMock.mock.calls[0][0].payload.expertRole).toBe("principal");
  });
});

describe("PATCH /api/hitl/[id]/comment — 401 / 500", () => {
  it("[시나리오 7] 비로그인 (user null) → 401 UNAUTHORIZED", async () => {
    mockAnonymous();

    const res = await PATCH(
      makeRequest({ expertComment: "ok" }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(401);
    expect(hitlUpdateMock).not.toHaveBeenCalled();
  });

  it("[시나리오 8] submitExpertComment Prisma 에러 (P2025 외) → 500 INTERNAL_ERROR", async () => {
    mockAuthedAs({ role: "expert" });
    hitlUpdateMock.mockRejectedValueOnce(new Error("DB connection lost"));

    const res = await PATCH(
      makeRequest({ expertComment: "ok" }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});

describe("PATCH /api/hitl/[id]/comment — Audit graceful", () => {
  it("[시나리오 9] audit 실패 graceful — 200 + auditRecorded:false + 코멘트 저장됨", async () => {
    mockAuthedAs({ role: "expert" });
    recordAuditMock.mockRejectedValueOnce(new Error("AuditLog INSERT crashed"));
    // console.warn 노이즈 억제.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await PATCH(
      makeRequest({ expertComment: "ok" }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.auditRecorded).toBe(false);
    // 메인 흐름 (Prisma update) 는 호출됨.
    expect(hitlUpdateMock).toHaveBeenCalledTimes(1);
    // warn 1회 (graceful 알림).
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("PATCH /api/hitl/[id]/comment — 멱등성 / 재검토", () => {
  it("[시나리오 10] 이미 reviewed 인 항목 재제출 → 200 + overwrite (409 미반환)", async () => {
    mockAuthedAs({ role: "expert" });
    // Prisma update 가 성공 (기존 row overwrite 가정).
    hitlUpdateMock.mockResolvedValueOnce(
      defaultUpdateRow({
        expertComment: "수정된 코멘트 — 보정 점수 재조정.",
        correctedScore: 80,
      }),
    );

    const res = await PATCH(
      makeRequest({
        expertComment: "수정된 코멘트 — 보정 점수 재조정.",
        correctedScore: 80,
      }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.expertComment).toContain("수정된 코멘트");
    expect(body.correctedScore).toBe(80);
  });
});

describe("PATCH /api/hitl/[id]/comment — CON-04 금칙어 (응답 본문)", () => {
  it("[시나리오 11] 정상 응답 본문에 의료 금칙어 0건 (구조 검증)", async () => {
    mockAuthedAs({ role: "expert" });

    const res = await PATCH(
      makeRequest({ expertComment: "발음 발달 확인 결과 양호." }),
      makeContext(QUEUE_ID),
    );

    expect(res.status).toBe(200);
    const raw = await res.text();
    for (const forbidden of FORBIDDEN_MEDICAL_WORDS) {
      expect(raw).not.toContain(forbidden);
    }
  });
});

// API-005 — POST /api/hitl/queue Route Handler 단위 테스트.
// REQ-FUNC-003 / HITL-001, FR-C-002.
//
// 검증 시나리오 (10+):
//  1. 정상 enqueue → 200 + queueId + slackNotified=true
//  2. 신규 + Slack webhook fetch 1회 (R4 검증 — 자녀 식별 정보 미노출)
//  3. validation fail — sessionId 누락 → 400
//  4. validation fail — phoneme 무관 (스키마 외 필드 무시) + confidence 범위 초과 → 400
//  5. validation fail — confidence 음수 → 400
//  6. DB error → 500 + INTERNAL_ERROR
//  7. Slack 실패 (fetch reject) — 200 + slackNotified=false (graceful)
//  8. SLACK_WEBHOOK_URL 미설정 — 200 + slackNotified=false (skip)
//  9. 중복 sessionId (멱등성) — findUnique 가 existing row → update 경로, 200 + 기존 queueId 반환
// 10. Rate Limit — 동일 sessionId 1분 내 재호출 → 429
// 11. INTERNAL_API_SECRET 설정 + Authorization 헤더 누락 → 401
// 12. INTERNAL_API_SECRET 설정 + 정확한 Bearer → 200
// 13. hitl_enqueued 텔레메트리 — console.log 1회 + R4 자녀 식별자 미포함

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Prisma mock — DB 호출 차단.
const hitlFindUniqueMock = vi.fn();
const hitlCreateMock = vi.fn();
const hitlUpdateMock = vi.fn();
const hitlCountMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    hITLQueue: {
      findUnique: (...args: unknown[]) => hitlFindUniqueMock(...args),
      create: (...args: unknown[]) => hitlCreateMock(...args),
      update: (...args: unknown[]) => hitlUpdateMock(...args),
      count: (...args: unknown[]) => hitlCountMock(...args),
    },
  },
}));

import { POST } from "@/app/api/hitl/queue/route";

// Zod 4 UUID validator: 3rd group [1-8], 4th group [89abAB] (또는 nil/max).
const VALID_SESSION_ID = "11111111-1111-4111-8111-111111111111";
const VALID_USER_ID = "22222222-2222-4222-8222-222222222222";
const QUEUE_ID = "33333333-3333-4333-8333-333333333333";
const SLA_DUE_AT = new Date("2026-05-24T12:00:00Z");

const ORIGINAL_SLACK_URL = process.env.SLACK_WEBHOOK_URL;
const ORIGINAL_INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;
const ORIGINAL_FETCH = globalThis.fetch;

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/hitl/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: VALID_SESSION_ID,
    userId: VALID_USER_ID,
    confidenceScore: 65,
    ...overrides,
  };
}

beforeEach(() => {
  hitlFindUniqueMock.mockReset();
  hitlCreateMock.mockReset();
  hitlUpdateMock.mockReset();
  hitlCountMock.mockReset();

  // 기본: 신규 sessionId 경로 (find→null) + abuse 0 + create 성공.
  hitlFindUniqueMock.mockResolvedValue(null);
  hitlCountMock.mockResolvedValue(0);
  hitlCreateMock.mockResolvedValue({
    id: QUEUE_ID,
    sessionId: VALID_SESSION_ID,
    status: "pending",
    slaDueAt: SLA_DUE_AT,
  });

  process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/T/B/X";
  delete process.env.INTERNAL_API_SECRET;
  globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
});

afterEach(() => {
  process.env.SLACK_WEBHOOK_URL = ORIGINAL_SLACK_URL;
  process.env.INTERNAL_API_SECRET = ORIGINAL_INTERNAL_SECRET;
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("POST /api/hitl/queue — 정상 흐름", () => {
  it("[시나리오 1] 정상 enqueue → 200 + queueId + slackNotified=true", async () => {
    const sid = "10000000-0000-4000-8000-000000000001";
    const res = await POST(makeRequest(validBody({ sessionId: sid })));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.queueId).toBe(QUEUE_ID);
    expect(body.slaDueAt).toBe(SLA_DUE_AT.toISOString());
    expect(body.slackNotified).toBe(true);
    expect(hitlCreateMock).toHaveBeenCalledTimes(1);
  });

  it("[시나리오 2] Slack webhook fetch 1회 + R4 자녀 식별자 미포함", async () => {
    const sid = "10000000-0000-4000-8000-000000000002";
    await POST(makeRequest(validBody({ sessionId: sid })));
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://hooks.slack.com/services/T/B/X");
    const sentBody = JSON.parse(init.body as string) as { text: string };
    expect(sentBody.text).toContain("10000000-0000-4000-8000-000000000002");
    expect(sentBody.text).toContain(QUEUE_ID);
    expect(sentBody.text).toContain("HITL 검토 필요");
    // R4: userId 등 자녀 식별 키워드 절대 미포함.
    for (const forbidden of ["userId", "anonymousUserId", "email", "name"]) {
      expect(sentBody.text).not.toContain(forbidden);
    }
    // CON-04 금칙어 미사용 검증.
    for (const forbidden of ["치료", "진단", "장애"]) {
      expect(sentBody.text).not.toContain(forbidden);
    }
  });
});

describe("POST /api/hitl/queue — 입력 검증 (400)", () => {
  it("[시나리오 3] sessionId 누락 → 400 INVALID_INPUT", async () => {
    const { sessionId: _omit, ...body } = validBody();
    void _omit;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("INVALID_INPUT");
    expect(hitlCreateMock).not.toHaveBeenCalled();
  });

  it("[시나리오 4] confidenceScore 범위 초과 (101) → 400", async () => {
    const res = await POST(makeRequest(validBody({ confidenceScore: 101 })));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("INVALID_INPUT");
    expect(hitlCreateMock).not.toHaveBeenCalled();
  });

  it("[시나리오 5] confidenceScore 음수 → 400", async () => {
    const res = await POST(makeRequest(validBody({ confidenceScore: -1 })));
    expect(res.status).toBe(400);
    expect(hitlCreateMock).not.toHaveBeenCalled();
  });

  it("[시나리오 5b] userId UUID 형식 위반 → 400", async () => {
    const res = await POST(makeRequest(validBody({ userId: "not-a-uuid" })));
    expect(res.status).toBe(400);
    expect(hitlCreateMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/hitl/queue — 에러 처리 (500 / graceful)", () => {
  it("[시나리오 6] DB error (create reject) → 500 INTERNAL_ERROR", async () => {
    const sid = "10000000-0000-4000-8000-000000000006";
    hitlCreateMock.mockRejectedValueOnce(new Error("DB connection lost"));
    const res = await POST(makeRequest(validBody({ sessionId: sid })));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("INTERNAL_ERROR");
  });

  it("[시나리오 7] Slack 실패 graceful — 200 + slackNotified=false", async () => {
    const sid = "10000000-0000-4000-8000-000000000007";
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    const res = await POST(makeRequest(validBody({ sessionId: sid })));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.slackNotified).toBe(false);
    expect(hitlCreateMock).toHaveBeenCalledTimes(1);
  });

  it("[시나리오 8] SLACK_WEBHOOK_URL 미설정 → 200 + slackNotified=false (skip, fetch 0회)", async () => {
    const sid = "10000000-0000-4000-8000-000000000008";
    delete process.env.SLACK_WEBHOOK_URL;
    const res = await POST(makeRequest(validBody({ sessionId: sid })));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slackNotified).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("POST /api/hitl/queue — 멱등성 (sessionId unique)", () => {
  it("[시나리오 9] 중복 sessionId → 기존 row update + 동일 queueId 반환", async () => {
    // 별도 sessionId 사용 (rate-limit map 격리 — 9-2 와 동일 sessionId 면 429).
    const dupSession = "99999999-9999-4999-8999-999999999999";
    const existingId = "44444444-4444-4444-8444-444444444444";
    hitlFindUniqueMock.mockResolvedValueOnce({
      id: existingId,
      sessionId: dupSession,
      status: "pending",
      slaDueAt: SLA_DUE_AT,
    });
    hitlUpdateMock.mockResolvedValueOnce({
      id: existingId,
      sessionId: dupSession,
      status: "pending",
      slaDueAt: SLA_DUE_AT,
    });

    const res = await POST(makeRequest(validBody({ sessionId: dupSession })));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.queueId).toBe(existingId);
    expect(hitlUpdateMock).toHaveBeenCalledTimes(1);
    expect(hitlCreateMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/hitl/queue — Rate Limit", () => {
  it("[시나리오 10] 동일 sessionId 1분 내 재호출 → 429 RATE_LIMITED", async () => {
    // 별도 sessionId — 다른 테스트가 같은 키 쓰면 false-positive 위험.
    const sid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

    const res1 = await POST(makeRequest(validBody({ sessionId: sid })));
    expect(res1.status).toBe(200);

    // 즉시 재호출.
    const res2 = await POST(makeRequest(validBody({ sessionId: sid })));
    expect(res2.status).toBe(429);
    const json = await res2.json();
    expect(json.error).toBe("RATE_LIMITED");
  });
});

describe("POST /api/hitl/queue — INTERNAL_API_SECRET 인증", () => {
  it("[시나리오 11] secret 설정 + Authorization 누락 → 401", async () => {
    process.env.INTERNAL_API_SECRET = "super-secret-token";
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("UNAUTHORIZED");
    expect(hitlCreateMock).not.toHaveBeenCalled();
  });

  it("[시나리오 11b] secret 설정 + 잘못된 Bearer → 401", async () => {
    process.env.INTERNAL_API_SECRET = "super-secret-token";
    const res = await POST(
      makeRequest(validBody(), { Authorization: "Bearer wrong-token" }),
    );
    expect(res.status).toBe(401);
  });

  it("[시나리오 12] secret 설정 + 정확한 Bearer → 200", async () => {
    process.env.INTERNAL_API_SECRET = "super-secret-token";
    // 별도 sessionId 로 rate-limit 회피.
    const sid = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const res = await POST(
      makeRequest(validBody({ sessionId: sid }), {
        Authorization: "Bearer super-secret-token",
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /api/hitl/queue — 텔레메트리 (hitl_enqueued)", () => {
  it("[시나리오 13] 정상 enqueue 시 hitl_enqueued 구조화 로그 1회 + R4 자녀 식별자 미포함", async () => {
    const sid = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await POST(makeRequest(validBody({ sessionId: sid })));

      // 구조화 로그 호출 추출.
      const calls = logSpy.mock.calls
        .map((c) => c[0])
        .filter((arg): arg is string => typeof arg === "string");
      const hitlEnqueuedLogs = calls
        .map((str) => {
          try {
            return JSON.parse(str) as { event?: string; properties?: Record<string, unknown> };
          } catch {
            return null;
          }
        })
        .filter((obj): obj is { event: string; properties: Record<string, unknown> } =>
          obj !== null && obj.event === "hitl_enqueued",
        );

      expect(hitlEnqueuedLogs).toHaveLength(1);
      const props = hitlEnqueuedLogs[0].properties;
      expect(props).toMatchObject({
        queueId: QUEUE_ID,
        sessionId: sid,
        confidenceScore: 65,
        slackNotified: true,
      });
      // R4 보호: 텔레메트리에 userId / email / 이름 절대 미포함.
      const raw = JSON.stringify(hitlEnqueuedLogs[0]);
      for (const forbidden of ["userId", "email", "anonymousUserId"]) {
        expect(raw).not.toContain(forbidden);
      }
    } finally {
      logSpy.mockRestore();
    }
  });
});

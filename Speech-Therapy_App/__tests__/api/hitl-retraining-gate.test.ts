// FR-C-HITL-006 — Cron Route Handler 통합 테스트.
//
// 시나리오:
//   1) Cron Secret 누락 → 401
//   2) 3 게이트 통과 cohort → 200 + allPassed=true + Slack 발송
//   3) 3 게이트 미통과 cohort → 200 + allPassed=false
//   4) Phase 2 HHI 위반 → 다양성 alert 추가 발송
//   5) Prisma error → 500 + console.error
//   6) Phase env override

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@/lib/cron-auth", () => ({
  verifyCronSecret: (request: Request) => {
    const auth = request.headers.get("authorization");
    if (auth === "Bearer test-cron-secret") return { ok: true };
    return { ok: false, reason: "invalid_authorization" };
  },
}));

const listRetrainingCohortMock = vi.fn();
const aggregateByExpertMock = vi.fn();
vi.mock("@/lib/hitl/retraining", () => ({
  listRetrainingCohort: (args: unknown) => listRetrainingCohortMock(args),
  aggregateByExpert: (since: Date) => aggregateByExpertMock(since),
}));

const sendSlackMock = vi.fn();
vi.mock("@/lib/notifications/slack", () => ({
  sendSlackMessage: (text: string) => sendSlackMock(text),
}));

import { GET } from "@/app/api/cron/hitl-retraining-gate/route";

beforeEach(() => {
  listRetrainingCohortMock.mockReset();
  aggregateByExpertMock.mockReset();
  sendSlackMock.mockReset();
  sendSlackMock.mockResolvedValue({ ok: true });
  delete process.env.HITL_DIVERSITY_PHASE;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeRequest(authorization: string | null = "Bearer test-cron-secret"): Request {
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  return new Request("http://localhost/api/cron/hitl-retraining-gate", { headers });
}

describe("FR-C-HITL-006 — Cron Route Handler", () => {
  it("[1] Cron Secret 누락 → 401", async () => {
    const response = await GET(makeRequest(null));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("[2] 3 게이트 통과 cohort → 200 + allPassed=true + Slack 발송", async () => {
    // 500 row + 평균 diff 0.8 + 10 expert 균등 분포
    const cohort = new Array(500).fill(null).map((_, i) => ({
      id: `entry-${i}`,
      sessionId: `sess-${i}`,
      expertId: `expert-${i % 10}`,
      diffPct: 0.8,
      consentTier: "T4-c",
      sanitized: true,
      createdAt: new Date(),
    }));
    listRetrainingCohortMock.mockResolvedValue(cohort);

    const dist = new Map<string, number>();
    for (let i = 0; i < 10; i++) dist.set(`expert-${i}`, 50);
    aggregateByExpertMock.mockResolvedValue(dist);

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.allPassed).toBe(true);
    expect(body.gate1.passed).toBe(true);
    expect(body.gate2.passed).toBe(true);
    expect(body.gate3.passed).toBe(true);
    expect(body.slackSent).toBe(true);
    // 다양성 alert 는 게이트 3 통과이므로 미발송
    expect(body.diversityAlertSent).toBe(false);
    // Slack 1회 (게이트 결과만)
    expect(sendSlackMock).toHaveBeenCalledTimes(1);
    expect(sendSlackMock).toHaveBeenCalledWith(
      expect.stringContaining("외부 ML 위탁 트리거"),
    );
  });

  it("[3] 3 게이트 미통과 cohort → 200 + allPassed=false", async () => {
    // 100 row 만 (게이트 2 미통과) + diff 0.3 (게이트 1 미통과)
    const cohort = new Array(100).fill(null).map((_, i) => ({
      id: `entry-${i}`,
      sessionId: `sess-${i}`,
      expertId: `expert-${i % 5}`,
      diffPct: 0.3,
      consentTier: "T4-c",
      sanitized: true,
      createdAt: new Date(),
    }));
    listRetrainingCohortMock.mockResolvedValue(cohort);

    const dist = new Map<string, number>();
    for (let i = 0; i < 5; i++) dist.set(`expert-${i}`, 20);
    aggregateByExpertMock.mockResolvedValue(dist);

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.allPassed).toBe(false);
    expect(body.gate1.passed).toBe(false);
    expect(body.gate2.passed).toBe(false);
    expect(body.gate3.passed).toBe(true); // 5 expert 균등 → top3=60%, gate3 통과
    expect(sendSlackMock).toHaveBeenCalledWith(expect.stringContaining("skip"));
  });

  it("[4] Phase 2 HHI 위반 → 다양성 alert 추가 발송", async () => {
    process.env.HITL_DIVERSITY_PHASE = "phase2";

    // 600 row + 단일 expert 80% 독점
    const cohort = new Array(600).fill(null).map((_, i) => ({
      id: `entry-${i}`,
      sessionId: `sess-${i}`,
      expertId: i < 480 ? "expert-A" : `expert-${(i % 4) + 1}`,
      diffPct: 0.8,
      consentTier: "T4-c",
      sanitized: true,
      createdAt: new Date(),
    }));
    listRetrainingCohortMock.mockResolvedValue(cohort);

    const dist = new Map([
      ["expert-A", 480],
      ["expert-1", 30],
      ["expert-2", 30],
      ["expert-3", 30],
      ["expert-4", 30],
    ]);
    aggregateByExpertMock.mockResolvedValue(dist);

    const response = await GET(makeRequest());
    const body = await response.json();
    expect(body.allPassed).toBe(false);
    expect(body.gate3.passed).toBe(false); // HHI > 0.3
    expect(body.diversityAlertSent).toBe(true);
    // Slack 2회 — 게이트 결과 + 다양성 alert
    expect(sendSlackMock).toHaveBeenCalledTimes(2);
    expect(sendSlackMock).toHaveBeenNthCalledWith(2, expect.stringContaining("HITL expert 다양성"));
  });

  it("[5] Prisma error → 500", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    listRetrainingCohortMock.mockRejectedValue(new Error("DB connection lost"));

    const response = await GET(makeRequest());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("INTERNAL_ERROR");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("[6] Phase env override (phase1 default → phase2 override)", async () => {
    process.env.HITL_DIVERSITY_PHASE = "phase2";

    listRetrainingCohortMock.mockResolvedValue([]);
    aggregateByExpertMock.mockResolvedValue(new Map());

    const response = await GET(makeRequest());
    const body = await response.json();
    expect(body.phase).toBe("phase2");
  });

  it("[7] 텔레메트리 console.log shape", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    listRetrainingCohortMock.mockResolvedValue([]);
    aggregateByExpertMock.mockResolvedValue(new Map());

    await GET(makeRequest());

    const logCalls = logSpy.mock.calls.map((c) => String(c[0]));
    const eventLog = logCalls.find((s) => s.includes("hitl_retraining_gate_evaluated"));
    expect(eventLog).toBeDefined();
    if (eventLog) {
      const parsed = JSON.parse(eventLog);
      expect(parsed.event).toBe("hitl_retraining_gate_evaluated");
      expect(parsed.properties.phase).toBe("phase1");
      expect(parsed.properties.allPassed).toBe(false);
      // R4: 자녀 식별 정보 미노출
      expect(JSON.stringify(parsed)).not.toMatch(/userId|sessionId|email/i);
    }
    logSpy.mockRestore();
  });
});

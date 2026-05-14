// TEST-002 — FR-C-002 + API-005 + DB-009 통합: HITL 자동 이관 + Slack 알림.
// REQ-FUNC-003 (Confidence < 70 → 이관), REQ-FUNC-HITL-001 (즉시 이관 ≤ 2초).
//
// 본 테스트는 analyzeDiagnosis Server Action 전체 흐름을 mock 환경에서 실행해
// HITL 분기·Slack 호출·멱등성·graceful 처리·성능을 통합 검증합니다.
//
// 격리: Gemini / Prisma / fetch 모두 mock — 실 외부 호출 0건.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateJsonMock = vi.fn();
const userUpsertMock = vi.fn();
const sessionLogCreateMock = vi.fn();
const hitlUpsertMock = vi.fn();

vi.mock("@/lib/ai/gemini", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/gemini")>("@/lib/ai/gemini");
  return {
    ...actual,
    generateJson: (...args: unknown[]) => generateJsonMock(...args),
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      upsert: (...args: unknown[]) => userUpsertMock(...args),
    },
    sessionLog: {
      create: (...args: unknown[]) => sessionLogCreateMock(...args),
    },
    hITLQueue: {
      upsert: (...args: unknown[]) => hitlUpsertMock(...args),
    },
    evaluationResult: {
      findUnique: vi.fn(),
    },
  },
}));

// peerPercentile 계산은 DB 의존 없는 fixed 반환으로 단순화 (compositeScore 기반).
vi.mock("@/lib/peer-percentile", async () => {
  const actual = await vi.importActual<typeof import("@/lib/peer-percentile")>(
    "@/lib/peer-percentile",
  );
  return {
    ...actual,
    computePeerPercentile: vi.fn().mockResolvedValue(50),
  };
});

import { analyzeDiagnosis } from "@/app/actions/diagnosis";

const ORIGINAL_SLACK_URL = process.env.SLACK_WEBHOOK_URL;
const ORIGINAL_FETCH = globalThis.fetch;

const VALID_INPUT = {
  transcript: "사과",
  childAgeMonths: 36,
  targetPhoneme: "ㅅ" as const,
};

beforeEach(() => {
  generateJsonMock.mockReset();
  userUpsertMock.mockReset();
  sessionLogCreateMock.mockReset();
  hitlUpsertMock.mockReset();

  userUpsertMock.mockResolvedValue({ id: "mocked-user" });
  sessionLogCreateMock.mockResolvedValue({ id: "mocked-session" });
  hitlUpsertMock.mockResolvedValue({
    id: "queue-1",
    slaDueAt: new Date("2026-05-16T12:00:00Z"),
  });

  process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/mock";
  globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
});

afterEach(() => {
  process.env.SLACK_WEBHOOK_URL = ORIGINAL_SLACK_URL;
  globalThis.fetch = ORIGINAL_FETCH;
});

/** §C 의 fire-and-forget Slack 호출이 완료될 때까지 microtask 큐 flush. */
async function waitForSlackCall() {
  await vi.waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalled();
  });
}

describe("TEST-002 — Confidence < 70 → HITL 큐 + Slack 통합", () => {
  it("[시나리오 1] confidence 65 → SessionLog + EvaluationResult INSERT 1건", async () => {
    generateJsonMock.mockResolvedValue({
      articulation: 50,
      linguistic: 50,
      acoustic: 50,
      confidence: 65,
    });

    const result = await analyzeDiagnosis(VALID_INPUT);

    expect(sessionLogCreateMock).toHaveBeenCalledTimes(1);
    const sessionArg = sessionLogCreateMock.mock.calls[0][0] as {
      data: {
        id: string;
        userId: string;
        evaluationResult: { create: { confidence: number; targetPhoneme: string } };
      };
    };
    expect(sessionArg.data.id).toBe(result.sessionId);
    expect(sessionArg.data.evaluationResult.create.confidence).toBe(65);
    expect(sessionArg.data.evaluationResult.create.targetPhoneme).toBe("ㅅ");
  });

  it("[시나리오 2] confidence 65 → Slack webhook fetch 호출 1건 (R4 검증)", async () => {
    generateJsonMock.mockResolvedValue({
      articulation: 50,
      linguistic: 50,
      acoustic: 50,
      confidence: 65,
    });

    const result = await analyzeDiagnosis(VALID_INPUT);
    await waitForSlackCall();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://hooks.slack.com/mock");
    const body = JSON.parse(init.body as string) as { text: string };
    expect(body.text).toContain(result.sessionId);
    expect(body.text).toContain("HITL 검토 필요");
    // R4: 식별자 키워드 미포함.
    for (const word of ["userId", "anonymousUserId", "email", "name"]) {
      expect(body.text).not.toContain(word);
    }
  });

  it("[시나리오 3] 응답 페이로드 requiresHITL: true", async () => {
    generateJsonMock.mockResolvedValue({
      articulation: 50,
      linguistic: 50,
      acoustic: 50,
      confidence: 65,
    });

    const result = await analyzeDiagnosis(VALID_INPUT);

    expect(result.requiresHITL).toBe(true);
    expect(result.confidence).toBe(65);
  });

  it("[시나리오 4] confidence 75 → HITLQueue UPSERT 0건, Slack 호출 0건", async () => {
    generateJsonMock.mockResolvedValue({
      articulation: 70,
      linguistic: 70,
      acoustic: 70,
      confidence: 75,
    });

    const result = await analyzeDiagnosis(VALID_INPUT);

    // SessionLog/EvaluationResult 는 confidence 무관 INSERT.
    expect(sessionLogCreateMock).toHaveBeenCalledTimes(1);
    // HITLQueue 와 Slack 은 confidence < 70 게이트로 차단.
    expect(hitlUpsertMock).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(result.requiresHITL).toBe(false);
  });

  it("[시나리오 5] enqueueForReview 멱등성 — 동일 sessionId 두 번째는 confidenceScore 만 update", async () => {
    // 통합 흐름으로는 sessionId 가 randomUUID 라 자연 중복이 안 일어남.
    // → enqueueForReview 단위 흐름으로 위임 검증 (upsert where/create/update 인자 셰이프).
    generateJsonMock.mockResolvedValue({
      articulation: 50,
      linguistic: 50,
      acoustic: 50,
      confidence: 65,
    });

    await analyzeDiagnosis(VALID_INPUT);

    expect(hitlUpsertMock).toHaveBeenCalledTimes(1);
    const arg = hitlUpsertMock.mock.calls[0][0] as {
      where: { sessionId: string };
      create: { sessionId: string; confidenceScore: number; slaDueAt: Date };
      update: { confidenceScore: number };
    };
    // upsert 시 where=sessionId 로 멱등성 보장. create 와 update 모두 confidence 갱신.
    expect(arg.where.sessionId).toBeTruthy();
    expect(arg.create.confidenceScore).toBe(65);
    expect(arg.update.confidenceScore).toBe(65);
    expect(arg.create.slaDueAt).toBeInstanceOf(Date);
  });

  it("[시나리오 6] Slack 실패 graceful — DB INSERT 성공 + 응답 정상", async () => {
    generateJsonMock.mockResolvedValue({
      articulation: 50,
      linguistic: 50,
      acoustic: 50,
      confidence: 65,
    });
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await analyzeDiagnosis(VALID_INPUT);
    // fire-and-forget Slack 호출이 .catch() 로 swallow 되는지 비동기 검증.
    await vi.waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    // DB 작업은 정상 완료.
    expect(sessionLogCreateMock).toHaveBeenCalledTimes(1);
    expect(hitlUpsertMock).toHaveBeenCalledTimes(1);
    // 사용자 응답에는 영향 없음.
    expect(result.requiresHITL).toBe(true);
    expect(result.sessionId).toBeTruthy();
  });

  it("[시나리오 7] 즉시 이관 ≤ 2초 (REQ-FUNC-HITL-001)", async () => {
    generateJsonMock.mockResolvedValue({
      articulation: 50,
      linguistic: 50,
      acoustic: 50,
      confidence: 65,
    });

    const start = performance.now();
    await analyzeDiagnosis(VALID_INPUT);
    const elapsed = performance.now() - start;

    // mock 환경 기준 동기 작업만이라 보통 < 100ms. 안전 여유 2,000ms.
    expect(elapsed).toBeLessThan(2_000);
  });
});

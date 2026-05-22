// TEST-002 (Sprint 2 §2 업데이트) — FR-C-002 + API-005 + DB-009 통합.
// HITL 자동 이관 + Slack 알림.
//
// Sprint 2 §2 변경: Gemini scoring 제거 → phonetic similarity 기반.
// HITL 게이트: articulationScore < 50 (이전 confidence < 70 대체).
//
// 격리: Prisma / fetch mock — 실 외부 호출 0건. Gemini 호출은 코드에서 제거됨.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const userUpsertMock = vi.fn();
const sessionLogCreateMock = vi.fn();
// TEST-014 — enqueueForReview 가 upsert → findUnique + create/update 패턴으로 전환.
const hitlFindUniqueMock = vi.fn();
const hitlCreateMock = vi.fn();
const hitlUpdateMock = vi.fn();
const hitlCountMock = vi.fn();
const cookieGetMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      upsert: (...args: unknown[]) => userUpsertMock(...args),
    },
    sessionLog: {
      create: (...args: unknown[]) => sessionLogCreateMock(...args),
    },
    hITLQueue: {
      findUnique: (...args: unknown[]) => hitlFindUniqueMock(...args),
      create: (...args: unknown[]) => hitlCreateMock(...args),
      update: (...args: unknown[]) => hitlUpdateMock(...args),
      count: (...args: unknown[]) => hitlCountMock(...args),
    },
    evaluationResult: {
      findUnique: vi.fn(),
    },
  },
}));

// Sprint 2 §3 — analyzeDiagnosis 가 cookie 를 읽음.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieGetMock(name),
  }),
}));

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

const VALID_INPUT_HIGH_MATCH = {
  intendedWord: "사과",
  transcript: "사과", // 완전 일치 → articulationScore = 100
  childAgeMonths: 36,
  targetPhoneme: "ㅅ" as const,
};

const VALID_INPUT_LOW_MATCH = {
  intendedWord: "사과",
  transcript: "타파", // 거의 다름 (ㅅ→ㅌ, ㄱ→ㅍ) → articulationScore < 50
  childAgeMonths: 36,
  targetPhoneme: "ㅅ" as const,
};

beforeEach(() => {
  userUpsertMock.mockReset();
  sessionLogCreateMock.mockReset();
  hitlFindUniqueMock.mockReset();
  hitlCreateMock.mockReset();
  hitlUpdateMock.mockReset();
  hitlCountMock.mockReset();
  cookieGetMock.mockReset();
  // 기본: cookie 미존재 시 undefined 반환 → analyzeDiagnosis 가 input.anonymousUserId 또는 randomUUID fallback.
  cookieGetMock.mockReturnValue(undefined);

  userUpsertMock.mockResolvedValue({ id: "mocked-user" });
  sessionLogCreateMock.mockResolvedValue({ id: "mocked-session" });
  // TEST-014 신규 enqueueForReview: 신규 sessionId 경로 (findUnique→null) + abuse 0 + create.
  hitlFindUniqueMock.mockResolvedValue(null);
  hitlCountMock.mockResolvedValue(0);
  hitlCreateMock.mockResolvedValue({
    id: "queue-1",
    status: "pending",
    slaDueAt: new Date("2026-05-16T12:00:00Z"),
  });

  process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/mock";
  globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
});

afterEach(() => {
  process.env.SLACK_WEBHOOK_URL = ORIGINAL_SLACK_URL;
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("TEST-002 — Sprint 2 §2 phonetic similarity 기반 HITL 분기", () => {
  it("[시나리오 1] 발음 차이 큼 (articulation < 50) → SessionLog + EvaluationResult INSERT 1건", async () => {
    const result = await analyzeDiagnosis(VALID_INPUT_LOW_MATCH);

    expect(sessionLogCreateMock).toHaveBeenCalledTimes(1);
    const sessionArg = sessionLogCreateMock.mock.calls[0][0] as {
      data: {
        id: string;
        userId: string;
        evaluationResult: {
          create: { articulationScore: number; targetPhoneme: string };
        };
      };
    };
    expect(sessionArg.data.id).toBe(result.sessionId);
    expect(sessionArg.data.evaluationResult.create.articulationScore).toBeLessThan(50);
    expect(sessionArg.data.evaluationResult.create.targetPhoneme).toBe("ㅅ");
  });

  it("[시나리오 2] 발음 차이 큼 → Slack webhook fetch 1건 (R4 검증)", async () => {
    const result = await analyzeDiagnosis(VALID_INPUT_LOW_MATCH);
    await vi.waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://hooks.slack.com/mock");
    const body = JSON.parse(init.body as string) as { text: string };
    expect(body.text).toContain(result.sessionId);
    expect(body.text).toContain("HITL 검토 필요");
    for (const word of ["userId", "anonymousUserId", "email", "name"]) {
      expect(body.text).not.toContain(word);
    }
  });

  it("[시나리오 3] 발음 차이 큼 → 응답 페이로드 requiresHITL: true", async () => {
    const result = await analyzeDiagnosis(VALID_INPUT_LOW_MATCH);

    expect(result.requiresHITL).toBe(true);
    expect(result.articulationScore).toBeLessThan(50);
    expect(result.intendedWord).toBe("사과");
    expect(result.heardWord).toBe("타파");
  });

  it("[시나리오 4] 발음 일치 (articulation = 100) → HITLQueue / Slack 모두 0건", async () => {
    const result = await analyzeDiagnosis(VALID_INPUT_HIGH_MATCH);

    expect(sessionLogCreateMock).toHaveBeenCalledTimes(1);
    expect(hitlCreateMock).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(result.requiresHITL).toBe(false);
    expect(result.articulationScore).toBe(100);
  });

  it("[시나리오 5] enqueueForReview — TEST-014 신규 패턴 (findUnique → create) 셰이프", async () => {
    await analyzeDiagnosis(VALID_INPUT_LOW_MATCH);
    // FR-C-002 (Gemini swap) 이후 — fire-and-forget maybeEnqueueHitl 도 같은 sessionId 로
    // 두 번째 호출 가능. UNIQUE 멱등성 시뮬 (beforeEach) 가 update 경로로 전환 보장.
    await vi.waitFor(() => expect(hitlCreateMock).toHaveBeenCalled());

    expect(hitlCreateMock).toHaveBeenCalledTimes(1); // create 는 단 1회 (UNIQUE 멱등)
    const arg = hitlCreateMock.mock.calls[0][0] as {
      data: { sessionId: string; confidenceScore: number; slaDueAt: Date; status: string };
    };
    expect(arg.data.sessionId).toBeTruthy();
    expect(arg.data.confidenceScore).toBeLessThan(50);
    expect(arg.data.slaDueAt).toBeInstanceOf(Date);
    expect(arg.data.status).toBe("pending"); // abuse=0 → pending
  });

  it("[시나리오 6] Slack 실패 graceful — DB INSERT 성공 + 응답 정상", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await analyzeDiagnosis(VALID_INPUT_LOW_MATCH);
    await vi.waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

    expect(sessionLogCreateMock).toHaveBeenCalledTimes(1);
    expect(hitlCreateMock).toHaveBeenCalledTimes(1);
    expect(result.requiresHITL).toBe(true);
    expect(result.sessionId).toBeTruthy();
  });

  it("[시나리오 7] 즉시 이관 ≤ 2초 (REQ-FUNC-HITL-001)", async () => {
    const start = performance.now();
    await analyzeDiagnosis(VALID_INPUT_LOW_MATCH);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2_000);
  });
});

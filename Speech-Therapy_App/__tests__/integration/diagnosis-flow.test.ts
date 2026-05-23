// TEST-001 — Sprint 1 P0 3축 스코어링 통합 (FR-C-001).
//
// 검증 영역 (sub-session B + C 의 운영 검증을 자동화 회귀 방지로 고정):
//  1. articulation 점수 — phonetic similarity (완전 일치 / 부분 / 불일치)
//  2. linguistic 점수 — sttConfidence 가중치 (high / mid / low / null)
//  3. acoustic 점수 — features (신호 기반, 50% duration + 30% pitch + 20% energy)
//     vs features 없음 (Sprint 2 §2 텍스트 프록시 폴백)
//  4. requiresHITL — articulationScore < 50 분기
//  5. revalidatePath("/rewards") 호출 (setup.ts 의 next/cache mock 활용)
//
// 격리: Prisma / cookies mock — 실 외부 호출 0건.
// 패턴: hitl-flow.test.ts (TEST-002) 와 동일 mock 전략.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const userUpsertMock = vi.fn();
const sessionLogCreateMock = vi.fn();
const hitlUpsertMock = vi.fn();
const cookieGetMock = vi.fn();
const txQueryRawMock = vi.fn();

// DB-011: app/actions/diagnosis.ts 가 익명 user.upsert 호출을 withActor 로 감쌌으므로
// prisma mock 에 $transaction 추가 (tx.user.upsert + tx.$queryRaw 노출).
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
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: (...args: unknown[]) => txQueryRawMock(...args),
        user: {
          upsert: (...args: unknown[]) => userUpsertMock(...args),
        },
      };
      return fn(tx);
    },
  },
}));

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
import { revalidatePath } from "next/cache";

const ORIGINAL_SLACK_URL = process.env.SLACK_WEBHOOK_URL;
const ORIGINAL_FETCH = globalThis.fetch;

const BASE_INPUT = {
  childAgeMonths: 36,
  targetPhoneme: "ㅅ" as const,
};

const FEATURES_GOOD = {
  pitchMean: 250,
  pitchStd: 30,
  durationSec: 3,
  energy: 0.05,
};

const FEATURES_SHORT = {
  pitchMean: 250,
  pitchStd: 5,
  durationSec: 0.3, // 너무 짧음
  energy: 0.005,
};

beforeEach(() => {
  userUpsertMock.mockReset();
  sessionLogCreateMock.mockReset();
  hitlUpsertMock.mockReset();
  cookieGetMock.mockReset();
  txQueryRawMock.mockReset();
  txQueryRawMock.mockResolvedValue([{ set_config: "" }]);
  cookieGetMock.mockReturnValue(undefined);

  userUpsertMock.mockResolvedValue({ id: "mocked-user" });
  sessionLogCreateMock.mockResolvedValue({ id: "mocked-session" });
  hitlUpsertMock.mockResolvedValue({
    id: "queue-1",
    slaDueAt: new Date("2026-05-21T00:00:00Z"),
  });

  // Slack fire-and-forget 비활성화 (테스트 환경)
  delete process.env.SLACK_WEBHOOK_URL;
  globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
});

afterEach(() => {
  process.env.SLACK_WEBHOOK_URL = ORIGINAL_SLACK_URL;
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("TEST-001 — Sprint 1 P0 3축 스코어링 통합 (FR-C-001)", () => {
  describe("articulation 점수 (phonetic similarity)", () => {
    it("[시나리오 1] 완전 일치 → articulationScore = 100", async () => {
      const result = await analyzeDiagnosis({
        ...BASE_INPUT,
        intendedWord: "사과",
        transcript: "사과",
      });
      expect(result.articulationScore).toBe(100);
      expect(result.requiresHITL).toBe(false);
    });

    it("[시나리오 2] 불일치 (자모 거의 다름) → articulationScore < 50 + requiresHITL=true", async () => {
      const result = await analyzeDiagnosis({
        ...BASE_INPUT,
        intendedWord: "사과",
        transcript: "타파", // ㅅ→ㅌ, ㄱ→ㅍ (자모 거의 다름)
      });
      expect(result.articulationScore).toBeLessThan(50);
      expect(result.requiresHITL).toBe(true);
    });

    it("[시나리오 3] 부분 일치 → articulationScore 중간값 (50~99)", async () => {
      const result = await analyzeDiagnosis({
        ...BASE_INPUT,
        intendedWord: "사과",
        transcript: "사파", // ㅅ 자모 일치, ㄱ→ㅍ
      });
      expect(result.articulationScore).toBeGreaterThanOrEqual(50);
      expect(result.articulationScore).toBeLessThan(100);
    });
  });

  describe("acoustic 점수 분기 (신호 vs 텍스트 프록시 폴백)", () => {
    it("[시나리오 4] features 없음 → 텍스트 프록시 폴백 (자모 길이 기반)", async () => {
      const result = await analyzeDiagnosis({
        ...BASE_INPUT,
        intendedWord: "사과",
        transcript: "사과",
        // acousticFeatures 미전달
      });
      // 폴백 점수 산출 (acousticScore 정의역 0~100 안)
      expect(result.acousticScore).toBeGreaterThanOrEqual(0);
      expect(result.acousticScore).toBeLessThanOrEqual(100);
    });

    it("[시나리오 5] features 충분 (3s/pitchStd 30/energy 0.05) → 높은 acousticScore", async () => {
      const result = await analyzeDiagnosis({
        ...BASE_INPUT,
        intendedWord: "사과",
        transcript: "사과",
        acousticFeatures: FEATURES_GOOD,
      });
      // 좋은 신호 → 50 이상 기대 (실제 산출은 acoustic-score.ts 의 가중 평균)
      expect(result.acousticScore).toBeGreaterThanOrEqual(50);
    });

    it("[시나리오 6] features 짧은 발화 (0.3s) → 낮은 acousticScore (duration 감점)", async () => {
      const result = await analyzeDiagnosis({
        ...BASE_INPUT,
        intendedWord: "사과",
        transcript: "사과",
        acousticFeatures: FEATURES_SHORT,
      });
      // 짧은 duration → 50 미만 가능
      expect(result.acousticScore).toBeLessThan(80);
    });
  });

  describe("linguistic 점수 (sttConfidence 가중치)", () => {
    it("[시나리오 7] confidence 0.95 (high) → linguisticScore 90+ (음절 일치 + 높은 신뢰)", async () => {
      const result = await analyzeDiagnosis({
        ...BASE_INPUT,
        intendedWord: "사과",
        transcript: "사과",
        sttConfidence: 0.95,
      });
      expect(result.linguisticScore).toBeGreaterThanOrEqual(90);
    });

    it("[시나리오 8] confidence 0.4 (low) → linguisticScore 감점", async () => {
      const result = await analyzeDiagnosis({
        ...BASE_INPUT,
        intendedWord: "사과",
        transcript: "사과", // 음절 일치 100% 인데
        sttConfidence: 0.4, // 신뢰도 낮음
      });
      // 0.4 confidence → 50% 가중치 적용 시 약 70 부근
      expect(result.linguisticScore).toBeLessThan(85);
    });

    it("[시나리오 9] confidence null → 기존 동작 (음절 100% 폴백)", async () => {
      const result = await analyzeDiagnosis({
        ...BASE_INPUT,
        intendedWord: "사과",
        transcript: "사과",
        sttConfidence: null,
      });
      // null 시 음절 일치도 100% 만 적용 → 100
      expect(result.linguisticScore).toBe(100);
    });
  });

  describe("revalidatePath 호출 (300-nextjs-server-actions-rules §5)", () => {
    it("[시나리오 10] 정상 분석 후 /rewards revalidate 호출", async () => {
      vi.mocked(revalidatePath).mockClear();

      await analyzeDiagnosis({
        ...BASE_INPUT,
        intendedWord: "사과",
        transcript: "사과",
      });

      expect(revalidatePath).toHaveBeenCalledWith("/rewards");
    });
  });

  describe("Zod 입력 검증 (303-zod-schema-validation-rules)", () => {
    it("[시나리오 11] transcript 빈 문자열 → ZodError throw", async () => {
      await expect(
        analyzeDiagnosis({
          ...BASE_INPUT,
          intendedWord: "사과",
          transcript: "",
        }),
      ).rejects.toThrow();
    });

    it("[시나리오 12] childAgeMonths 범위 초과 (100) → ZodError throw", async () => {
      await expect(
        analyzeDiagnosis({
          ...BASE_INPUT,
          childAgeMonths: 100, // max 84
          intendedWord: "사과",
          transcript: "사과",
        }),
      ).rejects.toThrow();
    });

    it("[시나리오 13] targetPhoneme 미허용 값 → ZodError throw", async () => {
      await expect(
        analyzeDiagnosis({
          ...BASE_INPUT,
          targetPhoneme: "ㄱㄴㄷ" as never, // enum 외
          intendedWord: "사과",
          transcript: "사과",
        }),
      ).rejects.toThrow();
    });
  });
});

// FR-C-011 (#34) — weekly-aggregator + lib/predictions/gemini 통합 시나리오.
//
// 본 테스트는 aggregateWeeklyReport 가 mock 폴백 path 에서 정상 동작하는지 + Gemini 응답이
// 있을 때 그 값이 그대로 predictedNextScore 에 반영되는지 검증한다.
//
// NODE_ENV='test' 가 forced-mock 트리거이므로, mock 경로는 NODE_ENV 그대로,
// Gemini 경로는 vi.stubEnv 로 우회한다.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const evaluationResultFindManyMock = vi.fn();
const weeklyReportFindManyMock = vi.fn();
const generateJsonMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    evaluationResult: {
      findMany: (...args: unknown[]) => evaluationResultFindManyMock(...args),
    },
    weeklyReport: {
      findMany: (...args: unknown[]) => weeklyReportFindManyMock(...args),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/gemini", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/gemini")>(
    "@/lib/ai/gemini",
  );
  return {
    ...actual,
    generateJson: (...args: unknown[]) => generateJsonMock(...args),
  };
});

import { aggregateWeeklyReport } from "@/lib/reports/weekly-aggregator";
import { __resetPredictionsGeminiForTest } from "@/lib/predictions/gemini";

function makeRow(
  userId: string,
  isoDate: string,
  articulation: number,
  linguistic: number,
  acoustic: number,
  peerPercentile = 50,
) {
  return {
    id: `er-${userId}-${isoDate}`,
    userId,
    createdAt: new Date(`${isoDate}T12:00:00Z`),
    targetPhoneme: "ㅅ",
    articulationScore: articulation,
    linguisticScore: linguistic,
    acousticScore: acoustic,
    peerPercentile,
  };
}

beforeEach(() => {
  evaluationResultFindManyMock.mockReset();
  weeklyReportFindManyMock.mockReset();
  generateJsonMock.mockReset();
  __resetPredictionsGeminiForTest();
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  delete process.env.GEMINI_DISABLED;
});

describe("aggregateWeeklyReport — FR-C-011 통합", () => {
  it("(1) test 환경 (forced mock) — predictedNextScore = 직전 주 평균 + 5", async () => {
    evaluationResultFindManyMock.mockResolvedValueOnce([
      makeRow("u-1", "2026-05-19", 80, 70, 75),
      makeRow("u-1", "2026-05-20", 80, 70, 75),
      makeRow("u-1", "2026-05-21", 80, 70, 75),
      makeRow("u-1", "2026-05-22", 80, 70, 75),
    ]);
    const data = await aggregateWeeklyReport({ userId: "u-1", year: 2026, weekNumber: 20 });
    expect(data).not.toBeNull();
    // (80+70+75)/3 = 75 → 75+5 = 80
    expect(data!.predictedNextScore).toBeCloseTo(80, 1);
    // forced mock 경로 — weeklyReport.findMany 호출 0 (test env 에서 fetch skip).
    expect(weeklyReportFindManyMock).not.toHaveBeenCalled();
    // Gemini 미호출.
    expect(generateJsonMock).not.toHaveBeenCalled();
  });

  it("(2) Gemini 정상 응답 → predictedNextScore = Gemini predicted (mock 공식 무시)", async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    vi.stubEnv("NODE_ENV", "development");
    evaluationResultFindManyMock.mockResolvedValueOnce([
      makeRow("u-2", "2026-05-19", 60, 60, 60),
      makeRow("u-2", "2026-05-20", 60, 60, 60),
      makeRow("u-2", "2026-05-21", 60, 60, 60),
      makeRow("u-2", "2026-05-22", 60, 60, 60),
    ]);
    // weekly-aggregator 가 직전 4주 weeklyReport 조회.
    weeklyReportFindManyMock.mockResolvedValueOnce([
      { weekNumber: 19, articulationAvg: 58, linguisticAvg: 58, acousticAvg: 58, sessionCount: 5 },
      { weekNumber: 18, articulationAvg: 56, linguisticAvg: 56, acousticAvg: 56, sessionCount: 4 },
      { weekNumber: 17, articulationAvg: 55, linguisticAvg: 55, acousticAvg: 55, sessionCount: 4 },
      { weekNumber: 16, articulationAvg: 53, linguisticAvg: 53, acousticAvg: 53, sessionCount: 4 },
    ]);
    generateJsonMock.mockResolvedValueOnce({
      predicted: 72,
      confidence: 0.81,
      reasoning: "상승 추세",
    });
    const data = await aggregateWeeklyReport({ userId: "u-2", year: 2026, weekNumber: 20 });
    expect(data!.predictedNextScore).toBe(72);
    // 직전 4주 weeklyReport 조회 1회.
    expect(weeklyReportFindManyMock).toHaveBeenCalledTimes(1);
    expect(generateJsonMock).toHaveBeenCalledTimes(1);
  });

  it("(3) Gemini 실패 (rate limit) → mock fallback 으로 number 보장 (null 아님)", async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    vi.stubEnv("NODE_ENV", "development");
    evaluationResultFindManyMock.mockResolvedValueOnce([
      makeRow("u-3", "2026-05-19", 70, 70, 70),
      makeRow("u-3", "2026-05-20", 70, 70, 70),
      makeRow("u-3", "2026-05-21", 70, 70, 70),
      makeRow("u-3", "2026-05-22", 70, 70, 70),
    ]);
    weeklyReportFindManyMock.mockResolvedValueOnce([]); // 직전 weekly 없음.
    const { RateLimitedError } = await import("@/lib/ai/gemini");
    generateJsonMock.mockRejectedValueOnce(new RateLimitedError("GLOBAL_RPM", 30));
    const data = await aggregateWeeklyReport({ userId: "u-3", year: 2026, weekNumber: 20 });
    expect(data!.predictedNextScore).toBeCloseTo(75, 1); // 70+5
    expect(data!.predictedNextScore).not.toBeNull();
  });

  it("(4) 0 session → null (예측 호출 자체 없음)", async () => {
    evaluationResultFindManyMock.mockResolvedValueOnce([]);
    const data = await aggregateWeeklyReport({ userId: "u-4", year: 2026, weekNumber: 20 });
    expect(data).toBeNull();
    expect(generateJsonMock).not.toHaveBeenCalled();
    expect(weeklyReportFindManyMock).not.toHaveBeenCalled();
  });

  it("(5) weeklyReport.findMany 호출 인자 검증 — userId + orderBy generatedAt desc + take 4", async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    vi.stubEnv("NODE_ENV", "development");
    evaluationResultFindManyMock.mockResolvedValueOnce([
      makeRow("u-5", "2026-05-22", 80, 80, 80),
    ]);
    weeklyReportFindManyMock.mockResolvedValueOnce([]);
    generateJsonMock.mockResolvedValueOnce({
      predicted: 85,
      confidence: 0.75,
      reasoning: "ok",
    });
    await aggregateWeeklyReport({ userId: "u-5", year: 2026, weekNumber: 20 });
    expect(weeklyReportFindManyMock).toHaveBeenCalledTimes(1);
    const arg = weeklyReportFindManyMock.mock.calls[0][0] as {
      where: { userId: string };
      orderBy: { generatedAt: string };
      take: number;
    };
    expect(arg.where.userId).toBe("u-5");
    expect(arg.orderBy.generatedAt).toBe("desc");
    expect(arg.take).toBe(4);
  });
});

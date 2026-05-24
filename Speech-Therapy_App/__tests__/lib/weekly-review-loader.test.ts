// FR-Q-WEEKLY-REVIEW — loadWeeklyReview 단위 테스트.
//
// 검증 시나리오:
//   [1] 정상 — 4건 → latest + history 3건, wAurAchieved=true (sessionCount≥4)
//   [2] 빈 데이터 (rows=0) → latest=null, history=[], hasData=false
//   [3] userId 빈 문자열 → 즉시 빈 상태 (DB 미조회)
//   [4] W-AUR 미달성 (sessionCount=2) → wAurAchieved=false
//   [5] history 1건만 (총 2건) → history.length=1
//   [6] cross-user 차단 — where 절에 본 userId 만 사용 (다른 userId 미사용)
//   [7] DB 에러 graceful → 빈 상태 반환
//   [8] orderBy/take 인자 정확성 — generatedAt desc, take 4

import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    weeklyReport: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

import { loadWeeklyReview } from "@/lib/reports/weekly-review-loader";

const USER_ME = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function makeRow(overrides: Partial<{ id: string; sessionCount: number; weekNumber: number }> = {}) {
  return {
    id: overrides.id ?? "wr-1",
    userId: USER_ME,
    year: 2026,
    weekNumber: overrides.weekNumber ?? 20,
    articulationAvg: 75,
    linguisticAvg: 70,
    acousticAvg: 65,
    peerPercentileAvg: 72,
    sessionCount: overrides.sessionCount ?? 5,
    predictedNextScore: 78,
    predictionConfidence: 0.85,
    generatedAt: new Date("2026-05-24T00:00:00Z"),
    scoreTrend: [],
  };
}

beforeEach(() => {
  findManyMock.mockReset();
});

describe("loadWeeklyReview — FR-Q-WEEKLY-REVIEW", () => {
  it("[1] 정상 4건 → latest + history 3건, wAurAchieved=true", async () => {
    findManyMock.mockResolvedValueOnce([
      makeRow({ id: "wr-latest", weekNumber: 20, sessionCount: 5 }),
      makeRow({ id: "wr-2", weekNumber: 19, sessionCount: 4 }),
      makeRow({ id: "wr-3", weekNumber: 18, sessionCount: 3 }),
      makeRow({ id: "wr-4", weekNumber: 17, sessionCount: 6 }),
    ]);

    const result = await loadWeeklyReview(USER_ME);

    expect(result.hasData).toBe(true);
    expect(result.latest?.id).toBe("wr-latest");
    expect(result.history).toHaveLength(3);
    expect(result.history.map((r) => r.id)).toEqual(["wr-2", "wr-3", "wr-4"]);
    expect(result.wAurAchieved).toBe(true);
  });

  it("[2] 빈 데이터 (rows=0) → latest=null, hasData=false", async () => {
    findManyMock.mockResolvedValueOnce([]);

    const result = await loadWeeklyReview(USER_ME);

    expect(result.hasData).toBe(false);
    expect(result.latest).toBeNull();
    expect(result.history).toEqual([]);
    expect(result.wAurAchieved).toBe(false);
  });

  it("[3] userId 빈 문자열 → DB 미조회 + 빈 상태 즉시 반환", async () => {
    const result = await loadWeeklyReview("");

    expect(result.hasData).toBe(false);
    expect(result.latest).toBeNull();
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("[4] W-AUR 미달성 (sessionCount=2) → wAurAchieved=false", async () => {
    findManyMock.mockResolvedValueOnce([makeRow({ sessionCount: 2 })]);

    const result = await loadWeeklyReview(USER_ME);

    expect(result.hasData).toBe(true);
    expect(result.wAurAchieved).toBe(false);
  });

  it("[5] history 1건만 (총 2건) → latest + history.length=1", async () => {
    findManyMock.mockResolvedValueOnce([
      makeRow({ id: "wr-l", weekNumber: 20 }),
      makeRow({ id: "wr-prev", weekNumber: 19 }),
    ]);

    const result = await loadWeeklyReview(USER_ME);

    expect(result.latest?.id).toBe("wr-l");
    expect(result.history).toHaveLength(1);
    expect(result.history[0]?.id).toBe("wr-prev");
  });

  it("[6] cross-user 차단 — where 절에 본 userId 만 (다른 userId 미사용)", async () => {
    findManyMock.mockResolvedValueOnce([makeRow()]);

    await loadWeeklyReview(USER_ME);

    expect(findManyMock).toHaveBeenCalledTimes(1);
    const call = findManyMock.mock.calls[0]?.[0] as { where: { userId: string } };
    expect(call.where.userId).toBe(USER_ME);
    // 어떤 인자에도 USER_OTHER 미사용.
    expect(JSON.stringify(findManyMock.mock.calls)).not.toContain(USER_OTHER);
  });

  it("[7] DB 에러 graceful → 빈 상태 반환", async () => {
    findManyMock.mockRejectedValueOnce(new Error("DB connection lost"));

    const result = await loadWeeklyReview(USER_ME);

    expect(result.hasData).toBe(false);
    expect(result.latest).toBeNull();
    expect(result.history).toEqual([]);
  });

  it("[8] orderBy generatedAt desc + take 4 — 인자 정확성", async () => {
    findManyMock.mockResolvedValueOnce([]);

    await loadWeeklyReview(USER_ME);

    expect(findManyMock).toHaveBeenCalledTimes(1);
    const call = findManyMock.mock.calls[0]?.[0] as {
      orderBy: { generatedAt: string };
      take: number;
    };
    expect(call.orderBy).toEqual({ generatedAt: "desc" });
    expect(call.take).toBe(4);
  });
});

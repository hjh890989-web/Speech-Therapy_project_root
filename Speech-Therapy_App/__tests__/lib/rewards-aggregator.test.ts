// FR-Q-004 (#45) — loadRewardCollection 단위 테스트 (Prisma mock).
//
// 검증 시나리오 (≥ 7):
//   1. star / tree / drawing 모두 보유 → 누적합 정합
//   2. 빈 userId → Prisma 미호출 + empty payload
//   3. star 만 보유 → tree=0, ai=0
//   4. tree 만 보유 → star=0, ai=0
//   5. drawing 만 보유 → aiArtsCount=양수, aiArts 항상 빈 배열 (schema 부재)
//   6. cross-user 보호 — where.userId 가 정확히 입력값만 (다른 userId 미사용, R4)
//   7. groupBy 결과 빈 배열 → empty 누적합 (sum 0)
//   8. _sum.amount null 케이스 → 0 으로 폴백

import { describe, it, expect, vi, beforeEach } from "vitest";

const groupByMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    rewardLog: {
      groupBy: (...args: unknown[]) => groupByMock(...args),
    },
  },
}));

import {
  loadRewardCollection,
  emptyRewardCollection,
} from "@/lib/rewards/aggregator";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

beforeEach(() => {
  groupByMock.mockReset();
});

describe("loadRewardCollection — FR-Q-004 보상 도감 집계", () => {
  it("[1] star/tree/drawing 모두 보유 → 누적합 정합", async () => {
    groupByMock.mockResolvedValueOnce([
      { rewardType: "star", _sum: { amount: 12 } },
      { rewardType: "tree", _sum: { amount: 3 } },
      { rewardType: "drawing", _sum: { amount: 2 } },
    ]);

    const data = await loadRewardCollection(USER_A);

    expect(data.stars).toBe(12);
    expect(data.trees).toBe(3);
    expect(data.aiArtsCount).toBe(2);
    // schema 부재 — aiArts thumbnail 항상 빈 배열.
    expect(data.aiArts).toEqual([]);
  });

  it("[2] 빈 userId → Prisma 호출 0 + empty payload", async () => {
    const data = await loadRewardCollection("");

    expect(groupByMock).not.toHaveBeenCalled();
    expect(data).toEqual(emptyRewardCollection());
    expect(data.stars).toBe(0);
    expect(data.trees).toBe(0);
    expect(data.aiArtsCount).toBe(0);
    expect(data.aiArts).toEqual([]);
  });

  it("[3] star 만 보유 → tree=0, aiArtsCount=0", async () => {
    groupByMock.mockResolvedValueOnce([
      { rewardType: "star", _sum: { amount: 5 } },
    ]);

    const data = await loadRewardCollection(USER_A);

    expect(data.stars).toBe(5);
    expect(data.trees).toBe(0);
    expect(data.aiArtsCount).toBe(0);
  });

  it("[4] tree 만 보유 → star=0, aiArtsCount=0", async () => {
    groupByMock.mockResolvedValueOnce([
      { rewardType: "tree", _sum: { amount: 7 } },
    ]);

    const data = await loadRewardCollection(USER_A);

    expect(data.stars).toBe(0);
    expect(data.trees).toBe(7);
    expect(data.aiArtsCount).toBe(0);
  });

  it("[5] drawing 만 보유 → aiArtsCount=양수, aiArts 항상 빈 배열 (schema 부재 placeholder)", async () => {
    groupByMock.mockResolvedValueOnce([
      { rewardType: "drawing", _sum: { amount: 4 } },
    ]);

    const data = await loadRewardCollection(USER_A);

    expect(data.stars).toBe(0);
    expect(data.trees).toBe(0);
    expect(data.aiArtsCount).toBe(4);
    expect(data.aiArts).toEqual([]);
  });

  it("[6] cross-user 보호 — where.userId 가 정확히 입력값만 (R4)", async () => {
    groupByMock.mockResolvedValueOnce([
      { rewardType: "star", _sum: { amount: 1 } },
    ]);

    await loadRewardCollection(USER_A);

    expect(groupByMock).toHaveBeenCalledTimes(1);
    const arg = groupByMock.mock.calls[0][0] as {
      by: string[];
      where: { userId: string };
      _sum: { amount: boolean };
    };
    expect(arg.where.userId).toBe(USER_A);
    expect(arg.by).toEqual(["rewardType"]);
    expect(arg._sum.amount).toBe(true);

    // 다른 USER_B 가 어떤 호출 인자에도 등장 0건 (cross-user 차단 검증).
    const serialized = JSON.stringify(groupByMock.mock.calls);
    expect(serialized).not.toContain(USER_B);
  });

  it("[7] groupBy 결과 빈 배열 → 모든 카운트 0", async () => {
    groupByMock.mockResolvedValueOnce([]);

    const data = await loadRewardCollection(USER_A);

    expect(data.stars).toBe(0);
    expect(data.trees).toBe(0);
    expect(data.aiArtsCount).toBe(0);
    expect(data.aiArts).toEqual([]);
  });

  it("[8] _sum.amount null 케이스 → 0 으로 폴백", async () => {
    groupByMock.mockResolvedValueOnce([
      { rewardType: "star", _sum: { amount: null } },
      { rewardType: "tree", _sum: { amount: null } },
    ]);

    const data = await loadRewardCollection(USER_A);

    expect(data.stars).toBe(0);
    expect(data.trees).toBe(0);
  });

  it("[9] 미지 rewardType 은 무시 (schema 확장 대비 graceful)", async () => {
    groupByMock.mockResolvedValueOnce([
      { rewardType: "star", _sum: { amount: 3 } },
      { rewardType: "unknown_future_type", _sum: { amount: 99 } },
    ]);

    const data = await loadRewardCollection(USER_A);

    expect(data.stars).toBe(3);
    expect(data.trees).toBe(0);
    expect(data.aiArtsCount).toBe(0);
  });
});

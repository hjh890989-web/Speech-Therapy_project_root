// FR-C-009 — grantReward 멱등성 + UPSERT 분기 단위 테스트.

import { describe, it, expect, vi, beforeEach } from "vitest";

const upsertProgressMock = vi.fn();
const findProgressMock = vi.fn();
const upsertUserMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    rewardProgress: {
      upsert: (...args: unknown[]) => upsertProgressMock(...args),
      findUnique: (...args: unknown[]) => findProgressMock(...args),
    },
    user: {
      upsert: (...args: unknown[]) => upsertUserMock(...args),
    },
  },
}));

import { grantReward, __resetGrantedKeysForTest } from "@/lib/reward";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  upsertProgressMock.mockReset();
  findProgressMock.mockReset();
  upsertUserMock.mockReset();
  upsertUserMock.mockResolvedValue({ id: USER_ID });
  __resetGrantedKeysForTest();
});

describe("grantReward — star UPSERT 분기", () => {
  it("최초 호출 시 wasSkipped=false + cumulativeStars 반환", async () => {
    upsertProgressMock.mockResolvedValue({
      cumulativeStars: 1,
      treeGrowthLevel: 0,
      aiDrawingCount: 0,
    });

    const out = await grantReward({
      userId: USER_ID,
      rewardType: "star",
      amount: 1,
      idempotencyKey: `${SESSION_ID}-star-1`,
    });

    expect(out.success).toBe(true);
    expect(out.wasSkipped).toBe(false);
    expect(out.cumulativeStars).toBe(1);
    expect(upsertProgressMock).toHaveBeenCalledTimes(1);
    expect(upsertUserMock).toHaveBeenCalledTimes(1);
  });

  it("rewardType=tree → treeGrowthLevel 만 증가", async () => {
    upsertProgressMock.mockResolvedValue({
      cumulativeStars: 0,
      treeGrowthLevel: 2,
      aiDrawingCount: 0,
    });

    await grantReward({
      userId: USER_ID,
      rewardType: "tree",
      amount: 2,
      idempotencyKey: "tree-key",
    });

    const arg = upsertProgressMock.mock.calls[0][0] as {
      create: { treeGrowthLevel: number; cumulativeStars?: number };
      update: { treeGrowthLevel?: { increment: number }; cumulativeStars?: unknown };
    };
    // create.cumulativeStars 는 Prisma @default(0) 에 위임 (필드 자체 미지정).
    expect(arg.create.treeGrowthLevel).toBe(2);
    expect(arg.update.treeGrowthLevel).toEqual({ increment: 2 });
    expect(arg.update.cumulativeStars).toBeUndefined();
  });

  it("rewardType=drawing → aiDrawingCount 만 증가", async () => {
    upsertProgressMock.mockResolvedValue({
      cumulativeStars: 0,
      treeGrowthLevel: 0,
      aiDrawingCount: 1,
    });

    await grantReward({
      userId: USER_ID,
      rewardType: "drawing",
      amount: 1,
      idempotencyKey: "drawing-key",
    });

    const arg = upsertProgressMock.mock.calls[0][0] as {
      create: { aiDrawingCount: number };
      update: { aiDrawingCount?: { increment: number } };
    };
    // create.cumulativeStars / treeGrowthLevel 은 Prisma @default(0) 위임.
    expect(arg.create.aiDrawingCount).toBe(1);
    expect(arg.update.aiDrawingCount).toEqual({ increment: 1 });
  });
});

describe("grantReward — 멱등성", () => {
  it("동일 (userId, idempotencyKey) 재호출 시 wasSkipped=true + DB 미호출", async () => {
    upsertProgressMock.mockResolvedValue({
      cumulativeStars: 5,
      treeGrowthLevel: 0,
      aiDrawingCount: 0,
    });
    findProgressMock.mockResolvedValue({
      cumulativeStars: 5,
      treeGrowthLevel: 0,
      aiDrawingCount: 0,
    });

    const args = {
      userId: USER_ID,
      rewardType: "star" as const,
      amount: 1,
      idempotencyKey: "dup-key",
    };

    const first = await grantReward(args);
    expect(first.wasSkipped).toBe(false);

    const second = await grantReward(args);
    expect(second.wasSkipped).toBe(true);
    expect(second.cumulativeStars).toBe(5);

    // upsertProgress 는 첫 호출에서만 호출.
    expect(upsertProgressMock).toHaveBeenCalledTimes(1);
    // 두 번째 호출 시 findUnique 로 현재 상태 조회.
    expect(findProgressMock).toHaveBeenCalledTimes(1);
  });

  it("다른 userId 동일 idempotencyKey → 두 번째도 정상 적립", async () => {
    upsertProgressMock.mockResolvedValue({
      cumulativeStars: 1,
      treeGrowthLevel: 0,
      aiDrawingCount: 0,
    });

    const a = await grantReward({
      userId: USER_ID,
      rewardType: "star",
      amount: 1,
      idempotencyKey: "shared-key",
    });
    const b = await grantReward({
      userId: "33333333-3333-4333-8333-333333333333",
      rewardType: "star",
      amount: 1,
      idempotencyKey: "shared-key",
    });

    expect(a.wasSkipped).toBe(false);
    expect(b.wasSkipped).toBe(false);
    expect(upsertProgressMock).toHaveBeenCalledTimes(2);
  });
});

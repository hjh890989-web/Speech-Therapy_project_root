// FR-C-009 — grantReward Sprint 2 DB 멱등성 + UPSERT 분기 단위 테스트.
// RewardLog @@unique([userId, idempotencyKey]) 위반 (P2002) 시 wasSkipped 분기.

import { describe, it, expect, vi, beforeEach } from "vitest";

const upsertProgressMock = vi.fn();
const findProgressMock = vi.fn();
const upsertUserMock = vi.fn();
const createRewardLogMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    rewardProgress: {
      upsert: (...args: unknown[]) => upsertProgressMock(...args),
      findUnique: (...args: unknown[]) => findProgressMock(...args),
    },
    user: {
      upsert: (...args: unknown[]) => upsertUserMock(...args),
    },
    rewardLog: {
      create: (...args: unknown[]) => createRewardLogMock(...args),
    },
  },
}));

import { grantReward } from "@/lib/reward";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";

/** Prisma P2002 unique constraint violation 시뮬레이션. */
function prismaUniqueConstraintError() {
  return Object.assign(new Error("Unique constraint violation"), { code: "P2002" });
}

beforeEach(() => {
  upsertProgressMock.mockReset();
  findProgressMock.mockReset();
  upsertUserMock.mockReset();
  createRewardLogMock.mockReset();
  upsertUserMock.mockResolvedValue({ id: USER_ID });
});

describe("grantReward — star UPSERT 분기 (신규 발급)", () => {
  it("최초 호출 시 RewardLog INSERT + wasSkipped=false + cumulativeStars 반환", async () => {
    createRewardLogMock.mockResolvedValue({ id: "log-1" });
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
    expect(createRewardLogMock).toHaveBeenCalledTimes(1);
    expect(upsertProgressMock).toHaveBeenCalledTimes(1);
    expect(upsertUserMock).toHaveBeenCalledTimes(1);

    const logArg = createRewardLogMock.mock.calls[0][0] as {
      data: { userId: string; rewardType: string; amount: number; idempotencyKey: string };
    };
    expect(logArg.data.userId).toBe(USER_ID);
    expect(logArg.data.rewardType).toBe("star");
    expect(logArg.data.idempotencyKey).toBe(`${SESSION_ID}-star-1`);
  });

  it("rewardType=tree → treeGrowthLevel 만 증가", async () => {
    createRewardLogMock.mockResolvedValue({ id: "log-2" });
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
      create: { treeGrowthLevel: number };
      update: { treeGrowthLevel?: { increment: number }; cumulativeStars?: unknown };
    };
    expect(arg.create.treeGrowthLevel).toBe(2);
    expect(arg.update.treeGrowthLevel).toEqual({ increment: 2 });
    expect(arg.update.cumulativeStars).toBeUndefined();
  });

  it("rewardType=drawing → aiDrawingCount 만 증가", async () => {
    createRewardLogMock.mockResolvedValue({ id: "log-3" });
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
    expect(arg.create.aiDrawingCount).toBe(1);
    expect(arg.update.aiDrawingCount).toEqual({ increment: 1 });
  });
});

describe("grantReward — Sprint 2 DB 멱등성 (RewardLog @@unique)", () => {
  it("동일 (userId, idempotencyKey) 재호출 — P2002 catch → wasSkipped=true + 현재 상태 반환", async () => {
    // 첫 호출: RewardLog INSERT 성공.
    createRewardLogMock.mockResolvedValueOnce({ id: "log-first" });
    upsertProgressMock.mockResolvedValue({
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
    expect(first.cumulativeStars).toBe(5);

    // 두 번째 호출: P2002 throw → wasSkipped + findUnique 로 현재 상태.
    createRewardLogMock.mockRejectedValueOnce(prismaUniqueConstraintError());
    findProgressMock.mockResolvedValueOnce({
      cumulativeStars: 5,
      treeGrowthLevel: 0,
      aiDrawingCount: 0,
    });

    const second = await grantReward(args);
    expect(second.wasSkipped).toBe(true);
    expect(second.cumulativeStars).toBe(5);

    // upsertProgress 는 첫 호출만 (두 번째는 increment 안 일어남).
    expect(upsertProgressMock).toHaveBeenCalledTimes(1);
    expect(findProgressMock).toHaveBeenCalledTimes(1);
    // RewardLog.create 는 두 번 시도됨 (두 번째는 reject).
    expect(createRewardLogMock).toHaveBeenCalledTimes(2);
  });

  it("다른 userId 동일 idempotencyKey → 각자 정상 적립 (멱등 키는 user 별 unique)", async () => {
    createRewardLogMock.mockResolvedValue({ id: "log-x" });
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
    expect(createRewardLogMock).toHaveBeenCalledTimes(2);
    expect(upsertProgressMock).toHaveBeenCalledTimes(2);
  });

  it("P2002 외 예외는 그대로 throw (silent swallow 금지)", async () => {
    createRewardLogMock.mockRejectedValue(new Error("Database connection lost"));

    await expect(
      grantReward({
        userId: USER_ID,
        rewardType: "star",
        amount: 1,
        idempotencyKey: "error-key",
      }),
    ).rejects.toThrow("Database connection lost");

    // 멱등 분기 미트리거 — upsertProgress / findUnique 모두 호출 안 됨.
    expect(upsertProgressMock).not.toHaveBeenCalled();
    expect(findProgressMock).not.toHaveBeenCalled();
  });
});

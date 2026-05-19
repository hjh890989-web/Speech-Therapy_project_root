// TEST-009 — FR-C-009 보상 정합성 Server Action 통합.
//
// 검증 영역:
//  1. Zod 입력 검증 (303-zod-schema-validation-rules) — 필수 / 형식 / 범위
//  2. lib/reward.ts grantReward 위임 (Server Action 본체 책임 분리)
//  3. revalidatePath("/rewards") 호출 (300-nextjs-server-actions-rules §5)
//
// 격리: lib/reward 의 grantReward 함수를 mock — DB 호출 없음.
// 기존 reward.test.ts 는 lib/reward.ts 의 UPSERT + 멱등성 (P2002) 다룸.
// 본 파일은 app/actions/reward.ts 의 entry 책임 (Zod + revalidate) 보강.

import { describe, it, expect, vi, beforeEach } from "vitest";

const grantRewardImplMock = vi.fn();

vi.mock("@/lib/reward", () => ({
  grantReward: (...args: unknown[]) => grantRewardImplMock(...args),
}));

import { grantReward as grantRewardAction } from "@/app/actions/reward";
import { revalidatePath } from "next/cache";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const VALID_INPUT = {
  userId: USER_ID,
  rewardType: "star" as const,
  amount: 1,
  idempotencyKey: "session-123-star-1",
};

const VALID_OUTPUT = {
  success: true,
  cumulativeStars: 5,
  treeGrowthLevel: 1,
  aiDrawingCount: 0,
  wasSkipped: false,
};

beforeEach(() => {
  grantRewardImplMock.mockReset();
  grantRewardImplMock.mockResolvedValue(VALID_OUTPUT);
  vi.mocked(revalidatePath).mockClear();
});

describe("TEST-009 — FR-C-009 grantReward Server Action 통합", () => {
  describe("정상 흐름 + revalidatePath", () => {
    it("[시나리오 1] 정상 입력 → lib/reward.grantReward 위임 + 출력 반환", async () => {
      const out = await grantRewardAction(VALID_INPUT);

      expect(grantRewardImplMock).toHaveBeenCalledTimes(1);
      expect(grantRewardImplMock).toHaveBeenCalledWith(VALID_INPUT);
      expect(out).toEqual(VALID_OUTPUT);
    });

    it("[시나리오 2] 정상 분석 후 /rewards revalidate 호출 (300 §5)", async () => {
      await grantRewardAction(VALID_INPUT);

      expect(revalidatePath).toHaveBeenCalledWith("/rewards");
      expect(revalidatePath).toHaveBeenCalledTimes(1);
    });

    it("[시나리오 3] rewardType=tree → 동일 흐름", async () => {
      grantRewardImplMock.mockResolvedValue({
        ...VALID_OUTPUT,
        cumulativeStars: 0,
        treeGrowthLevel: 3,
      });

      const out = await grantRewardAction({
        ...VALID_INPUT,
        rewardType: "tree",
        idempotencyKey: "session-123-tree-1",
      });

      expect(out.treeGrowthLevel).toBe(3);
      expect(revalidatePath).toHaveBeenCalledWith("/rewards");
    });

    it("[시나리오 4] wasSkipped=true (멱등성) 도 정상 반환 + revalidate 호출", async () => {
      grantRewardImplMock.mockResolvedValue({
        ...VALID_OUTPUT,
        wasSkipped: true,
      });

      const out = await grantRewardAction(VALID_INPUT);

      expect(out.wasSkipped).toBe(true);
      // revalidate 는 mutation 시도라도 호출 (cache freshness 정책).
      expect(revalidatePath).toHaveBeenCalledWith("/rewards");
    });
  });

  describe("Zod 입력 검증 (303 §3)", () => {
    it("[시나리오 5] userId 가 UUID 아님 → ZodError throw", async () => {
      await expect(
        grantRewardAction({
          ...VALID_INPUT,
          userId: "not-a-uuid",
        }),
      ).rejects.toThrow();

      // 검증 실패 시 lib/reward 미호출 + revalidate 미호출.
      expect(grantRewardImplMock).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("[시나리오 6] amount 0 → ZodError (min 1)", async () => {
      await expect(
        grantRewardAction({
          ...VALID_INPUT,
          amount: 0,
        }),
      ).rejects.toThrow();
    });

    it("[시나리오 7] amount 11 초과 → ZodError (max 10)", async () => {
      await expect(
        grantRewardAction({
          ...VALID_INPUT,
          amount: 11,
        }),
      ).rejects.toThrow();
    });

    it("[시나리오 8] rewardType 미허용 값 → ZodError (enum)", async () => {
      await expect(
        grantRewardAction({
          ...VALID_INPUT,
          rewardType: "invalid" as never,
        }),
      ).rejects.toThrow();
    });

    it("[시나리오 9] idempotencyKey 빈 문자열 → ZodError (min 1)", async () => {
      await expect(
        grantRewardAction({
          ...VALID_INPUT,
          idempotencyKey: "",
        }),
      ).rejects.toThrow();
    });

    it("[시나리오 10] idempotencyKey 256자 초과 → ZodError (max 255)", async () => {
      await expect(
        grantRewardAction({
          ...VALID_INPUT,
          idempotencyKey: "x".repeat(256),
        }),
      ).rejects.toThrow();
    });
  });

  describe("위임 실패 처리", () => {
    it("[시나리오 11] lib/reward.grantReward throw → Server Action 도 throw (silent swallow 금지)", async () => {
      grantRewardImplMock.mockRejectedValue(new Error("DB connection lost"));

      await expect(grantRewardAction(VALID_INPUT)).rejects.toThrow("DB connection lost");

      // 위임 실패 시 revalidate 미호출 (실패한 mutation 의 cache 갱신은 의미 없음).
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });
});

// API-004 — grantReward() 계약. SRS §3.5, REQ-FUNC-024~025, REQ-NF-005.
// 구현 책임: FR-C-009 + lib/reward.ts (UPSERT 헬퍼).

import { z } from "zod";

export const RewardErrorCode = z.enum([
  "INVALID_INPUT",
  "USER_NOT_FOUND",
  "INTERNAL_ERROR",
]);
export type RewardErrorCode = z.infer<typeof RewardErrorCode>;

export const RewardTypeSchema = z.enum(["star", "tree", "drawing"]);
export type RewardType = z.infer<typeof RewardTypeSchema>;

export const RewardInputSchema = z.object({
  /// 인증 사용자 UUID 또는 무로그인 localStorage anonymous UUID.
  userId: z.string().uuid(),
  rewardType: RewardTypeSchema,
  /// 한 번에 최대 10개.
  amount: z.number().int().min(1).max(10),
  /// 멱등성 키 — 동일 키 재호출 시 wasSkipped=true 반환 (FR-C-009 책임).
  idempotencyKey: z.string().min(1).max(255),
});
export type RewardInput = z.infer<typeof RewardInputSchema>;

export const RewardOutputSchema = z.object({
  success: z.boolean(),
  cumulativeStars: z.number().int().min(0),
  treeGrowthLevel: z.number().int().min(0),
  aiDrawingCount: z.number().int().min(0),
  wasSkipped: z.boolean(),
});
export type RewardOutput = z.infer<typeof RewardOutputSchema>;

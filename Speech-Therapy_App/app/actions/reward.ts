"use server";

// FR-C-009 — grantReward Server Action.
// API-004 Zod 입력 검증 → lib/reward.ts grantReward 위임 (UPSERT + 멱등성).

import { grantReward as grantRewardImpl } from "@/lib/reward";
import { RewardInputSchema, type RewardOutput } from "@/lib/schemas/reward";

export async function grantReward(rawInput: unknown): Promise<RewardOutput> {
  const input = RewardInputSchema.parse(rawInput);
  return grantRewardImpl(input);
}

"use server";

// API-004 — grantReward() Server Action 시그니처 stub.
// 구현은 FR-C-009 책임. lib/reward.ts 헬퍼 (incrementStars 등) 활용.

import type { RewardInput, RewardOutput } from "@/lib/schemas/reward";
import { RewardInputSchema } from "@/lib/schemas/reward";

export async function grantReward(rawInput: unknown): Promise<RewardOutput> {
  const _input: RewardInput = RewardInputSchema.parse(rawInput);

  // FR-C-009 구현:
  //    - idempotencyKey 검증 (동일 키 재호출 → wasSkipped=true)
  //    - rewardType 별 lib/reward.ts 함수 호출
  //    - 응답 ≤ 500ms 보장 (REQ-NF-005)
  throw new Error("Not implemented — see FR-C-009");
}

// MOCK-002 (reward 부분) — 3종 (first / accumulated / skipped 멱등성).

import {
  RewardOutputSchema,
  type RewardOutput,
} from "@/lib/schemas/reward";
import { getMockBySearchParam, isMockEnabled } from "./utils";

export const mockFirstReward: RewardOutput = {
  success: true,
  cumulativeStars: 1,
  treeGrowthLevel: 0,
  aiDrawingCount: 0,
  wasSkipped: false,
};

export const mockAccumulated: RewardOutput = {
  success: true,
  cumulativeStars: 15,
  treeGrowthLevel: 1,
  aiDrawingCount: 0,
  wasSkipped: false,
};

export const mockSkipped: RewardOutput = {
  success: true,
  cumulativeStars: 15,
  treeGrowthLevel: 1,
  aiDrawingCount: 0,
  wasSkipped: true,
};

const VARIANTS = {
  first: mockFirstReward,
  accumulated: mockAccumulated,
  skipped: mockSkipped,
} as const;

export function getRewardMock(
  searchParams: URLSearchParams | { get(key: string): string | null },
): RewardOutput | null {
  if (!isMockEnabled("USE_MOCK_REWARD")) return null;
  return getMockBySearchParam(searchParams, "mock-reward", VARIANTS, mockFirstReward);
}

RewardOutputSchema.parse(mockFirstReward);
RewardOutputSchema.parse(mockAccumulated);
RewardOutputSchema.parse(mockSkipped);

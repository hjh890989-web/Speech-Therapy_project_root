// MOCK-002 (curriculum 부분) — 4종 시나리오 (continue, level_down, level_up, phoneme_switch).

import {
  CurriculumOutputSchema,
  type CurriculumOutput,
} from "@/lib/schemas/curriculum";
import { getMockBySearchParam, isMockEnabled } from "./utils";

const MISSION_ID_1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MISSION_ID_2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MISSION_ID_3 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const MISSION_ID_4 = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

export const mockContinue: CurriculumOutput = {
  recommendedMissionId: MISSION_ID_1,
  recommendedDifficulty: 2,
  reason: "continue",
  streakInfo: { successCount: 4, failureCount: 1 },
};

export const mockLevelDown: CurriculumOutput = {
  recommendedMissionId: MISSION_ID_2,
  recommendedDifficulty: 1,
  reason: "level_down",
  streakInfo: { successCount: 0, failureCount: 3 },
};

export const mockLevelUp: CurriculumOutput = {
  recommendedMissionId: MISSION_ID_3,
  recommendedDifficulty: 3,
  reason: "level_up",
  streakInfo: { successCount: 5, failureCount: 0 },
};

export const mockPhonemeSwitch: CurriculumOutput = {
  recommendedMissionId: MISSION_ID_4,
  recommendedDifficulty: 1,
  reason: "phoneme_switch",
  suggestedNextPhoneme: "ㅈ",
  streakInfo: { successCount: 5, failureCount: 0 },
};

const VARIANTS = {
  continue: mockContinue,
  "level-down": mockLevelDown,
  "level-up": mockLevelUp,
  "phoneme-switch": mockPhonemeSwitch,
} as const;

export function getCurriculumMock(
  searchParams: URLSearchParams | { get(key: string): string | null },
): CurriculumOutput | null {
  if (!isMockEnabled("USE_MOCK_CURRICULUM")) return null;
  return getMockBySearchParam(searchParams, "mock-curriculum", VARIANTS, mockContinue);
}

CurriculumOutputSchema.parse(mockContinue);
CurriculumOutputSchema.parse(mockLevelDown);
CurriculumOutputSchema.parse(mockLevelUp);
CurriculumOutputSchema.parse(mockPhonemeSwitch);

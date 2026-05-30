// MOCK-002 — 데일리 미션 30개 정적 픽스처 (음소 ㄱ ㄴ ㅅ ㅈ ㄹ × 6단계 임상 위계).
// DB-006 의 실제 시드와는 독립 (FE 선개발 전용). 콘텐츠 금칙어 0건.
// (2026-05-27 fix — ㄹ 누락 회귀 해소. 사용자 진단의 5 자모와 정합.)
// (REQ-FUNC-CL-05 — 난이도 1~3 → 6단계 임상 위계로 확장.
//  1 단독음소 → 2 음절 → 3 단어 → 4 구 → 5 문장 → 6 대화. CL-05-0 매핑.)

// 음소/slug/타이틀/id 는 mission-config.ts(단일 소스)에서 — seed.ts 와 구조적 정합.
import {
  MISSION_PHONEMES,
  MISSION_LEVELS,
  TITLE_BY_LEVEL,
  missionCardId,
} from "./mission-config";

export type MissionFixture = {
  id: string;
  targetPhoneme: string;
  difficultyLevel: number;
  title: string;
  instructionText: string;
  rewardType: "star" | "tree" | "drawing";
  ageRangeMin: number;
  ageRangeMax: number;
};

const REWARDS = ["star", "tree", "drawing"] as const;

export const dailyMissionFixtures: MissionFixture[] = MISSION_PHONEMES.flatMap((phoneme) =>
  MISSION_LEVELS.map((level) => ({
    id: missionCardId(phoneme, level),
    targetPhoneme: phoneme,
    difficultyLevel: level,
    title: `${phoneme} 소리 ${TITLE_BY_LEVEL[level]}`,
    instructionText: `${phoneme} 소리로 ${TITLE_BY_LEVEL[level]} 활동을 해보세요.`,
    rewardType: REWARDS[level % REWARDS.length],
    ageRangeMin: 24 + (level - 1) * 12,
    ageRangeMax: Math.min(36 + (level - 1) * 12, 84),
  })),
);

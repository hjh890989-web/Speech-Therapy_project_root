// MOCK-002 — 데일리 미션 12개 정적 픽스처 (음소 ㅅ ㅈ ㄱ ㄴ × 난이도 1~3).
// DB-006 의 실제 시드와는 독립 (FE 선개발 전용). 콘텐츠 금칙어 0건.

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

const PHONEMES = ["ㅅ", "ㅈ", "ㄱ", "ㄴ"] as const;
const REWARDS = ["star", "tree", "drawing"] as const;

const TITLE_BY_LEVEL: Record<number, string> = {
  1: "단어 따라하기",
  2: "단어 빈칸 채우기",
  3: "짧은 문장 만들기",
};

export const dailyMissionFixtures: MissionFixture[] = PHONEMES.flatMap((phoneme) =>
  [1, 2, 3].map((level) => ({
    id: `mock-${phoneme}-${level}`,
    targetPhoneme: phoneme,
    difficultyLevel: level,
    title: `${phoneme} 소리 ${TITLE_BY_LEVEL[level]}`,
    instructionText: `${phoneme} 소리가 들어간 단어로 ${TITLE_BY_LEVEL[level]} 활동을 해보세요.`,
    rewardType: REWARDS[level % REWARDS.length],
    ageRangeMin: 24 + (level - 1) * 12,
    ageRangeMax: Math.min(36 + (level - 1) * 12, 84),
  })),
);

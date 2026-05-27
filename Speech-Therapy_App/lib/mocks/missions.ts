// MOCK-002 — 데일리 미션 15개 정적 픽스처 (음소 ㄱ ㄴ ㅅ ㅈ ㄹ × 난이도 1~3).
// DB-006 의 실제 시드와는 독립 (FE 선개발 전용). 콘텐츠 금칙어 0건.
// (2026-05-27 fix — ㄹ 누락 회귀 해소. 사용자 진단의 5 자모와 정합.)

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

// 한국어 음운론 위계 순서 (seed.ts 와 일치): 파열음(ㄱ) → 비음(ㄴ) → 마찰음(ㅅ) → 파찰음(ㅈ) → 유음(ㄹ).
const PHONEMES = ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"] as const;

// 2026-05-27 fix — fixture id 의 한국어 자음 (예: `mock-ㅅ-2`) 이 URL path segment
// 로 들어갈 때 인코딩/디코딩 + unicode normalization 차이로 prod 의 dynamic route
// 매칭이 실패하는 회귀 발견. ASCII slug 로 변경하면 URL 호환성 + 라우팅 안정성 보장.
const PHONEME_SLUG: Record<(typeof PHONEMES)[number], string> = {
  "ㄱ": "g",
  "ㄴ": "n",
  "ㅅ": "s",
  "ㅈ": "j",
  "ㄹ": "l",
};
const REWARDS = ["star", "tree", "drawing"] as const;

const TITLE_BY_LEVEL: Record<number, string> = {
  1: "단어 따라하기",
  2: "단어 빈칸 채우기",
  3: "짧은 문장 만들기",
};

export const dailyMissionFixtures: MissionFixture[] = PHONEMES.flatMap((phoneme) =>
  [1, 2, 3].map((level) => ({
    // ASCII slug 사용 — URL path segment 안전 (2026-05-27 fix).
    id: `mock-${PHONEME_SLUG[phoneme]}-${level}`,
    targetPhoneme: phoneme,
    difficultyLevel: level,
    title: `${phoneme} 소리 ${TITLE_BY_LEVEL[level]}`,
    instructionText: `${phoneme} 소리가 들어간 단어로 ${TITLE_BY_LEVEL[level]} 활동을 해보세요.`,
    rewardType: REWARDS[level % REWARDS.length],
    ageRangeMin: 24 + (level - 1) * 12,
    ageRangeMax: Math.min(36 + (level - 1) * 12, 84),
  })),
);

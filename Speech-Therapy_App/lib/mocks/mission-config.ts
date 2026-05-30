// REQ-FUNC-CL-05 — 미션 6단계 위계 공유 설정 (단일 진실 소스).
//
// seed.ts / fixtures(missions.ts) / mission-content.ts 가 모두 본 모듈을 import →
// 3자 divergence(음소 목록 / slug / 타이틀 불일치) 구조적 차단.
// (감사 w07imwxde + FR-C-003 적대적 리뷰에서 2회 지적된 DRY/divergence 리스크 해소.)
//
// 순수 상수만 (prisma/런타임 의존 0) → seed.ts(tsx) 가 lib/db 우회한 채로도 import 안전.

export const MISSION_PHONEMES = ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"] as const;
export type MissionPhoneme = (typeof MISSION_PHONEMES)[number];

// ASCII slug — URL path segment 안전 (한글 자음 routing 회귀 회피, 2026-05-28).
// id 형식: mock-${PHONEME_SLUG[phoneme]}-${level}.
export const PHONEME_SLUG: Record<MissionPhoneme, string> = {
  "ㄱ": "g",
  "ㄴ": "n",
  "ㅅ": "s",
  "ㅈ": "j",
  "ㄹ": "l",
};

// 6단계 임상 위계 (CL-05-0): 단독음소 → 음절 → 단어 → 구 → 문장 → 대화.
export const TITLE_BY_LEVEL: Record<number, string> = {
  1: "소리 내기",
  2: "음절 따라하기",
  3: "단어 따라하기",
  4: "구 만들기",
  5: "짧은 문장 만들기",
  6: "대화 나누기",
};

export const MISSION_LEVELS = [1, 2, 3, 4, 5, 6] as const;

/// 결정적 카드 id (seed/fixtures 공용).
export function missionCardId(phoneme: MissionPhoneme, level: number): string {
  return `mock-${PHONEME_SLUG[phoneme]}-${level}`;
}

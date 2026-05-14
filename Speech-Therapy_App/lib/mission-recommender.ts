// FR-C-008 UI 통합 — 적응형 난이도 결정 → fixture 카드 매칭 + 격려 카피.
//
// 입력: decideRecommendation() 결과 + dailyMissionFixtures
// 출력: 추천 fixture + 사용자에게 보일 격려 카피 (REQ-FUNC-021 "은밀히, X표시 0회")
//
// 폴백 우선순위:
//   1. 정확 매칭 (phoneme + difficulty)
//   2. 같은 phoneme 의 가장 가까운 difficulty
//   3. 같은 difficulty 의 임의 phoneme
//   4. fixture 의 첫 번째

import type { MissionFixture } from "@/lib/mocks/missions";
import type { CurriculumOutput } from "@/lib/schemas/curriculum";

interface Decision {
  difficulty: number;
  phoneme: string;
  reason: CurriculumOutput["reason"];
  suggestedNextPhoneme?: string;
}

export interface MissionRecommendation {
  mission: MissionFixture;
  reason: Decision["reason"];
  /// 사용자에게 보일 카피. CON-04 의료/실패 어휘 금지.
  copy: string;
}

const REASON_COPY: Record<Decision["reason"], string> = {
  continue: "오늘의 추천",
  level_down: "조금 익숙한 발음부터 시작해볼까요?",
  level_up: "더 멋진 발음에 도전해볼까요?",
  phoneme_switch: "새로운 발음을 만나볼까요?",
};

export function pickRecommendedMission(
  decision: Decision,
  fixtures: ReadonlyArray<MissionFixture>,
): MissionRecommendation | null {
  if (fixtures.length === 0) return null;

  // 1. 정확 매칭.
  const exact = fixtures.find(
    (m) => m.targetPhoneme === decision.phoneme && m.difficultyLevel === decision.difficulty,
  );
  if (exact) return { mission: exact, reason: decision.reason, copy: REASON_COPY[decision.reason] };

  // 2. 같은 phoneme — 난이도 차이 최소.
  const samePhoneme = fixtures
    .filter((m) => m.targetPhoneme === decision.phoneme)
    .sort(
      (a, b) =>
        Math.abs(a.difficultyLevel - decision.difficulty) -
        Math.abs(b.difficultyLevel - decision.difficulty),
    );
  if (samePhoneme.length > 0) {
    return { mission: samePhoneme[0], reason: decision.reason, copy: REASON_COPY[decision.reason] };
  }

  // 3. 같은 difficulty — 임의 phoneme.
  const sameDifficulty = fixtures.find((m) => m.difficultyLevel === decision.difficulty);
  if (sameDifficulty) {
    return { mission: sameDifficulty, reason: decision.reason, copy: REASON_COPY[decision.reason] };
  }

  // 4. 마지막 폴백 — 첫 번째 fixture.
  return { mission: fixtures[0], reason: decision.reason, copy: REASON_COPY[decision.reason] };
}

/** 진단 세션 점수 → success boolean. 70 이상이면 success. */
export const SUCCESS_THRESHOLD = 70;

/** 음소 빈도 카운트 → 가장 자주 등장한 음소 반환. 동률 시 첫 번째. */
export function findMostFrequentPhoneme(phonemes: string[]): string | null {
  if (phonemes.length === 0) return null;
  const count = new Map<string, number>();
  for (const p of phonemes) count.set(p, (count.get(p) ?? 0) + 1);
  let top: { phoneme: string; n: number } | null = null;
  for (const [phoneme, n] of count.entries()) {
    if (top === null || n > top.n) top = { phoneme, n };
  }
  return top?.phoneme ?? null;
}

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

// === FR-Q-003 Scenario 5 — NO_MISSIONS_AVAILABLE 휴식 권유 ===

export interface RecentActivity {
  success: boolean;
  /// ISO 8601 datetime. SessionLog.startTime 등에서 변환.
  timestamp: string;
  targetPhoneme: string;
}

export interface RestRecommendation {
  rest: boolean;
  /// 휴식 권유 시 시도하지 않은 음소 1개 (variety encouragement). 모든 음소 시도면 undefined.
  alternativePhoneme?: string;
}

export interface ShouldRecommendRestOptions {
  /// 현재 시각 (테스트 주입용). 기본 Date.now().
  nowMs?: number;
  /// 활동 윈도우 (ms). 기본 4시간.
  windowMs?: number;
  /// 휴식 권유 임계 (윈도우 내 성공 세션 수). 기본 5.
  minSuccessful?: number;
  /// 후보 음소 풀. 기본 ㅅ/ㅈ/ㄱ/ㄴ/ㄹ.
  allPhonemes?: ReadonlyArray<string>;
}

const DEFAULT_PHONEMES = ["ㅅ", "ㅈ", "ㄱ", "ㄴ", "ㄹ"] as const;

/**
 * 휴식 권유 여부 판정. 윈도우 내 minSuccessful 회 이상 성공 시 rest=true.
 * REQ-FUNC-016 (Drop-off < 10%) 보완 — 단시간 과다 시도 방지.
 */
export function shouldRecommendRest(
  activity: ReadonlyArray<RecentActivity>,
  options: ShouldRecommendRestOptions = {},
): RestRecommendation {
  const {
    nowMs = Date.now(),
    windowMs = 4 * 60 * 60_000,
    minSuccessful = 5,
    allPhonemes = DEFAULT_PHONEMES,
  } = options;

  const cutoff = nowMs - windowMs;
  const recentSuccess = activity.filter((a) => {
    const t = new Date(a.timestamp).getTime();
    return Number.isFinite(t) && t >= cutoff && a.success;
  });

  if (recentSuccess.length < minSuccessful) return { rest: false };

  const attemptedPhonemes = new Set(recentSuccess.map((a) => a.targetPhoneme));
  const untried = allPhonemes.find((p) => !attemptedPhonemes.has(p));
  return { rest: true, alternativePhoneme: untried };
}

// FR-C-008 — 적응형 난이도 분석 + 미션 추천 로직.
//
// REQ-FUNC-021: 마지막 3연속 실패 → 난이도 -1 (은밀히), X표시 0회, 전환 < 0.5s
// REQ-FUNC-022: 마지막 5연속 성공 → 난이도 +1
// 추가: 동일 음소 5단계 마스터 → 다른 음소로 phoneme_switch
//
// 멱등성: 동일 입력 → 동일 출력 (시드 기반 결정적 미션 선택).

import { prisma } from "@/lib/db";
import type {
  CurriculumInput,
  CurriculumOutput,
  SessionResult,
} from "@/lib/schemas/curriculum";

const SUPPORTED_PHONEMES = ["ㅅ", "ㅈ", "ㄱ", "ㄴ", "ㄹ"] as const;
// REQ-FUNC-CL-05 — 6단계 임상 위계 (단독음소→음절→단어→구→문장→대화).
// phoneme_switch 는 MAX_DIFFICULTY 마스터 시 발동하므로 상수 변경만으로 level≥6 정합.
const MAX_DIFFICULTY = 6;
const MIN_DIFFICULTY = 1;
const FAILURE_STREAK_DOWN = 3;
const SUCCESS_STREAK_UP = 5;

export interface StreakInfo {
  successCount: number;
  failureCount: number;
  trailingFailures: number;
  trailingSuccesses: number;
  /// 가장 최근 세션의 난이도 (없으면 null → 신규 사용자).
  recentDifficulty: number | null;
  /// 가장 최근 세션의 음소 (없으면 null).
  recentPhoneme: string | null;
}

/**
 * recentSessions 를 시간 역순으로 정렬 후 streak 계산.
 *
 * 입력은 timestamp ISO 문자열 기준 sort (호출부 부담 없도록 본 함수가 정렬).
 */
export function analyzeStreaks(
  sessions: SessionResult[],
  recentDifficulty: number | null = null,
  recentPhoneme: string | null = null,
): StreakInfo {
  const sorted = [...sessions].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  let trailingFailures = 0;
  let trailingSuccesses = 0;
  let successCount = 0;
  let failureCount = 0;

  for (const session of sorted) {
    if (session.success) successCount += 1;
    else failureCount += 1;
  }

  for (const session of sorted) {
    if (session.success) break;
    trailingFailures += 1;
  }
  for (const session of sorted) {
    if (!session.success) break;
    trailingSuccesses += 1;
  }

  return {
    successCount,
    failureCount,
    trailingFailures,
    trailingSuccesses,
    recentDifficulty,
    recentPhoneme,
  };
}

/**
 * streak + 입력 정책 기반으로 다음 난이도/음소를 결정.
 *
 * 우선순위: phoneme_switch (5단계 마스터) > level_down (3연속 실패) > level_up (5연속 성공) > continue.
 */
export function decideRecommendation(
  streak: StreakInfo,
  defaultDifficulty: number,
  preferredPhoneme: (typeof SUPPORTED_PHONEMES)[number],
): {
  difficulty: number;
  phoneme: string;
  reason: CurriculumOutput["reason"];
  suggestedNextPhoneme?: string;
} {
  const currentLevel = streak.recentDifficulty ?? defaultDifficulty;

  // phoneme_switch: 동일 음소 + 5단계 + 마지막 세션 성공 (마스터 신호).
  if (
    streak.recentPhoneme === preferredPhoneme &&
    currentLevel >= MAX_DIFFICULTY &&
    streak.trailingSuccesses >= 1
  ) {
    const next = nextPhoneme(preferredPhoneme);
    return {
      difficulty: MIN_DIFFICULTY,
      phoneme: next,
      reason: "phoneme_switch",
      suggestedNextPhoneme: next,
    };
  }

  if (streak.trailingFailures >= FAILURE_STREAK_DOWN) {
    return {
      difficulty: Math.max(MIN_DIFFICULTY, currentLevel - 1),
      phoneme: preferredPhoneme,
      reason: "level_down",
    };
  }

  if (streak.trailingSuccesses >= SUCCESS_STREAK_UP) {
    return {
      difficulty: Math.min(MAX_DIFFICULTY, currentLevel + 1),
      phoneme: preferredPhoneme,
      reason: "level_up",
    };
  }

  return {
    difficulty: currentLevel,
    phoneme: preferredPhoneme,
    reason: "continue",
  };
}

function nextPhoneme(current: string): string {
  const idx = SUPPORTED_PHONEMES.indexOf(current as (typeof SUPPORTED_PHONEMES)[number]);
  if (idx === -1) return SUPPORTED_PHONEMES[0];
  return SUPPORTED_PHONEMES[(idx + 1) % SUPPORTED_PHONEMES.length];
}

/**
 * 시드 (userId + 세션 ID 모음) 기반 결정적 인덱스 선택.
 * 동일 입력 → 동일 출력 보장.
 */
function deterministicPick<T>(items: T[], seedSource: string): T {
  if (items.length === 0) throw new Error("deterministicPick: 빈 배열");
  let hash = 0;
  for (let i = 0; i < seedSource.length; i += 1) {
    hash = (hash * 31 + seedSource.charCodeAt(i)) >>> 0;
  }
  return items[hash % items.length];
}

export interface ResolveMissionDeps {
  findCandidates: (args: {
    phoneme: string;
    difficulty: number;
    ageMonths: number;
  }) => Promise<Array<{ id: string }>>;
}

/**
 * 결정 + DB (혹은 mock) 카탈로그 조회를 합쳐 최종 추천 미션 ID 를 산출.
 *
 * 후보 0건 시 NO_MISSIONS_AVAILABLE 신호 (호출부가 throw 책임).
 */
export async function resolveMission(
  input: CurriculumInput,
  decision: ReturnType<typeof decideRecommendation>,
  deps: ResolveMissionDeps,
): Promise<string | null> {
  const candidates = await deps.findCandidates({
    phoneme: decision.phoneme,
    difficulty: decision.difficulty,
    ageMonths: input.childAgeMonths,
  });
  if (candidates.length === 0) return null;
  const seed = `${input.userId}:${input.recentSessions.map((s) => s.sessionId).join(",")}`;
  return deterministicPick(candidates, seed).id;
}

/**
 * Prisma 기반 기본 deps — Server Action 에서 그대로 주입.
 */
export const prismaMissionDeps: ResolveMissionDeps = {
  async findCandidates({ phoneme, difficulty, ageMonths }) {
    return prisma.missionCard.findMany({
      where: {
        targetPhoneme: phoneme,
        difficultyLevel: difficulty,
        ageRangeMin: { lte: ageMonths },
        ageRangeMax: { gte: ageMonths },
      },
      select: { id: true },
    });
  },
};

export const __testConstants = {
  SUPPORTED_PHONEMES,
  MAX_DIFFICULTY,
  MIN_DIFFICULTY,
  FAILURE_STREAK_DOWN,
  SUCCESS_STREAK_UP,
};

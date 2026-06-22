// FR-C-LIT (CR-2026-009 / Phase 3b S2) — 받아쓰기·철자 채점 + 게이트 + 세션 구성.
//
// ⚠️ 활성 게이트 (literacy 선례 동일): 임상 해석/판정 밴드는 산출하지 않는다 — 학령기(S2~S4)는
//    Phase 2 규준검증상 출시가능 모집단 밴드 0건 → **연습(놀이)-only**. 영속은 raw 점수만(보정 X).
//    - LITERACY_SPELLING_ENABLED !== 'true' (default off) → UI 휴면("준비 중").
//    - 순수 함수(채점·세션)는 선배선 — 게이트 ON 시 즉시 작동 + 테스트 가능.
// 연령 게이트: 만 7~9세(84~119개월 = 초1~3) — 철자 발달 구간(S2, wiki 철자쓰기발달 S113/S160).
// 자기교정(SC): 첫 응답 오답이라도 3초 내 정답 교정 시 credit (음운인식 선례 재사용 — 단일 진실원).

import {
  SELF_CORRECTION_WINDOW_MS,
  isWithinSelfCorrectionWindow,
} from "./phonological-awareness";
import {
  SPELLING_ITEMS,
  SPELLING_RULES,
  type SpellingItem,
  type SpellingRule,
} from "./spelling-content";

// ----- 활성 플래그 (default off) -----
/// LITERACY_SPELLING_ENABLED === 'true' 일 때만 받아쓰기 놀이 활성.
export function isSpellingEnabled(): boolean {
  return process.env.LITERACY_SPELLING_ENABLED === "true";
}

// ----- 연령 게이트 (만 7~9세 = 초1~3) -----
export const SPELLING_AGE_MIN_MONTHS = 84; // 만 7세(초1)
export const SPELLING_AGE_MAX_MONTHS = 119; // 만 9세 11개월(초3)

/// 받아쓰기 놀이 연령 적격 여부 (S2 철자 발달 — 초1~3).
export function isSpellingAgeEligible(ageMonths: number): boolean {
  return (
    Number.isFinite(ageMonths) &&
    ageMonths >= SPELLING_AGE_MIN_MONTHS &&
    ageMonths <= SPELLING_AGE_MAX_MONTHS
  );
}

// ----- 채점 (0/1 + SC) -----
export interface SpellingAttempt {
  item: SpellingItem;
  /// 첫 응답(선택지).
  firstAnswer: string;
  /// 첫 응답이 오답일 때 그 뒤 교정한 응답(없으면 미교정).
  correctedAnswer?: string;
  /// 첫 오답 → 교정까지 경과(ms). SC 창 판정용(없으면 SC 불인정).
  selfCorrectionElapsedMs?: number;
}

export interface SpellingScore {
  /// 0 = 오답 / 1 = 정답(첫 응답 정답 또는 SC 창 내 교정).
  correct: 0 | 1;
  /// 첫 응답 오답 → SC 창 내 정답 교정으로 credit 된 경우 true.
  selfCorrected: boolean;
}

/// 단일 시도 채점 (결정적 순수 함수).
///  - 첫 응답 정답 → 1.
///  - 첫 응답 오답 + 3초 내 정답 교정 → 1 (selfCorrected).
///  - 그 외 → 0.
export function scoreSpellingAttempt(attempt: SpellingAttempt): SpellingScore {
  const { item, firstAnswer, correctedAnswer, selfCorrectionElapsedMs } = attempt;
  if (firstAnswer === item.answer) return { correct: 1, selfCorrected: false };
  if (
    correctedAnswer === item.answer &&
    selfCorrectionElapsedMs !== undefined &&
    isWithinSelfCorrectionWindow(selfCorrectionElapsedMs)
  ) {
    return { correct: 1, selfCorrected: true };
  }
  return { correct: 0, selfCorrected: false };
}

// ----- 세션 요약 -----
export interface SpellingSessionSummary {
  total: number;
  correct: number;
  selfCorrected: number;
}

/// 시도 배열 → 세션 요약 (결정적 순수 함수).
export function summarizeSpellingSession(
  scores: readonly SpellingScore[],
): SpellingSessionSummary {
  return {
    total: scores.length,
    correct: scores.filter((s) => s.correct === 1).length,
    selfCorrected: scores.filter((s) => s.selfCorrected).length,
  };
}

// ----- 세션 구성 -----
/// 규칙별 앞 N개를 난이도 위계 순(경음화→…→구개음화)으로 배치한 결정적 세션. UI 입력.
export function buildSpellingSession(perRule = 2): SpellingItem[] {
  return SPELLING_RULES.flatMap((rule: SpellingRule) =>
    SPELLING_ITEMS.filter((i) => i.rule === rule).slice(0, Math.max(0, perRule)),
  );
}

// SELF_CORRECTION_WINDOW_MS 재노출 (클라이언트가 단일 import 로 사용).
export { SELF_CORRECTION_WINDOW_MS };

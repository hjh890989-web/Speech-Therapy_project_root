// FR-C-LIT (CR-2026-009 / Phase 3b S4) — 형태소 인식 채점 + 게이트 + 세션.
//
// ⚠️ 연습-only: 임상 판정/참고밴드 미산출(Phase 2 검증). raw 정답수만 영속(referenceBand=null).
//    LITERACY_MORPHOLOGY_ENABLED default off → UI 휴면.
// 연령 게이트: 만 10~12세(120~144개월 = 초4~6) — 형태소 인식 발달 구간(S4, wiki S114/S115).
// 자기교정(SC): 첫 오답이라도 3초 내 정답 교정 시 credit(음운인식 선례 재사용 — 단일 진실원).

import {
  SELF_CORRECTION_WINDOW_MS,
  isWithinSelfCorrectionWindow,
} from "./phonological-awareness";
import {
  MORPH_ITEMS,
  MORPH_TYPES,
  type MorphItem,
  type MorphType,
} from "./morphology-content";

// ----- 활성 플래그 (default off) -----
export function isMorphologyEnabled(): boolean {
  return process.env.LITERACY_MORPHOLOGY_ENABLED === "true";
}

// ----- 연령 게이트 (만 10~12세 = 초4~6) -----
export const MORPHOLOGY_AGE_MIN_MONTHS = 120; // 만 10세(초4)
export const MORPHOLOGY_AGE_MAX_MONTHS = 144; // 만 12세(초6)

export function isMorphologyAgeEligible(ageMonths: number): boolean {
  return (
    Number.isFinite(ageMonths) &&
    ageMonths >= MORPHOLOGY_AGE_MIN_MONTHS &&
    ageMonths <= MORPHOLOGY_AGE_MAX_MONTHS
  );
}

// ----- 채점 (0/1 + SC) -----
export interface MorphAttempt {
  item: MorphItem;
  firstAnswer: string;
  correctedAnswer?: string;
  selfCorrectionElapsedMs?: number;
}

export interface MorphScore {
  correct: 0 | 1;
  selfCorrected: boolean;
}

/// 단일 시도 채점 (결정적 순수 함수). 첫 정답=1 / 첫 오답+3초내 교정=1(SC) / 그 외=0.
export function scoreMorphAttempt(attempt: MorphAttempt): MorphScore {
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
export interface MorphSessionSummary {
  total: number;
  correct: number;
  selfCorrected: number;
}

export function summarizeMorphologySession(
  scores: readonly MorphScore[],
): MorphSessionSummary {
  return {
    total: scores.length,
    correct: scores.filter((s) => s.correct === 1).length,
    selfCorrected: scores.filter((s) => s.selfCorrected).length,
  };
}

// ----- 세션 구성 -----
/// 유형별 앞 N개를 난이도 위계 순(합성→파생→분석)으로 배치한 결정적 세션. UI 입력.
export function buildMorphologySession(perType = 2): MorphItem[] {
  return MORPH_TYPES.flatMap((type: MorphType) =>
    MORPH_ITEMS.filter((i) => i.type === type).slice(0, Math.max(0, perType)),
  );
}

export { SELF_CORRECTION_WINDOW_MS };

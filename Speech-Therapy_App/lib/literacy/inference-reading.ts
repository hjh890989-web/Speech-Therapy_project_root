// FR-C-LIT (CR-2026-009 / Phase 3b S4) — 추론 독해 채점 + 게이트 + 세션.
//
// ⚠️ 연습-only: 임상 판정/참고밴드 미산출(Phase 2 검증). raw 정답수만 영속(referenceBand=null).
//    LITERACY_INFERENCE_READING_ENABLED default off → UI 휴면.
//    ※ 기존 LITERACY_INFERENCE_ENABLED(만5-7 가이드형)와 별개 플래그/슬러그.
// 연령 게이트: 만 11~12세(132~144개월 = 초5~6) — 추론 독해 구간(S4).
// 채점: 시간압박 없는 재읽기 모델(사실적 이해와 동일) — 첫 정답=1 / 재선택 정답=1 / 그 외=0.

import {
  INFERENCE_CARDS,
  type InferenceCard,
} from "./inference-reading-content";

// ----- 활성 플래그 (default off) -----
export function isInferenceReadingEnabled(): boolean {
  return process.env.LITERACY_INFERENCE_READING_ENABLED === "true";
}

// ----- 연령 게이트 (만 11~12세 = 초5~6) -----
export const INFERENCE_READING_AGE_MIN_MONTHS = 132; // 만 11세(초5)
export const INFERENCE_READING_AGE_MAX_MONTHS = 144; // 만 12세(초6)

export function isInferenceReadingAgeEligible(ageMonths: number): boolean {
  return (
    Number.isFinite(ageMonths) &&
    ageMonths >= INFERENCE_READING_AGE_MIN_MONTHS &&
    ageMonths <= INFERENCE_READING_AGE_MAX_MONTHS
  );
}

// ----- 채점 (0/1, 자유 재시도) -----
export interface InferenceAttempt {
  card: InferenceCard;
  firstAnswer: string;
  correctedAnswer?: string;
}

export interface InferenceScore {
  correct: 0 | 1;
  selfCorrected: boolean;
}

/// 단일 시도 채점 (결정적 순수 함수). 첫 정답=1 / 재선택 정답=1(selfCorrected) / 그 외=0.
export function scoreInferenceAttempt(attempt: InferenceAttempt): InferenceScore {
  const { card, firstAnswer, correctedAnswer } = attempt;
  if (firstAnswer === card.answer) return { correct: 1, selfCorrected: false };
  if (correctedAnswer === card.answer) return { correct: 1, selfCorrected: true };
  return { correct: 0, selfCorrected: false };
}

// ----- 세션 요약 -----
export interface InferenceSessionSummary {
  total: number;
  correct: number;
  selfCorrected: number;
}

export function summarizeInferenceReadingSession(
  scores: readonly InferenceScore[],
): InferenceSessionSummary {
  return {
    total: scores.length,
    correct: scores.filter((s) => s.correct === 1).length,
    selfCorrected: scores.filter((s) => s.selfCorrected).length,
  };
}

// ----- 세션 구성 -----
/// 전체 카드(지문 순서 → 문항 순서)를 결정적으로 반환. UI 입력.
export function buildInferenceReadingSession(): InferenceCard[] {
  return [...INFERENCE_CARDS];
}

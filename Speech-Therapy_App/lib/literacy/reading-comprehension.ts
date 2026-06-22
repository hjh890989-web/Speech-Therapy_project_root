// FR-C-LIT (CR-2026-009 / Phase 3b S3) — 사실적 읽기이해 채점 + 게이트 + 세션.
//
// ⚠️ 연습-only: 임상 판정/참고밴드 미산출(Phase 2 검증). raw 정답수만 영속(referenceBand=null).
//    LITERACY_COMPREHENSION_ENABLED default off → UI 휴면.
// 연령 게이트: 만 9~10세(108~131개월 = 초3~4) — 사실적 읽기이해 구간(S3).
// 채점: 시간압박 없는 재읽기 모델 — 첫 정답=1 / 첫 오답 후 재선택 정답=1(다시읽기) / 그 외=0.
//   (SC 3초 타이머 미적용: 사실적 이해는 look-back 권장 — 속도 아닌 이해가 핵심.)

import {
  COMPREHENSION_CARDS,
  type ComprehensionCard,
} from "./reading-comprehension-content";

// ----- 활성 플래그 (default off) -----
export function isComprehensionEnabled(): boolean {
  return process.env.LITERACY_COMPREHENSION_ENABLED === "true";
}

// ----- 연령 게이트 (만 9~10세 = 초3~4) -----
export const COMPREHENSION_AGE_MIN_MONTHS = 108; // 만 9세(초3)
export const COMPREHENSION_AGE_MAX_MONTHS = 131; // 만 10세 11개월(초4)

export function isComprehensionAgeEligible(ageMonths: number): boolean {
  return (
    Number.isFinite(ageMonths) &&
    ageMonths >= COMPREHENSION_AGE_MIN_MONTHS &&
    ageMonths <= COMPREHENSION_AGE_MAX_MONTHS
  );
}

// ----- 채점 (0/1, 자유 재시도) -----
export interface ComprehensionAttempt {
  card: ComprehensionCard;
  firstAnswer: string;
  /// 첫 응답 오답 시 재선택(다시 읽고). 시간 제한 없음.
  correctedAnswer?: string;
}

export interface ComprehensionScore {
  correct: 0 | 1;
  /// 첫 오답 → 재선택으로 맞힘.
  selfCorrected: boolean;
}

/// 단일 시도 채점 (결정적 순수 함수). 첫 정답=1 / 재선택 정답=1(selfCorrected) / 그 외=0.
export function scoreComprehensionAttempt(attempt: ComprehensionAttempt): ComprehensionScore {
  const { card, firstAnswer, correctedAnswer } = attempt;
  if (firstAnswer === card.answer) return { correct: 1, selfCorrected: false };
  if (correctedAnswer === card.answer) return { correct: 1, selfCorrected: true };
  return { correct: 0, selfCorrected: false };
}

// ----- 세션 요약 -----
export interface ComprehensionSessionSummary {
  total: number;
  correct: number;
  selfCorrected: number;
}

export function summarizeComprehensionSession(
  scores: readonly ComprehensionScore[],
): ComprehensionSessionSummary {
  return {
    total: scores.length,
    correct: scores.filter((s) => s.correct === 1).length,
    selfCorrected: scores.filter((s) => s.selfCorrected).length,
  };
}

// ----- 세션 구성 -----
/// 전체 카드(지문 순서 → 문항 순서)를 결정적으로 반환. UI 입력.
export function buildComprehensionSession(): ComprehensionCard[] {
  return [...COMPREHENSION_CARDS];
}

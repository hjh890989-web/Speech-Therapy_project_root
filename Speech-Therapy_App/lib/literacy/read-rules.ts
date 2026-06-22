// FR-C-LIT (CR-2026-009 / Phase 3b S2) — 소리 규칙 읽기(해독) 채점 + 게이트 + 세션.
//
// ⚠️ 연습-only: 임상 판정/참고밴드 미산출(Phase 2 규준검증상 출시가능 모집단 밴드 0건).
//    영속은 raw 점수만(referenceBand=null). LITERACY_READ_RULES_ENABLED default off → UI 휴면.
// 연령 게이트: 만 7~9세(84~119개월 = 초1~3) — 해독(불일치형 음운규칙) 발달 구간(S2).
// 자기교정(SC): 첫 오답이라도 3초 내 정답 교정 시 credit(음운인식 선례 재사용 — 단일 진실원).

import {
  SELF_CORRECTION_WINDOW_MS,
  isWithinSelfCorrectionWindow,
} from "./phonological-awareness";
import {
  READ_RULE_ITEMS,
  READ_RULES,
  type ReadRuleItem,
  type ReadRule,
} from "./read-rules-content";

// ----- 활성 플래그 (default off) -----
export function isReadRulesEnabled(): boolean {
  return process.env.LITERACY_READ_RULES_ENABLED === "true";
}

// ----- 연령 게이트 (만 7~9세 = 초1~3) -----
export const READ_RULES_AGE_MIN_MONTHS = 84; // 만 7세(초1)
export const READ_RULES_AGE_MAX_MONTHS = 119; // 만 9세 11개월(초3)

export function isReadRulesAgeEligible(ageMonths: number): boolean {
  return (
    Number.isFinite(ageMonths) &&
    ageMonths >= READ_RULES_AGE_MIN_MONTHS &&
    ageMonths <= READ_RULES_AGE_MAX_MONTHS
  );
}

// ----- 채점 (0/1 + SC) -----
export interface ReadRuleAttempt {
  item: ReadRuleItem;
  firstAnswer: string;
  correctedAnswer?: string;
  selfCorrectionElapsedMs?: number;
}

export interface ReadRuleScore {
  correct: 0 | 1;
  selfCorrected: boolean;
}

/// 단일 시도 채점 (결정적 순수 함수). 첫 정답=1 / 첫 오답+3초내 교정=1(SC) / 그 외=0.
export function scoreReadRuleAttempt(attempt: ReadRuleAttempt): ReadRuleScore {
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
export interface ReadRuleSessionSummary {
  total: number;
  correct: number;
  selfCorrected: number;
}

export function summarizeReadRulesSession(
  scores: readonly ReadRuleScore[],
): ReadRuleSessionSummary {
  return {
    total: scores.length,
    correct: scores.filter((s) => s.correct === 1).length,
    selfCorrected: scores.filter((s) => s.selfCorrected).length,
  };
}

// ----- 세션 구성 -----
/// 규칙별 앞 N개를 난이도 위계 순으로 배치한 결정적 세션. UI 입력.
export function buildReadRulesSession(perRule = 2): ReadRuleItem[] {
  return READ_RULES.flatMap((rule: ReadRule) =>
    READ_RULE_ITEMS.filter((i) => i.rule === rule).slice(0, Math.max(0, perRule)),
  );
}

export { SELF_CORRECTION_WINDOW_MS };

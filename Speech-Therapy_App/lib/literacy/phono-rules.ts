// 소리 변신 놀이(phono-rules) — 활성 플래그 + 연령 게이트 + 세션/보기 구성 (CR-2026-007 후속).
//
// ⚠️ 활성 게이트 (음운인식/추론/F15 선례): 임상 해석·영속·연동은 KOPLAC 자문 통과 전까지 비활성.
//    LITERACY_PHONO_RULES_ENABLED !== 'true' (default off) → UI 휴면("준비 중").
// 연령 게이트: 만 2~7세 — 어휘 놀이와 공통 상수 재사용(vocabulary.ts).
//
// **연습/유도만 — 점수·정상규준·위험 판정 산출 X.** 글자 → 자연스러운 소리 알아맞히기(음운변동 인식).

import {
  CLINICAL_PLAY_AGE_MIN_MONTHS,
  CLINICAL_PLAY_AGE_MAX_MONTHS,
} from "./vocabulary";
import {
  PHONO_RULES,
  phonoItemsByRule,
  type PhonoRuleItem,
} from "./phono-rules-content";

// ----- 활성 플래그 (default off) -----
/// LITERACY_PHONO_RULES_ENABLED === 'true' 일 때만 소리 변신 놀이 활성. KOPLAC 게이트.
export function isPhonoRulesEnabled(): boolean {
  return process.env.LITERACY_PHONO_RULES_ENABLED === "true";
}

// ----- 연령 게이트 (만 2~7세, 임상 놀이 공통) -----
/// 소리 변신 놀이 연령 적격 여부 (만 2~7세만).
export function isPhonoRulesAgeEligible(ageMonths: number): boolean {
  return (
    Number.isFinite(ageMonths) &&
    ageMonths >= CLINICAL_PLAY_AGE_MIN_MONTHS &&
    ageMonths <= CLINICAL_PLAY_AGE_MAX_MONTHS
  );
}

// ----- 세션 구성 (결정적 순수 함수, 채점 X) -----
/// 규칙 순서대로 각 규칙 앞 N개를 이어붙인 결정적 세션. UI 입력용.
export function buildPhonoRulesSession(perRule = 2): PhonoRuleItem[] {
  const n = Math.max(0, perRule);
  return PHONO_RULES.flatMap((r) => phonoItemsByRule(r).slice(0, n));
}

export interface PhonoChoice {
  text: string;
  /// 자연스러운 소리(정답)인지. 채점엔 미사용 — 정답 표시/단서용.
  natural: boolean;
}

/// 보기 2개(자연스러운 소리 / 글자 그대로) 구성. 정답이 항상 같은 자리에 오지 않도록
///  index 짝수=정답 먼저, 홀수=보기 먼저(결정적). 채점 X — 함께 고르기 유도.
export function buildPhonoChoices(item: PhonoRuleItem, index = 0): PhonoChoice[] {
  const natural: PhonoChoice = { text: item.spoken, natural: true };
  const literal: PhonoChoice = { text: item.literal, natural: false };
  return index % 2 === 0 ? [natural, literal] : [literal, natural];
}

// FR-C-LIT-02 (CR-2026-007) — F4 음운변동 제품화: 탐지된 단일 변동을 부모용 발음 패턴 안내로 합성.
//
// ⚠️ display-only — 점수/HITL/escalation/저장은 raw 불변(app/actions/diagnosis.ts). 본 모듈은
//    detectVariation(CL-04)·classifyError(CL-02) — 둘 다 결정적 순수 함수 — 를 합성해 결과 페이지가
//    음소별 오류 유형(음소 핀셋)을 부모 친화 톤으로 표시하게 한다. 채점 신호 0줄 수정.
//    표시는 intended/heard 단어쌍에서 재계산하므로 errorPattern DB 저장과 무관(저장은 주간 트렌드
//    FR-Q-LIT-02 용 별도 CR).
//
// ADR-04 / CON-04: 금칙어("치료"/"진단"/"장애"/"지연"/"지체") 0건 — 분류를 부모 친화 격려 톤으로 치환.
//
// 근거: wiki product/concepts/F1a-F4-임상설계-reference §2.B(해독→음운변동) + clinical/concepts/조음장애.

import { detectVariation, getVariationType } from "./phonological-variation";
import { classifyError, type ErrorClassification, type ErrorPattern } from "./developmental";

export interface ErrorPatternAnalysis {
  /// 단일 ErrorPattern 키 (taxonomy).
  pattern: ErrorPattern;
  /// 변동 라벨 (예: "마찰음 파열음화"). 금칙어 0.
  label: string;
  /// 변동 예시 (예: "사자 → 타자").
  example: string;
  /// 발달 분류 (developmental / developmental_delayed / atypical).
  classification: ErrorClassification;
  /// 변동이 진단 대상 음소(targetPhoneme) 슬롯에서 일어났는가. 초성 변동만 의미 — 종성 변동은 undefined.
  onTargetSlot?: boolean;
  /// 부모 친화 안내 (ADR-04 치환 톤, 금칙어 0).
  parentNote: string;
  /// 격려 이모지.
  emoji: string;
}

/// 분류별 부모 친화 안내 — 금칙어("치료"/"진단"/"장애"/"지연"/"지체") 0건.
/// detectVariation 이 반환하는 7종은 모두 developmental → 실사용은 앞 두 분기. atypical 은 방어용.
const PARENT_NOTE: Record<ErrorClassification, { note: string; emoji: string }> = {
  developmental: {
    note: "이 또래에서 흔히 거치는 발음 단계예요. 미션으로 자연스럽게 또렷해질 수 있어요.",
    emoji: "🌱",
  },
  developmental_delayed: {
    note: "조금 더 연습하면 또렷해질 발음이에요. 미션으로 함께 해봐요.",
    emoji: "👍",
  },
  atypical: {
    note: "또박또박 함께 연습해 보면 좋은 발음이에요.",
    emoji: "🌟",
  },
};

/**
 * FR-C-LIT-02 — 의도/실현 단어쌍에서 단일 음운 변동을 탐지해 부모용 발음 패턴 분석으로 합성.
 *
 * detectVariation(CL-04, 단일 변동 우선 — 복합/일치/비한글/미정의 atypical 시 null) 미탐지면 null →
 * 결과 페이지는 분석 블록 미표시(보수적, 회귀 0). classification 은 classifyError(CL-02, 음소×연령).
 * onTargetSlot 은 초성 변동에서만 의미(intendedJamo == targetPhoneme); 종성 변동은 undefined.
 *
 * 결정적 순수 함수. **점수/HITL/escalation/저장에 미사용** — 결과 페이지 표시(음소 핀셋) 전용.
 */
export function analyzeErrorPattern(
  intendedWord: string,
  heardWord: string,
  targetPhoneme: string,
  ageMonths: number,
): ErrorPatternAnalysis | null {
  const variation = detectVariation(intendedWord, heardWord);
  if (!variation) return null;
  const type = getVariationType(variation.pattern);
  if (!type) return null; // 방어 — taxonomy 단일화로 도달 안 함.
  const classification = classifyError(variation.pattern, ageMonths);
  const { note, emoji } = PARENT_NOTE[classification];
  return {
    pattern: variation.pattern,
    label: type.label,
    example: type.example,
    classification,
    onTargetSlot:
      variation.slot === "cho" ? variation.intendedJamo === targetPhoneme : undefined,
    parentNote: note,
    emoji,
  };
}

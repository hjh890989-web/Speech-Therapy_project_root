// MOCK-LIT-PHONO (CR-2026-007 후속 / 음운변동 규칙) — 소리 변신 아이템 (자체 제작).
//
// ⚠️ 저작권·원본성 (OPS-LIT-01):
//   낱말·발음 표기는 **자체 작성**이며 어떤 표준화 검사의 문항·규준을 인용·복제하지 않는다.
//   한국어 일상 낱말의 표준 발음 변동(연음·경음화·ㅎ탈락·비음화)만 사용. 출시 전 원본성 검토.
//
// 임상 구인 (외부 wiki 근거 — ../Speech_Therapy_Wiki/my-healthcare-workbase/wiki/):
//   음운변동(phonological process) 규칙 인식 — 글자와 실제 소리의 차이를 알아채는 상위언어 놀이.
//   sources: S003·S087·S162 (음운규칙 위계 지도·연음규칙). concept: 음운규칙 · 음운인식 · 상위언어능력.
//   **유도/연습만 — 평가·채점·정상규준 산출 X.** 글자 → 자연스러운 소리 알아맞히기.
//
// CON-04: 자녀 친화 + 의료/진단/장애 금칙어 0건. 만 2~7세 (부모가 함께 읽어 주며).

export type PhonoRule = "liaison" | "tensification" | "hDeletion" | "nasalization";

/// 규칙 노출 순서 (결정적).
export const PHONO_RULES: readonly PhonoRule[] = [
  "liaison",
  "tensification",
  "hDeletion",
  "nasalization",
];

/// 규칙 라벨 (부모/아이용 — 금칙어 0).
export const PHONO_RULE_LABEL: Record<PhonoRule, string> = {
  liaison: "이어지는 소리",
  tensification: "된소리",
  hDeletion: "ㅎ이 숨는 소리",
  nasalization: "콧소리로 바뀌는 소리",
};

export interface PhonoRuleItem {
  id: string;
  rule: PhonoRule;
  /// 글자 그대로의 표기.
  written: string;
  /// 자연스럽게 읽을 때 나는 소리(정답).
  spoken: string;
  /// 글자 그대로 또박또박 읽은 소리(자연스럽지 않은 보기).
  literal: string;
}

// 자체 작성 — 규칙별 2개씩(총 8). 일상 낱말의 표준 발음.
export const PHONO_RULE_ITEMS: readonly PhonoRuleItem[] = [
  // 연음(이어지는 소리)
  { id: "pr-li-1", rule: "liaison", written: "손에", spoken: "소네", literal: "손에" },
  { id: "pr-li-2", rule: "liaison", written: "밥을", spoken: "바블", literal: "밥을" },
  // 경음화(된소리)
  { id: "pr-te-1", rule: "tensification", written: "학교", spoken: "학꾜", literal: "학교" },
  { id: "pr-te-2", rule: "tensification", written: "책상", spoken: "책쌍", literal: "책상" },
  // ㅎ탈락
  { id: "pr-hd-1", rule: "hDeletion", written: "좋아", spoken: "조아", literal: "좋아" },
  { id: "pr-hd-2", rule: "hDeletion", written: "놓아", spoken: "노아", literal: "놓아" },
  // 비음화(콧소리)
  { id: "pr-na-1", rule: "nasalization", written: "국물", spoken: "궁물", literal: "국물" },
  { id: "pr-na-2", rule: "nasalization", written: "밥만", spoken: "밤만", literal: "밥만" },
];

/// 특정 규칙의 아이템 (입력 순서 보존, 결정적).
export function phonoItemsByRule(rule: PhonoRule): PhonoRuleItem[] {
  return PHONO_RULE_ITEMS.filter((i) => i.rule === rule);
}

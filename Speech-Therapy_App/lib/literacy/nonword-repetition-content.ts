// MOCK-LIT-NWR (CR-2026-007 후속 / 음운 작업기억) — 비단어 따라말하기 아이템 (자체 제작).
//
// ⚠️ 저작권·원본성 (OPS-LIT-01):
//   비단어(무의미 음절열)는 **자체 작성**이며 어떤 표준화 검사(예: 비단어 따라말하기 검사)의
//   문항·규준을 인용·복제하지 않는다. 실재 단어가 아닌 무의미 음절만 사용. 출시 전 원본성 검토.
//
// 임상 구인 (외부 wiki 근거 — ../Speech_Therapy_Wiki/my-healthcare-workbase/wiki/):
//   음운 작업기억(phonological working memory) — 비단어 따라말하기로 음운 단기기억 부하 연습.
//   sources: S017·S022·S133 (작업기억 훈련·음운기억). concept: 작업기억 · 음운인식.
//   **유도/연습만 — 평가·채점·정상규준 산출 X.** 음절 길이를 점진적으로 늘리는 따라말하기.
//
// CON-04: 의료/진단/장애 금칙어 0건. 만 2~7세 (부모가 들려주고 아이가 따라 말함).

export interface NonwordItem {
  id: string;
  /// 무의미 음절열(자체 작성, 실재 단어 아님).
  syllables: string;
  /// 음절 수(난이도 = 작업기억 부하).
  length: number;
}

/// 난이도 = 음절 수 위계 (짧은→긴, 결정적).
export const NONWORD_LENGTHS: readonly number[] = [2, 3, 4, 5];

// 자체 작성 무의미 음절열 — 길이별 5/5/4/3개. 실재 단어 회피 위해 저빈도 음절 조합.
export const NONWORD_ITEMS: readonly NonwordItem[] = [
  // 2음절
  { id: "nw-2-1", syllables: "푸디", length: 2 },
  { id: "nw-2-2", syllables: "보마", length: 2 },
  { id: "nw-2-3", syllables: "너토", length: 2 },
  { id: "nw-2-4", syllables: "리구", length: 2 },
  { id: "nw-2-5", syllables: "새모", length: 2 },
  // 3음절
  { id: "nw-3-1", syllables: "푸디보", length: 3 },
  { id: "nw-3-2", syllables: "마너토", length: 3 },
  { id: "nw-3-3", syllables: "리구새", length: 3 },
  { id: "nw-3-4", syllables: "보디마", length: 3 },
  { id: "nw-3-5", syllables: "토리푸", length: 3 },
  // 4음절
  { id: "nw-4-1", syllables: "푸디보마", length: 4 },
  { id: "nw-4-2", syllables: "너토리구", length: 4 },
  { id: "nw-4-3", syllables: "새모보디", length: 4 },
  { id: "nw-4-4", syllables: "마토리푸", length: 4 },
  // 5음절
  { id: "nw-5-1", syllables: "푸디보마너", length: 5 },
  { id: "nw-5-2", syllables: "토리구새모", length: 5 },
  { id: "nw-5-3", syllables: "보디마토리", length: 5 },
];

/// 특정 음절 길이의 아이템 (입력 순서 보존, 결정적).
export function nonwordItemsByLength(length: number): NonwordItem[] {
  return NONWORD_ITEMS.filter((i) => i.length === length);
}

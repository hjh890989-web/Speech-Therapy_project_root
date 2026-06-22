// MOCK-LIT-VOCAB (CR-2026-007 후속 / 어휘 연습) — 어휘 놀이 아이템 (자체 제작).
//
// ⚠️ 저작권·원본성 (OPS-LIT-01):
//   단어·범주·그림(이모지)은 **자체 작성**이며 REVT 등 표준화 어휘검사의 문항·그림·규준을
//   인용·복제하지 않는다. 일상 고빈도 명사만 사용. 상업 출시 전 원본성 법률검토.
//
// 임상 구인 (외부 wiki 근거 — ../Speech_Therapy_Wiki/my-healthcare-workbase/wiki/):
//   집중적 자극(focused stimulation) + fast mapping 기반 어휘 노출/명명/범주화 연습.
//   sources: S070·S071 (언어발달장애 Rhea Paul — 어휘중재 원리). concept: 어휘.
//   **유도(elicitation)·연습만 — 평가/채점/정상규준 산출 X** (inference·F15 철학 계승).
//
// CON-04: 자녀 친화 + 의료/진단/장애 금칙어 0건. 만 2~7세.

export type VocabCategory = "animal" | "food" | "vehicle" | "object";

/// 범주 순서 (놀이 노출 순서 — 결정적).
export const VOCAB_CATEGORIES: readonly VocabCategory[] = [
  "animal",
  "food",
  "vehicle",
  "object",
];

/// 범주 라벨 (부모/아이용 — 금칙어 0).
export const VOCAB_CATEGORY_LABEL: Record<VocabCategory, string> = {
  animal: "동물",
  food: "음식",
  vehicle: "탈것",
  object: "물건",
};

export interface VocabItem {
  id: string;
  /// 일상 고빈도 명사(자체 작성).
  word: string;
  /// 그림 대체 이모지(자체 선택 — 검사 그림 미복제).
  emoji: string;
  category: VocabCategory;
}

// 자체 작성 어휘 풀 — 범주별 6개씩(총 24). 만 2~7세 고빈도 명사.
export const VOCAB_ITEMS: readonly VocabItem[] = [
  // 동물
  { id: "v-an-1", word: "강아지", emoji: "🐶", category: "animal" },
  { id: "v-an-2", word: "고양이", emoji: "🐱", category: "animal" },
  { id: "v-an-3", word: "토끼", emoji: "🐰", category: "animal" },
  { id: "v-an-4", word: "곰", emoji: "🐻", category: "animal" },
  { id: "v-an-5", word: "사자", emoji: "🦁", category: "animal" },
  { id: "v-an-6", word: "코끼리", emoji: "🐘", category: "animal" },
  // 음식
  { id: "v-fo-1", word: "사과", emoji: "🍎", category: "food" },
  { id: "v-fo-2", word: "바나나", emoji: "🍌", category: "food" },
  { id: "v-fo-3", word: "빵", emoji: "🍞", category: "food" },
  { id: "v-fo-4", word: "우유", emoji: "🥛", category: "food" },
  { id: "v-fo-5", word: "딸기", emoji: "🍓", category: "food" },
  { id: "v-fo-6", word: "당근", emoji: "🥕", category: "food" },
  // 탈것
  { id: "v-ve-1", word: "자동차", emoji: "🚗", category: "vehicle" },
  { id: "v-ve-2", word: "버스", emoji: "🚌", category: "vehicle" },
  { id: "v-ve-3", word: "기차", emoji: "🚆", category: "vehicle" },
  { id: "v-ve-4", word: "비행기", emoji: "✈️", category: "vehicle" },
  { id: "v-ve-5", word: "배", emoji: "🚢", category: "vehicle" },
  { id: "v-ve-6", word: "자전거", emoji: "🚲", category: "vehicle" },
  // 물건
  { id: "v-ob-1", word: "공", emoji: "⚽", category: "object" },
  { id: "v-ob-2", word: "책", emoji: "📖", category: "object" },
  { id: "v-ob-3", word: "시계", emoji: "⏰", category: "object" },
  { id: "v-ob-4", word: "우산", emoji: "☂️", category: "object" },
  { id: "v-ob-5", word: "의자", emoji: "🪑", category: "object" },
  { id: "v-ob-6", word: "신발", emoji: "👟", category: "object" },
];

/// 특정 범주의 아이템 (입력 순서 보존, 결정적).
export function vocabItemsByCategory(category: VocabCategory): VocabItem[] {
  return VOCAB_ITEMS.filter((i) => i.category === category);
}

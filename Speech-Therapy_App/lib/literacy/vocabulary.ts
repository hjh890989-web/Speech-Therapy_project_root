// 어휘 연습(vocabulary) — 활성 플래그 + 연령 게이트 + 세션 구성 (CR-2026-007 후속).
//
// ⚠️ 활성 게이트 (음운인식/추론/F15 선례): 임상 해석·영속·F1-a/F4 연동은 KOPLAC 자문 통과
//    전까지 비활성. LITERACY_VOCAB_ENABLED !== 'true' (default off) → UI 휴면("준비 중").
//    본 모듈 순수 함수(세션 구성)는 선배선 — 게이트 ON 시 즉시 작동 + 테스트 가능.
// 연령 게이트: 만 2~7세(24~84개월) — 어휘 놀이는 음운인식(만 5-7)보다 이른 연령 포함.
//
// **연습/유도만 — 점수·정상규준·위험 판정 산출 X.** 집중적 자극/fast mapping 노출·명명·범주화 놀이.

import {
  VOCAB_CATEGORIES,
  VOCAB_ITEMS,
  vocabItemsByCategory,
  type VocabCategory,
  type VocabItem,
} from "./vocabulary-content";

// ----- 활성 플래그 (default off) -----
/// LITERACY_VOCAB_ENABLED === 'true' 일 때만 어휘 놀이 활성. KOPLAC 게이트.
export function isVocabEnabled(): boolean {
  return process.env.LITERACY_VOCAB_ENABLED === "true";
}

// ----- 연령 게이트 (만 2~7세) -----
/// 임상 '놀이' 게임 공통 하한(만 2세 = 24개월). 어휘/작업기억/이야기 재사용.
export const CLINICAL_PLAY_AGE_MIN_MONTHS = 24; // 만 2세
export const CLINICAL_PLAY_AGE_MAX_MONTHS = 84; // 만 7세 0개월 (앱 진단 childAgeMonths 상한)

/// 어휘 놀이 연령 적격 여부 (만 2~7세만).
export function isVocabAgeEligible(ageMonths: number): boolean {
  return (
    Number.isFinite(ageMonths) &&
    ageMonths >= CLINICAL_PLAY_AGE_MIN_MONTHS &&
    ageMonths <= CLINICAL_PLAY_AGE_MAX_MONTHS
  );
}

// ----- 세션 구성 (결정적 순수 함수, 채점 X) -----
/// 범주 순서대로 각 범주 앞 N개를 이어붙인 결정적 명명 세션. UI 입력용.
export function buildVocabNamingSession(perCategory = 3): VocabItem[] {
  const n = Math.max(0, perCategory);
  return VOCAB_CATEGORIES.flatMap((c: VocabCategory) =>
    vocabItemsByCategory(c).slice(0, n),
  );
}

export interface VocabSortingRound {
  /// 정답 범주 1개.
  target: VocabCategory;
  /// 보기(섞이지 않은 결정적 순서) — target 범주 1개 + 다른 범주 distractor.
  choices: VocabItem[];
}

/// 범주 분류 놀이 라운드 구성 (결정적). 각 범주를 target 으로 1라운드씩.
///  choices = 해당 범주 첫 아이템 + 다음 두 범주의 첫 아이템(보기). 채점 X — 함께 고르기 유도.
export function buildVocabSortingRounds(): VocabSortingRound[] {
  const cats = VOCAB_CATEGORIES;
  return cats.map((target, i) => {
    const correct = vocabItemsByCategory(target)[0];
    const d1 = vocabItemsByCategory(cats[(i + 1) % cats.length])[0];
    const d2 = vocabItemsByCategory(cats[(i + 2) % cats.length])[0];
    return { target, choices: [correct, d1, d2] };
  });
}

export { VOCAB_ITEMS };

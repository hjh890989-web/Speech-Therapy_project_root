// 어휘 놀이(vocabulary) 단위 테스트 — 콘텐츠 무결성 + 원본성/금칙어 + 연령/플래그 + 세션 결정성.
// 연습 활동(채점 없음) — 세션 구성 순수 함수의 결정성만 검증.

import { describe, it, expect, afterEach } from "vitest";
import {
  VOCAB_ITEMS,
  VOCAB_CATEGORIES,
  VOCAB_CATEGORY_LABEL,
  vocabItemsByCategory,
} from "@/lib/literacy/vocabulary-content";
import {
  isVocabEnabled,
  isVocabAgeEligible,
  buildVocabNamingSession,
  buildVocabSortingRounds,
  CLINICAL_PLAY_AGE_MIN_MONTHS,
  CLINICAL_PLAY_AGE_MAX_MONTHS,
} from "@/lib/literacy/vocabulary";

const BANNED = [
  "NISE", "기초학습", "학습장애", "난독", "B·ACT", "BACT", "REVT",
  "치료", "진단", "장애", "지연", "지체",
];

describe("MOCK-LIT-VOCAB — 어휘 콘텐츠 무결성", () => {
  it("아이템 ≥12, id 유일, 모든 필드 채움", () => {
    expect(VOCAB_ITEMS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(VOCAB_ITEMS.map((i) => i.id)).size).toBe(VOCAB_ITEMS.length);
    for (const i of VOCAB_ITEMS) {
      expect(i.word.length).toBeGreaterThan(0);
      expect(i.emoji.length).toBeGreaterThan(0);
      expect(VOCAB_CATEGORIES).toContain(i.category);
    }
  });

  it("모든 범주에 라벨 + 아이템 ≥3 보유", () => {
    for (const c of VOCAB_CATEGORIES) {
      expect(VOCAB_CATEGORY_LABEL[c].length).toBeGreaterThan(0);
      expect(vocabItemsByCategory(c).length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("원본성·금칙어 lint (콘텐츠)", () => {
  it("단어·범주 라벨에 표준화 검사/난독 + 의료 금칙어 0건", () => {
    const corpus = [
      ...VOCAB_ITEMS.map((i) => i.word),
      ...Object.values(VOCAB_CATEGORY_LABEL),
    ].join(" ");
    for (const w of BANNED) expect(corpus, `금칙어 "${w}"`).not.toContain(w);
  });
});

describe("세션 구성 (결정적 순수 함수, 채점 없음)", () => {
  it("buildVocabNamingSession — 결정적 + 범주별 perCategory 개수", () => {
    expect(buildVocabNamingSession()).toEqual(buildVocabNamingSession());
    const s = buildVocabNamingSession(2);
    expect(s.length).toBe(VOCAB_CATEGORIES.length * 2);
    for (const c of VOCAB_CATEGORIES) {
      expect(s.filter((i) => i.category === c).length).toBe(2);
    }
  });

  it("buildVocabNamingSession(0) → 빈 세션", () => {
    expect(buildVocabNamingSession(0)).toEqual([]);
  });

  it("buildVocabSortingRounds — 범주당 1라운드, target 포함 + distractor 타범주", () => {
    const rounds = buildVocabSortingRounds();
    expect(rounds).toEqual(buildVocabSortingRounds());
    expect(rounds.length).toBe(VOCAB_CATEGORIES.length);
    for (const r of rounds) {
      const correct = r.choices.filter((c) => c.category === r.target);
      expect(correct.length).toBe(1);
      expect(r.choices.length).toBeGreaterThanOrEqual(2);
      // distractor 는 target 과 다른 범주
      expect(r.choices.some((c) => c.category !== r.target)).toBe(true);
    }
  });
});

describe("연령 게이트 / 플래그", () => {
  it("연령 — 만 2~7세(24~84) 적격, 경계 밖 부적격", () => {
    expect(isVocabAgeEligible(CLINICAL_PLAY_AGE_MIN_MONTHS)).toBe(true);
    expect(isVocabAgeEligible(CLINICAL_PLAY_AGE_MAX_MONTHS)).toBe(true);
    expect(isVocabAgeEligible(CLINICAL_PLAY_AGE_MIN_MONTHS - 1)).toBe(false);
    expect(isVocabAgeEligible(CLINICAL_PLAY_AGE_MAX_MONTHS + 1)).toBe(false);
    expect(isVocabAgeEligible(Number.NaN)).toBe(false);
  });

  const original = process.env.LITERACY_VOCAB_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.LITERACY_VOCAB_ENABLED;
    else process.env.LITERACY_VOCAB_ENABLED = original;
  });

  it("플래그 — 미설정 off, 'true' on", () => {
    delete process.env.LITERACY_VOCAB_ENABLED;
    expect(isVocabEnabled()).toBe(false);
    process.env.LITERACY_VOCAB_ENABLED = "true";
    expect(isVocabEnabled()).toBe(true);
  });
});

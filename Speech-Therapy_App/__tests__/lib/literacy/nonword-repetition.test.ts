// 비단어 따라말하기(nonword-repetition) 단위 테스트 — 콘텐츠 무결성 + 원본성/금칙어 + 연령/플래그 + 세션.
// 연습 활동(채점 없음) — 세션 구성 순수 함수의 결정성·길이 위계만 검증.

import { describe, it, expect, afterEach } from "vitest";
import {
  NONWORD_ITEMS,
  NONWORD_LENGTHS,
  nonwordItemsByLength,
} from "@/lib/literacy/nonword-repetition-content";
import {
  isNwrEnabled,
  isNwrAgeEligible,
  buildNwrSession,
} from "@/lib/literacy/nonword-repetition";
import {
  CLINICAL_PLAY_AGE_MIN_MONTHS,
  CLINICAL_PLAY_AGE_MAX_MONTHS,
} from "@/lib/literacy/vocabulary";

const BANNED = [
  "NISE", "기초학습", "학습장애", "난독", "B·ACT", "BACT",
  "치료", "진단", "장애", "지연", "지체",
];

describe("MOCK-LIT-NWR — 비단어 콘텐츠 무결성", () => {
  it("아이템 ≥12, id 유일, 음절 수 = 표기 length", () => {
    expect(NONWORD_ITEMS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(NONWORD_ITEMS.map((i) => i.id)).size).toBe(NONWORD_ITEMS.length);
    for (const i of NONWORD_ITEMS) {
      expect([...i.syllables].length).toBe(i.length);
      expect(NONWORD_LENGTHS).toContain(i.length);
    }
  });

  it("음절 길이 위계 오름차순 + 각 길이 아이템 ≥3", () => {
    expect([...NONWORD_LENGTHS]).toEqual([...NONWORD_LENGTHS].sort((a, b) => a - b));
    for (const len of NONWORD_LENGTHS) {
      expect(nonwordItemsByLength(len).length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("원본성·금칙어 lint (콘텐츠)", () => {
  it("음절열에 표준화 검사/난독 + 의료 금칙어 0건", () => {
    const corpus = NONWORD_ITEMS.map((i) => i.syllables).join(" ");
    for (const w of BANNED) expect(corpus, `금칙어 "${w}"`).not.toContain(w);
  });
});

describe("세션 구성 (결정적 순수 함수, 채점 없음)", () => {
  it("buildNwrSession — 결정적 + 길이별 perLength 개수 + 짧은→긴 순서", () => {
    expect(buildNwrSession()).toEqual(buildNwrSession());
    const s = buildNwrSession(2);
    expect(s.length).toBe(NONWORD_LENGTHS.length * 2);
    for (const len of NONWORD_LENGTHS) {
      expect(s.filter((i) => i.length === len).length).toBe(2);
    }
    // 길이가 비감소(오름차순 위계 유지)
    const lens = s.map((i) => i.length);
    expect(lens).toEqual([...lens].sort((a, b) => a - b));
  });

  it("buildNwrSession(0) → 빈 세션", () => {
    expect(buildNwrSession(0)).toEqual([]);
  });
});

describe("연령 게이트 / 플래그", () => {
  it("연령 — 만 2~7세(24~84) 적격, 경계 밖 부적격", () => {
    expect(isNwrAgeEligible(CLINICAL_PLAY_AGE_MIN_MONTHS)).toBe(true);
    expect(isNwrAgeEligible(CLINICAL_PLAY_AGE_MAX_MONTHS)).toBe(true);
    expect(isNwrAgeEligible(CLINICAL_PLAY_AGE_MIN_MONTHS - 1)).toBe(false);
    expect(isNwrAgeEligible(CLINICAL_PLAY_AGE_MAX_MONTHS + 1)).toBe(false);
    expect(isNwrAgeEligible(Number.NaN)).toBe(false);
  });

  const original = process.env.LITERACY_NWR_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.LITERACY_NWR_ENABLED;
    else process.env.LITERACY_NWR_ENABLED = original;
  });

  it("플래그 — 미설정 off, 'true' on", () => {
    delete process.env.LITERACY_NWR_ENABLED;
    expect(isNwrEnabled()).toBe(false);
    process.env.LITERACY_NWR_ENABLED = "true";
    expect(isNwrEnabled()).toBe(true);
  });
});

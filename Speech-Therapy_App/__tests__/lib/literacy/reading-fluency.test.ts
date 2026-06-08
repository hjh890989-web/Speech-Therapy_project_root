// FR-C-LIT-01 / MOCK-LIT-03 (CR-2026-007 / CL-10) — 읽기 유창성 미니게임 단위 테스트.
// 지문 무결성 + 읽기 속도 측정 + 원본성/금칙어 + 연령(만 6-7세)/플래그.

import { describe, it, expect, afterEach } from "vitest";
import { countHangulSyllables } from "@/lib/phonetic-similarity";
import {
  FLUENCY_PASSAGES,
  PASSAGE_TYPE_LABEL,
  pickFluencyPassage,
} from "@/lib/literacy/reading-fluency-content";
import {
  computeFluencyResult,
  formatFluencySeconds,
  isFluencyAgeEligible,
  isFluencyEnabled,
  FLUENCY_AGE_MIN_MONTHS,
  FLUENCY_AGE_MAX_MONTHS,
} from "@/lib/literacy/reading-fluency";

describe("MOCK-LIT-03 — 읽기 유창성 지문", () => {
  it("지문 ≥4, id 유일, 음절 수 = countHangulSyllables", () => {
    expect(FLUENCY_PASSAGES.length).toBeGreaterThanOrEqual(4);
    expect(new Set(FLUENCY_PASSAGES.map((p) => p.id)).size).toBe(FLUENCY_PASSAGES.length);
    for (const p of FLUENCY_PASSAGES) {
      expect(p.syllableCount).toBe(countHangulSyllables(p.text));
      expect(p.syllableCount).toBeGreaterThan(0);
    }
  });

  it("레벨 1·2 존재, pickFluencyPassage 결정적", () => {
    expect(FLUENCY_PASSAGES.some((p) => p.level === 1)).toBe(true);
    expect(FLUENCY_PASSAGES.some((p) => p.level === 2)).toBe(true);
    expect(pickFluencyPassage(1)).toEqual(pickFluencyPassage(1));
    expect(pickFluencyPassage(1).level).toBe(1);
  });
});

describe("원본성·금칙어 lint (CL-12 / ADR-04)", () => {
  it("표준화 검사/난독/학습장애 + 의료 금칙어 0건", () => {
    const banned = [
      "NISE", "기초학습", "학습장애", "난독", "B·ACT", "BACT",
      "치료", "진단", "장애", "지연", "지체",
    ];
    const corpus = [
      ...FLUENCY_PASSAGES.map((p) => p.text),
      ...Object.values(PASSAGE_TYPE_LABEL),
    ].join(" ");
    for (const w of banned) expect(corpus).not.toContain(w);
  });
});

describe("FR-C-LIT-01 — computeFluencyResult (완독시간 → 읽기 속도)", () => {
  it("30음절 30초 → 60음절/분", () => {
    expect(computeFluencyResult(30, 30_000)).toEqual({
      syllableCount: 30,
      elapsedMs: 30_000,
      syllablesPerMin: 60,
    });
  });

  it("50음절 60초 → 50음절/분", () => {
    expect(computeFluencyResult(50, 60_000).syllablesPerMin).toBe(50);
  });

  it("elapsed 0 → 속도 0 (0 나눗셈 방지)", () => {
    expect(computeFluencyResult(30, 0).syllablesPerMin).toBe(0);
  });

  it("음수 입력 방어 → clamp 0", () => {
    expect(computeFluencyResult(-5, -100)).toMatchObject({ syllableCount: 0, elapsedMs: 0 });
  });

  it("formatFluencySeconds — 소수점 1자리", () => {
    expect(formatFluencySeconds(12_345)).toBe("12.3");
  });
});

describe("연령 게이트 (만 6-7세) / 플래그", () => {
  it("연령 — 72~84(만 6-7세) 적격, 만 5세/그 외 부적격", () => {
    expect(isFluencyAgeEligible(FLUENCY_AGE_MIN_MONTHS)).toBe(true); // 72
    expect(isFluencyAgeEligible(FLUENCY_AGE_MAX_MONTHS)).toBe(true); // 84
    expect(isFluencyAgeEligible(60)).toBe(false); // 만 5세 — 해독 선행 전
    expect(isFluencyAgeEligible(71)).toBe(false);
    expect(isFluencyAgeEligible(85)).toBe(false);
    expect(isFluencyAgeEligible(Number.NaN)).toBe(false);
  });

  const original = process.env.LITERACY_FLUENCY_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.LITERACY_FLUENCY_ENABLED;
    else process.env.LITERACY_FLUENCY_ENABLED = original;
  });

  it("플래그 — 미설정 off, 'true' on", () => {
    delete process.env.LITERACY_FLUENCY_ENABLED;
    expect(isFluencyEnabled()).toBe(false);
    process.env.LITERACY_FLUENCY_ENABLED = "true";
    expect(isFluencyEnabled()).toBe(true);
  });
});

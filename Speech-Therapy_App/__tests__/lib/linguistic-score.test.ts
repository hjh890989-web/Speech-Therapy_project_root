// Sprint 3 §1 — linguistic 점수 (음절 일치도) 단위 테스트.

import { describe, it, expect } from "vitest";
import { computeLinguisticScore } from "@/lib/linguistic-score";

describe("computeLinguisticScore", () => {
  it("의도 = 발화 → 100", () => {
    expect(computeLinguisticScore("사과", "사과")).toBe(100);
  });

  it("음절 수 동일하지만 다른 단어 → 100 (어휘 단위 완성)", () => {
    expect(computeLinguisticScore("사과", "수갑")).toBe(100);
    expect(computeLinguisticScore("학교", "야구")).toBe(100);
  });

  it("의도 2음절 vs 발화 1음절 → 50", () => {
    expect(computeLinguisticScore("사과", "사")).toBe(50);
  });

  it("의도 4음절 vs 발화 2음절 → 50", () => {
    expect(computeLinguisticScore("어린이집", "어린")).toBe(50);
  });

  it("발화 빈 문자열 → 0", () => {
    expect(computeLinguisticScore("사과", "")).toBe(0);
  });

  it("의도 빈 문자열 → 0", () => {
    expect(computeLinguisticScore("", "사과")).toBe(0);
  });

  it("발화에 한글 음절이 전혀 없으면 → 0", () => {
    expect(computeLinguisticScore("사과", "abc")).toBe(0);
    expect(computeLinguisticScore("사과", "...")).toBe(0);
  });
});

describe("Sprint 3 §2 C — STT confidence 결합", () => {
  it("confidence=undefined (기존 데이터) → 음절 일치만 (100%) — 기존 동작 유지", () => {
    expect(computeLinguisticScore("사과", "사과")).toBe(100);
    expect(computeLinguisticScore("사과", "사", undefined)).toBe(50);
  });

  it("confidence=null → 음절 일치만 — jsdom / 미지원 환경 동등 처리", () => {
    expect(computeLinguisticScore("사과", "사과", null)).toBe(100);
    expect(computeLinguisticScore("사과", "사", null)).toBe(50);
  });

  it("confidence=1.0 + 음절 100% → 100", () => {
    expect(computeLinguisticScore("사과", "사과", 1.0)).toBe(100);
  });

  it("confidence=0.5 + 음절 100% → 75 (50% syllable + 50% confidence)", () => {
    expect(computeLinguisticScore("사과", "사과", 0.5)).toBe(75);
  });

  it("confidence=1.0 + 음절 50% → 75", () => {
    expect(computeLinguisticScore("사과", "사", 1.0)).toBe(75);
  });

  it("confidence=0.0 + 음절 100% → 50 (음절만 반영)", () => {
    expect(computeLinguisticScore("사과", "사과", 0.0)).toBe(50);
  });

  it("confidence > 1.0 (잘못된 입력) → clamp 후 1.0 으로 처리", () => {
    expect(computeLinguisticScore("사과", "사과", 5.0)).toBe(100);
  });

  it("confidence < 0 (잘못된 입력) → clamp 후 0 으로 처리", () => {
    expect(computeLinguisticScore("사과", "사과", -0.5)).toBe(50);
  });

  it("confidence=NaN → 무시 + 음절 일치만 (defensive)", () => {
    expect(computeLinguisticScore("사과", "사과", Number.NaN)).toBe(100);
  });

  it("빈 발화는 confidence 무관 → 0", () => {
    expect(computeLinguisticScore("사과", "", 1.0)).toBe(0);
  });
});

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

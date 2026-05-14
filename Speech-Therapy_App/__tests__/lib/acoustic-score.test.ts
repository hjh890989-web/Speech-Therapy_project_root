// Sprint 3 §1 — acoustic 점수 (길이 합리성 + 명료성) 단위 테스트.

import { describe, it, expect } from "vitest";
import { computeAcousticScore } from "@/lib/acoustic-score";

describe("computeAcousticScore", () => {
  it("의도 = 발화 (한글) → 100 (길이 1.0 + 명료성 1.0)", () => {
    expect(computeAcousticScore("사과", "사과")).toBe(100);
  });

  it("자모 수 동일 + 모두 한글 → 100", () => {
    // "사과" 4자모 vs "수갑" 4자모 (ㅅㅜㄱㅏㅂ = 5, ㅅㅏㄱㅘ=4) — 자모 수 다를 수 있음.
    // "사과": ㅅㅏㄱㅘ → 4 자모. "수갑": ㅅㅜㄱㅏㅂ → 5 자모. lengthRatio = 4/5 = 0.8
    // clarity = 1.0 → score = 0.5*0.8 + 0.5*1.0 = 0.9 → 90.
    expect(computeAcousticScore("사과", "수갑")).toBe(90);
  });

  it("발화가 의도 절반 길이 → ~50 (길이 0.5 + 명료성 1.0 = 75 / 0.5*0.5+0.5*1=0.75)", () => {
    // "사과" 4자모 vs "사" 2자모 → lengthRatio = 0.5, clarity = 1.0 → 0.75 → 75.
    expect(computeAcousticScore("사과", "사")).toBe(75);
  });

  it("발화에 영문 섞이면 명료성 감점", () => {
    // "사과" 4자모 vs "사a" 3자모 → lengthRatio = 0.75
    // hangulChars = 1 ("사"), meaningfulChars = 2 ("사", "a") → clarity = 0.5
    // score = 0.5 * 0.75 + 0.5 * 0.5 = 0.375 + 0.25 = 0.625 → 63.
    expect(computeAcousticScore("사과", "사a")).toBe(63);
  });

  it("발화 빈 문자열 → 0", () => {
    expect(computeAcousticScore("사과", "")).toBe(0);
  });

  it("의도 빈 문자열 → 0", () => {
    expect(computeAcousticScore("", "사과")).toBe(0);
  });

  it("발화가 모두 영문/기호 → 명료성 0 + 길이만 반영", () => {
    // "사과" 4자모 vs "abc" 3자모 → lengthRatio = 0.75, clarity = 0
    // score = 0.5*0.75 + 0.5*0 = 0.375 → 38.
    expect(computeAcousticScore("사과", "abc")).toBe(38);
  });
});

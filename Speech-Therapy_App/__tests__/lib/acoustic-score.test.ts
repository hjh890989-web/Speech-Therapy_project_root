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

describe("Sprint 3 §2 A — 신호 기반 점수 (Web Audio API features 우선)", () => {
  // "사과" = 2 음절 → expectedDuration = 0.8s.
  // 적정 features: duration ≈ 0.8s, pitchStd 안정, energy 적정.

  it("적정 신호 (duration·pitch·energy 모두 적정) → 100", () => {
    const score = computeAcousticScore("사과", "사과", {
      pitchMean: 220,
      pitchStd: 20,
      durationSec: 0.8,
      energy: 0.2,
    });
    expect(score).toBe(100);
  });

  it("너무 짧은 발화 (duration 0.2s) → duration 점수만 감점", () => {
    // ratio 0.25 → durationScore = 50, pitch 100, energy 100.
    // total = 0.5*50 + 0.3*100 + 0.2*100 = 25 + 30 + 20 = 75.
    const score = computeAcousticScore("사과", "사과", {
      pitchMean: 220,
      pitchStd: 20,
      durationSec: 0.2,
      energy: 0.2,
    });
    expect(score).toBe(75);
  });

  it("pitch 불안정 (std 150+) → pitch 점수 0", () => {
    // duration 100, pitch 0, energy 100.
    // total = 0.5*100 + 0.3*0 + 0.2*100 = 70.
    const score = computeAcousticScore("사과", "사과", {
      pitchMean: 220,
      pitchStd: 200,
      durationSec: 0.8,
      energy: 0.2,
    });
    expect(score).toBe(70);
  });

  it("무음 수준 energy → energy 점수 0", () => {
    // duration 100, pitch 100, energy 0.
    // total = 0.5*100 + 0.3*100 + 0.2*0 = 80.
    const score = computeAcousticScore("사과", "사과", {
      pitchMean: 220,
      pitchStd: 20,
      durationSec: 0.8,
      energy: 0.001,
    });
    expect(score).toBe(80);
  });

  it("features 가 모두 null → 텍스트 프록시 폴백", () => {
    const score = computeAcousticScore("사과", "사과", {
      pitchMean: null,
      pitchStd: null,
      durationSec: null,
      energy: null,
    });
    expect(score).toBe(100); // 프록시 — 의도 = 발화 → 100.
  });

  it("features=null → 텍스트 프록시 폴백 (인자 자체 미전달과 동일)", () => {
    expect(computeAcousticScore("사과", "사과", null)).toBe(100);
  });

  it("durationSec 만 있고 energy null → 신호 신뢰 불가, 프록시 폴백", () => {
    // durationSec 만 있어도 energy 가 null 이면 무음 가능성 → 프록시 사용.
    expect(
      computeAcousticScore("사과", "사과", {
        pitchMean: null,
        pitchStd: null,
        durationSec: 0.8,
        energy: null,
      }),
    ).toBe(100); // 프록시 → 100.
  });
});

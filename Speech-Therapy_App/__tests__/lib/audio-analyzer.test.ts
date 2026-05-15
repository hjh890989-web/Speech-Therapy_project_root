// Sprint 3 §2 A — Web Audio API analyzer 단위 테스트.
// helper math 함수 + 미지원 환경 분기 검증. 실제 AudioContext 동작은 e2e/manual 영역.

import { describe, it, expect } from "vitest";

import { isAudioAnalysisSupported, mean, stddev } from "@/lib/audio/analyzer";

describe("mean", () => {
  it("빈 배열 → 0", () => {
    expect(mean([])).toBe(0);
  });

  it("단일 값", () => {
    expect(mean([5])).toBe(5);
  });

  it("정수 배열", () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  it("부동소수", () => {
    expect(mean([1.5, 2.5, 3.5])).toBeCloseTo(2.5);
  });
});

describe("stddev", () => {
  it("길이 1 → 0", () => {
    expect(stddev([42])).toBe(0);
  });

  it("빈 배열 → 0", () => {
    expect(stddev([])).toBe(0);
  });

  it("동일 값 → 0", () => {
    expect(stddev([5, 5, 5, 5])).toBe(0);
  });

  it("표본 표준편차 (n-1 보정)", () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] 의 표본 표준편차 ≈ 2.138
    const result = stddev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(2.138, 2);
  });
});

describe("isAudioAnalysisSupported (jsdom 환경)", () => {
  it("jsdom 에는 AudioContext 가 없어 false 반환", () => {
    // jsdom 은 navigator.mediaDevices.getUserMedia 와 AudioContext 미구현.
    // 본 테스트는 hook 의 graceful fallback 검증.
    expect(isAudioAnalysisSupported()).toBe(false);
  });
});

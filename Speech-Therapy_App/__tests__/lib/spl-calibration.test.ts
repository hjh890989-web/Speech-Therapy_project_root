// REQ-FUNC-007 잔여 (#106) — spl-calibration helper 단위 테스트.
//
// 시나리오 (총 10건):
//   1) getCalibrationOffset() 초기 (미저장) → DEFAULT_OFFSET (100)
//   2) setCalibrationOffset(120) → localStorage 저장 + getCalibrationOffset() 일치
//   3) resetCalibrationOffset() → DEFAULT_OFFSET 복귀 + hasCalibration() false
//   4) hasCalibration() 토글 — 저장 전 false, 저장 후 true, reset 후 false
//   5) setCalibrationOffset(NaN) → 거부 (반환 false, 저장 안 됨)
//   6) setCalibrationOffset(-10) → 거부 (60 미만)
//   7) setCalibrationOffset(200) → 거부 (140 초과)
//   8) setCalibrationOffset(60) → 경계값 허용
//   9) setCalibrationOffset(140) → 경계값 허용
//  10) localStorage 에 손상된 값 ("abc") 직접 주입 → getCalibrationOffset() DEFAULT 폴백
//
// 추가 SSR 안전 시나리오 (window 미존재 시 throw 없이 DEFAULT 반환) 는 별도 isolate 모듈로
// 검증 — happy-dom 환경에선 window 가 항상 존재하므로 코드 경로만 review (검증 11번 항목).

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_OFFSET,
  MAX_OFFSET,
  MIN_OFFSET,
  STORAGE_KEY,
  getCalibrationOffset,
  hasCalibration,
  resetCalibrationOffset,
  setCalibrationOffset,
} from "@/lib/audio/spl-calibration";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("spl-calibration helper — REQ-FUNC-007 #106", () => {
  it("getCalibrationOffset() 초기 → DEFAULT_OFFSET", () => {
    expect(getCalibrationOffset()).toBe(DEFAULT_OFFSET);
    expect(DEFAULT_OFFSET).toBe(100);
  });

  it("setCalibrationOffset(120) → localStorage 저장 + get 일치", () => {
    const ok = setCalibrationOffset(120);
    expect(ok).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("120");
    expect(getCalibrationOffset()).toBe(120);
  });

  it("resetCalibrationOffset() → DEFAULT 복귀 + hasCalibration false", () => {
    setCalibrationOffset(115);
    expect(hasCalibration()).toBe(true);

    resetCalibrationOffset();

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(getCalibrationOffset()).toBe(DEFAULT_OFFSET);
    expect(hasCalibration()).toBe(false);
  });

  it("hasCalibration() 토글 — 저장/리셋 사이클", () => {
    expect(hasCalibration()).toBe(false);
    setCalibrationOffset(110);
    expect(hasCalibration()).toBe(true);
    resetCalibrationOffset();
    expect(hasCalibration()).toBe(false);
  });

  it("setCalibrationOffset(NaN) → 거부 (저장 안 됨)", () => {
    const ok = setCalibrationOffset(NaN);
    expect(ok).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(getCalibrationOffset()).toBe(DEFAULT_OFFSET);
  });

  it("setCalibrationOffset(-10) → 범위 외 거부", () => {
    const ok = setCalibrationOffset(-10);
    expect(ok).toBe(false);
    expect(hasCalibration()).toBe(false);
  });

  it("setCalibrationOffset(200) → 범위 외 거부 (MAX 초과)", () => {
    const ok = setCalibrationOffset(200);
    expect(ok).toBe(false);
    expect(hasCalibration()).toBe(false);
  });

  it("setCalibrationOffset(MIN_OFFSET=60) → 경계값 허용", () => {
    const ok = setCalibrationOffset(MIN_OFFSET);
    expect(ok).toBe(true);
    expect(getCalibrationOffset()).toBe(60);
  });

  it("setCalibrationOffset(MAX_OFFSET=140) → 경계값 허용", () => {
    const ok = setCalibrationOffset(MAX_OFFSET);
    expect(ok).toBe(true);
    expect(getCalibrationOffset()).toBe(140);
  });

  it("손상된 localStorage 값 ('abc') → getCalibrationOffset() DEFAULT 폴백 + hasCalibration false", () => {
    // 직접 주입 (set 가드 우회) — 외부 도구로 손상된 값 가정.
    window.localStorage.setItem(STORAGE_KEY, "abc");
    expect(getCalibrationOffset()).toBe(DEFAULT_OFFSET);
    expect(hasCalibration()).toBe(false);
  });

  it("Infinity 거부 + 범위 외 numeric ('500') 도 DEFAULT 폴백", () => {
    expect(setCalibrationOffset(Infinity)).toBe(false);
    window.localStorage.setItem(STORAGE_KEY, "500");
    expect(getCalibrationOffset()).toBe(DEFAULT_OFFSET);
    expect(hasCalibration()).toBe(false);
  });

  it("setCalibrationOffset(110) → 두 번째 호출이 첫 값 덮어쓰기", () => {
    setCalibrationOffset(110);
    expect(getCalibrationOffset()).toBe(110);
    setCalibrationOffset(95);
    expect(getCalibrationOffset()).toBe(95);
  });
});

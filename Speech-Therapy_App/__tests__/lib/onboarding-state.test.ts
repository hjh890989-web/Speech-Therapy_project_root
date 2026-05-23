// FR-C-PARENT-ONBOARDING — lib/onboarding/state localStorage helper 단위 테스트.
//
// 검증 시나리오 (총 9건):
//   1) 초기 상태 — 모두 default (completed=false, skipped=false, currentStep=1)
//   2) setOnboardingStep — 범위 안 값 정상 저장
//   3) setOnboardingStep — 범위 초과 (5) → MAX_STEP 로 clamp
//   4) setOnboardingStep — NaN → 거부 (false) + 저장 없음
//   5) markOnboardingCompleted → completed=true + currentStep=MAX_STEP
//   6) markOnboardingSkipped → skipped=true
//   7) resetOnboardingState → 모든 키 제거 → default 복귀
//   8) SSR 안전 — typeof window === "undefined" 분기 (vi.stubGlobal 로 시뮬레이션)
//   9) 손상된 step 값 ("abc") → MIN_STEP 폴백
//
// CON-04 금칙어 ("치료/진단/장애") 검증 — 본 모듈의 코드 / 카피 / 키 명에 0건.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  MAX_STEP,
  MIN_STEP,
  STORAGE_KEY_COMPLETED,
  STORAGE_KEY_SKIPPED,
  STORAGE_KEY_STEP,
  getOnboardingState,
  markOnboardingCompleted,
  markOnboardingSkipped,
  resetOnboardingState,
  setOnboardingStep,
} from "@/lib/onboarding/state";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("lib/onboarding/state — FR-C-PARENT-ONBOARDING", () => {
  it("초기 상태 — 모두 default 반환", () => {
    const state = getOnboardingState();
    expect(state.completed).toBe(false);
    expect(state.skipped).toBe(false);
    expect(state.currentStep).toBe(MIN_STEP);
  });

  it("setOnboardingStep — 범위 안 값 (3) 정상 저장 + 후속 read 반영", () => {
    const ok = setOnboardingStep(3);
    expect(ok).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY_STEP)).toBe("3");
    expect(getOnboardingState().currentStep).toBe(3);
  });

  it("setOnboardingStep — 범위 초과 (99) → MAX_STEP 으로 clamp 저장", () => {
    const ok = setOnboardingStep(99);
    expect(ok).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY_STEP)).toBe(String(MAX_STEP));
    expect(getOnboardingState().currentStep).toBe(MAX_STEP);
  });

  it("setOnboardingStep — NaN 거부 (false) + 저장 없음", () => {
    const ok = setOnboardingStep(Number.NaN);
    expect(ok).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY_STEP)).toBeNull();
  });

  it("markOnboardingCompleted → completed=true + currentStep=MAX_STEP", () => {
    markOnboardingCompleted();
    expect(window.localStorage.getItem(STORAGE_KEY_COMPLETED)).toBe("true");
    expect(window.localStorage.getItem(STORAGE_KEY_STEP)).toBe(String(MAX_STEP));
    const state = getOnboardingState();
    expect(state.completed).toBe(true);
    expect(state.currentStep).toBe(MAX_STEP);
  });

  it("markOnboardingSkipped → skipped=true + completed 영향 없음", () => {
    markOnboardingSkipped();
    expect(window.localStorage.getItem(STORAGE_KEY_SKIPPED)).toBe("true");
    const state = getOnboardingState();
    expect(state.skipped).toBe(true);
    expect(state.completed).toBe(false);
  });

  it("resetOnboardingState — 모든 키 제거 → default 복귀", () => {
    markOnboardingCompleted();
    markOnboardingSkipped();
    setOnboardingStep(3);
    resetOnboardingState();
    expect(window.localStorage.getItem(STORAGE_KEY_COMPLETED)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY_SKIPPED)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY_STEP)).toBeNull();
    const state = getOnboardingState();
    expect(state.completed).toBe(false);
    expect(state.skipped).toBe(false);
    expect(state.currentStep).toBe(MIN_STEP);
  });

  it("SSR 안전 — localStorage 접근 throw 시 default 폴백", () => {
    // happy-dom 의 localStorage 를 getter throw 로 swap → SecurityError 시 graceful 분기.
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError");
      },
    });

    try {
      const state = getOnboardingState();
      expect(state.completed).toBe(false);
      expect(state.skipped).toBe(false);
      expect(state.currentStep).toBe(MIN_STEP);
    } finally {
      if (original) {
        Object.defineProperty(window, "localStorage", original);
      }
    }
  });

  it("손상된 step 값 ('abc') → MIN_STEP 폴백 (graceful)", () => {
    window.localStorage.setItem(STORAGE_KEY_STEP, "abc");
    const state = getOnboardingState();
    expect(state.currentStep).toBe(MIN_STEP);
  });

  it("CON-04 — 본 모듈의 storage key 명에 금칙어 0건", () => {
    // key 명에 치료/진단/장애 포함 안 되었는지 직접 검증 (수동 추적 보강).
    for (const k of [STORAGE_KEY_COMPLETED, STORAGE_KEY_SKIPPED, STORAGE_KEY_STEP]) {
      expect(k).not.toMatch(/치료/);
      expect(k).not.toMatch(/진단/);
      expect(k).not.toMatch(/장애/);
    }
  });
});

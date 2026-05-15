// SEC-004 §E-1 (Sprint 3 §2 E) — in-memory rate limiter 단위 테스트.
// 글로벌 RPM 14 + 사용자당 일 50회.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  checkRateLimit,
  recordCall,
  RateLimitedError,
  __resetRateLimitForTest,
} from "@/lib/ratelimit";

const USER_A = "user-a";
const USER_B = "user-b";

beforeEach(() => {
  __resetRateLimitForTest();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-15T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit — 초기 상태", () => {
  it("아무 호출 없을 때 모든 사용자 허용", () => {
    expect(checkRateLimit(USER_A).allowed).toBe(true);
    expect(checkRateLimit(USER_B).allowed).toBe(true);
  });
});

describe("글로벌 RPM 14 한도", () => {
  it("14번까지 허용, 15번째는 GLOBAL_RPM 차단", () => {
    for (let i = 0; i < 14; i++) {
      expect(checkRateLimit(USER_A).allowed).toBe(true);
      recordCall(USER_A);
    }
    const result = checkRateLimit(USER_A);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("GLOBAL_RPM");
    expect(result.retryAfterSec).toBeGreaterThan(0);
    expect(result.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("다른 사용자 호출도 동일 글로벌 카운터에 합산 (14회 합산 후 다음 차단)", () => {
    for (let i = 0; i < 7; i++) {
      expect(checkRateLimit(USER_A).allowed).toBe(true);
      recordCall(USER_A);
    }
    for (let i = 0; i < 7; i++) {
      expect(checkRateLimit(USER_B).allowed).toBe(true);
      recordCall(USER_B);
    }
    // 14 회 글로벌 합산 → 다음은 차단.
    expect(checkRateLimit(USER_A).allowed).toBe(false);
    expect(checkRateLimit(USER_B).allowed).toBe(false);
  });

  it("60초 지나면 sliding window 으로 회복", () => {
    for (let i = 0; i < 14; i++) recordCall(USER_A);
    expect(checkRateLimit(USER_A).allowed).toBe(false);

    // 61 초 경과 — 모든 timestamps 가 window 밖으로.
    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit(USER_A).allowed).toBe(true);
  });

  it("일부만 만료 — sliding window 점진 회복", () => {
    // 7회 즉시 호출.
    for (let i = 0; i < 7; i++) recordCall(USER_A);
    // 30초 후 7회 추가.
    vi.advanceTimersByTime(30_000);
    for (let i = 0; i < 7; i++) recordCall(USER_A);
    // 14회 누적 — 차단.
    expect(checkRateLimit(USER_A).allowed).toBe(false);
    // 31초 더 → 처음 7개 만료 → 7 슬롯 회복.
    vi.advanceTimersByTime(31_000);
    expect(checkRateLimit(USER_A).allowed).toBe(true);
  });
});

describe("사용자당 일 50회 한도", () => {
  it("50회까지 허용, 51번째 USER_DAILY 차단", () => {
    // 글로벌 RPM 14 제약 회피: 매 5초 간격으로 호출 → RPM 안전.
    for (let i = 0; i < 50; i++) {
      expect(checkRateLimit(USER_A).allowed).toBe(true);
      recordCall(USER_A);
      vi.advanceTimersByTime(5_000);
    }
    const result = checkRateLimit(USER_A);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("USER_DAILY");
    expect(result.retryAfterSec).toBeGreaterThan(0);
  });

  it("다른 사용자는 영향 없음 (per-user 독립)", () => {
    for (let i = 0; i < 50; i++) {
      recordCall(USER_A);
      vi.advanceTimersByTime(5_000);
    }
    expect(checkRateLimit(USER_A).allowed).toBe(false);
    // USER_B 는 글로벌 RPM 만 통과하면 OK.
    expect(checkRateLimit(USER_B).allowed).toBe(true);
  });

  it("24시간 후 사용자 카운터 리셋", () => {
    for (let i = 0; i < 50; i++) {
      recordCall(USER_A);
      vi.advanceTimersByTime(5_000);
    }
    expect(checkRateLimit(USER_A).allowed).toBe(false);

    // 24h - (50 * 5s = 250s) + 1s 경과 → 첫 호출이 24h 전이 됨.
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(checkRateLimit(USER_A).allowed).toBe(true);
  });
});

describe("RateLimitedError", () => {
  it("reason + retryAfterSec 필드 노출", () => {
    const err = new RateLimitedError("GLOBAL_RPM", 42);
    expect(err.name).toBe("RateLimitedError");
    expect(err.reason).toBe("GLOBAL_RPM");
    expect(err.retryAfterSec).toBe(42);
    expect(err.message).toContain("GLOBAL_RPM");
  });

  it("instanceof Error", () => {
    const err = new RateLimitedError("USER_DAILY", 100);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(RateLimitedError);
  });
});

describe("__resetRateLimitForTest", () => {
  it("모든 카운터 초기화", () => {
    for (let i = 0; i < 14; i++) recordCall(USER_A);
    expect(checkRateLimit(USER_A).allowed).toBe(false);

    __resetRateLimitForTest();
    expect(checkRateLimit(USER_A).allowed).toBe(true);
  });
});

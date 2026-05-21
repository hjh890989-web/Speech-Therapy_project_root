// SEC-004 (Sprint 3 §2 E) — in-memory rate limiter 단위 테스트.
// 글로벌 RPM 14 + 사용자당 일 50회 + 일 비용 80% Slack 알림 + 환경 prefix.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Slack mock — recordCall 의 비용 임계 알림 캡처.
const sendSlackMock = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/notifications/slack", () => ({
  sendSlackMessage: (...args: unknown[]) => sendSlackMock(...args),
}));

import {
  checkRateLimit,
  recordCall,
  RateLimitedError,
  getRateLimitDailyStats,
  __resetRateLimitForTest,
} from "@/lib/ratelimit";

const USER_A = "user-a";
const USER_B = "user-b";

beforeEach(() => {
  __resetRateLimitForTest();
  sendSlackMock.mockClear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-15T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
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
    expect(getRateLimitDailyStats().callCount).toBe(0);
    expect(getRateLimitDailyStats().alertSent).toBe(false);
  });
});

describe("일 비용 80% Slack 알림 (AC Scenario 4)", () => {
  // COST_PER_CALL_USD = 0.000060, DAILY_COST_THRESHOLD_USD = 1.00, COST_ALERT_PERCENT = 80
  // → 80% 임계 = $0.80 = 13,334 calls
  // 테스트 단순화 위해 직접 카운터 증가는 못 하므로 USER_DAILY_LIMIT 우회 + RPM 우회 양쪽 적용 필요.
  // 대신 다수 유저로 분산해 합산.
  //
  // 13,334 / 50 (user daily) = 267 사용자 필요 — 테스트 시간 부담.
  // → 본 테스트는 임계 도달 동작만 검증 (정확 호출 수 보단 stats + Slack 호출 횟수).

  function flushDayWithUsers(targetCalls: number) {
    let userIdx = 0;
    let placed = 0;
    while (placed < targetCalls) {
      const userId = `user-cost-${userIdx++}`;
      for (let i = 0; i < 50 && placed < targetCalls; i++) {
        if (checkRateLimit(userId).allowed) {
          recordCall(userId);
          placed++;
        }
        // 매 호출마다 4s 진행 — global RPM 14 우회 (60s/14 ≈ 4.3s 간격).
        vi.advanceTimersByTime(4_300);
      }
    }
  }

  it("80% 미만 → Slack 호출 0회", () => {
    // $0.79 ≈ 13,166 calls — 임계 직전. 테스트 시간 절약 위해 100 calls 만.
    flushDayWithUsers(100);
    expect(sendSlackMock).not.toHaveBeenCalled();
    expect(getRateLimitDailyStats().alertSent).toBe(false);
  });

  it("80% 임계 도달 → Slack 1회 호출 + 메시지 포맷 검증", () => {
    // 13,334 호출 — 다수 사용자 필요. 시간 단축 위해 partial 시뮬:
    // 임계 = $0.80, COST_PER_CALL = $0.000060 → 13,334 calls 정확.
    flushDayWithUsers(13_334);
    expect(sendSlackMock).toHaveBeenCalledTimes(1);
    const message = sendSlackMock.mock.calls[0][0] as string;
    expect(message).toContain("Gemini 일 비용");
    expect(message).toContain("80% 임계");
    expect(message).toContain("$0.80"); // threshold
    expect(getRateLimitDailyStats().alertSent).toBe(true);
    expect(getRateLimitDailyStats().estimatedCostUsd).toBeGreaterThanOrEqual(0.8);
  }, 30_000);

  it("임계 도달 후 추가 호출 — Slack 중복 호출 안 함 (AC Scenario 4 중복 방지)", () => {
    flushDayWithUsers(13_334);
    sendSlackMock.mockClear();

    // 임계 이후 추가 100 호출.
    flushDayWithUsers(100);
    expect(sendSlackMock).not.toHaveBeenCalled();
  }, 30_000);

  it("자정 자동 리셋 후 (24h 경과) → alert flag + 카운터 둘 다 리셋", () => {
    flushDayWithUsers(13_334);
    expect(getRateLimitDailyStats().alertSent).toBe(true);

    // 24h+ 경과.
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000);
    sendSlackMock.mockClear();

    // 새 호출 → 카운터 리셋 + alertSent=false.
    recordCall("user-z");
    const stats = getRateLimitDailyStats();
    expect(stats.callCount).toBe(1);
    expect(stats.alertSent).toBe(false);
    expect(sendSlackMock).not.toHaveBeenCalled();
  }, 30_000);
});

describe("환경 prefix 격리 (AC Scenario 5)", () => {
  it("VERCEL_ENV=production → envPrefix='production'", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(getRateLimitDailyStats().envPrefix).toBe("production");
  });

  it("VERCEL_ENV=preview → envPrefix='preview'", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(getRateLimitDailyStats().envPrefix).toBe("preview");
  });

  it("VERCEL_ENV 없음 + NODE_ENV=development → envPrefix='development'", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getRateLimitDailyStats().envPrefix).toBe("development");
  });

  it("둘 다 없음 → fallback 'dev'", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "");
    expect(getRateLimitDailyStats().envPrefix).toBe("dev");
  });
});

describe("getRateLimitDailyStats — 모니터링 shape", () => {
  it("초기 상태 — 0 호출 / alertSent=false / 임계 $1.00 / 80%", () => {
    const stats = getRateLimitDailyStats();
    expect(stats).toMatchObject({
      callCount: 0,
      estimatedCostUsd: 0,
      costThresholdUsd: 1.0,
      alertPercent: 80,
      alertSent: false,
    });
    expect(typeof stats.envPrefix).toBe("string");
  });

  it("recordCall 1회 → 비용 추정 = $0.000060", () => {
    recordCall("user-stats");
    const stats = getRateLimitDailyStats();
    expect(stats.callCount).toBe(1);
    expect(stats.estimatedCostUsd).toBeCloseTo(0.000_060, 6);
  });
});

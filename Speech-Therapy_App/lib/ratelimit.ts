// SEC-004 §E-1 (Sprint 3 §2 E) — Gemini Rate Limiter (in-memory P0 보호).
//
// 보호 대상:
//  1. 글로벌 RPM ≤ 14 (Gemini 무료 티어 15 RPM 안전 마진 1)
//  2. 사용자당 일 50회 (REQ-NF-018 비용 보호: 유저당 월 ≤ ₩5,250)
//
// 한계 / Sprint 3+ 후속 (§E-2):
//  - 다중 Vercel 인스턴스 시 각 인스턴스가 독립 카운터 → 총 RPM > 14 가능 (현재 Hobby single region 가정)
//  - Slack 80% 임계 알림 미구현
//  - 토큰 단위 비용 계산 미구현 (호출 횟수 proxy 만)
//  - Upstash Redis 도입 시 본 모듈을 어댑터로 교체

const USER_DAILY_LIMIT = 50;
const GLOBAL_RPM_LIMIT = 14;
const RPM_WINDOW_MS = 60 * 1000;
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;

// In-memory state — module 수명 동안 유지. Vercel cold start 마다 초기화 됨 (보수적, 누적 허용).
const globalCallTimestamps: number[] = [];
const userDailyCount = new Map<string, { count: number; resetAt: number }>();

export type RateLimitReason = "GLOBAL_RPM" | "USER_DAILY";

export interface RateLimitResult {
  allowed: boolean;
  reason?: RateLimitReason;
  /// 차단된 경우 다음 시도 가능까지 남은 초 (sliding window 의 가장 오래된 record 기준).
  retryAfterSec?: number;
}

/**
 * 호출 전 체크. allowed=false 시 호출 차단 (Gemini API 미호출).
 * recordCall 은 별도 — 실제 호출이 성공한 경우에만 카운터 증가.
 */
export function checkRateLimit(userId: string): RateLimitResult {
  const now = Date.now();

  // 1. Global RPM (sliding window).
  pruneGlobalTimestamps(now);
  if (globalCallTimestamps.length >= GLOBAL_RPM_LIMIT) {
    const oldestInWindow = globalCallTimestamps[0];
    const retryAfterMs = oldestInWindow + RPM_WINDOW_MS - now;
    return {
      allowed: false,
      reason: "GLOBAL_RPM",
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  // 2. User daily limit.
  const userState = userDailyCount.get(userId);
  if (userState && userState.resetAt > now) {
    if (userState.count >= USER_DAILY_LIMIT) {
      const retryAfterMs = userState.resetAt - now;
      return {
        allowed: false,
        reason: "USER_DAILY",
        retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }
  }

  return { allowed: true };
}

/**
 * 호출 성공 후 카운터 증가. Gemini 호출 실패 시는 record 안 함
 * (실패한 호출은 비용/RPM 한도에 잡히지 않도록).
 */
export function recordCall(userId: string): void {
  const now = Date.now();

  // Global timestamp.
  globalCallTimestamps.push(now);
  pruneGlobalTimestamps(now);

  // User daily.
  let userState = userDailyCount.get(userId);
  if (!userState || userState.resetAt <= now) {
    userState = { count: 0, resetAt: now + DAY_WINDOW_MS };
    userDailyCount.set(userId, userState);
  }
  userState.count += 1;
}

function pruneGlobalTimestamps(now: number): void {
  const windowStart = now - RPM_WINDOW_MS;
  // 정렬 보장 (push 만 사용하므로 자연 정렬). 앞에서부터 stale 제거.
  while (globalCallTimestamps.length > 0 && globalCallTimestamps[0] < windowStart) {
    globalCallTimestamps.shift();
  }
}

/** RATE_LIMITED 응답을 호출 측이 식별할 수 있도록 sentinel 에러. */
export class RateLimitedError extends Error {
  readonly reason: RateLimitReason;
  readonly retryAfterSec: number;
  constructor(reason: RateLimitReason, retryAfterSec: number) {
    super(`RATE_LIMITED:${reason}`);
    this.name = "RateLimitedError";
    this.reason = reason;
    this.retryAfterSec = retryAfterSec;
  }
}

/** 테스트용 — 모든 in-memory 카운터 초기화. */
export function __resetRateLimitForTest(): void {
  globalCallTimestamps.length = 0;
  userDailyCount.clear();
}

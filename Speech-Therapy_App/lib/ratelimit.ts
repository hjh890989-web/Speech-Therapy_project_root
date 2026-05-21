// SEC-004 (Sprint 3 §2 E) — Gemini Rate Limiter (in-memory P0+ 보호).
//
// 보호 대상:
//  1. 글로벌 RPM ≤ 14 (Gemini 무료 티어 15 RPM 안전 마진 1)
//  2. 사용자당 일 50회 (REQ-NF-018 비용 보호: 유저당 월 ≤ ₩5,250)
//  3. 일 누적 비용 추정 ≤ $1.00 — 80% 임계 도달 시 Slack 알림 1회 (중복 방지)
//  4. 환경별 prefix (VERCEL_ENV/NODE_ENV) 로 prod/preview/dev 카운터 격리 (단일 인스턴스 in-memory)
//
// 한계 / 별도 task (§E-2):
//  - 다중 Vercel 인스턴스 시 각 인스턴스가 독립 카운터 → 총 RPM > 14 가능 (현재 Hobby single region 가정)
//  - Upstash Redis 도입 시 본 모듈을 어댑터로 교체 (AGENTS.md §3 스택 외 → 별도 결정)
//
// 비용 추정 (gemini-2.5-flash-lite):
//  - $0.075/M input tokens + $0.30/M output tokens
//  - 호출 평균 200 input + 150 output → ~$0.000060/call
//  - 일 임계 $1.00 ≈ 16,667 calls (RPM 14 max throughput 20,160/일 대비 안전)

import { sendSlackMessage } from "@/lib/notifications/slack";

const USER_DAILY_LIMIT = 50;
const GLOBAL_RPM_LIMIT = 14;
const RPM_WINDOW_MS = 60 * 1000;
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const COST_PER_CALL_USD = 0.000_060;
const DAILY_COST_THRESHOLD_USD = 1.0;
const COST_ALERT_PERCENT = 80;

// In-memory state — module 수명 동안 유지. Vercel cold start 마다 초기화 됨 (보수적, 누적 허용).
const globalCallTimestamps: number[] = [];
const userDailyCount = new Map<string, { count: number; resetAt: number }>();
// 일 글로벌 호출 카운터 (비용 추정용).
let dailyCallCount = 0;
let dailyResetAt = 0;
let dailyCostAlertSent = false;

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
 *
 * 본 함수는 일 비용 임계 (80%) 도달 시 Slack 알림을 fire-and-forget 으로 트리거.
 * 알림 실패는 호출 측에 영향 주지 않음 (graceful).
 */
export function recordCall(userId: string): void {
  const now = Date.now();

  // Global timestamp (RPM sliding window).
  globalCallTimestamps.push(now);
  pruneGlobalTimestamps(now);

  // User daily.
  let userState = userDailyCount.get(userId);
  if (!userState || userState.resetAt <= now) {
    userState = { count: 0, resetAt: now + DAY_WINDOW_MS };
    userDailyCount.set(userId, userState);
  }
  userState.count += 1;

  // Daily global count + 비용 임계 알림.
  rotateDailyCounterIfStale(now);
  dailyCallCount += 1;
  maybeAlertCostThreshold();
}

function rotateDailyCounterIfStale(now: number): void {
  if (now >= dailyResetAt) {
    dailyCallCount = 0;
    dailyResetAt = now + DAY_WINDOW_MS;
    dailyCostAlertSent = false;
  }
}

function maybeAlertCostThreshold(): void {
  if (dailyCostAlertSent) return;
  const estimatedCostUsd = dailyCallCount * COST_PER_CALL_USD;
  const alertAt = DAILY_COST_THRESHOLD_USD * (COST_ALERT_PERCENT / 100);
  if (estimatedCostUsd < alertAt) return;
  dailyCostAlertSent = true;
  // fire-and-forget — Slack 실패가 Gemini 호출 흐름을 막지 않도록.
  void sendSlackMessage(
    [
      `:warning: Gemini 일 비용 ${COST_ALERT_PERCENT}% 임계 도달 [${getEnvPrefix()}]`,
      `• 추정 비용: $${estimatedCostUsd.toFixed(3)} / $${DAILY_COST_THRESHOLD_USD.toFixed(2)}`,
      `• 누적 호출: ${dailyCallCount}`,
      `• 임계 도달 후 추가 호출은 계속 허용 (RPM/사용자 한도 만 강제) — 자정 자동 리셋 대기`,
    ].join("\n"),
  ).catch(() => {
    /* graceful — 알림 실패 무시 */
  });
}

/// 환경별 prefix — Vercel ENV (production/preview/development) 우선, 그 외 NODE_ENV → fallback "dev".
function getEnvPrefix(): string {
  const v = (process.env.VERCEL_ENV || process.env.NODE_ENV || "dev").toLowerCase();
  return v;
}

/// 모니터링 / 디버깅용 — 일 글로벌 통계 노출 (env-scoped).
export interface RateLimitDailyStats {
  envPrefix: string;
  callCount: number;
  estimatedCostUsd: number;
  costThresholdUsd: number;
  alertPercent: number;
  alertSent: boolean;
}

export function getRateLimitDailyStats(): RateLimitDailyStats {
  return {
    envPrefix: getEnvPrefix(),
    callCount: dailyCallCount,
    estimatedCostUsd: dailyCallCount * COST_PER_CALL_USD,
    costThresholdUsd: DAILY_COST_THRESHOLD_USD,
    alertPercent: COST_ALERT_PERCENT,
    alertSent: dailyCostAlertSent,
  };
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

/** 테스트용 — 모든 in-memory 카운터 + 일 비용 카운터 + Slack 알림 플래그 초기화. */
export function __resetRateLimitForTest(): void {
  globalCallTimestamps.length = 0;
  userDailyCount.clear();
  dailyCallCount = 0;
  dailyResetAt = 0;
  dailyCostAlertSent = false;
}

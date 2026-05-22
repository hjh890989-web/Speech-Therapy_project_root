// MON-002 — 에러 메트릭 in-memory ring buffer + 임계 검사 + Slack alert.
//
// 설계 (SEC-004 ratelimit.ts 패턴 재사용):
// - in-memory Map<source, {total: count, errors: timestamp[]}> — 윈도우 기반 ratio 계산
// - 환경 prefix (VERCEL_ENV → NODE_ENV → "dev") — production/preview/dev 격리
// - Slack 알림 중복 방지 — 1시간당 source 별 1회
// - 자정 자동 리셋 (sliding 24h, alert flag 동시)
//
// 한계 / 별도 task:
// - 다중 Vercel 인스턴스 시 각 인스턴스 독립 → 정확 ratio 불가 (단일 region Hobby 가정)
// - 자동 AI provider fallback (Gemini → OpenAI) 미구현 (D4 정신 — 알림만, 수동 대응)
// - Upstash Redis 도입 시 본 모듈 어댑터 교체
//
// 사용 패턴:
//   trackError("gemini_429");           // 에러 시
//   trackSuccess("gemini");             // 성공 시 (total++)
//   checkErrorThresholds();              // cron 에서 호출 → Slack alert

import { sendSlackMessage } from "@/lib/notifications/slack";
import {
  type ErrorCode,
  type ErrorSource,
  ERROR_WINDOW_MS,
  ERROR_THRESHOLD_RATIO,
  getErrorSource,
} from "@/lib/error-catalog";

const ALERT_COOLDOWN_MS = 60 * 60_000; // 1시간 — source 별 1회만 알림.

interface SourceMetrics {
  /// 윈도우 내 모든 호출 (성공 + 에러) timestamp (sliding).
  calls: number[];
  /// 윈도우 내 에러 timestamp (sliding).
  errors: number[];
  /// 마지막 Slack alert 발송 시각 (중복 방지 cooldown).
  lastAlertAt: number;
  /// 마지막 임계 초과 source / ratio (cron 응답 노출).
  lastBreachInfo: { ratio: number; errorCount: number; at: number } | null;
}

const metrics = new Map<ErrorSource, SourceMetrics>();

function getOrInit(source: ErrorSource): SourceMetrics {
  let m = metrics.get(source);
  if (!m) {
    m = { calls: [], errors: [], lastAlertAt: 0, lastBreachInfo: null };
    metrics.set(source, m);
  }
  return m;
}

function pruneOldEntries(source: ErrorSource, now: number): void {
  const m = getOrInit(source);
  const cutoff = now - ERROR_WINDOW_MS[source];
  while (m.calls.length > 0 && m.calls[0] < cutoff) m.calls.shift();
  while (m.errors.length > 0 && m.errors[0] < cutoff) m.errors.shift();
}

function envPrefix(): string {
  return (process.env.VERCEL_ENV || process.env.NODE_ENV || "dev").toLowerCase();
}

/// 호출 성공 시 — calls 만 추가 (ratio 분모).
export function trackSuccess(source: ErrorSource, now: number = Date.now()): void {
  const m = getOrInit(source);
  pruneOldEntries(source, now);
  m.calls.push(now);
}

/// 호출 실패 시 — calls + errors 동시 추가.
export function trackError(code: ErrorCode, now: number = Date.now()): void {
  const source = getErrorSource(code);
  const m = getOrInit(source);
  pruneOldEntries(source, now);
  m.calls.push(now);
  m.errors.push(now);
}

export interface ThresholdCheckResult {
  source: ErrorSource;
  envPrefix: string;
  /// 윈도우 내 호출 수 (성공 + 에러).
  callsInWindow: number;
  /// 윈도우 내 에러 수.
  errorCount: number;
  ratio: number;
  threshold: number;
  breached: boolean;
  alertSent: boolean;
}

/// 모든 source 의 임계 검사 + 초과 시 Slack alert (1시간당 1회).
/// cron 에서 호출. 결과 배열 반환 (응답 페이로드 + 로깅용).
export async function checkErrorThresholds(now: number = Date.now()): Promise<ThresholdCheckResult[]> {
  const results: ThresholdCheckResult[] = [];

  for (const source of ["stt", "gemini"] as const) {
    const m = getOrInit(source);
    pruneOldEntries(source, now);

    const errorCount = m.errors.length;
    const callsInWindow = m.calls.length;
    const threshold = ERROR_THRESHOLD_RATIO[source];
    // ratio = 윈도우 내 에러 / 윈도우 내 호출 (REQ-NF-021/024 정합 sliding ratio).
    const denominator = Math.max(1, callsInWindow);
    const ratio = errorCount / denominator;
    const breached = ratio > threshold && errorCount > 0;

    let alertSent = false;
    if (breached) {
      const cooldownExpired = now - m.lastAlertAt > ALERT_COOLDOWN_MS;
      if (cooldownExpired) {
        m.lastAlertAt = now;
        m.lastBreachInfo = { ratio, errorCount, at: now };
        alertSent = true;
        const windowMin = Math.round(ERROR_WINDOW_MS[source] / 60_000);
        void sendSlackMessage(
          [
            `:warning: ${source.toUpperCase()} 에러율 임계 초과 [${envPrefix()}]`,
            `• 윈도우: ${windowMin}분`,
            `• 에러 수: ${errorCount} / 호출 ${callsInWindow}`,
            `• ratio: ${(ratio * 100).toFixed(1)}% (임계 ${(threshold * 100).toFixed(1)}%)`,
            `• 다음 알림은 1시간 후 또는 정상화 후`,
          ].join("\n"),
        ).catch(() => {
          /* graceful */
        });
      }
    }

    results.push({
      source,
      envPrefix: envPrefix(),
      callsInWindow,
      errorCount,
      ratio,
      threshold,
      breached,
      alertSent,
    });
  }

  return results;
}

/// 모니터링 / 디버깅용 — 현재 메트릭 스냅샷.
export interface ErrorTrackingSnapshot {
  envPrefix: string;
  sources: Record<ErrorSource, {
    callsInWindow: number;
    errorCount: number;
    ratio: number;
    threshold: number;
    lastAlertAt: number | null;
  }>;
}

export function getErrorTrackingSnapshot(now: number = Date.now()): ErrorTrackingSnapshot {
  const snapshot: ErrorTrackingSnapshot = {
    envPrefix: envPrefix(),
    sources: {
      stt: { callsInWindow: 0, errorCount: 0, ratio: 0, threshold: ERROR_THRESHOLD_RATIO.stt, lastAlertAt: null },
      gemini: { callsInWindow: 0, errorCount: 0, ratio: 0, threshold: ERROR_THRESHOLD_RATIO.gemini, lastAlertAt: null },
    },
  };
  for (const source of ["stt", "gemini"] as const) {
    const m = metrics.get(source);
    if (!m) continue;
    pruneOldEntries(source, now);
    const denom = Math.max(1, m.calls.length);
    snapshot.sources[source] = {
      callsInWindow: m.calls.length,
      errorCount: m.errors.length,
      ratio: m.errors.length / denom,
      threshold: ERROR_THRESHOLD_RATIO[source],
      lastAlertAt: m.lastAlertAt > 0 ? m.lastAlertAt : null,
    };
  }
  return snapshot;
}

/// 테스트용 — 모든 메트릭 초기화.
export function __resetErrorTrackingForTest(): void {
  metrics.clear();
}

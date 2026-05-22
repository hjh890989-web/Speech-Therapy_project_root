// FR-C-014 잔여 (#37) — admin 수동 에스컬레이션 helper (rate-limiter + Slack 본문).
//
// 책임:
//   1. checkManualEscalateRateLimit(actorId) — admin 1분 5건 제한 (in-memory sliding window).
//   2. recordManualEscalate(actorId) — rate-limit 카운터 증가.
//   3. buildManualEscalationMessage(args) — Slack 본문 빌더 (R4 보호).
//   4. notifyManualEscalationBySlack(args) — Slack 발송 (graceful).
//   5. __resetManualEscalateRateLimitForTest() — 테스트 격리.
//
// 어뷰징 방어 (REQ-FUNC-034):
//   - 동일 actorId (User.id) 1분 5건 초과 escalate 차단 → 429.
//   - 분당 5건은 합법적 batch 처리 (예: bulk 어뷰징 의심 큐 처리) 허용 + 폭주 차단.
//   - 환경별 prefix (production / preview / dev / test) — lib/replay.ts 동일 패턴.
//   - cold start 마다 reset 됨 — single instance Hobby 가정 (SEC-004 §E-2 한계 인지).
//
// lib/hitl.ts / lib/hitl/escalation.ts 와 분리 이유:
//   - escalation.ts: cron 의 _자동_ escalation (Slack + DB) — actor 부재.
//   - 본 파일: admin _수동_ escalation — actor 인증 + rate-limit + audit.
//   - lib/hitl.ts 본체 미수정 (사이드 effect 격리 — sibling Agent 충돌 회피).
//
// R4 (자녀 식별 보호):
//   - Slack 본문엔 queueId / actorRole / reason / now 만 노출.
//   - sessionId 는 운영자 식별 필요 → 포함 (lib/hitl/escalation.ts 와 동일 정책).
//   - userId / 음성 / email / 이름 절대 미포함.
//
// 금칙어 (CON-04): "치료" / "진단" / "장애" 사용 금지.

import { sendSlackMessage, type SlackResult } from "@/lib/notifications/slack";

const MANUAL_RATE_WINDOW_MS = 60_000; // 1분.
const MANUAL_RATE_LIMIT = 5; // actor 당 1분 5건.

/** 환경별 prefix — dev/preview/prod/test 격리. */
function getEnvPrefix(): string {
  return (process.env.VERCEL_ENV || process.env.NODE_ENV || "dev").toLowerCase();
}

function prefixed(actorId: string): string {
  return `${getEnvPrefix()}::${actorId}`;
}

/** in-memory: actorId(prefixed) → 최근 호출 timestamps (sliding window). */
const recentEscalateTimestamps = new Map<string, number[]>();

export type ManualEscalateRateLimitReason = "ACTOR_RATE_LIMIT";

export interface ManualEscalateRateCheckResult {
  allowed: boolean;
  reason?: ManualEscalateRateLimitReason;
  /// 차단 시 다음 시도 가능까지 남은 초 (가장 오래된 record 기준).
  retryAfterSec?: number;
}

/**
 * 호출 전 체크. allowed=false 시 호출 차단 (429 응답).
 * recordManualEscalate 는 _처리 성공 후_ 명시 호출 — 실패한 호출은 카운터 증가 안 함
 * (cron + 동일 패턴: 실패한 호출은 한도에 잡히지 않음 → DoS amplifier 회피).
 */
export function checkManualEscalateRateLimit(
  actorId: string,
): ManualEscalateRateCheckResult {
  if (!actorId) {
    // 인증 실패 → 본 함수 호출 안 되는 게 정상. 방어적 차단.
    return { allowed: false, reason: "ACTOR_RATE_LIMIT", retryAfterSec: 60 };
  }
  const now = Date.now();
  const key = prefixed(actorId);
  const timestamps = recentEscalateTimestamps.get(key) ?? [];
  const windowStart = now - MANUAL_RATE_WINDOW_MS;
  const within = timestamps.filter((t) => t >= windowStart);

  if (within.length >= MANUAL_RATE_LIMIT) {
    const oldest = within[0];
    const retryAfterMs = oldest + MANUAL_RATE_WINDOW_MS - now;
    return {
      allowed: false,
      reason: "ACTOR_RATE_LIMIT",
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }
  return { allowed: true };
}

/**
 * 호출 성공 후 카운터 증가. 메모리 폭주 가드: actor 당 최대 MANUAL_RATE_LIMIT*4 entry 보관.
 */
export function recordManualEscalate(actorId: string): void {
  if (!actorId) return;
  const now = Date.now();
  const key = prefixed(actorId);
  const timestamps = recentEscalateTimestamps.get(key) ?? [];
  const windowStart = now - MANUAL_RATE_WINDOW_MS;
  // window 밖 항목 제거 + push.
  const cleaned = timestamps.filter((t) => t >= windowStart);
  cleaned.push(now);
  // 폭주 가드 (이론상 발생 불가하나 방어적).
  const capped = cleaned.slice(-MANUAL_RATE_LIMIT * 4);
  recentEscalateTimestamps.set(key, capped);

  // 전체 Map 폭주 가드 — 1000 actor 초과 시 오래된 actor entry GC.
  if (recentEscalateTimestamps.size > 1000) {
    for (const [k, list] of recentEscalateTimestamps) {
      const stillRelevant = list.some((t) => t >= windowStart);
      if (!stillRelevant) recentEscalateTimestamps.delete(k);
    }
  }
}

/** 테스트 전용 — rate-limit in-memory store 초기화. */
export function __resetManualEscalateRateLimitForTest(): void {
  recentEscalateTimestamps.clear();
}

/** 테스트 / 모니터링 — 현재 actor 의 window 내 카운트 (디버깅용). */
export function getManualEscalateCount(actorId: string): number {
  if (!actorId) return 0;
  const now = Date.now();
  const key = prefixed(actorId);
  const timestamps = recentEscalateTimestamps.get(key) ?? [];
  const windowStart = now - MANUAL_RATE_WINDOW_MS;
  return timestamps.filter((t) => t >= windowStart).length;
}

/// R4 보호: queueId / sessionId / actor role / reason 만 노출. userId / PII 0건.
export function buildManualEscalationMessage(args: {
  queueId: string;
  sessionId: string;
  actorRole: "admin" | "principal" | "expert";
  reason: "expert_judgment" | "sla_at_risk" | "duplicate" | "manual";
  now?: Date;
}): string {
  const now = args.now ?? new Date();
  return [
    ":rotating_light: HITL 수동 에스컬레이션 (admin)",
    `• queueId: \`${args.queueId}\``,
    `• sessionId: \`${args.sessionId}\``,
    `• 사유: ${args.reason}`,
    `• 처리자 role: ${args.actorRole}`,
    `• 발생 시각: ${now.toISOString()}`,
    "• 조치: 마스터 전문가 우선 검토 + 부모 알림 대기열 점검",
  ].join("\n");
}

/// FR-C-014 — 수동 escalation Slack 알림 (graceful).
export async function notifyManualEscalationBySlack(args: {
  queueId: string;
  sessionId: string;
  actorRole: "admin" | "principal" | "expert";
  reason: "expert_judgment" | "sla_at_risk" | "duplicate" | "manual";
  now?: Date;
}): Promise<SlackResult> {
  const text = buildManualEscalationMessage(args);
  return sendSlackMessage(text);
}

/// 상수 노출 (테스트 / 디버깅).
export const MANUAL_ESCALATE_WINDOW_MS = MANUAL_RATE_WINDOW_MS;
export const MANUAL_ESCALATE_LIMIT = MANUAL_RATE_LIMIT;

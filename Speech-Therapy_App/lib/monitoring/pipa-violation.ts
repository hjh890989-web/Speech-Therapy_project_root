// MON-005 — PIPA 위반 monitoring (V07 신규).
//
// 책임:
//   - PIPA 5중 가드 (ADR-16) 의 throw 지점에서 발생한 ConsentRequiredError 를
//     Slack alert 로 통보 — 운영팀이 미동의 진단 시도 패턴 실시간 모니터링.
//   - 본 sub-session 의 5중 가드 결과의 _계측_ layer — 가드가 정상 동작하는지
//     production 에서 통계로 확인 (FN/FP 추적성).
//
// 정책 결정:
//   1) 익명 user 의 boolean 가드 throw (5층) 와 인증 user 의 assertConsentedIfAuthenticated
//      throw (2~4층) 둘 다 본 hook 호출.
//   2) Slack 메시지에 R4 정합 — 자녀 식별 정보 (이름 / email / anonymousUserId) 절대 미포함.
//      대신 sessionId / 가드 layer (1~5층) / Server Action 이름 / 시각만 노출.
//   3) Rate limit — 동일 user 동일 layer 의 violation 은 5분 내 1회만 Slack 발송
//      (lib/replay.ts in-memory dedup 패턴 재사용 — Vercel serverless 환경 instance 별).
//   4) 실 alert 실패는 graceful — console.warn 만, 메인 흐름 차단 X.
//      monitoring 의 보조 역할 — 가드 자체는 ConsentRequiredError throw 로 이미 차단됨.
//   5) SLACK_WEBHOOK_PIPA_ALERTS 별도 환경변수 — HITL Slack 채널과 분리 (필요 시
//      동일 채널 사용 위해 미설정 시 SLACK_WEBHOOK_URL fallback).
//
// 호출 위치:
//   - Server Action 2/3/4층의 catch (ConsentRequiredError) 블록
//   - 익명 user 의 5층 boolean 가드 throw 직전
//
// Refs: TASK_MON-005.md, REQ-NF-029 (PIPA 5중 가드), ADR-16, §12.4 (가드 매트릭스).

import { sendSlackMessage } from "@/lib/notifications/slack";

/**
 * PIPA 가드 layer 식별자 (§12.4 가드 매트릭스).
 *
 * - "1_ui_redirect": UI ConsentRedirectGate (FR-C-019)
 * - "2_analyze_authenticated": analyzeDiagnosis 의 인증 user assertConsented
 * - "3_update_child_profile": updateChildProfile graceful 분기
 * - "4_generate_cushion": generateCushion graceful fallback
 * - "5_analyze_anonymous_boolean": analyzeDiagnosis 의 익명 boolean 검증
 */
export type PipaGuardLayer =
  | "1_ui_redirect"
  | "2_analyze_authenticated"
  | "3_update_child_profile"
  | "4_generate_cushion"
  | "5_analyze_anonymous_boolean";

export interface PipaViolationContext {
  /// 가드 layer 1~5.
  layer: PipaGuardLayer;
  /// 호출된 Server Action 이름 (예: "analyzeDiagnosis").
  serverAction: string;
  /// sessionId (있을 경우만 — R4 정합).
  sessionId?: string;
  /// 발생 시각 (ISO).
  timestamp?: Date;
}

// ---------------------------------------------------------------------------
// Rate limit — 동일 (userKey, layer) 5분 내 1회.
// userKey: 인증 user id 또는 anonymous_user_id 의 _hash_ (R4 정합 — raw id 미저장).
// ---------------------------------------------------------------------------
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5분
const dedupCache = new Map<string, number>();

function shouldSendAlert(dedupKey: string, now: number): boolean {
  const last = dedupCache.get(dedupKey);
  if (last && now - last < DEDUP_WINDOW_MS) {
    return false;
  }
  dedupCache.set(dedupKey, now);

  // Memory leak 방지 — cache size > 1000 시 oldest 절반 정리.
  if (dedupCache.size > 1000) {
    const entries = Array.from(dedupCache.entries()).sort((a, b) => a[1] - b[1]);
    for (const [k] of entries.slice(0, 500)) {
      dedupCache.delete(k);
    }
  }
  return true;
}

/**
 * 메시지 빌더 — R4 정합 (자녀 식별 정보 미포함).
 *
 * 노출 항목: layer / serverAction / sessionId? / timestamp
 */
export function buildPipaViolationMessage(ctx: PipaViolationContext): string {
  const ts = (ctx.timestamp ?? new Date()).toISOString();
  const sessionLine = ctx.sessionId ? `\n• sessionId: \`${ctx.sessionId}\`` : "";
  return [
    ":no_entry_sign: PIPA 가드 위반 시도 차단",
    `• layer: \`${ctx.layer}\``,
    `• action: \`${ctx.serverAction}\``,
    `• time: ${ts}`,
  ].join("\n") + sessionLine;
}

/**
 * PIPA 위반 시도 Slack 발송.
 *
 * - dedupKey: 동일 userHash + layer 의 5분 내 중복 호출 skip.
 * - Slack 발송 실패는 graceful — console.warn 만.
 * - 반환: 발송 여부 + Slack 응답.
 *
 * userHash 책임:
 *   - 호출 측에서 _hash_ 화된 식별자 전달 (R4 — raw id 미전달).
 *   - 안 가능 시 generic key "anonymous" 사용 (dedup 효과 약화 OK).
 */
export async function reportPipaViolation(args: {
  ctx: PipaViolationContext;
  userHash?: string;
}): Promise<{ sent: boolean; skipped?: "deduped" | "no_webhook" | "error"; error?: string }> {
  const { ctx, userHash = "anonymous" } = args;
  const now = Date.now();
  const dedupKey = `${userHash}:${ctx.layer}`;

  if (!shouldSendAlert(dedupKey, now)) {
    return { sent: false, skipped: "deduped" };
  }

  const text = buildPipaViolationMessage(ctx);
  const result = await sendSlackMessage(text);

  if (!result.ok) {
    // SLACK_WEBHOOK_URL 미설정 → graceful skip.
    if (result.skipped) {
      return { sent: false, skipped: "no_webhook" };
    }
    // 실 발송 실패 → graceful (monitoring 보조 역할, 메인 흐름 차단 X).
    console.warn("[MON-005] PIPA violation Slack alert failed:", result.error);
    return { sent: false, skipped: "error", error: result.error };
  }
  return { sent: true };
}

/**
 * dedup cache 초기화 — 테스트 전용.
 *
 * @internal
 */
export function _resetDedupCacheForTest(): void {
  dedupCache.clear();
}

// DB-011 후속 — AuditLog 위험 action Slack alert helper.
//
// 동기:
//   lib/audit.ts::recordAudit 가 INSERT 성공한 직후, action 이 운영 위험 카테고리
//   (사용자 삭제 / 권한 변경 / 환경 설정 변경 / 대량 export / 2FA 약화 등) 에 속할 때
//   Slack incoming webhook 으로 즉시 알림 → 운영팀이 분 단위로 감지 + 대응.
//
//   본 helper 는 _후처리_ — 메인 흐름 (DB INSERT) 의 graceful 정책을 따른다:
//     - 환경변수 부재 → skip + console.warn 1회 (dev/preview 노이즈 최소화)
//     - fetch 실패 → console.error + 메인 흐름 차단 X (throw 안 함)
//     - payload diff 가 크거나 PII 의심 키 포함 → 본문에서 자동 truncate / 키 라벨만 노출
//
// 환경변수:
//   AUDIT_SLACK_WEBHOOK_URL — Slack App → Incoming Webhooks 발급.
//   부재 시 graceful skip — lib/notifications/slack.ts 와 동일한 분리 정책 (HITL 알림 채널과 분리).
//
// CRITICAL_ACTIONS 정책 (R4 / SEC 운영):
//   - User_delete         : PostgreSQL TRIGGER (audit_trigger_fn) — User row 삭제
//   - User_update         : TRIGGER — role 변경 등 critical 권한 흐름
//   - data_delete         : 애플리케이션 (lib/audit.ts) — 자녀 데이터 폐기 (GDPR 6h 의무)
//   - data_export         : 애플리케이션 — 대량 데이터 export (개인정보 유출 risk)
//   - config_change       : 애플리케이션 — 환경 변수 / 정책 변경
//   - hitl_manually_escalated: 애플리케이션 — admin 이 expert 판정 우회
//   - totp_disabled       : 향후 _audit_ 기록 시 (현재 분석 이벤트만) — 2FA 약화 분기
//
// R4 (자녀 식별 정보 보호) 가드:
//   - diff 본문은 _없거나_ JSON.stringify 후 256자 truncate
//   - 의심 키 (lib/audit.ts SUSPICIOUS_PAYLOAD_KEYS 와 동일 분류) 가 포함되면 key 라벨만 노출
//   - actorId 는 UUID 형식만 노출 (anonymous / system 폴백 그대로)
//   - sessionId / userId / email / 자녀 이름 등 _콘텐츠_ 는 _별도_ Slack 알림 채널이 아닌 한 노출 금지

import { sendSlackMessage } from "@/lib/notifications/slack";

/**
 * 위험 action 정의 — Set 자료구조로 O(1) lookup.
 *
 * 추가 시 본 Set 에만 명시 — 호출 측 (recordAudit 등) 코드 변경 불필요.
 * TRIGGER (PostgreSQL) 와 애플리케이션 (recordAudit) 양쪽 action 모두 포함.
 *
 * 본 목록은 _명시적_ 운영 정책 — 실수로 추가/제거되면 알림 누락 risk → 변경 시 PR 리뷰 강제.
 */
export const CRITICAL_ACTIONS: ReadonlySet<string> = new Set([
  // TRIGGER 측 (audit_trigger_fn() — DB-011 migration) - {Table}_{op} 패턴.
  "User_delete",
  "User_update",
  "ConsentSignature_delete",
  "HITLQueue_delete",
  "RewardLog_delete",
  "OfflineEntry_delete",
  // 애플리케이션 측 (lib/audit.ts AuditAction enum).
  "data_delete",
  "data_export",
  "config_change",
  "hitl_manually_escalated",
  // 향후 record-side 분기 (현재는 telemetry 만) — totp_disabled audit 도입 시 활성화.
  "totp_disabled",
  "User_role_change",
]);

/**
 * critical 판정.
 *
 * @param action — recordAudit 의 action (또는 TRIGGER 가 적재한 `{Table}_{op}`).
 * @returns true → Slack alert 발송 대상.
 */
export function isCriticalAction(action: string): boolean {
  return CRITICAL_ACTIONS.has(action);
}

/**
 * R4 가드 — diff 의심 키 (자녀 식별 정보) 검출.
 *
 * lib/audit.ts SUSPICIOUS_PAYLOAD_KEYS 와 동일 패턴 — 본 모듈 독립 (순환 의존 회피).
 * 매칭 시 본문에서 _값_ 은 제거하고 _key_ 라벨만 노출 ("realname: [REDACTED]").
 */
const SUSPICIOUS_DIFF_KEYS: readonly string[] = [
  "realname",
  "real_name",
  "ssn",
  "rrn",
  "email",
  "phone",
  "address",
  "birthdate",
  "birthday",
  "transcript",
  "audiourl",
  "audio_url",
];

/**
 * diff 본문을 Slack 메시지에 안전하게 요약.
 *
 * 정책:
 *   1) null / undefined → "(diff 없음)"
 *   2) 객체 → key 별로 SUSPICIOUS_DIFF_KEYS 매칭 시 "[REDACTED]" 치환
 *   3) JSON.stringify 후 256자 초과 시 truncate + "…" 추가
 *   4) JSON.stringify throw (순환 참조 등) → "(직렬화 불가)"
 *
 * R4: 의심 키의 _값_ 절대 노출 금지. 키 _이름_ 자체는 노출 허용 (분석 단서).
 */
export function summarizeDiff(diff: Record<string, unknown> | null | undefined): string {
  if (diff === null || diff === undefined) return "(diff 없음)";
  if (typeof diff !== "object") return "(diff 형식 비정상)";

  try {
    // 의심 키 [REDACTED] 치환 — shallow only (depth 1) 본문 truncate 정책.
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(diff)) {
      const lower = key.toLowerCase();
      const suspicious = SUSPICIOUS_DIFF_KEYS.some((s) => lower.includes(s));
      sanitized[key] = suspicious ? "[REDACTED]" : value;
    }
    const json = JSON.stringify(sanitized);
    if (json.length <= 256) return json;
    return `${json.slice(0, 256)}…`;
  } catch {
    return "(직렬화 불가)";
  }
}

/// AUDIT_SLACK_WEBHOOK_URL 미설정 경고 1회만 (dev/preview 노이즈 최소화).
let warnedNoWebhook = false;

/**
 * Slack alert 본문 빌더 — R4 가드 적용.
 *
 * 형식:
 *   :rotating_light: AuditLog critical event
 *   • action: `<action>`
 *   • actor: `<actorId>`
 *   • when: <ISO>
 *   • diff: <요약>
 *   • 조회: <audit page link>
 *
 * R4: actorId 는 그대로 노출 (UUID/익명 — server-side 분석 백엔드 자동 해시 가정).
 *     자녀 식별 정보 (이름 / email / 자녀 ID) 절대 본문 미포함.
 */
export function buildCriticalAlertMessage(args: {
  action: string;
  actorId: string;
  diff: Record<string, unknown> | null | undefined;
  occurredAt: Date;
  baseUrl?: string;
}): string {
  const linkBase = args.baseUrl ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const link = linkBase
    ? `${linkBase.replace(/\/$/, "")}/admin/audit?action=${encodeURIComponent(args.action)}`
    : `/admin/audit?action=${encodeURIComponent(args.action)}`;
  return [
    ":rotating_light: AuditLog critical event",
    `• action: \`${args.action}\``,
    `• actor: \`${args.actorId}\``,
    `• when: ${args.occurredAt.toISOString()}`,
    `• diff: ${summarizeDiff(args.diff)}`,
    `• 조회: ${link}`,
  ].join("\n");
}

/**
 * critical action 시 Slack 알림 발송 — 메인 흐름 차단 X.
 *
 * 호출 책임 (lib/audit.ts::recordAudit 등):
 *   - await 해도 throw 0 (graceful) — 메인 흐름 차단 안 함.
 *   - fire-and-forget 도 안전: 호출 측이 `void alertIfCritical(...)` 로 await 생략 가능.
 *
 * 흐름:
 *   1) isCriticalAction 검사 — 비대상 → 즉시 return.
 *   2) AUDIT_SLACK_WEBHOOK_URL env 검사 — 부재 시 warn 1회 + return.
 *   3) sendCriticalSlack — env 임시 swap (SLACK_WEBHOOK_URL ← AUDIT_SLACK_WEBHOOK_URL)
 *      후 sendSlackMessage 호출. 본 채널은 HITL 알림과 분리.
 *   4) fetch 실패 → console.error + return (throw X).
 */
export async function alertIfCritical(
  action: string,
  actorId: string,
  diff: Record<string, unknown> | null | undefined,
  occurredAt: Date = new Date(),
): Promise<void> {
  if (!isCriticalAction(action)) return;

  const webhookUrl = process.env.AUDIT_SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    if (!warnedNoWebhook) {
      console.warn(
        "[audit-critical-alert] AUDIT_SLACK_WEBHOOK_URL 미설정 — critical action Slack 알림 skip (dev/preview 예상).",
      );
      warnedNoWebhook = true;
    }
    return;
  }

  const text = buildCriticalAlertMessage({ action, actorId, diff, occurredAt });

  // sendSlackMessage 는 SLACK_WEBHOOK_URL 만 읽으므로 임시 swap.
  // HITL 채널 (SLACK_WEBHOOK_URL) 과 운영 알림 채널 (AUDIT_SLACK_WEBHOOK_URL) 분리 가능하도록.
  const originalSlackUrl = process.env.SLACK_WEBHOOK_URL;
  process.env.SLACK_WEBHOOK_URL = webhookUrl;
  try {
    const result = await sendSlackMessage(text);
    if (!result.ok && !result.skipped) {
      console.error(
        `[audit-critical-alert] Slack 발송 실패 (graceful — 메인 흐름 유지): action=${action} error=${result.error ?? "unknown"}`,
      );
    }
  } catch (err) {
    // sendSlackMessage 가 graceful 이라 normally throw X — defensive.
    console.error(
      "[audit-critical-alert] Slack 발송 예외 (graceful — 메인 흐름 유지):",
      err,
    );
  } finally {
    // env 복원 — 다른 호출자 (HITL) 영향 차단.
    if (originalSlackUrl === undefined) {
      delete process.env.SLACK_WEBHOOK_URL;
    } else {
      process.env.SLACK_WEBHOOK_URL = originalSlackUrl;
    }
  }
}

/**
 * 테스트용 — webhook 미설정 경고 플래그 reset.
 *
 * 단위 테스트가 "warn 1회만" 시나리오를 격리 검증할 수 있게 export.
 * production 호출 금지.
 */
export function __resetCriticalAlertWarnFlagForTest(): void {
  warnedNoWebhook = false;
}

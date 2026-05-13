// API-005 / FR-C-002 — Slack Incoming Webhook 어댑터.
// D4 적용: HITL Realtime 미사용, Slack 웹훅으로 즉시 알림.
//
// 환경 변수: SLACK_WEBHOOK_URL (Slack App → Incoming Webhooks 발급)
// 부재 시: skip 처리 (graceful degradation, dev/test 환경 보호).
//
// 횡단 제약 R4: 메시지 본문에 자녀 식별 정보 (이름·email·anonymousUserId) 미포함.
// sessionId 만 인덱스 키로 사용.

export interface SlackResult {
  ok: boolean;
  /// 실패 시 사유.
  error?: string;
  /// 환경 변수 부재로 skip 한 경우 true.
  skipped?: boolean;
}

export async function sendSlackMessage(text: string): Promise<SlackResult> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    return { ok: false, skipped: true, error: "SLACK_WEBHOOK_URL not set" };
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/// FR-C-002 — HITL 큐 등록 알림 메시지 빌더.
/// R4: sessionId / confidenceScore / slaDueAt 만 노출. 자녀 식별 정보 절대 미포함.
export function buildHITLAlertMessage(args: {
  sessionId: string;
  queueId: string;
  confidenceScore: number;
  slaDueAt: Date;
  supabaseStudioUrl?: string;
}): string {
  const studio = args.supabaseStudioUrl
    ? `\nSupabase Studio: ${args.supabaseStudioUrl}`
    : "";
  return [
    ":warning: HITL 검토 필요",
    `• sessionId: \`${args.sessionId}\``,
    `• queueId: \`${args.queueId}\``,
    `• confidence: ${args.confidenceScore.toFixed(1)}`,
    `• SLA: ${args.slaDueAt.toISOString()}`,
  ].join("\n") + studio;
}

/// FR-C-002 — Slack 알림 + R4 보호 검증.
export async function notifyHITLBySlack(args: {
  sessionId: string;
  queueId: string;
  confidenceScore: number;
  slaDueAt: Date;
}): Promise<SlackResult> {
  const text = buildHITLAlertMessage(args);
  return sendSlackMessage(text);
}

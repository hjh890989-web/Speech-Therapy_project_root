// FR-C-014 (#37) — HITL 24h 미처리 자동 에스컬레이션 helper.
//
// 책임:
//   1. findEscalationCandidates() — 24h 초과 + escalatedAt IS NULL + status in (pending, in_review) 조회
//      어뷰징 방어: BATCH_LIMIT (50) 으로 max take 제한 (DB 폭주 + Slack 폭주 방어).
//   2. escalateItem({ item }) — Slack 재알림 + escalatedAt 마킹 (트랜잭션, all-or-nothing)
//   3. buildEscalationMessage() / notifyEscalationBySlack() — Slack 본문 빌더
//
// 설계 결정 (lib/hitl.escalateOverdueQueues 와 분리 이유):
//   - 기존 escalateOverdueQueues 는 prisma.updateMany — 1쿼리 일괄 처리 (bulk metric).
//     per-item Slack 발송 불가 (어떤 row 가 escalated 되었는지 round-trip 후 알 수 없음).
//   - 본 helper 는 per-item findMany → per-item Slack → per-item update — 어뷰징 방어 + 알림 정확도.
//   - lib/hitl.ts 본체는 손대지 않음 (기존 cron / 통합 테스트 보호).
//
// 어뷰징 방어 (REQ-FUNC-034):
//   - WHERE escalatedAt IS NULL — 동일 row 24h 내 escalation 1회만 (멱등).
//   - 동일 sessionId 반복 alert 방지.
//
// 트랜잭션 보호 (Slack + DB 일관성):
//   - Slack 성공 + DB 실패 → 다음 cron 주기 중복 alert 위험.
//   - 처리: Slack 호출은 트랜잭션 외부 (외부 I/O), DB update 는 Slack 성공 시에만.
//     Slack 실패 → escalatedAt 미설정 → 다음 cron 주기 재시도 (graceful retry).
//     DB update 실패 → errors 누적 + 다음 cron 주기 재시도 (with 중복 alert 위험 단발).
//
// R4 (자녀 식별 보호):
//   - Slack 본문엔 sessionId / queueId / confidenceScore / createdAt 만 노출.
//   - userId / 음성 / email / 이름 절대 미포함.
//
// 금칙어 (CON-04): "치료" / "진단" / "장애" 사용 금지.

import { prisma } from "@/lib/db";
import { sendSlackMessage } from "@/lib/notifications/slack";

const ESCALATION_HOURS = 24;

/// 어뷰징 방어 (#37 잔여) — cron 1회 max 50건. DB 폭주 + Slack 폭주 방어.
/// 50건 초과 시 다음 cron 주기로 자연 분산 (createdAt asc 정렬 → 가장 오래된 50건 우선).
const BATCH_LIMIT = 50;

/// FR-C-014 — 24h 초과 미처리 + 아직 escalation 안 된 큐 조회.
/// status 후보:
///   - pending: 전문가 미할당 (대다수)
///   - in_review: 할당됐지만 24h+ 무응답
/// completed / escalated / dismissed 는 제외.
export interface EscalationCandidate {
  id: string;
  sessionId: string;
  userId: string;
  confidenceScore: number;
  status: string;
  createdAt: Date;
  slaDueAt: Date;
}

export async function findEscalationCandidates(
  now: Date = new Date(),
): Promise<EscalationCandidate[]> {
  const threshold = new Date(now.getTime() - ESCALATION_HOURS * 60 * 60 * 1000);
  const rows = await prisma.hITLQueue.findMany({
    where: {
      status: { in: ["pending", "in_review"] },
      createdAt: { lt: threshold },
      escalatedAt: null,
    },
    select: {
      id: true,
      sessionId: true,
      userId: true,
      confidenceScore: true,
      status: true,
      createdAt: true,
      slaDueAt: true,
    },
    orderBy: { createdAt: "asc" },
    take: BATCH_LIMIT,
  });
  return rows as EscalationCandidate[];
}

/// 상수 노출 (테스트 / 디버깅).
export const ESCALATION_BATCH_LIMIT = BATCH_LIMIT;

/// FR-C-014 — Slack 본문 빌더.
/// R4: sessionId / queueId / confidence / createdAt 만 노출.
export function buildEscalationMessage(args: {
  sessionId: string;
  queueId: string;
  confidenceScore: number;
  createdAt: Date;
  now?: Date;
}): string {
  const now = args.now ?? new Date();
  const hoursOverdue = Math.floor(
    (now.getTime() - args.createdAt.getTime()) / (60 * 60 * 1000),
  );
  return [
    ":warning: HITL 24h SLA 초과 — 자동 에스컬레이션",
    `• sessionId: \`${args.sessionId}\``,
    `• queueId: \`${args.queueId}\``,
    `• confidence: ${args.confidenceScore.toFixed(1)}`,
    `• createdAt: ${args.createdAt.toISOString()} (경과 ${hoursOverdue}h)`,
    "• 조치: 마스터 전문가 우선 검토 요청",
  ].join("\n");
}

/// FR-C-014 — Slack 재알림 (graceful).
export async function notifyEscalationBySlack(args: {
  sessionId: string;
  queueId: string;
  confidenceScore: number;
  createdAt: Date;
  now?: Date;
}) {
  const text = buildEscalationMessage(args);
  return sendSlackMessage(text);
}

/// FR-C-014 — 단일 항목 에스컬레이션 (Slack + DB).
/// 흐름:
///   1. Slack 호출 (외부 I/O, 트랜잭션 밖)
///   2. Slack 실패 시 즉시 return — DB 업데이트 안 함 → 다음 cron 주기 재시도
///   3. Slack 성공 → prisma.update (escalatedAt + status='escalated')
///   4. DB 실패 시 errors 누적 (Slack 중복 alert 1회는 감내 — 다음 주기 동일 sessionId 재escalate)
export interface EscalateItemResult {
  ok: boolean;
  sessionId: string;
  queueId: string;
  slackOk: boolean;
  dbOk: boolean;
  /// 실패 사유 (디버깅).
  error?: string;
}

export async function escalateItem(args: {
  item: EscalationCandidate;
  now?: Date;
}): Promise<EscalateItemResult> {
  const now = args.now ?? new Date();
  const { item } = args;

  // 1단계 — Slack 재알림.
  let slackOk = false;
  try {
    const slackResult = await notifyEscalationBySlack({
      sessionId: item.sessionId,
      queueId: item.id,
      confidenceScore: item.confidenceScore,
      createdAt: item.createdAt,
      now,
    });
    slackOk = slackResult.ok === true;
    if (!slackOk) {
      // Slack 실패 / skip → DB 업데이트 미수행 (다음 cron 주기 재시도).
      return {
        ok: false,
        sessionId: item.sessionId,
        queueId: item.id,
        slackOk: false,
        dbOk: false,
        error: slackResult.skipped ? "slack_skipped" : `slack_failed:${slackResult.error ?? "unknown"}`,
      };
    }
  } catch (err) {
    return {
      ok: false,
      sessionId: item.sessionId,
      queueId: item.id,
      slackOk: false,
      dbOk: false,
      error: `slack_exception:${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // 2단계 — DB update (escalatedAt 마킹 + status='escalated').
  // 멱등 보호: WHERE escalatedAt IS NULL — 동시 race-condition (hitl-monitor cron 과 충돌) 시 0 update 안전.
  try {
    const updated = await prisma.hITLQueue.updateMany({
      where: { id: item.id, escalatedAt: null },
      data: { status: "escalated", escalatedAt: now },
    });
    if (updated.count === 0) {
      // 동시 race — 다른 프로세스가 먼저 마킹. Slack 1회 중복 가능하나 다음 주기엔 미해당.
      return {
        ok: false,
        sessionId: item.sessionId,
        queueId: item.id,
        slackOk: true,
        dbOk: false,
        error: "concurrent_escalation_race",
      };
    }
    return {
      ok: true,
      sessionId: item.sessionId,
      queueId: item.id,
      slackOk: true,
      dbOk: true,
    };
  } catch (err) {
    return {
      ok: false,
      sessionId: item.sessionId,
      queueId: item.id,
      slackOk: true,
      dbOk: false,
      error: `db_failed:${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/// Test 전용 — ESCALATION_HOURS 상수 노출.
export const ESCALATION_THRESHOLD_HOURS = ESCALATION_HOURS;

// DB-009 §AC — HITL 큐 헬퍼.
// FR-C-002 (Confidence<70 자동 이관) 와 FR-C-014 (24h+ 에스컬레이션) 가
// 본 모듈을 호출.
//
// D4 단순화: Supabase Realtime 미사용. 등록 후 알림은 Slack 웹훅으로
// 별도 통보 (API-005 가 책임). 운영은 Supabase Studio 에서 수동.

import { prisma } from "@/lib/db";

const SLA_HOURS = 48;
const ESCALATION_HOURS = 24;
const ABUSE_MONTHLY_DISMISSED_THRESHOLD = 3; // REQ-FUNC-034 — 월 3건 dismissed 후 4번째는 자동 거부.
const EXPERT_DAILY_REVIEW_THRESHOLD = 50; // 1일 50건 초과 시 admin 알림 (검토 품질 보호).

/// REQ-FUNC-003 / HITL-001: Confidence < 70 시 자동 큐 등록.
/// 멱등성: sessionId @unique 제약. 재호출 시 confidence 만 갱신.
///
/// REQ-FUNC-034 (어뷰징 방어): 동일 userId 가 현재 캘린더 월에 이미 3건 dismissed 이면
/// 4번째 신규 큐는 status=dismissed 로 즉시 등록 (전문가 큐 부담 회피).
/// 멱등 upsert 경로 (재호출) 에서는 abuse 검사 생략 — 이미 존재하는 row 의 confidence 만 갱신.
export async function enqueueForReview(sessionId: string, userId: string, confidence: number) {
  const now = new Date();
  const slaDueAt = new Date(now.getTime() + SLA_HOURS * 60 * 60 * 1000);

  const existing = await prisma.hITLQueue.findUnique({ where: { sessionId } });
  if (existing) {
    return prisma.hITLQueue.update({
      where: { sessionId },
      data: { confidenceScore: confidence },
    });
  }

  // 신규 등록 — abuse 검사.
  const dismissedThisMonth = await countDismissedThisMonth(userId, now);
  const isAbusive = dismissedThisMonth >= ABUSE_MONTHLY_DISMISSED_THRESHOLD;

  return prisma.hITLQueue.create({
    data: {
      sessionId,
      userId,
      confidenceScore: confidence,
      slaDueAt,
      status: isAbusive ? "dismissed" : "pending",
      completedAt: isAbusive ? now : null,
    },
  });
}

/// REQ-FUNC-034 — 어뷰징 방어 기준값 조회.
/// 현재 캘린더 월의 dismissed 건수.
export async function countDismissedThisMonth(
  userId: string,
  now: Date = new Date(),
): Promise<number> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return prisma.hITLQueue.count({
    where: {
      userId,
      status: "dismissed",
      createdAt: { gte: monthStart, lt: monthEnd },
    },
  });
}

/// 전문가 검토 부담 — 1일 (UTC) 동안 본 expertId 가 검토 완료한 건수.
/// EXPERT_DAILY_REVIEW_THRESHOLD (50) 초과 시 admin Slack 알림 (cron 책임).
export async function countReviewsToday(
  expertId: string,
  now: Date = new Date(),
): Promise<number> {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return prisma.hITLQueue.count({
    where: {
      assignedExpertId: expertId,
      completedAt: { gte: dayStart, lt: dayEnd },
    },
  });
}

/// expert 일 검토 임계 상수 노출 (테스트 + cron 공유).
export const EXPERT_DAILY_THRESHOLD = EXPERT_DAILY_REVIEW_THRESHOLD;
export const ABUSE_MONTHLY_THRESHOLD = ABUSE_MONTHLY_DISMISSED_THRESHOLD;

/// REQ-FUNC-033 / FR-C-014: 24h 초과 pending 큐를 escalated 로 마킹.
/// Vercel Cron (INFRA-002) 가 주기 호출.
export async function escalateOverdueQueues(now: Date = new Date()) {
  const threshold = new Date(now.getTime() - ESCALATION_HOURS * 60 * 60 * 1000);

  return prisma.hITLQueue.updateMany({
    where: {
      status: "pending",
      createdAt: { lt: threshold },
    },
    data: {
      status: "escalated",
      escalatedAt: now,
    },
  });
}

/// MON-003: SLA 임박 (24h 내) pending 큐 조회 — 알림 기준.
export async function findUpcomingSLABreaches(hoursAhead: number = 24, now: Date = new Date()) {
  const threshold = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  return prisma.hITLQueue.findMany({
    where: {
      status: "pending",
      slaDueAt: { lte: threshold },
    },
    orderBy: { slaDueAt: "asc" },
  });
}

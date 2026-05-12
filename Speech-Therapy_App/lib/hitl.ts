// DB-009 §AC — HITL 큐 헬퍼.
// FR-C-002 (Confidence<70 자동 이관) 와 FR-C-014 (24h+ 에스컬레이션) 가
// 본 모듈을 호출.
//
// D4 단순화: Supabase Realtime 미사용. 등록 후 알림은 Slack 웹훅으로
// 별도 통보 (API-005 가 책임). 운영은 Supabase Studio 에서 수동.

import { prisma } from "@/lib/db";

const SLA_HOURS = 48;
const ESCALATION_HOURS = 24;

/// REQ-FUNC-003 / HITL-001: Confidence < 70 시 자동 큐 등록.
/// 멱등성: sessionId @unique 제약. 재호출 시 confidence 만 갱신.
export async function enqueueForReview(sessionId: string, userId: string, confidence: number) {
  const now = new Date();
  const slaDueAt = new Date(now.getTime() + SLA_HOURS * 60 * 60 * 1000);

  return prisma.hITLQueue.upsert({
    where: { sessionId },
    create: {
      sessionId,
      userId,
      confidenceScore: confidence,
      slaDueAt,
    },
    update: {
      confidenceScore: confidence,
    },
  });
}

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

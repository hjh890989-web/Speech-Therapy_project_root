// INFRA-002 + FR-C-014 — HITL 24h 자동 에스컬레이션 Cron.
// schedule: 매시간 정각 — vercel.json 의 "0 * * * *"
//
// 동작:
//  1) Cron Secret 검증
//  2) lib/hitl.escalateOverdueQueues (status=pending + createdAt < now-24h → escalated)
//  3) 신규 escalated 가 있으면 Slack alert
//  4) TEST-014 sc9 — 본 cron tick 시점에 1일 50건 초과 검토한 expert 별 admin alert (1회/일/expert).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  escalateOverdueQueues,
  findUpcomingSLABreaches,
  countReviewsToday,
  EXPERT_DAILY_THRESHOLD,
} from "@/lib/hitl";
import { sendSlackMessage } from "@/lib/notifications/slack";

export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED", reason: auth.reason }, { status: 401 });
  }

  const start = Date.now();
  const now = new Date();

  let escalatedCount = 0;
  let upcomingBreachCount = 0;
  let overloadedExperts: { expertId: string; reviews: number }[] = [];

  try {
    const result = await escalateOverdueQueues(now);
    escalatedCount = result.count;

    const upcoming = await findUpcomingSLABreaches(24, now);
    upcomingBreachCount = upcoming.length;

    overloadedExperts = await findOverloadedExperts(now);
  } catch (err) {
    console.error("hitl-monitor: 실패", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  if (escalatedCount > 0) {
    await sendSlackMessage(
      `:rotating_light: HITL 자동 에스컬레이션 — ${escalatedCount}건 (24h 초과 pending → escalated)`,
    );
  }
  // MON-003 — 1일 5건 초과 임박 시 admin 알림.
  if (upcomingBreachCount >= 3) {
    await sendSlackMessage(
      `:warning: HITL 24h SLA 임박 ${upcomingBreachCount}건 — 전문가 검토 우선 처리 요청`,
    );
  }
  // TEST-014 sc9 — 1일 50건 초과 검토 expert 별 1회 alert.
  // R4 보호: expertId 만 노출 (자녀 식별 정보 0).
  for (const exp of overloadedExperts) {
    await sendSlackMessage(
      `:bell: HITL expert 검토 부담 임계 — expertId=${exp.expertId} 1일 ${exp.reviews}건 (>${EXPERT_DAILY_THRESHOLD})`,
    );
  }

  return NextResponse.json({
    job: "hitl-monitor",
    escalatedCount,
    upcomingBreachCount,
    overloadedExpertCount: overloadedExperts.length,
    durationMs: Date.now() - start,
  });
}

/// 오늘(UTC) 완료한 expert 별 카운트 집계 → threshold 초과만 반환.
async function findOverloadedExperts(now: Date) {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const todayCompleted = await prisma.hITLQueue.findMany({
    where: {
      completedAt: { gte: dayStart, lt: dayEnd },
      assignedExpertId: { not: null },
    },
    select: { assignedExpertId: true },
  });
  const counts = new Map<string, number>();
  for (const row of todayCompleted) {
    if (!row.assignedExpertId) continue;
    counts.set(row.assignedExpertId, (counts.get(row.assignedExpertId) ?? 0) + 1);
  }
  const overloaded: { expertId: string; reviews: number }[] = [];
  for (const [expertId, reviews] of counts.entries()) {
    if (reviews > EXPERT_DAILY_THRESHOLD) {
      overloaded.push({ expertId, reviews });
    }
  }
  return overloaded;
}

// Test 전용 — countReviewsToday 의 함수 표면 노출 검증용.
export const __exposedForTest = { countReviewsToday };

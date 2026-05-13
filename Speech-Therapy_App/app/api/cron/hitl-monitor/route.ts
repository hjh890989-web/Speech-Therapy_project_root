// INFRA-002 + FR-C-014 — HITL 24h 자동 에스컬레이션 Cron.
// schedule: 매시간 정각 — vercel.json 의 "0 * * * *"
//
// 동작:
//  1) Cron Secret 검증
//  2) lib/hitl.escalateOverdueQueues (status=pending + createdAt < now-24h → escalated)
//  3) 신규 escalated 가 있으면 Slack alert

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { escalateOverdueQueues, findUpcomingSLABreaches } from "@/lib/hitl";
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

  try {
    const result = await escalateOverdueQueues(now);
    escalatedCount = result.count;

    const upcoming = await findUpcomingSLABreaches(24, now);
    upcomingBreachCount = upcoming.length;
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

  return NextResponse.json({
    job: "hitl-monitor",
    escalatedCount,
    upcomingBreachCount,
    durationMs: Date.now() - start,
  });
}

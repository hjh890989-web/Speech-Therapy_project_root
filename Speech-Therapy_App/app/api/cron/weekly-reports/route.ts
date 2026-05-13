// INFRA-002 + FR-C-010 — 주간 리포트 Cron Route Handler.
// schedule: 매주 일요일 03:00 UTC (한국 12시) — vercel.json 의 "0 3 * * 0"
//
// 동작:
//  1) Cron Secret 검증
//  2) 지난 주의 ISO week 계산
//  3) evaluation_results 가 있는 unique user 모두 순회
//  4) 각 user 별 aggregateWeeklyScores → weekly_reports upsert
//  5) 5건 이상 실패 시 Slack alert

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  aggregateWeeklyScores,
  getCurrentWeekNumber,
} from "@/lib/weekly-report";
import { sendSlackMessage } from "@/lib/notifications/slack";

const SLACK_ALERT_THRESHOLD = 5;

export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED", reason: auth.reason }, { status: 401 });
  }

  const start = Date.now();

  // 지난 주의 ISO week 계산.
  const now = new Date();
  const lastSunday = new Date(now);
  lastSunday.setUTCDate(now.getUTCDate() - 7);
  const { year, week } = getCurrentWeekNumber(lastSunday);

  // evaluation_results 가 있는 모든 unique user 추출 (지난 주 범위).
  const weekStart = new Date(lastSunday);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  let users: { userId: string }[] = [];
  try {
    users = await prisma.evaluationResult.findMany({
      where: { createdAt: { gte: weekStart, lt: weekEnd } },
      select: { userId: true },
      distinct: ["userId"],
    });
  } catch (err) {
    console.error("weekly-reports: user 조회 실패", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  let successCount = 0;
  let failureCount = 0;

  for (const { userId } of users) {
    try {
      const agg = await aggregateWeeklyScores(userId, year, week);
      if (!agg) continue; // 데이터 부족 — skip (FR-Q-006 가 별도 처리).
      await prisma.weeklyReport.upsert({
        where: { userId_year_weekNumber: { userId, year, weekNumber: week } },
        create: {
          userId,
          year,
          weekNumber: week,
          scoreTrend: agg.scoreTrend,
          articulationAvg: agg.articulationAvg,
          linguisticAvg: agg.linguisticAvg,
          acousticAvg: agg.acousticAvg,
          peerPercentileAvg: agg.peerPercentileAvg,
          sessionCount: agg.sessionCount,
        },
        update: {
          scoreTrend: agg.scoreTrend,
          articulationAvg: agg.articulationAvg,
          linguisticAvg: agg.linguisticAvg,
          acousticAvg: agg.acousticAvg,
          peerPercentileAvg: agg.peerPercentileAvg,
          sessionCount: agg.sessionCount,
          generatedAt: new Date(),
        },
      });
      successCount += 1;
    } catch (err) {
      failureCount += 1;
      console.error("weekly-reports: user 처리 실패", userId, err);
    }
  }

  const durationMs = Date.now() - start;

  if (failureCount >= SLACK_ALERT_THRESHOLD) {
    await sendSlackMessage(
      `:warning: weekly-reports Cron — ${failureCount}건 실패 / ${successCount}건 성공 / ${durationMs}ms`,
    );
  }

  return NextResponse.json({
    job: "weekly-reports",
    year,
    week,
    successCount,
    failureCount,
    durationMs,
  });
}

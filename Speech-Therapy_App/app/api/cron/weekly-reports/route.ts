// INFRA-002 + FR-C-010 (#33) — 주간 리포트 Cron Route Handler.
// schedule: 매주 일요일 03:00 UTC (한국 12시) — vercel.json 의 "0 3 * * 0"
//
// 동작:
//  1) Cron Secret 검증
//  2) 지난 주의 ISO week 계산 + [weekStart, weekEnd) UTC 범위 산출
//  3) 활성 user (evaluation_results 가 있는 unique user) 식별 → getActiveUsers
//  4) 각 user 별 aggregateWeeklyReport → upsertWeeklyReport (멱등)
//  5) 사용자별 실패는 graceful — failureCount 누적 + 다른 user 계속 진행
//  6) 5건 이상 실패 시 Slack alert
//  7) 응답: { successCount, failureCount, wAurAchievedCount, durationMs }
//
// 본 route 는 thin wrapper — 핵심 로직은 lib/reports/weekly-aggregator.ts.

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getCurrentWeekNumber } from "@/lib/weekly-report";
import {
  getActiveUsers,
  aggregateWeeklyReport,
  upsertWeeklyReport,
} from "@/lib/reports/weekly-aggregator";
import { sendSlackMessage } from "@/lib/notifications/slack";

const SLACK_ALERT_THRESHOLD = 5;

export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED", reason: auth.reason }, { status: 401 });
  }

  const start = Date.now();

  // 지난 주의 ISO week 계산 (cron 은 일요일 03:00 UTC 발화 — "지난 주" = -7d 기준 ISO 주차).
  const now = new Date();
  const lastSunday = new Date(now);
  lastSunday.setUTCDate(now.getUTCDate() - 7);
  const { year, week } = getCurrentWeekNumber(lastSunday);

  // 활성 user 추출 — ISO 주차 [start, end) UTC 범위.
  const weekStart = new Date(lastSunday);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  let userIds: string[] = [];
  try {
    userIds = await getActiveUsers(weekStart, weekEnd);
  } catch (err) {
    console.error("weekly-reports: user 조회 실패", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  let successCount = 0;
  let failureCount = 0;
  let wAurAchievedCount = 0;

  for (const userId of userIds) {
    try {
      const data = await aggregateWeeklyReport({ userId, year, weekNumber: week });
      if (!data) continue; // 0 session — skip (FR-Q-006 EmptyState 분기 책임).
      await upsertWeeklyReport(data);
      successCount += 1;
      if (data.wAurAchieved) wAurAchievedCount += 1;
      // 분석 이벤트는 server-side cron 이므로 console.log 로 대체
      // (trackEvent 는 client-side analytics — 본 cron 은 PostHog/GA 등 직접 호출 0).
      console.log(
        `weekly-reports: generated userId=${userId} week=${year}-W${week} ` +
          `sessions=${data.sessionCount} wAurAchieved=${data.wAurAchieved} ` +
          `predicted=${data.predictedNextScore ?? "null"}`,
      );
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
    processedUsers: userIds.length,
    successCount,
    failureCount,
    wAurAchievedCount,
    durationMs,
  });
}

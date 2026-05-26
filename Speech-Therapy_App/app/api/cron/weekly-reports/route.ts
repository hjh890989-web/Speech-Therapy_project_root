// INFRA-002 + FR-C-010 (#33) + FR-C-NOTIFICATION-PREFERENCE — 주간 리포트 Cron Route Handler.
// schedule: 매주 일요일 03:00 UTC (한국 12시) — vercel.json 의 "0 3 * * 0"
//
// 동작:
//  1) Cron Secret 검증
//  2) 지난 주의 ISO week 계산 + [weekStart, weekEnd) UTC 범위 산출
//  3) 활성 user (evaluation_results 가 있는 unique user) 식별 → getActiveUsers
//  4) 각 user 별 aggregateWeeklyReport → upsertWeeklyReport (멱등)
//  5) upsert 직후 sendWeeklyReportEmail 호출 (preference 체크 + Resend 위임)
//     - User.email 부재 → email skip (no_parent_email)
//     - weeklyReportEmail opt-out → email skip (user_opt_out)
//     - Resend 미설정 / 환경 graceful skip
//     - 다른 user 처리 계속 (이메일 실패가 cron 전체를 막지 않음)
//  6) 사용자별 실패는 graceful — failureCount 누적 + 다른 user 계속 진행
//  7) 5건 이상 실패 시 Slack alert
//  8) 응답: { successCount, failureCount, emailSentCount, emailSkippedCount,
//            wAurAchievedCount, durationMs }
//
// 이메일 발송 option flag:
//  - URL 쿼리 ?sendEmails=false → 본 실행에서 이메일 발송 skip (upsert 만).
//  - 환경변수 WEEKLY_REPORT_EMAIL_DISABLED=1 → 모든 실행에서 이메일 발송 skip.
//  - 기본값: 이메일 발송 활성 (default true).
//
// 본 route 는 thin wrapper — 핵심 로직은 lib/reports/weekly-aggregator.ts +
// lib/email/weekly-report-email.ts.

import { NextResponse } from "next/server";
// FR-PERF-2-TAG-INVALIDATE — cron 이 새 WeeklyReport 생성 시 principal/teacher
// dashboard 의 `institution:<id>:dashboard` 캐시를 즉시 무효화 → 60s TTL 대기 X.
import { revalidateTag } from "next/cache";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getCurrentWeekNumber } from "@/lib/weekly-report";
import {
  getActiveUsers,
  aggregateWeeklyReport,
  upsertWeeklyReport,
} from "@/lib/reports/weekly-aggregator";
import { sendSlackMessage } from "@/lib/notifications/slack";
import { sendWeeklyReportEmail } from "@/lib/email/weekly-report-email";
import { prisma } from "@/lib/db";

const SLACK_ALERT_THRESHOLD = 5;

/// /weekly-review 페이지 base URL — sendWeeklyReportEmail 의 dashboardLink.
/// 우선순위: NEXT_PUBLIC_SITE_URL > VERCEL_URL > localhost.
function getDashboardLink(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim().length > 0) {
    return `${explicit.replace(/\/$/, "")}/weekly-review`;
  }
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.trim().length > 0) {
    return `https://${vercelUrl.replace(/\/$/, "")}/weekly-review`;
  }
  return "http://localhost:4000/weekly-review";
}

/// URL ?sendEmails=false 또는 WEEKLY_REPORT_EMAIL_DISABLED=1 → 이메일 발송 skip.
/// 기본 (URL 미전달 + 환경변수 미설정) → 이메일 발송 활성.
function resolveSendEmailsFlag(request: Request): boolean {
  if (process.env.WEEKLY_REPORT_EMAIL_DISABLED === "1") return false;
  try {
    const url = new URL(request.url);
    const param = url.searchParams.get("sendEmails");
    if (param !== null && param.toLowerCase() === "false") return false;
  } catch {
    // graceful — URL 파싱 실패 시 default true.
  }
  return true;
}

export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED", reason: auth.reason }, { status: 401 });
  }

  const start = Date.now();
  const sendEmailsEnabled = resolveSendEmailsFlag(request);

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
  let emailSentCount = 0;
  let emailSkippedCount = 0;
  let emailFailedCount = 0;

  // FR-PERF-2-TAG-INVALIDATE — 성공 upsert user 들의 institutionId 누적 (중복 제거).
  // 루프 종료 후 institution 별 1회씩 revalidateTag — 같은 기관 N user 면 1 invalidate.
  const institutionIdsToRevalidate = new Set<string>();

  const dashboardLink = getDashboardLink();

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

      // R4: parentEmail + institutionId 만 select — 그 외 PII 미조회.
      // institutionId 는 FR-PERF-2-TAG-INVALIDATE 의 dashboard 캐시 무효화에 사용.
      // sendEmails 비활성 시에도 fetch — institutionId 누적 → 루프 후 revalidateTag.
      // findUnique 실패는 graceful (이메일/태그 둘 다 skip, cron 전체 차단 X).
      let parentEmail = "";
      try {
        const userRow = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, institutionId: true },
        });
        parentEmail = userRow?.email ?? "";
        if (userRow?.institutionId) {
          institutionIdsToRevalidate.add(userRow.institutionId);
        }
      } catch (userFetchErr) {
        console.error(
          "weekly-reports: user fetch 실패 (graceful)",
          userId,
          userFetchErr,
        );
      }

      // FR-C-NOTIFICATION-PREFERENCE — upsert 직후 weekly_report 이메일 발송.
      // 본 실행이 sendEmails=false / WEEKLY_REPORT_EMAIL_DISABLED=1 일 때만 skip.
      if (!sendEmailsEnabled) {
        continue;
      }
      try {
        const emailResult = await sendWeeklyReportEmail({
          userId,
          parentEmail,
          dashboardLink,
          report: {
            weekNumber: data.weekNumber,
            year: data.year,
            articulationAvg: data.articulationAvg,
            linguisticAvg: data.linguisticAvg,
            acousticAvg: data.acousticAvg,
            sessionCount: data.sessionCount,
            wAurAchieved: data.wAurAchieved,
            predictedNextScore: data.predictedNextScore,
          },
        });
        if (emailResult.sent) {
          emailSentCount += 1;
        } else if (emailResult.skipped) {
          emailSkippedCount += 1;
        } else {
          emailFailedCount += 1;
        }
        console.log(
          `weekly-reports: email userId=${userId} sent=${emailResult.sent} ` +
            `skipped=${emailResult.skipped} error=${emailResult.error ?? "null"}`,
        );
      } catch (emailErr) {
        // 이메일 실패 → cron 전체를 막지 않고 graceful counter 증가.
        emailFailedCount += 1;
        console.error("weekly-reports: email 발송 실패", userId, emailErr);
      }
    } catch (err) {
      failureCount += 1;
      console.error("weekly-reports: user 처리 실패", userId, err);
    }
  }

  // FR-PERF-2-TAG-INVALIDATE — 루프 후 institution 별 dashboard 캐시 무효화.
  // 각 revalidateTag 는 graceful — 실패해도 cron 응답에 영향 X (60s TTL fallback).
  // tag 패턴은 lib/admin/principal-aggregator.ts / teacher-aggregator.ts 의
  // `institution:<id>:dashboard` 와 정합. 동일 institution N user 면 1회 invalidate.
  let revalidatedTagsCount = 0;
  for (const institutionId of institutionIdsToRevalidate) {
    try {
      // Next.js 16 — revalidateTag(tag, profile) 2-arg signature. 'default' profile
      // 은 lib/admin/principal-aggregator.ts 의 unstable_cache 와 정합.
      revalidateTag(`institution:${institutionId}:dashboard`, "default");
      revalidatedTagsCount += 1;
    } catch (tagErr) {
      console.error(
        "weekly-reports: revalidateTag 실패 (graceful)",
        institutionId,
        tagErr,
      );
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
    emailEnabled: sendEmailsEnabled,
    emailSentCount,
    emailSkippedCount,
    emailFailedCount,
    revalidatedTagsCount,
    durationMs,
  });
}

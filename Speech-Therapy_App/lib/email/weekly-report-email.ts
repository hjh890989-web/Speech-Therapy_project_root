// FR-C-010 + FR-C-NOTIFICATION-PREFERENCE — 주간 리포트 이메일 발송 orchestrator.
//
// 책임:
//   - lib/email/templates.ts::buildWeeklyReportEmail + lib/email/resend.ts::sendEmail 통합
//   - lib/notifications/preference.ts::weeklyReportEmail opt-in 검사 (opt-out 시 skip)
//   - parentEmail 부재 / Resend 실패 graceful (throw 금지)
//   - CON-04 검증은 sendEmail 단에서 한 번 더 (defense in depth)
//
// 호출 측 — app/api/cron/weekly-reports/route.ts (매주 일요일 cron).
//
// R4 보호:
//   - 본 함수는 thin orchestrator — userId 와 parentEmail 만 사용. 그 외 식별자 미사용.
//   - tags 에는 weeklyReport id / userId 모두 미포함 (R4: PII 0). template / week 라벨만.

import { sendEmail } from "@/lib/email/resend";
import { buildWeeklyReportEmail } from "@/lib/email/templates";
import {
  getNotificationPreference,
  shouldSendEmail,
} from "@/lib/notifications/preference";

/// sendWeeklyReportEmail 입력 — cron 이 user 별 1회 호출.
export interface WeeklyReportEmailArgs {
  /// 수신자 User.id — preference 체크 (weeklyReportEmail) 의 키.
  userId: string;
  /// 부모 이메일. 빈값 → skipped: 'no_parent_email'.
  parentEmail: string;
  /// (선택) 부모 호칭.
  parentName?: string;
  /// (선택) 자녀 이름 — subject + 인사말에 사용. 수신자 = 부모이므로 R4 허용.
  childName?: string;
  /// /weekly-review URL — RBAC 자동 검증.
  dashboardLink: string;
  /// WeeklyReport 데이터 — buildWeeklyReportEmail 입력 그대로.
  report: {
    weekNumber: number;
    year: number;
    articulationAvg: number;
    linguisticAvg: number;
    acousticAvg: number;
    sessionCount: number;
    wAurAchieved: boolean;
    predictedNextScore: number | null;
  };
}

/// sendWeeklyReportEmail 결과 — cron 응답 / 로그 분기.
export interface WeeklyReportEmailResult {
  /// 실 발송 (Resend ok) 시 true.
  sent: boolean;
  /// graceful skip (preference / parentEmail / 환경 미설정 / Resend 응답) 시 true.
  skipped: boolean;
  /// skip 또는 실패 사유 — 'user_opt_out' / 'no_parent_email' / sendEmail.error 전파.
  error?: string;
}

/**
 * 주간 리포트 이메일 발송 (graceful — 절대 throw 금지).
 *
 * 분기 매트릭스:
 *   1. parentEmail 부재 / 빈값 → skipped, error: 'no_parent_email'
 *   2. userId 부재 / 빈값 → skipped, error: 'no_user_id'
 *   3. weeklyReportEmail preference === false → skipped, error: 'user_opt_out'
 *   4. sendEmail.skipped (test env / API key 미설정) → skipped + error 전파
 *   5. sendEmail.ok === false (CON-04 / SDK / timeout) → sent: false + error 전파
 *   6. 정상 발송 → sent: true
 */
export async function sendWeeklyReportEmail(
  args: WeeklyReportEmailArgs,
): Promise<WeeklyReportEmailResult> {
  // 1) parentEmail 사전 검증 — Resend 호출 비용 절감.
  const email = (args.parentEmail ?? "").trim();
  if (email.length === 0) {
    return { sent: false, skipped: true, error: "no_parent_email" };
  }

  // 2) userId 검증 — preference 조회 키.
  const userId = (args.userId ?? "").trim();
  if (userId.length === 0) {
    return { sent: false, skipped: true, error: "no_user_id" };
  }

  // 3) FR-C-NOTIFICATION-PREFERENCE — weeklyReportEmail opt-in 검사.
  const pref = await getNotificationPreference(userId);
  if (!shouldSendEmail(pref, "weeklyReportEmail")) {
    return { sent: false, skipped: true, error: "user_opt_out" };
  }

  // 4) 템플릿 생성.
  const template = buildWeeklyReportEmail({
    parentName: args.parentName,
    childName: args.childName,
    weekNumber: args.report.weekNumber,
    year: args.report.year,
    articulationAvg: args.report.articulationAvg,
    linguisticAvg: args.report.linguisticAvg,
    acousticAvg: args.report.acousticAvg,
    sessionCount: args.report.sessionCount,
    wAurAchieved: args.report.wAurAchieved,
    predictedNextScore: args.report.predictedNextScore,
    dashboardLink: args.dashboardLink,
  });

  // 5) sendEmail 위임 — graceful.
  // tags: R4 — userId / weeklyReport id 미노출. template / week / year 메타만.
  const result = await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    tags: [
      { name: "template", value: "weekly_report" },
      { name: "year", value: String(args.report.year) },
      { name: "week", value: String(args.report.weekNumber) },
    ],
  });

  if (result.skipped) {
    return { sent: false, skipped: true, error: result.error };
  }
  if (!result.ok) {
    return { sent: false, skipped: false, error: result.error };
  }
  return { sent: true, skipped: false };
}

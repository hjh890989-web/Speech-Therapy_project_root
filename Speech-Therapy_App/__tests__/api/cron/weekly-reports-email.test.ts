// FR-C-010 + FR-C-NOTIFICATION-PREFERENCE — /api/cron/weekly-reports route 의
// weekly_report 이메일 발송 path 통합 단위 테스트.
//
// 격리:
//   - @/lib/cron-auth (verifyCronSecret) mock
//   - @/lib/reports/weekly-aggregator mock
//   - @/lib/email/weekly-report-email (sendWeeklyReportEmail) mock
//   - @/lib/db (prisma.user.findUnique) mock — User.email lookup
//   - @/lib/notifications/slack (sendSlackMessage) mock
//   - @/lib/weekly-report (getCurrentWeekNumber) mock
//
// 시나리오 (총 4건):
//   1. 정상 1 user → upsert 1회 + sendWeeklyReportEmail 1회 + emailSentCount=1
//   2. 일부 user 이메일 실패 → 다른 user 계속 처리, emailFailedCount 격리
//   3. sendEmails=false (URL param) → upsert N회 + email 발송 0회 (skip path)
//   4. WEEKLY_REPORT_EMAIL_DISABLED=1 → upsert N회 + email 발송 0회

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyCronSecretMock = vi.fn();
const getActiveUsersMock = vi.fn();
const aggregateWeeklyReportMock = vi.fn();
const upsertWeeklyReportMock = vi.fn();
const sendSlackMessageMock = vi.fn();
const sendWeeklyReportEmailMock = vi.fn();
const findUniqueMock = vi.fn();

vi.mock("@/lib/cron-auth", () => ({
  verifyCronSecret: (...args: unknown[]) => verifyCronSecretMock(...args),
}));

vi.mock("@/lib/reports/weekly-aggregator", () => ({
  getActiveUsers: (...args: unknown[]) => getActiveUsersMock(...args),
  aggregateWeeklyReport: (...args: unknown[]) => aggregateWeeklyReportMock(...args),
  upsertWeeklyReport: (...args: unknown[]) => upsertWeeklyReportMock(...args),
  W_AUR_MIN_SESSIONS: 4,
}));

vi.mock("@/lib/notifications/slack", () => ({
  sendSlackMessage: (...args: unknown[]) => sendSlackMessageMock(...args),
}));

vi.mock("@/lib/email/weekly-report-email", () => ({
  sendWeeklyReportEmail: (...args: unknown[]) => sendWeeklyReportEmailMock(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

vi.mock("@/lib/weekly-report", () => ({
  getCurrentWeekNumber: (date: Date) => ({
    year: date.getUTCFullYear(),
    week: 20,
  }),
}));

import { GET } from "@/app/api/cron/weekly-reports/route";

function makeRequest(url = "http://localhost/api/cron/weekly-reports"): Request {
  return new Request(url);
}

function makeAggData(userId: string, sessionCount: number, wAurAchieved: boolean) {
  return {
    userId,
    year: 2026,
    weekNumber: 20,
    scoreTrend: [],
    articulationAvg: 80,
    linguisticAvg: 70,
    acousticAvg: 75,
    peerPercentileAvg: 60,
    sessionCount,
    wAurAchieved,
    predictedNextScore: 82,
  };
}

beforeEach(() => {
  verifyCronSecretMock.mockReset();
  getActiveUsersMock.mockReset();
  aggregateWeeklyReportMock.mockReset();
  upsertWeeklyReportMock.mockReset();
  sendSlackMessageMock.mockReset();
  sendWeeklyReportEmailMock.mockReset();
  findUniqueMock.mockReset();
  // 환경변수 초기화 — vi.stubEnv 로 격리.
  vi.unstubAllEnvs();

  verifyCronSecretMock.mockReturnValue({ ok: true });
  getActiveUsersMock.mockResolvedValue([]);
  sendSlackMessageMock.mockResolvedValue({ ok: true });
  // findUnique default — email 존재.
  findUniqueMock.mockResolvedValue({ email: "parent@example.com" });
  // sendWeeklyReportEmail default — 정상 발송.
  sendWeeklyReportEmailMock.mockResolvedValue({ sent: true, skipped: false });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("FR-C-010 cron route — weekly_report 이메일 발송 path", () => {
  it("[1] 1 user 정상 → upsert 1 + sendWeeklyReportEmail 1 + emailSentCount=1", async () => {
    getActiveUsersMock.mockResolvedValueOnce(["user-a"]);
    aggregateWeeklyReportMock.mockResolvedValueOnce(makeAggData("user-a", 5, true));

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      successCount: number;
      emailEnabled: boolean;
      emailSentCount: number;
      emailSkippedCount: number;
      emailFailedCount: number;
    };
    expect(body.successCount).toBe(1);
    expect(body.emailEnabled).toBe(true);
    expect(body.emailSentCount).toBe(1);
    expect(body.emailSkippedCount).toBe(0);
    expect(body.emailFailedCount).toBe(0);
    expect(upsertWeeklyReportMock).toHaveBeenCalledTimes(1);
    expect(sendWeeklyReportEmailMock).toHaveBeenCalledTimes(1);

    // sendWeeklyReportEmail 인자 확인 — report 데이터가 aggregator 결과와 매핑.
    const emailArgs = sendWeeklyReportEmailMock.mock.calls[0][0];
    expect(emailArgs.userId).toBe("user-a");
    expect(emailArgs.parentEmail).toBe("parent@example.com");
    expect(emailArgs.report.weekNumber).toBe(20);
    expect(emailArgs.report.year).toBe(2026);
    expect(emailArgs.report.articulationAvg).toBe(80);
    expect(emailArgs.report.wAurAchieved).toBe(true);
    expect(emailArgs.report.predictedNextScore).toBe(82);
    expect(emailArgs.report.sessionCount).toBe(5);
    expect(emailArgs.dashboardLink).toContain("/weekly-review");
  });

  it("[2] 일부 user 이메일 실패 → 다른 user 계속 처리 + emailFailedCount 격리", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getActiveUsersMock.mockResolvedValueOnce(["u1", "u2", "u3"]);
    aggregateWeeklyReportMock
      .mockResolvedValueOnce(makeAggData("u1", 5, true))
      .mockResolvedValueOnce(makeAggData("u2", 4, true))
      .mockResolvedValueOnce(makeAggData("u3", 6, true));
    // email 결과: u1 sent / u2 throw / u3 skipped (user_opt_out)
    sendWeeklyReportEmailMock
      .mockResolvedValueOnce({ sent: true, skipped: false })
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockResolvedValueOnce({
        sent: false,
        skipped: true,
        error: "user_opt_out",
      });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      successCount: number;
      failureCount: number;
      emailSentCount: number;
      emailSkippedCount: number;
      emailFailedCount: number;
    };
    // 3명 모두 upsert 성공 (이메일 실패는 cron 전체 실패에 영향 X).
    expect(body.successCount).toBe(3);
    expect(body.failureCount).toBe(0);
    expect(upsertWeeklyReportMock).toHaveBeenCalledTimes(3);
    expect(sendWeeklyReportEmailMock).toHaveBeenCalledTimes(3);
    // 이메일 분기 카운트: sent=1 / skipped=1 / failed=1.
    expect(body.emailSentCount).toBe(1);
    expect(body.emailSkippedCount).toBe(1);
    expect(body.emailFailedCount).toBe(1);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("[3] sendEmails=false (URL param) → upsert N회 + email 발송 0회", async () => {
    getActiveUsersMock.mockResolvedValueOnce(["u1", "u2"]);
    aggregateWeeklyReportMock
      .mockResolvedValueOnce(makeAggData("u1", 5, true))
      .mockResolvedValueOnce(makeAggData("u2", 3, false));

    const res = await GET(
      makeRequest("http://localhost/api/cron/weekly-reports?sendEmails=false"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      successCount: number;
      emailEnabled: boolean;
      emailSentCount: number;
      emailSkippedCount: number;
      emailFailedCount: number;
    };
    expect(body.successCount).toBe(2);
    expect(body.emailEnabled).toBe(false);
    // upsert 는 진행 — 이메일만 skip.
    expect(upsertWeeklyReportMock).toHaveBeenCalledTimes(2);
    expect(sendWeeklyReportEmailMock).not.toHaveBeenCalled();
    // FR-PERF-2-TAG-INVALIDATE — findUnique 는 institutionId 수집을 위해 sendEmails
    // 무관 항상 호출. 단 이메일 발송은 skip (sendEmailsEnabled flag 가 별도 가드).
    expect(findUniqueMock).toHaveBeenCalledTimes(2);
    expect(body.emailSentCount).toBe(0);
    expect(body.emailSkippedCount).toBe(0);
    expect(body.emailFailedCount).toBe(0);
  });

  it("[4] WEEKLY_REPORT_EMAIL_DISABLED=1 → upsert N회 + email 발송 0회", async () => {
    vi.stubEnv("WEEKLY_REPORT_EMAIL_DISABLED", "1");
    getActiveUsersMock.mockResolvedValueOnce(["u1"]);
    aggregateWeeklyReportMock.mockResolvedValueOnce(makeAggData("u1", 5, true));

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      successCount: number;
      emailEnabled: boolean;
      emailSentCount: number;
    };
    expect(body.successCount).toBe(1);
    expect(body.emailEnabled).toBe(false);
    expect(upsertWeeklyReportMock).toHaveBeenCalledTimes(1);
    expect(sendWeeklyReportEmailMock).not.toHaveBeenCalled();
    expect(body.emailSentCount).toBe(0);
  });

  it("[5] User.email 부재 (parent email null) → sendWeeklyReportEmail 의 'no_parent_email' skip 분기 도달", async () => {
    getActiveUsersMock.mockResolvedValueOnce(["u-no-email"]);
    aggregateWeeklyReportMock.mockResolvedValueOnce(
      makeAggData("u-no-email", 5, true),
    );
    findUniqueMock.mockResolvedValueOnce({ email: null });
    // sendWeeklyReportEmail mock 이 빈 email 을 받고 skipped 응답을 반환.
    sendWeeklyReportEmailMock.mockResolvedValueOnce({
      sent: false,
      skipped: true,
      error: "no_parent_email",
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      emailSentCount: number;
      emailSkippedCount: number;
    };
    expect(body.emailSentCount).toBe(0);
    expect(body.emailSkippedCount).toBe(1);
    // sendWeeklyReportEmail 의 parentEmail 인자가 빈 string 으로 전달.
    const call = sendWeeklyReportEmailMock.mock.calls[0][0];
    expect(call.parentEmail).toBe("");
  });
});

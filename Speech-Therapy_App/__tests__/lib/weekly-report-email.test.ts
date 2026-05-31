// FR-C-010 + FR-C-NOTIFICATION-PREFERENCE — sendWeeklyReportEmail + buildWeeklyReportEmail
// 단위 테스트.
//
// 격리:
//   - @/lib/email/resend (sendEmail) mock
//   - @/lib/notifications/preference (getNotificationPreference / shouldSendEmail) mock
//
// 시나리오 (총 9건):
//   1. 정상 발송 → sent: true, sendEmail 호출 1회 + tags 정상
//   2. weeklyReportEmail=false → skipped 'user_opt_out', sendEmail 미호출
//   3. parentEmail 빈값 → skipped 'no_parent_email'
//   4. userId 빈값 → skipped 'no_user_id'
//   5. sendEmail.skipped → result.skipped + error 전파
//   6. sendEmail.ok=false → result.skipped=false + error 전파
//   7. buildWeeklyReportEmail — CON-04 금칙어 0건 (subject/html/text)
//   8. buildWeeklyReportEmail — dashboardLink + 의료 disclaimer 포함
//   9. buildWeeklyReportEmail — predictedNextScore=null 시 "데이터가 더 모이면" 표시

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendEmailMock = vi.fn();
vi.mock("@/lib/email/resend", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

const getPrefMock = vi.fn();
vi.mock("@/lib/notifications/preference", () => ({
  getNotificationPreference: (...args: unknown[]) => getPrefMock(...args),
  shouldSendEmail: (pref: Record<string, boolean>, kind: string) =>
    pref[kind] !== false,
}));

import { sendWeeklyReportEmail } from "@/lib/email/weekly-report-email";
import { buildWeeklyReportEmail } from "@/lib/email/templates";
import { hasBannedTerm } from "@/lib/forbidden-words";

const BASE_REPORT = {
  weekNumber: 20,
  year: 2026,
  articulationAvg: 80.2,
  linguisticAvg: 72.0,
  acousticAvg: 78.6,
  sessionCount: 5,
  missionCompletedCount: 5,
  wAurAchieved: true,
  predictedNextScore: 82.5,
};

const BASE_ARGS = {
  userId: "user-uuid-weekly-1111",
  parentEmail: "parent@example.com",
  parentName: "김민지",
  childName: "지우",
  dashboardLink: "https://speech-therapy.app/weekly-review",
  report: BASE_REPORT,
};

const FORBIDDEN_MEDICAL = ["치료", "진단", "장애"];

beforeEach(() => {
  sendEmailMock.mockReset();
  getPrefMock.mockReset();
  // default — opt-in 모두 true.
  getPrefMock.mockResolvedValue({
    weeklyReportEmail: true,
    cushionNoteEmail: true,
    consentReminderEmail: true,
    parentInviteEmail: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendWeeklyReportEmail — 정상 흐름", () => {
  it("[1] 정상 발송 → sent: true + sendEmail 1회 + tags 정확", async () => {
    sendEmailMock.mockResolvedValueOnce({
      ok: true,
      skipped: false,
      id: "email-week-1",
    });
    const result = await sendWeeklyReportEmail(BASE_ARGS);
    expect(result.sent).toBe(true);
    expect(result.skipped).toBe(false);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const call = sendEmailMock.mock.calls[0][0];
    expect(call.to).toBe("parent@example.com");
    // R4 — tags 에는 userId / weeklyReport id 미포함, week / year / template 만.
    expect(call.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "template", value: "weekly_report" }),
        expect.objectContaining({ name: "year", value: "2026" }),
        expect.objectContaining({ name: "week", value: "20" }),
      ]),
    );
    // subject 에 자녀 이름 + 주차 포함.
    expect(call.subject).toContain("지우");
    expect(call.subject).toContain("20주차");
  });
});

describe("sendWeeklyReportEmail — preference / 입력 검증", () => {
  it("[2] weeklyReportEmail=false → skipped 'user_opt_out' + sendEmail 미호출", async () => {
    getPrefMock.mockResolvedValueOnce({
      weeklyReportEmail: false,
      cushionNoteEmail: true,
      consentReminderEmail: true,
      parentInviteEmail: true,
    });
    const result = await sendWeeklyReportEmail(BASE_ARGS);
    expect(result.sent).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toBe("user_opt_out");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("[3] parentEmail 빈값 → skipped 'no_parent_email' (preference 미호출)", async () => {
    const result = await sendWeeklyReportEmail({
      ...BASE_ARGS,
      parentEmail: "   ",
    });
    expect(result.sent).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toBe("no_parent_email");
    expect(getPrefMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("[4] userId 빈값 → skipped 'no_user_id' (preference 미호출)", async () => {
    const result = await sendWeeklyReportEmail({
      ...BASE_ARGS,
      userId: "",
    });
    expect(result.sent).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toBe("no_user_id");
    expect(getPrefMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("sendWeeklyReportEmail — sendEmail 위임 graceful", () => {
  it("[5] sendEmail.skipped (test env) → result.skipped + error 전파", async () => {
    sendEmailMock.mockResolvedValueOnce({
      ok: false,
      skipped: true,
      error: "test_env_skip",
    });
    const result = await sendWeeklyReportEmail(BASE_ARGS);
    expect(result.sent).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toBe("test_env_skip");
  });

  it("[6] sendEmail.ok=false (Resend SDK 실패) → sent: false + error 전파 (throw 금지)", async () => {
    sendEmailMock.mockResolvedValueOnce({
      ok: false,
      skipped: false,
      error: "network down",
    });
    const result = await sendWeeklyReportEmail(BASE_ARGS);
    expect(result.sent).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.error).toBe("network down");
  });
});

describe("buildWeeklyReportEmail — CON-04 / 본문 정합", () => {
  it("[7] subject / html / text 금칙어 0건 (기본 본문)", () => {
    const tpl = buildWeeklyReportEmail({
      parentName: "김민지",
      childName: "지우",
      weekNumber: 20,
      year: 2026,
      articulationAvg: 80,
      linguisticAvg: 70,
      acousticAvg: 75,
      sessionCount: 5,
      missionCompletedCount: 5,
      wAurAchieved: true,
      predictedNextScore: 80,
      dashboardLink: "https://speech-therapy.app/weekly-review",
    });
    expect(hasBannedTerm(tpl.subject)).toBe(false);
    expect(hasBannedTerm(tpl.html)).toBe(false);
    expect(hasBannedTerm(tpl.text)).toBe(false);
    // 추가 sanity — 명시적 금칙어 string scan.
    for (const w of FORBIDDEN_MEDICAL) {
      expect(tpl.subject).not.toContain(w);
      expect(tpl.html).not.toContain(w);
      expect(tpl.text).not.toContain(w);
    }
  });

  it("[8] dashboardLink + 의료 disclaimer 본문 포함", () => {
    const tpl = buildWeeklyReportEmail({
      parentName: "김민지",
      childName: "지우",
      weekNumber: 20,
      year: 2026,
      articulationAvg: 80,
      linguisticAvg: 70,
      acousticAvg: 75,
      sessionCount: 5,
      missionCompletedCount: 5,
      wAurAchieved: true,
      predictedNextScore: 80,
      dashboardLink: "https://speech-therapy.app/weekly-review",
    });
    // dashboardLink — html / text 양쪽 포함.
    expect(tpl.html).toContain("https://speech-therapy.app/weekly-review");
    expect(tpl.text).toContain("https://speech-therapy.app/weekly-review");
    // 의료 disclaimer.
    expect(tpl.html).toContain("의료 서비스가 아닌");
    expect(tpl.text).toContain("의료 서비스가 아닌");
    // 인사말 — parentName 우선.
    expect(tpl.html).toContain("김민지 부모님께");
  });

  it("[9] predictedNextScore=null → '데이터가 더 모이면' 문구 노출", () => {
    const tpl = buildWeeklyReportEmail({
      parentName: "김민지",
      childName: "지우",
      weekNumber: 20,
      year: 2026,
      articulationAvg: 80,
      linguisticAvg: 70,
      acousticAvg: 75,
      sessionCount: 5,
      missionCompletedCount: 5,
      wAurAchieved: true,
      predictedNextScore: null,
      dashboardLink: "https://speech-therapy.app/weekly-review",
    });
    expect(tpl.html).toContain("데이터가 더 모이면");
    expect(tpl.text).toContain("데이터가 더 모이면");
  });

  it("[10] wAurAchieved=false → 격려 카피 표시", () => {
    const tpl = buildWeeklyReportEmail({
      childName: "지우",
      weekNumber: 20,
      year: 2026,
      articulationAvg: 60,
      linguisticAvg: 55,
      acousticAvg: 50,
      sessionCount: 2,
      missionCompletedCount: 1,
      wAurAchieved: false,
      predictedNextScore: 60,
      dashboardLink: "https://speech-therapy.app/weekly-review",
    });
    expect(tpl.html).toContain("다음 주에 다시 함께해요");
    expect(tpl.text).toContain("다음 주에 다시 함께해요");
    // wAurAchieved=true 카피와 충돌 없음.
    expect(tpl.html).not.toContain("주간 활동 목표를 달성했어요");
  });

  it("[11] HTML escape — childName XSS 무효화", () => {
    const tpl = buildWeeklyReportEmail({
      childName: `<script>alert(1)</script>`,
      weekNumber: 20,
      year: 2026,
      articulationAvg: 80,
      linguisticAvg: 70,
      acousticAvg: 75,
      sessionCount: 5,
      missionCompletedCount: 5,
      wAurAchieved: true,
      predictedNextScore: 80,
      dashboardLink: "https://speech-therapy.app/weekly-review",
    });
    expect(tpl.html).not.toContain("<script>alert(1)</script>");
    expect(tpl.html).toContain("&lt;script&gt;");
  });
});

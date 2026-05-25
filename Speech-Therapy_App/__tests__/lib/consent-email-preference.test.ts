// FR-C-NOTIFICATION-PREFERENCE — sendConsentEmailWithPreference 단위 테스트.
//
// 격리:
//   - @/lib/email/resend (sendEmail) mock
//   - @/lib/notifications/preference (getNotificationPreference / shouldSendEmail) mock
//   - @/lib/db (prisma.user.findFirst) mock
//
// 시나리오 (총 7건):
//   1. parentEmail 부재 (빈 문자열) → preference 체크 우회, sendEmail 그대로 위임
//   2. parentEmail 부재 + skipPreferenceCheck=true → preference 체크 우회, sendEmail 위임
//   3. User row 부재 (가입 전 부모) → preference 미적용, sendEmail 그대로 호출
//   4. User row 존재 + consentReminderEmail=true → sendEmail 호출, 결과 전파
//   5. User row 존재 + consentReminderEmail=false → skipped + 'user_opt_out', sendEmail 미호출
//   6. skipPreferenceCheck=true → user lookup 자체 생략, sendEmail 강제 호출
//   7. prisma lookup throw → graceful 발송 (안전한 기본값 정책)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendEmailMock = vi.fn();
const getPrefMock = vi.fn();
const userFindFirstMock = vi.fn();

vi.mock("@/lib/email/resend", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

vi.mock("@/lib/notifications/preference", () => ({
  getNotificationPreference: (...args: unknown[]) => getPrefMock(...args),
  shouldSendEmail: (pref: Record<string, boolean>, kind: string) =>
    pref?.[kind] !== false,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => userFindFirstMock(...args),
    },
  },
}));

import { sendConsentEmailWithPreference } from "@/lib/consent/email";

const BASE_ARGS = {
  to: "parent@example.com",
  parentEmail: "parent@example.com",
  subject: "[Speech-Therapy] 동의서 안내",
  html: "<p>본문</p>",
  text: "본문",
  tags: [{ name: "template", value: "consent_signature" }],
};

beforeEach(() => {
  sendEmailMock.mockReset();
  getPrefMock.mockReset();
  userFindFirstMock.mockReset();
  sendEmailMock.mockResolvedValue({ ok: true, id: "email-x", skipped: false });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendConsentEmailWithPreference — parentEmail 부재 분기", () => {
  it("[1] parentEmail 빈 문자열 → preference 체크 우회 + sendEmail 그대로 위임", async () => {
    const result = await sendConsentEmailWithPreference({
      ...BASE_ARGS,
      parentEmail: "",
    });
    expect(result.ok).toBe(true);
    expect(getPrefMock).not.toHaveBeenCalled();
    expect(userFindFirstMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("[2] parentEmail 공백 only → preference 체크 우회 (.trim() 처리)", async () => {
    const result = await sendConsentEmailWithPreference({
      ...BASE_ARGS,
      parentEmail: "   ",
    });
    expect(result.ok).toBe(true);
    expect(getPrefMock).not.toHaveBeenCalled();
    expect(userFindFirstMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });
});

describe("sendConsentEmailWithPreference — User lookup + preference 분기", () => {
  it("[3] User row 부재 (가입 전 부모) → preference 미적용, sendEmail 그대로 호출", async () => {
    userFindFirstMock.mockResolvedValueOnce(null);
    const result = await sendConsentEmailWithPreference({
      ...BASE_ARGS,
      parentEmail: "new-parent@example.com",
    });
    expect(result.ok).toBe(true);
    expect(userFindFirstMock).toHaveBeenCalledTimes(1);
    expect(getPrefMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    // sendEmail 호출 시 parentEmail / skipPreferenceCheck 는 전파되지 않음 (helper-only 필드).
    const sentArgs = sendEmailMock.mock.calls[0][0];
    expect(sentArgs.parentEmail).toBeUndefined();
    expect(sentArgs.skipPreferenceCheck).toBeUndefined();
    expect(sentArgs.to).toBe("parent@example.com");
  });

  it("[4] 가입한 user + consentReminderEmail=true → sendEmail 호출 + 결과 전파", async () => {
    userFindFirstMock.mockResolvedValueOnce({ id: "user-opt-in" });
    getPrefMock.mockResolvedValueOnce({
      weeklyReportEmail: true,
      cushionNoteEmail: true,
      consentReminderEmail: true,
      parentInviteEmail: true,
    });
    sendEmailMock.mockResolvedValueOnce({
      ok: true,
      id: "email-opt-in",
      skipped: false,
    });
    const result = await sendConsentEmailWithPreference(BASE_ARGS);
    expect(result.ok).toBe(true);
    expect(result.id).toBe("email-opt-in");
    expect(userFindFirstMock).toHaveBeenCalledWith({
      where: { email: "parent@example.com" },
      select: { id: true },
    });
    expect(getPrefMock).toHaveBeenCalledWith("user-opt-in");
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("[5] 가입한 user + consentReminderEmail=false → skipped 'user_opt_out', sendEmail 미호출", async () => {
    userFindFirstMock.mockResolvedValueOnce({ id: "user-opt-out" });
    getPrefMock.mockResolvedValueOnce({
      weeklyReportEmail: true,
      cushionNoteEmail: true,
      consentReminderEmail: false, // 사용자 opt-out
      parentInviteEmail: true,
    });
    const result = await sendConsentEmailWithPreference(BASE_ARGS);
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toBe("user_opt_out");
    expect(userFindFirstMock).toHaveBeenCalledTimes(1);
    expect(getPrefMock).toHaveBeenCalledWith("user-opt-out");
    // sendEmail 호출 비용 절약 — Resend SDK 미호출.
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("sendConsentEmailWithPreference — skipPreferenceCheck 우회", () => {
  it("[6] skipPreferenceCheck=true → user lookup 자체 생략 + sendEmail 강제 호출", async () => {
    // opt-out user 가 있어도 우회 옵션이면 발송 진행.
    userFindFirstMock.mockResolvedValueOnce({ id: "user-opt-out" });
    getPrefMock.mockResolvedValueOnce({
      consentReminderEmail: false,
    } as Record<string, boolean>);
    sendEmailMock.mockResolvedValueOnce({
      ok: true,
      id: "email-forced",
      skipped: false,
    });
    const result = await sendConsentEmailWithPreference({
      ...BASE_ARGS,
      skipPreferenceCheck: true,
    });
    expect(result.ok).toBe(true);
    expect(result.id).toBe("email-forced");
    // user lookup 자체가 발생하지 않음 (skipPreferenceCheck=true 가 가장 먼저 분기).
    expect(userFindFirstMock).not.toHaveBeenCalled();
    expect(getPrefMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });
});

describe("sendConsentEmailWithPreference — DB graceful 분기", () => {
  it("[7] prisma lookup throw → graceful 발송 (안전한 기본값 정책)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    userFindFirstMock.mockRejectedValueOnce(new Error("DB connection lost"));
    sendEmailMock.mockResolvedValueOnce({
      ok: true,
      id: "email-graceful",
      skipped: false,
    });
    const result = await sendConsentEmailWithPreference(BASE_ARGS);
    expect(result.ok).toBe(true);
    expect(result.id).toBe("email-graceful");
    expect(userFindFirstMock).toHaveBeenCalledTimes(1);
    // DB 실패 시 preference 체크 skip + sendEmail 호출 — 발송 누락 < 미발송 누락 정책.
    expect(getPrefMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

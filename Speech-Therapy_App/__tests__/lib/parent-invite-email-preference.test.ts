// FR-C-NOTIFICATION-PREFERENCE — sendParentInviteEmailWithPreference unit 테스트.
//
// 격리:
//   - @/lib/db (prisma.user.findFirst) mock
//   - @/lib/email/resend (sendEmail) mock
//   - @/lib/notifications/preference (getNotificationPreference / shouldSendEmail) mock
//
// 시나리오 (총 6건):
//   1. parentEmail 빈값 → skipped 'no_parent_email' (lookup + sendEmail 둘 다 미호출)
//   2. User 미존재 (가입 전 부모) → preference 체크 우회, sendEmail 정상 호출
//   3. User 존재 + parentInviteEmail=true → sendEmail 정상 호출
//   4. User 존재 + parentInviteEmail=false → skipped 'user_opt_out', sendEmail 미호출
//   5. prisma findFirst throw → preference 우회 + sendEmail 정상 호출 (graceful)
//   6. parentEmail 대문자 입력 → 소문자 정규화 후 lookup + sendEmail

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
  },
}));

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

import { sendParentInviteEmailWithPreference } from "@/lib/parent-invite/email-with-preference";

const BASE_ARGS = {
  parentEmail: "parent@example.com",
  subject: "[행복어린이집] 부모님 초대",
  html: "<p>가입 링크</p>",
  text: "가입 링크",
  tags: [{ name: "template", value: "parent_invite" }],
};

beforeEach(() => {
  findFirstMock.mockReset();
  sendEmailMock.mockReset();
  getPrefMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendParentInviteEmailWithPreference — FR-C-NOTIFICATION-PREFERENCE", () => {
  it("[1] parentEmail 빈값 → skipped 'no_parent_email' (lookup + sendEmail 미호출)", async () => {
    const result = await sendParentInviteEmailWithPreference({
      ...BASE_ARGS,
      parentEmail: "   ",
    });
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toBe("no_parent_email");
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(getPrefMock).not.toHaveBeenCalled();
  });

  it("[2] User 미존재 (가입 전 부모) → preference 체크 우회 + sendEmail 정상 호출", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    sendEmailMock.mockResolvedValueOnce({
      ok: true,
      skipped: false,
      id: "email-pre-signup",
    });
    const result = await sendParentInviteEmailWithPreference(BASE_ARGS);
    expect(result.ok).toBe(true);
    expect(findFirstMock).toHaveBeenCalledTimes(1);
    expect(getPrefMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    // sendEmail 인자 — subject / html / text 그대로 전달.
    const call = sendEmailMock.mock.calls[0][0];
    expect(call.to).toBe("parent@example.com");
    expect(call.subject).toBe(BASE_ARGS.subject);
    expect(call.tags).toEqual(BASE_ARGS.tags);
  });

  it("[3] User 존재 + parentInviteEmail=true → sendEmail 정상 호출", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "user-aaa" });
    getPrefMock.mockResolvedValueOnce({
      weeklyReportEmail: true,
      cushionNoteEmail: true,
      consentReminderEmail: true,
      parentInviteEmail: true,
    });
    sendEmailMock.mockResolvedValueOnce({
      ok: true,
      skipped: false,
      id: "email-opt-in",
    });
    const result = await sendParentInviteEmailWithPreference(BASE_ARGS);
    expect(result.ok).toBe(true);
    expect(getPrefMock).toHaveBeenCalledWith("user-aaa");
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("[4] User 존재 + parentInviteEmail=false → skipped 'user_opt_out', sendEmail 미호출", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "user-bbb" });
    getPrefMock.mockResolvedValueOnce({
      weeklyReportEmail: true,
      cushionNoteEmail: true,
      consentReminderEmail: true,
      parentInviteEmail: false, // opt-out
    });
    const result = await sendParentInviteEmailWithPreference(BASE_ARGS);
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toBe("user_opt_out");
    expect(getPrefMock).toHaveBeenCalledWith("user-bbb");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("[5] prisma findFirst throw → preference 우회 + sendEmail 정상 호출 (graceful)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    findFirstMock.mockRejectedValueOnce(new Error("connection lost"));
    sendEmailMock.mockResolvedValueOnce({
      ok: true,
      skipped: false,
      id: "email-graceful",
    });
    const result = await sendParentInviteEmailWithPreference(BASE_ARGS);
    expect(result.ok).toBe(true);
    expect(getPrefMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("[6] parentEmail 대문자 입력 → 소문자 정규화 후 lookup + sendEmail", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    sendEmailMock.mockResolvedValueOnce({
      ok: true,
      skipped: false,
      id: "email-case",
    });
    const result = await sendParentInviteEmailWithPreference({
      ...BASE_ARGS,
      parentEmail: "Parent@Example.COM",
    });
    expect(result.ok).toBe(true);
    // findFirst 의 where.email 이 lowercase 로 전달.
    const lookupCall = findFirstMock.mock.calls[0][0];
    expect(lookupCall.where.email).toBe("parent@example.com");
    // sendEmail.to 도 lowercase.
    const sendCall = sendEmailMock.mock.calls[0][0];
    expect(sendCall.to).toBe("parent@example.com");
  });
});

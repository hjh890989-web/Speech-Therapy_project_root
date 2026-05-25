// FR-C-NOTIFICATION-PREFERENCE — sendCushionNoteEmail 의 preference 통합 단위 테스트.
//
// 격리:
//   - @/lib/email/resend mock (sendEmail)
//   - @/lib/notifications/preference mock (getNotificationPreference / shouldSendEmail)
//
// 시나리오 (총 4건):
//   1. recipientUserId 미전달 (legacy 호출자) → preference 체크 우회, sendEmail 정상 호출
//   2. recipientUserId 전달 + cushionNoteEmail=true → sendEmail 정상 호출 + sent: true
//   3. recipientUserId 전달 + cushionNoteEmail=false → skipped: 'user_opt_out', sendEmail 미호출
//   4. recipientUserId 가 빈 문자열 → preference 체크 우회 (legacy 동등)

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

import { sendCushionNoteEmail } from "@/lib/cushion/email";

const BASE_ARGS = {
  evaluationResultId: "eval-pref-1",
  parentEmail: "parent@example.com",
  parentName: "김민지",
  childName: "지우",
  noteText: "보호자님, 오늘 발음을 함께 연습했어요.",
  senderName: "홍길동",
  institutionName: "행복어린이집",
};

beforeEach(() => {
  sendEmailMock.mockReset();
  getPrefMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendCushionNoteEmail — FR-C-NOTIFICATION-PREFERENCE 통합", () => {
  it("[1] recipientUserId 미전달 (legacy) → preference 체크 우회, sendEmail 정상 호출", async () => {
    sendEmailMock.mockResolvedValue({
      ok: true,
      skipped: false,
      id: "email-legacy",
    });
    const result = await sendCushionNoteEmail(BASE_ARGS);
    expect(result.sent).toBe(true);
    expect(getPrefMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("[2] recipientUserId 전달 + cushionNoteEmail=true → sendEmail 정상 호출 + sent: true", async () => {
    getPrefMock.mockResolvedValueOnce({
      weeklyReportEmail: true,
      cushionNoteEmail: true,
      consentReminderEmail: true,
      parentInviteEmail: true,
    });
    sendEmailMock.mockResolvedValue({
      ok: true,
      skipped: false,
      id: "email-opt-in",
    });
    const result = await sendCushionNoteEmail({
      ...BASE_ARGS,
      recipientUserId: "user-uuid-opt-in-aaaa",
    });
    expect(result.sent).toBe(true);
    expect(result.skipped).toBe(false);
    expect(getPrefMock).toHaveBeenCalledWith("user-uuid-opt-in-aaaa");
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("[3] recipientUserId 전달 + cushionNoteEmail=false → skipped 'user_opt_out', sendEmail 미호출", async () => {
    getPrefMock.mockResolvedValueOnce({
      weeklyReportEmail: true,
      cushionNoteEmail: false, // 사용자 opt-out
      consentReminderEmail: true,
      parentInviteEmail: true,
    });
    const result = await sendCushionNoteEmail({
      ...BASE_ARGS,
      recipientUserId: "user-uuid-opt-out-bbbb",
    });
    expect(result.sent).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toBe("user_opt_out");
    expect(getPrefMock).toHaveBeenCalledWith("user-uuid-opt-out-bbbb");
    // sendEmail 자체 호출 X — Resend 호출 비용 절약.
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("[4] recipientUserId 가 빈 문자열 → preference 체크 우회 (legacy 동등)", async () => {
    sendEmailMock.mockResolvedValue({
      ok: true,
      skipped: false,
      id: "email-empty-uid",
    });
    const result = await sendCushionNoteEmail({
      ...BASE_ARGS,
      recipientUserId: "   ",
    });
    expect(result.sent).toBe(true);
    expect(getPrefMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("[5] preference skip 분기는 parentEmail / noteText 부재 분기보다 _뒤_ 에 평가 (호출 비용 최적화)", async () => {
    // parentEmail 부재 — preference 체크 자체 발생 X (이전 단계에서 short-circuit).
    const result = await sendCushionNoteEmail({
      ...BASE_ARGS,
      parentEmail: "",
      recipientUserId: "user-uuid-cccc",
    });
    expect(result.sent).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toBe("no_parent_email");
    expect(getPrefMock).not.toHaveBeenCalled();
  });
});

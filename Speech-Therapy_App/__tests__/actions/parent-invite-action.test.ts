// FR-Q-009 / FR-C-005 — sendParentInvite Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser + from(User).select)
//   - @/lib/email/resend mock (sendEmail)
//   - @/lib/auth/parent-invite mock (createParentInviteToken)
//   - @/lib/db (prisma.user.findFirst) mock — FR-C-NOTIFICATION-PREFERENCE wrapper 가 user lookup
//   - @/lib/notifications/preference mock — wrapper 의 opt-out 체크 우회 (본 파일 검증 X)
//
// 시나리오:
//   1. 비로그인 → unauthorized, sent=false, skipped=true, sendEmail 미호출
//   2. parent role → forbidden
//   3. expert role → forbidden (admin/principal 만 허용)
//   4. institutionId 부재 → forbidden
//   5. 정상 (principal) → sendEmail 호출 + sent=true
//   6. 빈 parentEmail → invalid_input
//   7. parentEmail @ 부재 → invalid_input
//   8. createParentInviteToken throw (secret 미설정) → jwt_misconfigured graceful
//   9. sendEmail ok=false → email_failed graceful, tokenIssued=true
//  10. sendEmail 정상 → tags 에 'parent_invite' 포함

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getUserMock = vi.fn();
const fromSelectMaybeSingleMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: string) => ({
          maybeSingle: () => fromSelectMaybeSingleMock(),
        }),
      }),
    }),
  }),
}));

const sendEmailMock = vi.fn();
vi.mock("@/lib/email/resend", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

const createTokenMock = vi.fn();
vi.mock("@/lib/auth/parent-invite", () => ({
  createParentInviteToken: (...args: unknown[]) => createTokenMock(...args),
}));

// FR-C-NOTIFICATION-PREFERENCE — wrapper 의 user lookup / preference 체크 mock.
// 본 파일은 sendParentInvite 의 RBAC + 발송 흐름 검증 — preference 분기는
// __tests__/lib/parent-invite-email-preference.test.ts 가 별도 검증.
const findFirstMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
  },
}));

const getPrefMock = vi.fn();
vi.mock("@/lib/notifications/preference", () => ({
  getNotificationPreference: (...args: unknown[]) => getPrefMock(...args),
  shouldSendEmail: (pref: Record<string, boolean>, kind: string) =>
    pref[kind] !== false,
}));

import { sendParentInvite } from "@/app/actions/parent-invite";

const PRINCIPAL_USER = "11111111-1111-4111-8111-111111111111";
const INSTITUTION = "22222222-2222-4222-8222-222222222222";
const CHILD_ID = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  getUserMock.mockReset();
  fromSelectMaybeSingleMock.mockReset();
  sendEmailMock.mockReset();
  createTokenMock.mockReset();
  findFirstMock.mockReset();
  getPrefMock.mockReset();

  // 기본값 — 정상 흐름 가정.
  createTokenMock.mockResolvedValue("jwt.payload.signature");
  sendEmailMock.mockResolvedValue({ ok: true, id: "email-1", skipped: false });
  // 기본: 가입 전 부모 (User 미존재) — wrapper 가 preference 체크 우회, sendEmail 호출.
  findFirstMock.mockResolvedValue(null);
  // 안전 default — preference 체크가 발생해도 모두 opt-in (관찰 X).
  getPrefMock.mockResolvedValue({
    weeklyReportEmail: true,
    cushionNoteEmail: true,
    consentReminderEmail: true,
    parentInviteEmail: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("sendParentInvite — 입력 검증", () => {
  it("빈 parentEmail → invalid_input", async () => {
    const out = await sendParentInvite({
      parentEmail: "  ",
      childId: CHILD_ID,
      institutionName: "행복어린이집",
    });
    expect(out.sent).toBe(false);
    expect(out.skipped).toBe(true);
    expect(out.reason).toBe("invalid_input");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("parentEmail @ 부재 → invalid_input", async () => {
    const out = await sendParentInvite({
      parentEmail: "not-an-email",
      childId: CHILD_ID,
      institutionName: "행복어린이집",
    });
    expect(out.reason).toBe("invalid_input");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("빈 childId → invalid_input", async () => {
    const out = await sendParentInvite({
      parentEmail: "p@example.com",
      childId: "",
      institutionName: "행복어린이집",
    });
    expect(out.reason).toBe("invalid_input");
  });
});

describe("sendParentInvite — RBAC", () => {
  it("비로그인 (user null) → unauthorized", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const out = await sendParentInvite({
      parentEmail: "p@example.com",
      childId: CHILD_ID,
      institutionName: "행복어린이집",
    });
    expect(out.reason).toBe("unauthorized");
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(createTokenMock).not.toHaveBeenCalled();
  });

  it("parent role → forbidden", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: PRINCIPAL_USER } },
      error: null,
    });
    fromSelectMaybeSingleMock.mockResolvedValue({
      data: { role: "parent", institutionId: INSTITUTION },
      error: null,
    });
    const out = await sendParentInvite({
      parentEmail: "p@example.com",
      childId: CHILD_ID,
      institutionName: "행복어린이집",
    });
    expect(out.reason).toBe("forbidden");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("expert role → forbidden (admin/principal 만 허용)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: PRINCIPAL_USER } },
      error: null,
    });
    fromSelectMaybeSingleMock.mockResolvedValue({
      data: { role: "expert", institutionId: INSTITUTION },
      error: null,
    });
    const out = await sendParentInvite({
      parentEmail: "p@example.com",
      childId: CHILD_ID,
      institutionName: "행복어린이집",
    });
    expect(out.reason).toBe("forbidden");
  });

  it("institutionId 부재 → forbidden", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: PRINCIPAL_USER } },
      error: null,
    });
    fromSelectMaybeSingleMock.mockResolvedValue({
      data: { role: "principal", institutionId: null },
      error: null,
    });
    const out = await sendParentInvite({
      parentEmail: "p@example.com",
      childId: CHILD_ID,
      institutionName: "행복어린이집",
    });
    expect(out.reason).toBe("forbidden");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("sendParentInvite — 정상 흐름 + graceful", () => {
  beforeEach(() => {
    getUserMock.mockResolvedValue({
      data: { user: { id: PRINCIPAL_USER } },
      error: null,
    });
    fromSelectMaybeSingleMock.mockResolvedValue({
      data: { role: "principal", institutionId: INSTITUTION },
      error: null,
    });
  });

  it("정상 → sendEmail 호출 + sent=true + tokenIssued=true", async () => {
    const out = await sendParentInvite({
      parentEmail: "Parent@Example.COM",
      childId: CHILD_ID,
      institutionName: "행복어린이집",
      senderName: "홍길동",
      childName: "지우",
    });
    expect(out.sent).toBe(true);
    expect(out.skipped).toBe(false);
    expect(out.tokenIssued).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledOnce();

    // JWT 토큰 발급 시 parentEmail 정규화 (소문자) 확인.
    const tokenInput = createTokenMock.mock.calls[0]![0] as {
      parentEmail: string;
      institutionId: string;
      childId: string;
    };
    expect(tokenInput.parentEmail).toBe("parent@example.com");
    expect(tokenInput.institutionId).toBe(INSTITUTION);
    expect(tokenInput.childId).toBe(CHILD_ID);

    // sendEmail 호출 인자 확인.
    const sendInput = sendEmailMock.mock.calls[0]![0] as {
      to: string;
      tags?: Array<{ name: string; value: string }>;
      html?: string;
    };
    expect(sendInput.to).toBe("parent@example.com");
    expect(sendInput.tags).toEqual([
      { name: "template", value: "parent_invite" },
    ]);
    // signupLink 가 본문에 token 과 함께 포함되어야 함.
    expect(sendInput.html).toContain("/signup/parent?token=");
  });

  it("createParentInviteToken throw (secret 미설정) → jwt_misconfigured graceful", async () => {
    createTokenMock.mockRejectedValueOnce(
      new Error("PARENT_INVITE_JWT_SECRET 환경변수가 설정되지 않았습니다."),
    );
    const out = await sendParentInvite({
      parentEmail: "p@example.com",
      childId: CHILD_ID,
      institutionName: "행복어린이집",
    });
    expect(out.sent).toBe(false);
    expect(out.skipped).toBe(true);
    expect(out.reason).toBe("jwt_misconfigured");
    expect(out.tokenIssued).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sendEmail ok=false → email_failed (tokenIssued=true)", async () => {
    sendEmailMock.mockResolvedValueOnce({
      ok: false,
      skipped: true,
      error: "RESEND_API_KEY not set",
    });
    const out = await sendParentInvite({
      parentEmail: "p@example.com",
      childId: CHILD_ID,
      institutionName: "행복어린이집",
    });
    expect(out.sent).toBe(false);
    expect(out.skipped).toBe(true);
    expect(out.reason).toBe("email_failed");
    expect(out.tokenIssued).toBe(true);
  });

  it("childName / senderName 전달 — buildParentInviteEmail 본문에 반영", async () => {
    await sendParentInvite({
      parentEmail: "p@example.com",
      childId: CHILD_ID,
      institutionName: "행복어린이집",
      childName: "지우",
      senderName: "홍길동",
    });
    const sendInput = sendEmailMock.mock.calls[0]![0] as {
      html: string;
      text: string;
    };
    // FR-EMAIL-REACT-TEMPLATE — childName 은 React Email 컴포넌트의 인사말에 표시.
    expect(sendInput.html).toContain("지우 부모님께");
    // senderName 은 plain text 본문에서만 "{institution} {sender} 드림" 으로 유지
    // (React 컴포넌트는 institutionName 만 헤더에 노출 — 디자인 단순화).
    expect(sendInput.text).toContain("행복어린이집 홍길동 드림");
  });
});

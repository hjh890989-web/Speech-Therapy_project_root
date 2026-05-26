// FR-C-017+ — sendCushionNoteToParent Server Action 단위 테스트.
//
// 검증 시나리오 (≥8):
//   1. 정상 발송 — principal + same institution → sent: true + sendCushionNoteEmail 호출
//   2. RBAC: parent role → 403 (admin/principal/expert 만 허용)
//   3. 인증 없음 (auth.getUser 실패) → 401
//   4. EvaluationResult 미존재 → 404
//   5. R4: principal cross-institution → 403 (admin 외 차단)
//   6. admin → cross-institution 도 통과 → sent: true
//   7. admin + parentEmailOverride → DB user.email 무시 + override 사용
//   8. principal + parentEmailOverride → override 무시, DB user.email 사용 (silently)
//   9. parentEmail 부재 (User.email = null) → graceful skipped: true
//  10. sendCushionNoteEmail 실패 → sent: false + error 전파 (throw 금지)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    evaluationResult: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

const supabaseGetUserMock = vi.fn();
const userSelectMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: async () => supabaseGetUserMock() },
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: unknown) => ({
          maybeSingle: async () => userSelectMock(),
        }),
      }),
    }),
  }),
}));

const sendCushionNoteEmailMock = vi.fn();
vi.mock("@/lib/cushion/email", () => ({
  sendCushionNoteEmail: (...args: unknown[]) => sendCushionNoteEmailMock(...args),
}));

// generateCushionNote 는 본 Action 안에서 사용 안 함 — 그래도 동일 모듈에서 import.
vi.mock("@/lib/cushion/generate", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cushion/generate")>(
    "@/lib/cushion/generate",
  );
  return {
    ...actual,
    generateCushionNote: vi.fn(),
  };
});

import { sendCushionNoteToParent } from "@/app/actions/cushion-note";
// FR-PERF-3-USE-SERVER-REFACTOR — class 는 shape 모듈 (non-"use server") 에서.
import { CushionAuthError } from "@/app/actions/cushion-note-shape";

const VIEWER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const EVAL_ID = "eval-abc-123";
const INSTITUTION_A = "inst-a";
const INSTITUTION_B = "inst-b";

function mockAuthAsRole(
  role: string | null,
  institutionId: string | null = INSTITUTION_A,
) {
  supabaseGetUserMock.mockResolvedValue({
    data: { user: { id: VIEWER_ID } },
    error: null,
  });
  userSelectMock.mockResolvedValue({
    data: role === null ? null : { role, institutionId },
    error: null,
  });
}

function mockEvaluation(opts: {
  email?: string | null;
  institutionId?: string | null;
  exists?: boolean;
}) {
  if (opts.exists === false) {
    findUniqueMock.mockResolvedValue(null);
    return;
  }
  findUniqueMock.mockResolvedValue({
    id: EVAL_ID,
    userId: "child-user-1",
    user: {
      email: opts.email ?? "parent@example.com",
      institutionId: opts.institutionId ?? INSTITUTION_A,
      institution: { name: "행복어린이집" },
    },
  });
}

const BASE_INPUT = {
  evaluationResultId: EVAL_ID,
  noteText: "보호자님, 오늘 잘 했어요.",
  childName: "지우",
};

beforeEach(() => {
  findUniqueMock.mockReset();
  supabaseGetUserMock.mockReset();
  userSelectMock.mockReset();
  sendCushionNoteEmailMock.mockReset();
  sendCushionNoteEmailMock.mockResolvedValue({
    sent: true,
    skipped: false,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("sendCushionNoteToParent — 인증 & RBAC", () => {
  it("scenario 3: 인증 없음 → CushionAuthError 401", async () => {
    supabaseGetUserMock.mockResolvedValue({
      data: { user: null },
      error: new Error("not_signed_in"),
    });
    await expect(sendCushionNoteToParent(BASE_INPUT)).rejects.toThrow(
      CushionAuthError,
    );
    await expect(sendCushionNoteToParent(BASE_INPUT)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("scenario 2: parent role → CushionAuthError 403", async () => {
    mockAuthAsRole("parent");
    mockEvaluation({});
    await expect(sendCushionNoteToParent(BASE_INPUT)).rejects.toMatchObject({
      status: 403,
    });
    expect(sendCushionNoteEmailMock).not.toHaveBeenCalled();
  });

  it("scenario: role row 없음 → 403", async () => {
    mockAuthAsRole(null);
    await expect(sendCushionNoteToParent(BASE_INPUT)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("scenario: teacher role → 403 (admin/principal/expert 만 허용)", async () => {
    mockAuthAsRole("teacher");
    mockEvaluation({});
    await expect(sendCushionNoteToParent(BASE_INPUT)).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe("sendCushionNoteToParent — EvaluationResult 조회", () => {
  it("scenario 4: EvaluationResult 미존재 → 404", async () => {
    mockAuthAsRole("principal");
    mockEvaluation({ exists: false });
    await expect(sendCushionNoteToParent(BASE_INPUT)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("sendCushionNoteToParent — R4 cross-institution", () => {
  it("scenario 5: principal 가 다른 institution 의 결과에 접근 → 403", async () => {
    mockAuthAsRole("principal", INSTITUTION_A);
    mockEvaluation({ institutionId: INSTITUTION_B });
    await expect(sendCushionNoteToParent(BASE_INPUT)).rejects.toMatchObject({
      status: 403,
    });
    expect(sendCushionNoteEmailMock).not.toHaveBeenCalled();
  });

  it("scenario 6: admin 은 cross-institution 통과 → 발송", async () => {
    mockAuthAsRole("admin", INSTITUTION_A);
    mockEvaluation({ institutionId: INSTITUTION_B, email: "p@example.com" });
    const out = await sendCushionNoteToParent(BASE_INPUT);
    expect(out.sent).toBe(true);
    expect(sendCushionNoteEmailMock).toHaveBeenCalledOnce();
    const args = sendCushionNoteEmailMock.mock.calls[0][0];
    expect(args.parentEmail).toBe("p@example.com");
  });

  it("scenario: expert 가 same institution → 발송", async () => {
    mockAuthAsRole("expert", INSTITUTION_A);
    mockEvaluation({ institutionId: INSTITUTION_A });
    const out = await sendCushionNoteToParent(BASE_INPUT);
    expect(out.sent).toBe(true);
  });
});

describe("sendCushionNoteToParent — parentEmail 결정", () => {
  it("scenario 7: admin + parentEmailOverride → override 사용 (DB user.email 무시)", async () => {
    mockAuthAsRole("admin");
    mockEvaluation({ email: "from-db@example.com" });
    const out = await sendCushionNoteToParent({
      ...BASE_INPUT,
      parentEmailOverride: "admin-override@example.com",
    });
    expect(out.sent).toBe(true);
    const args = sendCushionNoteEmailMock.mock.calls[0][0];
    expect(args.parentEmail).toBe("admin-override@example.com");
  });

  it("scenario 8: principal + parentEmailOverride → override 무시 (DB user.email 사용)", async () => {
    mockAuthAsRole("principal");
    mockEvaluation({ email: "real-parent@example.com" });
    const out = await sendCushionNoteToParent({
      ...BASE_INPUT,
      parentEmailOverride: "evil-override@attacker.com",
    });
    expect(out.sent).toBe(true);
    const args = sendCushionNoteEmailMock.mock.calls[0][0];
    expect(args.parentEmail).toBe("real-parent@example.com");
  });

  it("scenario 9: User.email = null → sendCushionNoteEmail 가 graceful skipped 반환", async () => {
    mockAuthAsRole("principal");
    mockEvaluation({ email: null });
    sendCushionNoteEmailMock.mockResolvedValue({
      sent: false,
      skipped: true,
      error: "no_parent_email",
    });
    const out = await sendCushionNoteToParent(BASE_INPUT);
    expect(out.sent).toBe(false);
    expect(out.skipped).toBe(true);
    expect(out.error).toBe("no_parent_email");
  });
});

describe("sendCushionNoteToParent — graceful error 전파", () => {
  it("scenario 10: sendCushionNoteEmail 가 실패 → sent: false + error (throw 금지)", async () => {
    mockAuthAsRole("principal");
    mockEvaluation({});
    sendCushionNoteEmailMock.mockResolvedValue({
      sent: false,
      skipped: false,
      error: "resend network down",
    });
    const out = await sendCushionNoteToParent(BASE_INPUT);
    expect(out.sent).toBe(false);
    expect(out.skipped).toBe(false);
    expect(out.error).toBe("resend network down");
    expect(out.evaluationResultId).toBe(EVAL_ID);
  });

  it("scenario 1: 정상 발송 — sendCushionNoteEmail 가 evaluationResultId / institutionName / childName 전달", async () => {
    mockAuthAsRole("principal", INSTITUTION_A);
    mockEvaluation({ institutionId: INSTITUTION_A, email: "p@example.com" });
    const out = await sendCushionNoteToParent({
      ...BASE_INPUT,
      parentName: "김민지",
      senderName: "홍길동",
    });
    expect(out.sent).toBe(true);
    const args = sendCushionNoteEmailMock.mock.calls[0][0];
    expect(args).toMatchObject({
      evaluationResultId: EVAL_ID,
      parentEmail: "p@example.com",
      parentName: "김민지",
      childName: "지우",
      senderName: "홍길동",
      institutionName: "행복어린이집",
      noteText: "보호자님, 오늘 잘 했어요.",
    });
  });
});

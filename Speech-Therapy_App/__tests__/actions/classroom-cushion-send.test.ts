// FR-Q-TEACHER + FR-C-017+ — sendClassroomCushionNotes Server Action 테스트.
//
// 검증 시나리오 (≥ 6):
//   1. RBAC teacher 본인 반 → status='ok' + 카운트 정합
//   2. parent role → status='forbidden'
//   3. expert role → status='forbidden' (teacher/principal/admin 만 허용)
//   4. 다른 teacher 반 → status='forbidden' (cross-teacher 차단)
//   5. admin → 모든 반 OK
//   6. rate-limit (2번째 호출) → status='rate_limited' + retryAfterSec
//   7. CON-04 금칙어 본문 graceful — sendCushionNoteEmail ok=false → errors 카운트 (서버 crash 금지)
//   8. 비로그인 → status='unauthorized'
//   9. invalid_input (빈 classId) → status='invalid_input'
//  10. 빈 반 → attempted=0 + status='ok' (rate-limit 마킹 안 함 — 다음 호출 통과)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
  }),
}));

const userFindUniqueMock = vi.fn();
const classFindUniqueMock = vi.fn();
const evalFindFirstMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) },
    class: { findUnique: (...args: unknown[]) => classFindUniqueMock(...args) },
    evaluationResult: {
      findFirst: (...args: unknown[]) => evalFindFirstMock(...args),
    },
  },
}));

const sendCushionNoteEmailMock = vi.fn();
vi.mock("@/lib/cushion/email", () => ({
  sendCushionNoteEmail: (...args: unknown[]) =>
    sendCushionNoteEmailMock(...args),
}));

const generateCushionNoteMock = vi.fn();
vi.mock("@/lib/cushion/generate", () => ({
  generateCushionNote: (...args: unknown[]) =>
    generateCushionNoteMock(...args),
}));

import { sendClassroomCushionNotes } from "@/app/actions/classroom-cushion";
import { __resetClassroomBatchRateLimitForTest } from "@/lib/classroom/cushion-batch";

const TEACHER = "11111111-1111-4111-8111-111111111111";
const OTHER_TEACHER = "22222222-2222-4222-8222-222222222222";
const INSTITUTION_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLASS_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function mockAuth(userId: string | null) {
  if (userId === null) {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
  } else {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: userId } },
      error: null,
    });
  }
}

function mockUserRow(role: string | null, institutionId: string | null = INSTITUTION_A) {
  userFindUniqueMock.mockResolvedValueOnce(
    role === null ? null : { role, institutionId },
  );
}

interface MockClassOptions {
  teacherId?: string | null;
  institutionId?: string;
  users?: Array<{ id: string; email: string | null }>;
}

function mockClass(opts: MockClassOptions = {}) {
  classFindUniqueMock.mockResolvedValueOnce({
    id: CLASS_ID,
    name: "햇님반",
    teacherId: opts.teacherId === undefined ? TEACHER : opts.teacherId,
    institutionId: opts.institutionId ?? INSTITUTION_A,
    institution: { name: "행복어린이집" },
    users: opts.users ?? [
      { id: "u-1", email: "p1@example.com" },
      { id: "u-2", email: "p2@example.com" },
    ],
  });
}

function mockEvalForEach(userIds: string[]) {
  for (const uid of userIds) {
    evalFindFirstMock.mockResolvedValueOnce({
      id: `eval-${uid}`,
      userId: uid,
      targetPhoneme: "ㅅ",
      articulationScore: 72,
      linguisticScore: 70,
      acousticScore: 65,
    });
  }
}

beforeEach(() => {
  getUserMock.mockReset();
  userFindUniqueMock.mockReset();
  classFindUniqueMock.mockReset();
  evalFindFirstMock.mockReset();
  sendCushionNoteEmailMock.mockReset();
  generateCushionNoteMock.mockReset();
  generateCushionNoteMock.mockResolvedValue({
    text: "보호자님, 오늘도 즐겁게 연습했어요.",
    source: "template",
    fallbackReason: "disabled",
  });
  __resetClassroomBatchRateLimitForTest();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("sendClassroomCushionNotes — RBAC", () => {
  it("[1] teacher 본인 반 → ok + sent=2 (학생 2명)", async () => {
    mockAuth(TEACHER);
    mockUserRow("teacher");
    mockClass();
    mockEvalForEach(["u-1", "u-2"]);
    sendCushionNoteEmailMock.mockResolvedValue({ sent: true, skipped: false });

    const out = await sendClassroomCushionNotes({ classId: CLASS_ID });

    expect(out.status).toBe("ok");
    expect(out.attempted).toBe(2);
    expect(out.sent).toBe(2);
    expect(out.skipped).toBe(0);
    expect(out.errors).toBe(0);
    expect(out.batchId).toMatch(/^cb_/);
    expect(sendCushionNoteEmailMock).toHaveBeenCalledTimes(2);
  });

  it("[2] parent role → forbidden + sendEmail 미호출", async () => {
    mockAuth("parent-id");
    mockUserRow("parent");
    const out = await sendClassroomCushionNotes({ classId: CLASS_ID });
    expect(out.status).toBe("forbidden");
    expect(sendCushionNoteEmailMock).not.toHaveBeenCalled();
    expect(classFindUniqueMock).not.toHaveBeenCalled();
  });

  it("[3] expert role → forbidden", async () => {
    mockAuth("expert-id");
    mockUserRow("expert");
    const out = await sendClassroomCushionNotes({ classId: CLASS_ID });
    expect(out.status).toBe("forbidden");
  });

  it("[4] 다른 teacher 반 (Class.teacherId 불일치) → forbidden", async () => {
    mockAuth(TEACHER);
    mockUserRow("teacher");
    mockClass({ teacherId: OTHER_TEACHER });
    const out = await sendClassroomCushionNotes({ classId: CLASS_ID });
    expect(out.status).toBe("forbidden");
    expect(sendCushionNoteEmailMock).not.toHaveBeenCalled();
  });

  it("[5] admin — 모든 반 통과 (다른 institutionId 도 OK)", async () => {
    mockAuth("admin-id");
    mockUserRow("admin", null);
    mockClass({
      teacherId: OTHER_TEACHER,
      institutionId: "different-inst",
    });
    mockEvalForEach(["u-1", "u-2"]);
    sendCushionNoteEmailMock.mockResolvedValue({ sent: true, skipped: false });
    const out = await sendClassroomCushionNotes({ classId: CLASS_ID });
    expect(out.status).toBe("ok");
    expect(out.sent).toBe(2);
  });

  it("[8] 비로그인 → unauthorized", async () => {
    mockAuth(null);
    const out = await sendClassroomCushionNotes({ classId: CLASS_ID });
    expect(out.status).toBe("unauthorized");
  });

  it("[9] invalid_input — 빈 classId", async () => {
    const out = await sendClassroomCushionNotes({ classId: "   " });
    expect(out.status).toBe("invalid_input");
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("not_found — Class 미존재 → not_found 상태", async () => {
    mockAuth(TEACHER);
    mockUserRow("teacher");
    classFindUniqueMock.mockResolvedValueOnce(null);
    const out = await sendClassroomCushionNotes({ classId: CLASS_ID });
    expect(out.status).toBe("not_found");
  });
});

describe("sendClassroomCushionNotes — rate-limit", () => {
  it("[6] 2번째 호출 → rate_limited + retryAfterSec", async () => {
    // 1번째 호출 — 정상 발송.
    mockAuth(TEACHER);
    mockUserRow("teacher");
    mockClass();
    mockEvalForEach(["u-1", "u-2"]);
    sendCushionNoteEmailMock.mockResolvedValue({ sent: true, skipped: false });
    const first = await sendClassroomCushionNotes({ classId: CLASS_ID });
    expect(first.status).toBe("ok");

    // 2번째 호출 — 1시간 안에 재시도 → rate_limited.
    mockAuth(TEACHER);
    mockUserRow("teacher");
    mockClass();
    const second = await sendClassroomCushionNotes({ classId: CLASS_ID });
    expect(second.status).toBe("rate_limited");
    expect(second.retryAfterSec).toBeGreaterThan(0);
    expect(second.attempted).toBe(0);
    expect(second.sent).toBe(0);
  });
});

describe("sendClassroomCushionNotes — graceful (CON-04 + 부분 실패)", () => {
  it("[7] CON-04 금칙어 → sendEmail ok=false → errors 카운트 (서버 crash X)", async () => {
    mockAuth(TEACHER);
    mockUserRow("teacher");
    mockClass({
      users: [
        { id: "u-1", email: "p1@example.com" },
        { id: "u-2", email: "p2@example.com" },
      ],
    });
    mockEvalForEach(["u-1", "u-2"]);
    // u-1 은 성공, u-2 는 banned_term 차단 → errors 카운트.
    sendCushionNoteEmailMock
      .mockResolvedValueOnce({ sent: true, skipped: false })
      .mockResolvedValueOnce({
        sent: false,
        skipped: false,
        error: "banned_term:text:primary:치료",
      });

    const out = await sendClassroomCushionNotes({ classId: CLASS_ID });
    expect(out.status).toBe("ok");
    expect(out.attempted).toBe(2);
    expect(out.sent).toBe(1);
    expect(out.skipped).toBe(0);
    expect(out.errors).toBe(1);
  });

  it("[10] 빈 반 → attempted=0 + ok (rate-limit 마킹 안 함 — 다음 호출 통과)", async () => {
    mockAuth(TEACHER);
    mockUserRow("teacher");
    mockClass({ users: [] });

    const out = await sendClassroomCushionNotes({ classId: CLASS_ID });
    expect(out.status).toBe("ok");
    expect(out.attempted).toBe(0);
    expect(out.sent).toBe(0);

    // 2번째 호출도 통과 — 빈 반은 rate-limit 마킹 안 함.
    mockAuth(TEACHER);
    mockUserRow("teacher");
    mockClass({ users: [] });
    const out2 = await sendClassroomCushionNotes({ classId: CLASS_ID });
    expect(out2.status).toBe("ok");
  });

  it("개별 학생 sendEmail throw → errored + 다른 학생 계속", async () => {
    mockAuth(TEACHER);
    mockUserRow("teacher");
    mockClass({
      users: [
        { id: "u-1", email: "p1@example.com" },
        { id: "u-2", email: "p2@example.com" },
        { id: "u-3", email: "p3@example.com" },
      ],
    });
    mockEvalForEach(["u-1", "u-2", "u-3"]);
    sendCushionNoteEmailMock
      .mockResolvedValueOnce({ sent: true, skipped: false })
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ sent: true, skipped: false });

    const out = await sendClassroomCushionNotes({ classId: CLASS_ID });
    expect(out.status).toBe("ok");
    expect(out.attempted).toBe(3);
    expect(out.sent).toBe(2);
    expect(out.errors).toBe(1);
  });

  it("parentEmail 부재 학생 → skipped 카운트", async () => {
    mockAuth(TEACHER);
    mockUserRow("teacher");
    mockClass({
      users: [
        { id: "u-1", email: null },
        { id: "u-2", email: "p2@example.com" },
      ],
    });
    // u-1 은 parentEmail 부재 → eval fetch 안 거치고 skipped — 그러나 prisma findFirst 는 두 학생 모두 호출됨.
    mockEvalForEach(["u-1", "u-2"]);
    sendCushionNoteEmailMock.mockResolvedValueOnce({ sent: true, skipped: false });

    const out = await sendClassroomCushionNotes({ classId: CLASS_ID });
    expect(out.status).toBe("ok");
    expect(out.attempted).toBe(2);
    expect(out.sent).toBe(1);
    expect(out.skipped).toBe(1);
  });
});

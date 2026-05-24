// FR-Q-TEACHER + FR-C-017+ — lib/classroom/cushion-batch 단위 테스트.
//
// 검증 시나리오 (≥ 8):
//   1. 정상 fan-out — 각 학생별 sendCushionNoteEmail 호출 + sent 카운트
//   2. parentEmail 부재 → skipped (no_parent_email)
//   3. 최신 EvaluationResult 부재 → skipped (no_evaluation)
//   4. 개별 sendCushionNoteEmail throw → errored + 다른 학생 계속 진행
//   5. rate-limit 활성 (markClassroomBatchSent 후) → 2번째 호출 차단 (allowed=false)
//   6. cross-tenant 차단 — teacher 가 다른 반 (Class.teacherId 불일치) 조회 → forbidden
//   7. principal 정상 — 본인 institutionId 의 Class 통과
//   8. admin 정상 — 모든 Class 통과
//   9. 100명 batch limit — Prisma take 가 BATCH_MAX_STUDENTS 로 clamp
//  10. not_found — Class 미존재 → ClassroomBatchError("not_found")
//  11. principal cross-institution 차단

import { describe, it, expect, vi, beforeEach } from "vitest";

const classFindUniqueMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    class: {
      findUnique: (...args: unknown[]) => classFindUniqueMock(...args),
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

import {
  loadClassroomForBatch,
  processStudentForBatch,
  enforceClassroomRateLimit,
  markClassroomBatchSent,
  ClassroomBatchError,
  BATCH_MAX_STUDENTS,
  RATE_LIMIT_WINDOW_MS,
  __resetClassroomBatchRateLimitForTest,
  type ClassroomBatchViewer,
  type LatestEvaluationSnapshot,
} from "@/lib/classroom/cushion-batch";

const TEACHER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_TEACHER_ID = "22222222-2222-4222-8222-222222222222";
const INSTITUTION_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INSTITUTION_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLASS_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const teacherViewer: ClassroomBatchViewer = {
  userId: TEACHER_ID,
  role: "teacher",
  institutionId: INSTITUTION_A,
};
const principalViewer: ClassroomBatchViewer = {
  userId: "principal-id",
  role: "principal",
  institutionId: INSTITUTION_A,
};
const adminViewer: ClassroomBatchViewer = {
  userId: "admin-id",
  role: "admin",
  institutionId: null,
};

beforeEach(() => {
  classFindUniqueMock.mockReset();
  sendCushionNoteEmailMock.mockReset();
  generateCushionNoteMock.mockReset();
  generateCushionNoteMock.mockResolvedValue({
    text: "보호자님, 오늘도 즐겁게 연습했어요.",
    source: "template",
    fallbackReason: "disabled",
  });
  __resetClassroomBatchRateLimitForTest();
});

describe("loadClassroomForBatch — RBAC + Class fetch", () => {
  function mockClass(overrides: Partial<{
    teacherId: string | null;
    institutionId: string;
    users: Array<{ id: string; email: string | null }>;
  }> = {}) {
    classFindUniqueMock.mockResolvedValueOnce({
      id: CLASS_ID,
      name: "햇님반",
      teacherId: overrides.teacherId ?? TEACHER_ID,
      institutionId: overrides.institutionId ?? INSTITUTION_A,
      institution: { name: "행복어린이집" },
      users: overrides.users ?? [
        { id: "u-1", email: "p1@example.com" },
        { id: "u-2", email: "p2@example.com" },
      ],
    });
  }

  it("[1-base] teacher 본인 담당 반 — context 반환 (students 포함)", async () => {
    mockClass();
    const ctx = await loadClassroomForBatch(CLASS_ID, teacherViewer);
    expect(ctx.classId).toBe(CLASS_ID);
    expect(ctx.className).toBe("햇님반");
    expect(ctx.institutionName).toBe("행복어린이집");
    expect(ctx.students).toHaveLength(2);
    expect(ctx.students[0]).toEqual({
      userId: "u-1",
      parentEmail: "p1@example.com",
    });
  });

  it("[6] cross-tenant 차단 — teacher 가 다른 teacher 의 반 조회 → forbidden", async () => {
    mockClass({ teacherId: OTHER_TEACHER_ID });
    await expect(
      loadClassroomForBatch(CLASS_ID, teacherViewer),
    ).rejects.toMatchObject({
      name: "ClassroomBatchError",
      code: "forbidden",
    });
  });

  it("[7] principal 정상 — 본인 institutionId 의 Class 통과", async () => {
    mockClass({ teacherId: OTHER_TEACHER_ID, institutionId: INSTITUTION_A });
    const ctx = await loadClassroomForBatch(CLASS_ID, principalViewer);
    expect(ctx.classId).toBe(CLASS_ID);
    expect(ctx.students).toHaveLength(2);
  });

  it("[11] principal cross-institution 차단 — Class.institutionId 가 다름 → forbidden", async () => {
    mockClass({ teacherId: OTHER_TEACHER_ID, institutionId: INSTITUTION_B });
    await expect(
      loadClassroomForBatch(CLASS_ID, principalViewer),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("[8] admin — 모든 Class 통과", async () => {
    mockClass({ teacherId: OTHER_TEACHER_ID, institutionId: INSTITUTION_B });
    const ctx = await loadClassroomForBatch(CLASS_ID, adminViewer);
    expect(ctx.classId).toBe(CLASS_ID);
  });

  it("[10] not_found — Class 미존재 → ClassroomBatchError('not_found')", async () => {
    classFindUniqueMock.mockResolvedValueOnce(null);
    await expect(
      loadClassroomForBatch(CLASS_ID, teacherViewer),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("[9] 100명 batch limit — Prisma users.take 가 BATCH_MAX_STUDENTS 로 clamp", async () => {
    mockClass();
    await loadClassroomForBatch(CLASS_ID, teacherViewer);
    const arg = classFindUniqueMock.mock.calls[0][0];
    expect(arg.select.users.take).toBe(BATCH_MAX_STUDENTS);
    expect(BATCH_MAX_STUDENTS).toBe(100);
    expect(arg.select.users.where).toEqual({ role: "parent" });
    expect(arg.select.users.select).toEqual({ id: true, email: true });
  });

  it("ClassroomBatchError name + code 노출", () => {
    const err = new ClassroomBatchError("not_found");
    expect(err.name).toBe("ClassroomBatchError");
    expect(err.code).toBe("not_found");
  });
});

describe("processStudentForBatch — 개별 학생 처리 (graceful)", () => {
  const baseEval: LatestEvaluationSnapshot = {
    id: "eval-1",
    targetPhoneme: "ㅅ",
    articulationScore: 72,
    linguisticScore: 70,
    acousticScore: 65,
  };

  it("[1] 정상 — sendCushionNoteEmail 호출 + sent 반환", async () => {
    sendCushionNoteEmailMock.mockResolvedValueOnce({ sent: true, skipped: false });
    const out = await processStudentForBatch(
      { userId: "u-1", parentEmail: "p@example.com" },
      baseEval,
      { institutionName: "행복어린이집" },
    );
    expect(out).toEqual({ kind: "sent", userId: "u-1" });
    expect(sendCushionNoteEmailMock).toHaveBeenCalledOnce();
    const call = sendCushionNoteEmailMock.mock.calls[0][0];
    expect(call.parentEmail).toBe("p@example.com");
    expect(call.evaluationResultId).toBe("eval-1");
    expect(call.noteText).toContain("연습");
    expect(call.institutionName).toBe("행복어린이집");
  });

  it("[2] parentEmail 부재 → skipped no_parent_email + sendEmail 미호출", async () => {
    const out = await processStudentForBatch(
      { userId: "u-2", parentEmail: null },
      baseEval,
      { institutionName: null },
    );
    expect(out).toEqual({
      kind: "skipped",
      userId: "u-2",
      reason: "no_parent_email",
    });
    expect(sendCushionNoteEmailMock).not.toHaveBeenCalled();
  });

  it("[2b] parentEmail 빈 문자열 → skipped no_parent_email", async () => {
    const out = await processStudentForBatch(
      { userId: "u-2b", parentEmail: "   " },
      baseEval,
      { institutionName: null },
    );
    expect(out.kind).toBe("skipped");
    if (out.kind === "skipped") expect(out.reason).toBe("no_parent_email");
  });

  it("[3] 최신 EvaluationResult 부재 → skipped no_evaluation + sendEmail 미호출", async () => {
    const out = await processStudentForBatch(
      { userId: "u-3", parentEmail: "p@example.com" },
      null,
      { institutionName: null },
    );
    expect(out).toEqual({
      kind: "skipped",
      userId: "u-3",
      reason: "no_evaluation",
    });
    expect(sendCushionNoteEmailMock).not.toHaveBeenCalled();
  });

  it("[4] sendCushionNoteEmail throw → errored + reason 캡처 (다른 학생 계속 진행 보장)", async () => {
    sendCushionNoteEmailMock.mockRejectedValueOnce(new Error("network down"));
    const out = await processStudentForBatch(
      { userId: "u-4", parentEmail: "p@example.com" },
      baseEval,
      { institutionName: null },
    );
    expect(out.kind).toBe("errored");
    if (out.kind === "errored") {
      expect(out.userId).toBe("u-4");
      expect(out.reason).toContain("send_failed");
      expect(out.reason).toContain("network down");
    }
  });

  it("[4b] sendCushionNoteEmail ok=false (banned_term) → errored + reason 전파", async () => {
    sendCushionNoteEmailMock.mockResolvedValueOnce({
      sent: false,
      skipped: false,
      error: "banned_term:text:primary:치료",
    });
    const out = await processStudentForBatch(
      { userId: "u-banned", parentEmail: "p@example.com" },
      baseEval,
      { institutionName: null },
    );
    expect(out.kind).toBe("errored");
    if (out.kind === "errored") {
      expect(out.reason).toContain("banned_term");
    }
  });

  it("[4c] sendCushionNoteEmail skipped (test env) → skipped + reason 전파", async () => {
    sendCushionNoteEmailMock.mockResolvedValueOnce({
      sent: false,
      skipped: true,
      error: "test_env_skip",
    });
    const out = await processStudentForBatch(
      { userId: "u-skip", parentEmail: "p@example.com" },
      baseEval,
      { institutionName: null },
    );
    expect(out.kind).toBe("skipped");
    if (out.kind === "skipped") expect(out.reason).toBe("test_env_skip");
  });

  it("정의 외 음소 → ㅅ 폴백 (generateCushionNote 호출 targetPhoneme)", async () => {
    sendCushionNoteEmailMock.mockResolvedValueOnce({ sent: true, skipped: false });
    await processStudentForBatch(
      { userId: "u-1", parentEmail: "p@example.com" },
      { ...baseEval, targetPhoneme: "X" },
      { institutionName: null },
    );
    const genArg = generateCushionNoteMock.mock.calls[0][0];
    expect(genArg.targetPhoneme).toBe("ㅅ");
  });
});

describe("enforceClassroomRateLimit — 반당 1시간 1회", () => {
  it("[5a] 최초 호출 → allowed=true", () => {
    const r = enforceClassroomRateLimit(CLASS_ID);
    expect(r.allowed).toBe(true);
    expect(r.retryAfterSec).toBeUndefined();
  });

  it("[5b] markClassroomBatchSent 후 즉시 재호출 → allowed=false + retryAfterSec", () => {
    const t0 = 1_000_000_000;
    markClassroomBatchSent(CLASS_ID, t0);
    const r = enforceClassroomRateLimit(CLASS_ID, t0 + 1000);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSec).toBeGreaterThan(3500);
    expect(r.retryAfterSec).toBeLessThanOrEqual(3600);
  });

  it("[5c] 윈도우 경과 후 → allowed=true", () => {
    const t0 = 1_000_000_000;
    markClassroomBatchSent(CLASS_ID, t0);
    const after = t0 + RATE_LIMIT_WINDOW_MS + 1;
    const r = enforceClassroomRateLimit(CLASS_ID, after);
    expect(r.allowed).toBe(true);
  });

  it("[5d] 다른 classId 는 독립적 — A 발송이 B 를 차단 안 함", () => {
    markClassroomBatchSent("class-a");
    const r = enforceClassroomRateLimit("class-b");
    expect(r.allowed).toBe(true);
  });
});

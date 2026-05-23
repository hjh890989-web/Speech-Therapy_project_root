// FR-C-017+ — sendCushionNoteEmail orchestrator unit 테스트.
//
// 시나리오 매핑 (TASK §7 — 본 파일 최소 4):
//   1. parentEmail 부재 → skipped: true, error: 'no_parent_email'
//   2. parentEmail 빈 문자열 → skipped: true, error: 'no_parent_email'
//   3. noteText 빈 문자열 → skipped: true, error: 'no_note_text'
//   4. sendEmail skipped (test env) → skipped: true (error 전파)
//   5. sendEmail 실패 (Resend SDK 실패 / CON-04) → sent: false, error 전파
//   6. 정상 발송 → sent: true, skipped: false
//   7. CON-04 금칙어 본문 → sendEmail 단에서 차단 → sent: false, error: banned_term:*
//   8. buildCushionNoteEmail 결과가 sendEmail 에 spread 되어 전달됨 (tags 포함)

import { describe, it, expect, vi, beforeEach } from "vitest";

const sendEmailMock = vi.fn();
vi.mock("@/lib/email/resend", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

// templates 는 실제 구현 사용 (CON-04 검증 시나리오에서 본문 escape 확인).

import { sendCushionNoteEmail } from "@/lib/cushion/email";

const BASE_ARGS = {
  evaluationResultId: "eval-123",
  parentEmail: "parent@example.com",
  parentName: "김민지",
  childName: "지우",
  noteText: "보호자님, 오늘 ㅅ 발음을 함께 연습했어요.",
  senderName: "홍길동",
  institutionName: "행복어린이집",
};

beforeEach(() => {
  sendEmailMock.mockReset();
});

describe("sendCushionNoteEmail — graceful skip 분기", () => {
  it("scenario 1: parentEmail 부재 (undefined) → skipped + error: 'no_parent_email'", async () => {
    const result = await sendCushionNoteEmail({
      ...BASE_ARGS,
      parentEmail: undefined as unknown as string,
    });
    expect(result.sent).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toBe("no_parent_email");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("scenario 2: parentEmail 빈 문자열 → skipped + error: 'no_parent_email'", async () => {
    const result = await sendCushionNoteEmail({
      ...BASE_ARGS,
      parentEmail: "   ",
    });
    expect(result.sent).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toBe("no_parent_email");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("scenario 3: noteText 빈 문자열 → skipped + error: 'no_note_text'", async () => {
    const result = await sendCushionNoteEmail({
      ...BASE_ARGS,
      noteText: "   ",
    });
    expect(result.sent).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toBe("no_note_text");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("sendCushionNoteEmail — sendEmail 위임", () => {
  it("scenario 4: sendEmail skipped (test env) → skipped: true + error 전파", async () => {
    sendEmailMock.mockResolvedValue({
      ok: false,
      skipped: true,
      error: "test_env_skip",
    });
    const result = await sendCushionNoteEmail(BASE_ARGS);
    expect(result.sent).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toBe("test_env_skip");
    expect(sendEmailMock).toHaveBeenCalledOnce();
  });

  it("scenario 5: sendEmail 실패 (Resend SDK) → sent: false + error 전파 (throw 금지)", async () => {
    sendEmailMock.mockResolvedValue({
      ok: false,
      skipped: false,
      error: "network down",
    });
    const result = await sendCushionNoteEmail(BASE_ARGS);
    expect(result.sent).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.error).toBe("network down");
  });

  it("scenario 6: 정상 발송 → sent: true + skipped: false", async () => {
    sendEmailMock.mockResolvedValue({
      ok: true,
      skipped: false,
      id: "email-abc",
    });
    const result = await sendCushionNoteEmail(BASE_ARGS);
    expect(result.sent).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.error).toBeUndefined();
    expect(sendEmailMock).toHaveBeenCalledOnce();
    const call = sendEmailMock.mock.calls[0][0];
    expect(call.to).toBe("parent@example.com");
    // subject 에 childName 포함.
    expect(call.subject).toContain("지우");
    // tags 에 evaluationResultId / template 라벨 포함.
    expect(call.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "template", value: "cushion_note" }),
        expect.objectContaining({
          name: "evaluation_result_id",
          value: "eval-123",
        }),
      ]),
    );
  });

  it("scenario 7: sendEmail 가 CON-04 banned_term 차단 (text 본문에 금칙어) → sent: false + error 전파", async () => {
    // 실 시나리오 — sendEmail 측이 detectBannedTerms 로 차단.
    sendEmailMock.mockResolvedValue({
      ok: false,
      skipped: false,
      error: "banned_term:text:primary:치료",
    });
    const result = await sendCushionNoteEmail({
      ...BASE_ARGS,
      noteText: "치료가 필요합니다.", // 금칙어 — 호출 측 검증 누락 가정
    });
    expect(result.sent).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.error).toMatch(/^banned_term:/);
  });

  it("scenario 8: optional fields (parentName/senderName/institutionName) 부재 → sendEmail 호출 정상", async () => {
    sendEmailMock.mockResolvedValue({
      ok: true,
      skipped: false,
      id: "email-min",
    });
    const result = await sendCushionNoteEmail({
      evaluationResultId: "eval-min",
      parentEmail: "p@example.com",
      childName: "민준",
      noteText: "오늘도 잘 했어요.",
    });
    expect(result.sent).toBe(true);
    const call = sendEmailMock.mock.calls[0][0];
    expect(call.to).toBe("p@example.com");
    expect(call.text).toContain("오늘도 잘 했어요.");
    // 기본 인사말 — "{childName} 부모님께" 형식 (parentName 부재 시).
    expect(call.text).toContain("민준 부모님께");
  });
});

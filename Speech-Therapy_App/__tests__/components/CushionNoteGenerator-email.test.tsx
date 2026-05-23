// FR-C-017+ — CushionNoteGenerator 의 "부모 이메일로 발송" 버튼 UI 테스트.
//
// 검증 시나리오:
//   1. parentEmail 부재 → "부모 이메일로 발송" 버튼 disabled (텍스트 생성 완료 후에도)
//   2. parentEmail 존재 + 텍스트 생성 완료 → 버튼 enabled + 클릭 → confirmation dialog
//   3. confirmation dialog 안 parentEmail 노출
//   4. confirmation dialog 의 "발송" → sendCushionNoteToParent Server Action 호출
//   5. 정상 발송 → "발송 완료" 노출 + cushion_note_emailed 이벤트 (emailSkipped:false, hasError:false)
//   6. skipped 결과 → error 메시지 노출 + cushion_note_emailed 이벤트 (emailSkipped:true)
//   7. sent:false (Resend 실패) → error 메시지 + cushion_note_emailed (hasError:true)
//   8. confirmation dialog "취소" → 닫힘 + Server Action 미호출

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { CushionNoteGenerator } from "@/components/admin/CushionNoteGenerator";

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

const shareMock = vi.fn();
vi.mock("@/lib/share", () => ({
  shareOrCopy: (...args: unknown[]) => shareMock(...args),
}));

const sendCushionNoteToParentMock = vi.fn();
vi.mock("@/app/actions/cushion-note", () => ({
  sendCushionNoteToParent: (...args: unknown[]) =>
    sendCushionNoteToParentMock(...args),
}));

const fetchMock = vi.fn();

function makeStreamResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) {
        controller.enqueue(encoder.encode(c));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function generateNote(text = "본문 텍스트") {
  fetchMock.mockResolvedValueOnce(makeStreamResponse([text]));
  fireEvent.click(screen.getByTestId("cushion-generate-button"));
  await waitFor(() =>
    expect(screen.getByTestId("cushion-status-done")).toBeInTheDocument(),
  );
}

beforeEach(() => {
  trackMock.mockReset();
  shareMock.mockReset();
  fetchMock.mockReset();
  sendCushionNoteToParentMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const EVAL_ID = "eval-abc-999";

describe("CushionNoteGenerator (email)", () => {
  it("scenario 1: parentEmail 부재 → 텍스트 생성 후에도 이메일 버튼 disabled", async () => {
    render(<CushionNoteGenerator evaluationResultId={EVAL_ID} />);
    await generateNote();

    const btn = screen.getByTestId("cushion-email-button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute(
      "title",
      expect.stringContaining("등록된 부모 이메일이 없어요"),
    );
  });

  it("scenario 1b: 텍스트 생성 전에는 이메일 버튼 자체 렌더 안 됨", () => {
    render(
      <CushionNoteGenerator
        evaluationResultId={EVAL_ID}
        parentEmail="parent@example.com"
      />,
    );
    expect(screen.queryByTestId("cushion-email-button")).not.toBeInTheDocument();
  });

  it("scenario 2: parentEmail 존재 + 텍스트 생성 → 이메일 버튼 enabled + 클릭 → confirmation dialog", async () => {
    render(
      <CushionNoteGenerator
        evaluationResultId={EVAL_ID}
        parentEmail="parent@example.com"
      />,
    );
    await generateNote();

    const btn = screen.getByTestId("cushion-email-button");
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);

    await waitFor(() =>
      expect(
        screen.getByTestId("cushion-email-confirm-dialog"),
      ).toBeInTheDocument(),
    );
  });

  it("scenario 3: confirmation dialog 안에 parentEmail 노출", async () => {
    render(
      <CushionNoteGenerator
        evaluationResultId={EVAL_ID}
        parentEmail="parent@example.com"
      />,
    );
    await generateNote();
    fireEvent.click(screen.getByTestId("cushion-email-button"));

    await waitFor(() =>
      expect(
        screen.getByTestId("cushion-email-confirm-address"),
      ).toHaveTextContent("parent@example.com"),
    );
  });

  it("scenario 4 + 5: 발송 버튼 → Server Action 호출 + 정상 완료 → '발송 완료' + 이벤트", async () => {
    sendCushionNoteToParentMock.mockResolvedValueOnce({
      sent: true,
      skipped: false,
      evaluationResultId: EVAL_ID,
    });

    render(
      <CushionNoteGenerator
        evaluationResultId={EVAL_ID}
        parentEmail="parent@example.com"
      />,
    );
    await generateNote("부모님께 보낼 본문.");
    fireEvent.click(screen.getByTestId("cushion-email-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("cushion-email-confirm-dialog"),
      ).toBeInTheDocument(),
    );

    trackMock.mockClear();
    fireEvent.click(screen.getByTestId("cushion-email-confirm-button"));

    await waitFor(() => {
      expect(
        screen.getByTestId("cushion-email-status-sent"),
      ).toBeInTheDocument();
    });

    expect(sendCushionNoteToParentMock).toHaveBeenCalledOnce();
    const args = sendCushionNoteToParentMock.mock.calls[0][0];
    expect(args.evaluationResultId).toBe(EVAL_ID);
    expect(args.noteText).toBe("부모님께 보낼 본문.");

    expect(trackMock).toHaveBeenCalledWith("cushion_note_emailed", {
      evaluationResultId: EVAL_ID,
      emailSkipped: false,
      hasError: false,
    });
  });

  it("scenario 6: Server Action 가 skipped: true 반환 → error 메시지 + emailSkipped:true 이벤트", async () => {
    sendCushionNoteToParentMock.mockResolvedValueOnce({
      sent: false,
      skipped: true,
      error: "no_parent_email",
      evaluationResultId: EVAL_ID,
    });

    render(
      <CushionNoteGenerator
        evaluationResultId={EVAL_ID}
        parentEmail="parent@example.com"
      />,
    );
    await generateNote();
    fireEvent.click(screen.getByTestId("cushion-email-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("cushion-email-confirm-dialog"),
      ).toBeInTheDocument(),
    );

    trackMock.mockClear();
    fireEvent.click(screen.getByTestId("cushion-email-confirm-button"));

    await waitFor(() =>
      expect(
        screen.getByTestId("cushion-email-status-error"),
      ).toBeInTheDocument(),
    );
    expect(trackMock).toHaveBeenCalledWith("cushion_note_emailed", {
      evaluationResultId: EVAL_ID,
      emailSkipped: true,
      hasError: false,
    });
  });

  it("scenario 7: Server Action 가 sent:false (Resend 실패) → error 메시지 + hasError:true 이벤트", async () => {
    sendCushionNoteToParentMock.mockResolvedValueOnce({
      sent: false,
      skipped: false,
      error: "network down",
      evaluationResultId: EVAL_ID,
    });

    render(
      <CushionNoteGenerator
        evaluationResultId={EVAL_ID}
        parentEmail="parent@example.com"
      />,
    );
    await generateNote();
    fireEvent.click(screen.getByTestId("cushion-email-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("cushion-email-confirm-dialog"),
      ).toBeInTheDocument(),
    );

    trackMock.mockClear();
    fireEvent.click(screen.getByTestId("cushion-email-confirm-button"));

    await waitFor(() =>
      expect(
        screen.getByTestId("cushion-email-status-error"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByTestId("cushion-email-status-error")).toHaveTextContent(
      /network down/,
    );
    expect(trackMock).toHaveBeenCalledWith("cushion_note_emailed", {
      evaluationResultId: EVAL_ID,
      emailSkipped: false,
      hasError: true,
    });
  });

  it("scenario 8: confirmation dialog '취소' → dialog 닫힘 + Server Action 미호출", async () => {
    render(
      <CushionNoteGenerator
        evaluationResultId={EVAL_ID}
        parentEmail="parent@example.com"
      />,
    );
    await generateNote();
    fireEvent.click(screen.getByTestId("cushion-email-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("cushion-email-confirm-dialog"),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("cushion-email-cancel-button"));

    await waitFor(() =>
      expect(
        screen.queryByTestId("cushion-email-confirm-dialog"),
      ).not.toBeInTheDocument(),
    );
    expect(sendCushionNoteToParentMock).not.toHaveBeenCalled();
  });

  it("scenario 9: Server Action throw → error 메시지 + hasError:true 이벤트 (graceful UI)", async () => {
    sendCushionNoteToParentMock.mockRejectedValueOnce(
      new Error("network unreachable"),
    );

    render(
      <CushionNoteGenerator
        evaluationResultId={EVAL_ID}
        parentEmail="parent@example.com"
      />,
    );
    await generateNote();
    fireEvent.click(screen.getByTestId("cushion-email-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("cushion-email-confirm-dialog"),
      ).toBeInTheDocument(),
    );

    trackMock.mockClear();
    fireEvent.click(screen.getByTestId("cushion-email-confirm-button"));

    await waitFor(() =>
      expect(
        screen.getByTestId("cushion-email-status-error"),
      ).toBeInTheDocument(),
    );
    expect(trackMock).toHaveBeenCalledWith("cushion_note_emailed", {
      evaluationResultId: EVAL_ID,
      emailSkipped: false,
      hasError: true,
    });
  });
});

// FR-C-017 (#40 Replace D8) — CushionNoteGenerator 클라이언트 컴포넌트 테스트.
//
// 검증 (8 시나리오):
//   1. idle → "알림장 생성" 클릭 → fetch /api/cushion/stream POST 호출 (body 검증)
//   2. ReadableStream 소비 → textarea 한 글자씩 채워짐 + char count 갱신
//   3. 스트림 완료 → "생성 완료" + cushion_note_generated 이벤트 (source/charCount)
//   4. 클립보드 복사 → shareOrCopy 호출 + cushion_note_copied 이벤트
//   5. CUSHION_SWAP_MARKER 등장 → textarea 누적 텍스트가 마커 이후 chunk 로 교체
//   6. HTTP 4xx 응답 → error state + 메시지 노출
//   7. studentName 입력 변경 → fetch body 에 포함 (R4 컨텍스트 검증)
//   8. body 없는 응답 → error state

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

const fetchMock = vi.fn();

/** 문자열 chunk 들을 ReadableStream<Uint8Array> 로 변환 (TextDecoder 가 소비). */
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

beforeEach(() => {
  trackMock.mockReset();
  shareMock.mockReset();
  fetchMock.mockReset();
  // happy-dom 의 global fetch 를 mock.
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const EVAL_ID = "eval-abc-123";

describe("CushionNoteGenerator", () => {
  it("scenario 1: '알림장 생성' 클릭 → POST /api/cushion/stream 호출 + body 에 evaluationResultId 포함", async () => {
    fetchMock.mockResolvedValueOnce(makeStreamResponse(["짧은 응답"]));

    render(<CushionNoteGenerator evaluationResultId={EVAL_ID} />);
    fireEvent.click(screen.getByTestId("cushion-generate-button"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/cushion/stream");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.evaluationResultId).toBe(EVAL_ID);
  });

  it("scenario 2: streaming chunk 소비 → textarea 한 글자씩 채워짐 + 글자 수 갱신", async () => {
    fetchMock.mockResolvedValueOnce(
      makeStreamResponse(["오늘 ", "지우는 ", "잘 했어요."]),
    );

    render(<CushionNoteGenerator evaluationResultId={EVAL_ID} />);
    fireEvent.click(screen.getByTestId("cushion-generate-button"));

    await waitFor(() => {
      const textarea = screen.getByTestId("cushion-text-area") as HTMLTextAreaElement;
      expect(textarea.value).toBe("오늘 지우는 잘 했어요.");
    });
    const expectedLen = "오늘 지우는 잘 했어요.".length;
    expect(screen.getByTestId("cushion-char-count")).toHaveTextContent(String(expectedLen));
  });

  it("scenario 3: 스트림 완료 → '생성 완료' + cushion_note_generated 이벤트 (source='gemini')", async () => {
    fetchMock.mockResolvedValueOnce(
      makeStreamResponse(["부모님께 드리는 알림장입니다."]),
    );

    render(<CushionNoteGenerator evaluationResultId={EVAL_ID} />);
    fireEvent.click(screen.getByTestId("cushion-generate-button"));

    await waitFor(() => {
      expect(screen.getByTestId("cushion-status-done")).toBeInTheDocument();
    });
    expect(screen.getByTestId("cushion-status-done")).toHaveAttribute(
      "data-source",
      "gemini",
    );
    expect(trackMock).toHaveBeenCalledWith("cushion_note_generated", {
      evaluationResultId: EVAL_ID,
      source: "gemini",
      charCount: "부모님께 드리는 알림장입니다.".length,
    });
  });

  it("scenario 4: 완료 후 클립보드 복사 클릭 → shareOrCopy 호출 + cushion_note_copied 이벤트", async () => {
    fetchMock.mockResolvedValueOnce(makeStreamResponse(["테스트 본문"]));
    shareMock.mockResolvedValueOnce({ method: "clipboard", succeeded: true });

    render(<CushionNoteGenerator evaluationResultId={EVAL_ID} />);
    fireEvent.click(screen.getByTestId("cushion-generate-button"));

    await waitFor(() => expect(screen.getByTestId("cushion-status-done")).toBeInTheDocument());

    trackMock.mockClear();
    fireEvent.click(screen.getByTestId("cushion-copy-button"));

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledTimes(1);
    });
    expect(shareMock.mock.calls[0][0]).toMatchObject({
      text: "테스트 본문",
      surface: "result",
    });
    expect(trackMock).toHaveBeenCalledWith("cushion_note_copied", {
      evaluationResultId: EVAL_ID,
      method: "clipboard",
    });
    expect(screen.getByTestId("cushion-status-copied")).toHaveAttribute(
      "data-method",
      "clipboard",
    );
  });

  it("scenario 4b: shareOrCopy method='unsupported' → 안내 메시지 노출", async () => {
    fetchMock.mockResolvedValueOnce(makeStreamResponse(["본문"]));
    shareMock.mockResolvedValueOnce({
      method: "unsupported",
      succeeded: false,
      message: "지원 안 됨",
    });

    render(<CushionNoteGenerator evaluationResultId={EVAL_ID} />);
    fireEvent.click(screen.getByTestId("cushion-generate-button"));
    await waitFor(() => expect(screen.getByTestId("cushion-status-done")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("cushion-copy-button"));
    await waitFor(() => {
      expect(screen.getByTestId("cushion-status-copied")).toHaveAttribute(
        "data-method",
        "unsupported",
      );
    });
    expect(screen.getByTestId("cushion-status-copied")).toHaveTextContent(/자동 복사/);
  });

  it("scenario 5: CUSHION_SWAP_MARKER 등장 → textarea 가 마커 이후 chunk 로 교체 + source='template'", async () => {
    fetchMock.mockResolvedValueOnce(
      makeStreamResponse([
        "오늘 치료 권장합니다.", // 금칙어 chunk
        "\n[__CUSHION_SWAP__]\n",
        "보호자님, 오늘 ㅅ 발음을 함께 연습했어요.",
      ]),
    );

    render(<CushionNoteGenerator evaluationResultId={EVAL_ID} />);
    fireEvent.click(screen.getByTestId("cushion-generate-button"));

    await waitFor(() => {
      expect(screen.getByTestId("cushion-status-done")).toBeInTheDocument();
    });
    const textarea = screen.getByTestId("cushion-text-area") as HTMLTextAreaElement;
    expect(textarea.value).toContain("ㅅ 발음을 함께 연습");
    expect(textarea.value).not.toContain("치료");
    expect(textarea.value).not.toContain("[__CUSHION_SWAP__]");
    expect(screen.getByTestId("cushion-status-done")).toHaveAttribute(
      "data-source",
      "template",
    );
    expect(trackMock).toHaveBeenCalledWith("cushion_note_generated", {
      evaluationResultId: EVAL_ID,
      source: "template",
      charCount: textarea.value.length,
    });
  });

  it("scenario 6: HTTP 403 응답 → error state + 메시지 노출", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "FORBIDDEN" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<CushionNoteGenerator evaluationResultId={EVAL_ID} />);
    fireEvent.click(screen.getByTestId("cushion-generate-button"));

    await waitFor(() => expect(screen.getByTestId("cushion-status-error")).toBeInTheDocument());
    expect(screen.getByTestId("cushion-status-error")).toHaveTextContent(/FORBIDDEN/);
  });

  it("scenario 7: studentName 입력 변경 → fetch body 에 포함", async () => {
    fetchMock.mockResolvedValueOnce(makeStreamResponse(["본문"]));

    render(<CushionNoteGenerator evaluationResultId={EVAL_ID} defaultStudentName="민준" />);
    const nameInput = screen.getByTestId("cushion-student-name-input") as HTMLInputElement;
    expect(nameInput.value).toBe("민준");

    fireEvent.change(nameInput, { target: { value: "서연" } });
    fireEvent.click(screen.getByTestId("cushion-generate-button"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.studentName).toBe("서연");
  });

  it("scenario 8: body 없는 응답 → error state", async () => {
    // Response with null body — happy-dom 에서는 직접 null body 만들기 까다로워서 status 200 + 빈 stream 으로 대체.
    fetchMock.mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );

    render(<CushionNoteGenerator evaluationResultId={EVAL_ID} />);
    fireEvent.click(screen.getByTestId("cushion-generate-button"));

    await waitFor(() => expect(screen.getByTestId("cushion-status-error")).toBeInTheDocument());
  });

  it("scenario 9: streaming 동안 generate 버튼 disabled", async () => {
    let resolveStream: () => void;
    const streamPromise = new Promise<void>((resolve) => {
      resolveStream = resolve;
    });
    fetchMock.mockImplementationOnce(async () => {
      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream<Uint8Array>({
          async start(controller) {
            controller.enqueue(encoder.encode("부분 "));
            await streamPromise;
            controller.enqueue(encoder.encode("완료"));
            controller.close();
          },
        }),
        { status: 200 },
      );
    });

    render(<CushionNoteGenerator evaluationResultId={EVAL_ID} />);
    const btn = screen.getByTestId("cushion-generate-button");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(btn).toBeDisabled();
    });
    expect(btn).toHaveTextContent(/AI 가 작성 중/);

    // 스트림 마무리.
    resolveStream!();
    await waitFor(() => expect(screen.getByTestId("cushion-status-done")).toBeInTheDocument());
    expect(btn).not.toBeDisabled();
  });
});

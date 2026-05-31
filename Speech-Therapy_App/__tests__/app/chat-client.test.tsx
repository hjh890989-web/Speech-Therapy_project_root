// FR-Q-022 — ChatClient (F15 챗봇 UI) 단위 테스트.
//   route(/api/chat/stream) 는 fetch+stream mock, submitChatUtterance 는 저장 record mock.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const submitMock = vi.fn();
vi.mock("@/app/actions/submit-chat-utterance", () => ({
  submitChatUtterance: (...a: unknown[]) => submitMock(...a),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { ChatClient } from "@/app/(public)/chat/ChatClient";

function streamRes(chunks: string[]): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    },
  });
  return { ok: true, status: 200, body, json: async () => ({}) } as unknown as Response;
}
function errRes(status: number, json: object): Response {
  return { ok: false, status, body: null, json: async () => json } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  submitMock.mockReset();
  submitMock.mockResolvedValue({ success: true });
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

async function clickSend() {
  await act(async () => {
    fireEvent.click(screen.getByTestId("chat-send"));
  });
}
function type(text: string) {
  fireEvent.change(screen.getByTestId("chat-input"), { target: { value: text } });
}

describe("ChatClient — FR-Q-022 F15 챗봇 UI", () => {
  it("초기 인사말 노출 + 빈 입력 시 보내기 비활성", () => {
    render(<ChatClient />);
    expect(screen.getByText(/오늘은 뭐 하고 놀았어/)).toBeInTheDocument();
    expect(screen.getByTestId("chat-send")).toBeDisabled();
  });

  it("전송 → 사용자 말풍선 + history 포함 POST + 7일 저장 record + 스트림 응답 누적", async () => {
    fetchMock.mockResolvedValue(streamRes(["반가워! ", "또 얘기해 줄래? 😊"]));
    render(<ChatClient />);
    type("오늘 블록 쌓기 했어");
    await clickSend();

    // 사용자 말풍선.
    expect(screen.getByText("오늘 블록 쌓기 했어")).toBeInTheDocument();
    // POST — 마지막 메시지가 방금 user 발화.
    expect(fetchMock).toHaveBeenCalledWith("/api/chat/stream", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body);
    expect(body.messages.at(-1)).toEqual({ role: "user", content: "오늘 블록 쌓기 했어" });
    // 승인된 저장 경로 호출(7일 폐기 record).
    expect(submitMock).toHaveBeenCalledWith({ role: "user", content: "오늘 블록 쌓기 했어" });
    // 스트림 응답 누적.
    expect(await screen.findByText(/또 얘기해 줄래/)).toBeInTheDocument();
  });

  it("401 → 로그인 안내 + 링크", async () => {
    fetchMock.mockResolvedValue(errRes(401, { error: "UNAUTHORIZED" }));
    render(<ChatClient />);
    type("안녕");
    await clickSend();
    const err = await screen.findByTestId("chat-error");
    expect(err).toHaveTextContent("로그인");
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login?next=/chat");
  });

  it("403 CONSENT_REQUIRED → 동의 안내 + 링크", async () => {
    fetchMock.mockResolvedValue(errRes(403, { error: "CONSENT_REQUIRED" }));
    render(<ChatClient />);
    type("안녕");
    await clickSend();
    const err = await screen.findByTestId("chat-error");
    expect(err).toHaveTextContent("동의");
    expect(screen.getByRole("link", { name: "동의하러 가기" })).toHaveAttribute(
      "href",
      "/settings/privacy-consent",
    );
  });

  it("429 → 친화 안내(과속)", async () => {
    fetchMock.mockResolvedValue(errRes(429, { error: "RATE_LIMITED" }));
    render(<ChatClient />);
    type("안녕");
    await clickSend();
    expect(await screen.findByTestId("chat-error")).toHaveTextContent("잠시 후");
  });
});

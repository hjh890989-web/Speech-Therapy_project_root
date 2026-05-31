// FR-Q-022 — ChatClient STT 마이크 버튼 단위 테스트.
//
// 격리: useSpeechToText mock 으로 supported/listening 상태 주입. (실 STT 미지원 happy-dom 에선
//       마이크 미노출 — 본 테스트는 hook 을 mock 해 노출/클릭 wiring 만 검증.)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/app/actions/submit-chat-utterance", () => ({
  submitChatUtterance: (...a: unknown[]) => Promise.resolve(a),
}));
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

const startMock = vi.fn();
const stopMock = vi.fn();
const sttState = {
  current: { supported: true, listening: false } as {
    supported: boolean;
    listening: boolean;
  },
};
vi.mock("@/lib/hooks/useSpeechToText", () => ({
  useSpeechToText: () => ({
    ...sttState.current,
    start: startMock,
    stop: stopMock,
  }),
}));

import { ChatClient } from "@/app/(public)/chat/ChatClient";

beforeEach(() => {
  startMock.mockReset();
  stopMock.mockReset();
  sttState.current = { supported: true, listening: false };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChatClient — FR-Q-022 STT 마이크", () => {
  it("supported → 마이크 버튼 노출 + 클릭 시 start()", () => {
    render(<ChatClient />);
    const mic = screen.getByTestId("chat-mic");
    expect(mic).toBeTruthy();
    fireEvent.click(mic);
    expect(startMock).toHaveBeenCalledOnce();
    expect(stopMock).not.toHaveBeenCalled();
  });

  it("listening 중 → 클릭 시 stop()", () => {
    sttState.current = { supported: true, listening: true };
    render(<ChatClient />);
    fireEvent.click(screen.getByTestId("chat-mic"));
    expect(stopMock).toHaveBeenCalledOnce();
  });

  it("미지원 → 마이크 버튼 미노출", () => {
    sttState.current = { supported: false, listening: false };
    render(<ChatClient />);
    expect(screen.queryByTestId("chat-mic")).toBeNull();
  });
});

// FR-Q-022 — useSpeechToText (Web Speech API STT) 단위 테스트.
//
// window.SpeechRecognition 을 fake 로 주입해 지원 감지 + start/onresult/onend/stop 동작 검증.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import {
  isSpeechToTextSupported,
  useSpeechToText,
} from "@/lib/hooks/useSpeechToText";

// 실제 class 생성자 — vi.fn 을 new 로 쓰면 팩토리 반환 객체를 돌려주지 않으므로 class 사용.
class FakeRecognition {
  lang = "";
  interimResults = true;
  continuous = true;
  start = vi.fn();
  stop = vi.fn();
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null = null;
  onerror: (() => void) | null = null;
  onend: (() => void) | null = null;
  constructor() {
    // 테스트 fake — 직전 생성 인스턴스를 기록해 onresult/onend 등을 외부에서 트리거.
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- test fake instance 캡처(의도)
    lastRec = this;
  }
}

let lastRec: FakeRecognition | null = null;

const win = window as unknown as {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
};

beforeEach(() => {
  lastRec = null;
  win.SpeechRecognition = FakeRecognition;
  delete win.webkitSpeechRecognition;
});

afterEach(() => {
  delete win.SpeechRecognition;
  delete win.webkitSpeechRecognition;
  vi.restoreAllMocks();
});

describe("isSpeechToTextSupported", () => {
  it("SpeechRecognition 존재 → true", () => {
    expect(isSpeechToTextSupported()).toBe(true);
  });
  it("미지원 → false", () => {
    delete win.SpeechRecognition;
    expect(isSpeechToTextSupported()).toBe(false);
  });
  it("webkit prefix 도 지원으로 인식", () => {
    delete win.SpeechRecognition;
    win.webkitSpeechRecognition = FakeRecognition;
    expect(isSpeechToTextSupported()).toBe(true);
  });
});

describe("useSpeechToText", () => {
  it("supported=true + start → recognition.start + lang=ko-KR + listening true", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechToText(onResult));
    expect(result.current.supported).toBe(true);
    act(() => result.current.start());
    expect(lastRec).not.toBeNull();
    expect(lastRec!.lang).toBe("ko-KR");
    expect(lastRec!.interimResults).toBe(false);
    expect(lastRec!.start).toHaveBeenCalledOnce();
    expect(result.current.listening).toBe(true);
  });

  it("onresult → onResult 콜백(trim) 1회 호출", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechToText(onResult));
    act(() => result.current.start());
    act(() => {
      lastRec!.onresult!({ results: [[{ transcript: "  안녕하세요  " }]] });
    });
    expect(onResult).toHaveBeenCalledWith("안녕하세요");
  });

  it("빈 transcript → 콜백 미호출", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechToText(onResult));
    act(() => result.current.start());
    act(() => {
      lastRec!.onresult!({ results: [[{ transcript: "   " }]] });
    });
    expect(onResult).not.toHaveBeenCalled();
  });

  it("onend → listening false", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechToText(onResult));
    act(() => result.current.start());
    expect(result.current.listening).toBe(true);
    act(() => lastRec!.onend!());
    expect(result.current.listening).toBe(false);
  });

  it("stop → recognition.stop + listening false", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechToText(onResult));
    act(() => result.current.start());
    act(() => result.current.stop());
    expect(lastRec!.stop).toHaveBeenCalled();
    expect(result.current.listening).toBe(false);
  });

  it("미지원 → supported false + start no-op (listening 유지 false)", () => {
    delete win.SpeechRecognition;
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechToText(onResult));
    expect(result.current.supported).toBe(false);
    act(() => result.current.start());
    expect(result.current.listening).toBe(false);
  });
});

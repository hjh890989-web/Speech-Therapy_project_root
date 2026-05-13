// TEST-003 근간 — useSpeechRecognition 훅 단위 테스트 (happy-dom).
// Web Speech API 모킹 + SSR-safe (isMounted) 동작 검증.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Web Speech API mock 클래스.
class MockSpeechRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}

beforeEach(() => {
  // 브라우저 환경에서 SpeechRecognition 주입.
  (globalThis as unknown as { SpeechRecognition: typeof MockSpeechRecognition }).SpeechRecognition =
    MockSpeechRecognition;
});

describe("useSpeechRecognition", () => {
  it("mount 후 isMounted=true + isSupported=true (mock 주입)", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isMounted).toBe(true);
    expect(result.current.isSupported).toBe(true);
    expect(result.current.status).toBe("idle");
  });

  it("start() 호출 시 status=listening + transcript 초기화", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.start();
    });
    expect(result.current.status).toBe("listening");
    expect(result.current.transcript).toBe("");
  });

  it("reset() → status=idle + transcript=''", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.transcript).toBe("");
    expect(result.current.errorCode).toBeNull();
  });
});

describe("useSpeechRecognition — 미지원 환경", () => {
  it("SpeechRecognition 미정의 → isSupported=false, errorCode='not_supported'", async () => {
    delete (globalThis as unknown as Record<string, unknown>).SpeechRecognition;
    // useSyncExternalStore 가 호출마다 client snapshot 재평가하므로 모듈 재import 불필요.
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isMounted).toBe(true);
    expect(result.current.isSupported).toBe(false);
    expect(result.current.errorCode).toBe("not_supported");
  });
});

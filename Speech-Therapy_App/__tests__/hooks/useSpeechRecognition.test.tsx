// TEST-003 근간 — useSpeechRecognition 훅 단위 테스트 (happy-dom).
// Web Speech API 모킹 + SSR-safe (isMounted) 동작 검증.
// FR-C-003 — 자동 재시도 1회 + trackEvent 발송 검증.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// trackEvent mock — STT 이벤트 발송 캡처.
const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

// Web Speech API mock 클래스 — start() 가 호출될 때마다 instance counter 증가, 외부 captureInstance 로 추적.
class MockSpeechRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  constructor() {
    capturedInstances.push(this);
  }
}

const capturedInstances: MockSpeechRecognition[] = [];

beforeEach(() => {
  capturedInstances.length = 0;
  trackMock.mockClear();
  // 브라우저 환경에서 SpeechRecognition 주입.
  (globalThis as unknown as { SpeechRecognition: typeof MockSpeechRecognition }).SpeechRecognition =
    MockSpeechRecognition;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
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

// FR-C-003 — 재시도 1회 정책.
describe("useSpeechRecognition — 자동 재시도 (FR-C-003)", () => {
  it("초기 retryCount = 0", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.retryCount).toBe(0);
  });

  it("start() → retryCount 0 + status listening", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.start();
    });
    expect(result.current.retryCount).toBe(0);
    expect(result.current.status).toBe("listening");
  });

  it("reset() → retryCount 0 + status idle", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.reset();
    });
    expect(result.current.retryCount).toBe(0);
    expect(result.current.status).toBe("idle");
  });

  // AC Scenario 1 — 일시 오류 → 200ms 후 자동 재시도 → 성공.
  it("network 일시 오류 → 200ms 후 재시도 → 성공 시 stt_retry_success 발송", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });
    expect(result.current.status).toBe("listening");

    // 첫 호출 onerror (network).
    const instance = capturedInstances[0];
    act(() => {
      instance.onerror?.({ error: "network" });
    });
    expect(result.current.status).toBe("retrying");
    expect(result.current.retryCount).toBe(1);

    // 200ms 진행 → setTimeout 트리거 → instance.start() 재호출 + status='listening'.
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.status).toBe("listening");

    // 재시도 onresult — 성공.
    act(() => {
      instance.onresult?.({
        results: { 0: { 0: { transcript: "사과", confidence: 0.9 }, isFinal: true } },
      });
    });
    expect(result.current.status).toBe("result");
    expect(result.current.transcript).toBe("사과");
    expect(trackMock).toHaveBeenCalledWith("stt_retry_success", {
      firstAttemptError: "network",
    });
  });

  // AC Scenario 2 — 재시도도 실패 → status='error' + stt_retry_failed 발송.
  it("재시도 후 또 실패 → status='error' + stt_retry_failed 발송", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const instance = capturedInstances[0];

    // 1차 실패.
    act(() => instance.onerror?.({ error: "no-speech" }));
    expect(result.current.status).toBe("retrying");

    // 200ms 진행 + 재시도 시작.
    act(() => vi.advanceTimersByTime(200));

    // 2차도 실패 (no-speech) — 재시도 안 함, error 상태.
    act(() => instance.onerror?.({ error: "no-speech" }));
    expect(result.current.status).toBe("error");
    expect(result.current.errorCode).toBe("no_speech");
    expect(trackMock).toHaveBeenCalledWith("stt_retry_failed", { finalError: "no_speech" });
  });

  // AC Scenario 4 — 무한 재시도 방지: 5회 onerror 도 자동 재시도는 1회만.
  it("5회 onerror 도 자동 재시도는 1회만 (무한 재시도 방지)", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const instance = capturedInstances[0];

    // 5회 연속 error — 동일 instance 의 onerror.
    for (let i = 0; i < 5; i++) {
      act(() => instance.onerror?.({ error: "aborted" }));
      act(() => vi.advanceTimersByTime(200));
    }

    // start() 는 초기 1회 + 자동 재시도 1회 = 총 2회만.
    expect(instance.start).toHaveBeenCalledTimes(2);
    expect(result.current.retryCount).toBe(1);
    expect(result.current.status).toBe("error");
  });

  // 영구 오류 (permission_denied) → 재시도 안 함.
  it("permission_denied → 즉시 error, 재시도 안 함, stt_first_attempt 도 발송 안 함", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const instance = capturedInstances[0];

    act(() => instance.onerror?.({ error: "not-allowed" }));
    expect(result.current.status).toBe("error");
    expect(result.current.errorCode).toBe("permission_denied");
    expect(result.current.retryCount).toBe(0);
    expect(instance.start).toHaveBeenCalledTimes(1); // 초기 호출만, 재시도 X
    expect(trackMock).not.toHaveBeenCalledWith("stt_retry_failed", expect.anything());
  });

  // 첫 시도 성공 → stt_first_attempt_success 발송.
  it("첫 시도 성공 → stt_first_attempt_success 발송", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const instance = capturedInstances[0];

    act(() => {
      instance.onresult?.({
        results: { 0: { 0: { transcript: "사과", confidence: 0.95 }, isFinal: true } },
      });
    });
    expect(result.current.status).toBe("result");
    expect(trackMock).toHaveBeenCalledWith("stt_first_attempt_success", {});
    expect(trackMock).not.toHaveBeenCalledWith("stt_retry_success", expect.anything());
  });
});

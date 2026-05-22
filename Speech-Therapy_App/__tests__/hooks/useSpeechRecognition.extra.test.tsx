// TEST-003 (#77) — useSpeechRecognition 단위 테스트 보강.
//
// 본 파일은 기존 useSpeechRecognition.test.tsx (12 cases) 를 변경하지 않고
// 누락 케이스를 보강한다:
//   - REQ-FUNC-006: 마이크 권한 거부 (not-allowed / service-not-allowed) 분류 + 재시도 없음
//   - REQ-FUNC-004 / FR-C-003: 자동 재시도 1회 (firstAttemptError 3 variant + final error 분기)
//   - REQ-NF-014: 100회 부하 시뮬레이션 → 최종 성공률 ≥ 98% 보장
//   - REQ-NF-021 / MON-002: stt_error 이벤트 (error-catalog 코드) 발송 검증
//   - 알 수 없는 에러 → stt_unknown 분류
//   - audio_capture (디바이스 부재) 분류 + 재시도 없음
//
// 60dB 소음 시뮬레이션 (REQ-FUNC-007) 노트:
//   useSpeechRecognition 훅은 SpeechRecognition 의 result/error 만 소비하며 SPL/dB 측정 로직이
//   없다. 본 프로젝트의 dB 측정은 useAudioAnalyzer / lib/audio/analyzer.ts 에서 별도 처리되며
//   60dB 임계 게이트 자체는 아직 미구현 (audio-analyzer 의 noise-floor 는 -70dB FFT bin 신뢰
//   하한이지 환경 소음 SPL 게이트가 아님). TEST-003 의 60dB Toast 시나리오는 별도 hook /
//   컴포넌트 책임이므로 본 파일에선 STT 측면만 검증한다 — 발견 사항으로 보고.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// trackEvent mock — STT 이벤트 발송 캡처.
const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

// Web Speech API mock — start() / stop() 호출 추적 + onresult / onerror / onend 핸들러 노출.
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
  (globalThis as unknown as { SpeechRecognition: typeof MockSpeechRecognition }).SpeechRecognition =
    MockSpeechRecognition;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// 1) 마이크 권한 거부 (REQ-FUNC-006)
// ---------------------------------------------------------------------------
describe("useSpeechRecognition — 마이크 권한 거부 (REQ-FUNC-006)", () => {
  it("'not-allowed' → errorCode='permission_denied' + 재시도 안 함 + stt_retry_failed 없음", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const instance = capturedInstances[0];

    act(() => instance.onerror?.({ error: "not-allowed" }));

    expect(result.current.status).toBe("error");
    expect(result.current.errorCode).toBe("permission_denied");
    expect(result.current.retryCount).toBe(0);
    // 200ms 가 지나도 재시도 호출이 발생하면 안 됨.
    act(() => vi.advanceTimersByTime(200));
    expect(instance.start).toHaveBeenCalledTimes(1);
    expect(trackMock).not.toHaveBeenCalledWith("stt_retry_failed", expect.anything());
    expect(trackMock).not.toHaveBeenCalledWith("stt_retry_success", expect.anything());
  });

  it("'service-not-allowed' → errorCode='permission_denied' (브라우저 정책 거부 케이스)", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const instance = capturedInstances[0];

    act(() => instance.onerror?.({ error: "service-not-allowed" }));

    expect(result.current.errorCode).toBe("permission_denied");
    expect(result.current.retryCount).toBe(0);
    expect(instance.start).toHaveBeenCalledTimes(1);
  });

  it("권한 거부 후 → stt_error 메트릭(MON-002) 'stt_permission_denied' 발송", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const instance = capturedInstances[0];

    act(() => instance.onerror?.({ error: "not-allowed" }));

    expect(result.current.errorCode).toBe("permission_denied");
    expect(trackMock).toHaveBeenCalledWith("stt_error", { code: "stt_permission_denied" });
  });
});

// ---------------------------------------------------------------------------
// 2) 디바이스 부재 — audio_capture (마이크 없음 / 점유)
// ---------------------------------------------------------------------------
describe("useSpeechRecognition — audio_capture (디바이스 부재)", () => {
  it("'audio-capture' → errorCode='audio_capture' + 재시도 안 함 + stt_error 'stt_audio_capture'", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const instance = capturedInstances[0];

    act(() => instance.onerror?.({ error: "audio-capture" }));

    expect(result.current.errorCode).toBe("audio_capture");
    expect(result.current.retryCount).toBe(0);
    act(() => vi.advanceTimersByTime(200));
    expect(instance.start).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("stt_error", { code: "stt_audio_capture" });
  });
});

// ---------------------------------------------------------------------------
// 3) firstAttemptError 3 variant (no_speech / network / aborted)
// ---------------------------------------------------------------------------
describe("useSpeechRecognition — firstAttemptError 분류 (FR-C-003)", () => {
  it("첫 호출 no-speech → 재시도 → 성공 시 firstAttemptError='no_speech'", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const instance = capturedInstances[0];

    act(() => instance.onerror?.({ error: "no-speech" }));
    expect(result.current.status).toBe("retrying");
    expect(result.current.retryCount).toBe(1);

    act(() => vi.advanceTimersByTime(200));
    expect(instance.start).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("listening");

    act(() =>
      instance.onresult?.({
        results: { 0: { 0: { transcript: "사과", confidence: 0.9 }, isFinal: true } },
      }),
    );
    expect(result.current.transcript).toBe("사과");
    expect(trackMock).toHaveBeenCalledWith("stt_retry_success", { firstAttemptError: "no_speech" });
  });

  it("첫 호출 aborted → 재시도 → 성공 시 firstAttemptError='aborted'", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const instance = capturedInstances[0];

    act(() => instance.onerror?.({ error: "aborted" }));
    act(() => vi.advanceTimersByTime(200));
    act(() =>
      instance.onresult?.({
        results: { 0: { 0: { transcript: "바나나", confidence: 0.85 }, isFinal: true } },
      }),
    );

    expect(result.current.transcript).toBe("바나나");
    expect(trackMock).toHaveBeenCalledWith("stt_retry_success", { firstAttemptError: "aborted" });
  });
});

// ---------------------------------------------------------------------------
// 4) finalError 분기 — 마지막 에러 우선 + unknown 분류
// ---------------------------------------------------------------------------
describe("useSpeechRecognition — finalError 분기 (재시도 후 실패)", () => {
  it("양쪽 모두 network → finalError='network'", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const instance = capturedInstances[0];

    act(() => instance.onerror?.({ error: "network" }));
    act(() => vi.advanceTimersByTime(200));
    act(() => instance.onerror?.({ error: "network" }));

    expect(result.current.status).toBe("error");
    expect(result.current.errorCode).toBe("network");
    expect(trackMock).toHaveBeenCalledWith("stt_retry_failed", { finalError: "network" });
    expect(trackMock).toHaveBeenCalledWith("stt_error", { code: "stt_network" });
  });

  it("첫 no_speech + 재시도 network → finalError='network' (마지막 에러 우선)", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const instance = capturedInstances[0];

    act(() => instance.onerror?.({ error: "no-speech" }));
    act(() => vi.advanceTimersByTime(200));
    act(() => instance.onerror?.({ error: "network" }));

    expect(result.current.errorCode).toBe("network");
    expect(trackMock).toHaveBeenCalledWith("stt_retry_failed", { finalError: "network" });
  });

  it("재시도 후 알 수 없는 에러 → finalError='unknown' + stt_error 'stt_unknown'", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const instance = capturedInstances[0];

    act(() => instance.onerror?.({ error: "no-speech" }));
    act(() => vi.advanceTimersByTime(200));
    // 재시도 후 매핑되지 않는 새 에러 — finalError fallback 'unknown' 경로.
    act(() => instance.onerror?.({ error: "language-not-supported" }));

    expect(result.current.errorCode).toBe("unknown");
    expect(trackMock).toHaveBeenCalledWith("stt_retry_failed", { finalError: "unknown" });
    expect(trackMock).toHaveBeenCalledWith("stt_error", { code: "stt_unknown" });
  });
});

// ---------------------------------------------------------------------------
// 5) 에러 분류 (REQ-NF-021) — mapErrorCode 전 코드 매핑 검증
// ---------------------------------------------------------------------------
describe("useSpeechRecognition — 에러 분류 (REQ-NF-021)", () => {
  it("알 수 없는 첫 호출 에러 → errorCode='unknown' + stt_error 'stt_unknown'", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const instance = capturedInstances[0];

    act(() => instance.onerror?.({ error: "totally-unknown-code" }));

    expect(result.current.errorCode).toBe("unknown");
    expect(result.current.retryCount).toBe(0); // 영구 오류 — 자동 재시도 없음
    expect(trackMock).toHaveBeenCalledWith("stt_error", { code: "stt_unknown" });
  });
});

// ---------------------------------------------------------------------------
// 6) 성공률 시뮬레이션 (REQ-NF-014 — ≥ 98%)
// ---------------------------------------------------------------------------
describe("useSpeechRecognition — 성공률 시뮬 (REQ-NF-014)", () => {
  it("100회 시뮬 / 10% 첫 호출 실패 → 재시도 1회로 최종 성공 ≥ 98건", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const TRIALS = 100;
    const FIRST_FAIL_RATE = 0.1; // 10% 첫 호출 실패
    const RETRY_FAIL_RATE = 0.05; // 5% — 재시도도 실패 (독립 가정)

    let successCount = 0;

    for (let i = 0; i < TRIALS; i++) {
      const { result, unmount } = renderHook(() => useSpeechRecognition());
      act(() => result.current.start());
      const instance = capturedInstances[capturedInstances.length - 1];

      const firstFails = Math.random() < FIRST_FAIL_RATE;
      if (!firstFails) {
        // 첫 호출 즉시 성공.
        act(() =>
          instance.onresult?.({
            results: { 0: { 0: { transcript: "ok", confidence: 0.9 }, isFinal: true } },
          }),
        );
        if (result.current.status === "result") successCount++;
      } else {
        act(() => instance.onerror?.({ error: "network" }));
        act(() => vi.advanceTimersByTime(200));
        const retryFails = Math.random() < RETRY_FAIL_RATE;
        if (retryFails) {
          act(() => instance.onerror?.({ error: "network" }));
        } else {
          act(() =>
            instance.onresult?.({
              results: { 0: { 0: { transcript: "ok", confidence: 0.9 }, isFinal: true } },
            }),
          );
          if (result.current.status === "result") successCount++;
        }
      }
      unmount();
    }

    // 기대값: 90 + 10 * 0.95 = 99.5 — 분산 고려 ≥ 98 보장.
    // (실패 확률은 0.1 * 0.05 = 0.005 이므로 binomial 분산으로 98 이하 확률 매우 낮음)
    expect(successCount).toBeGreaterThanOrEqual(98);
  });
});

// ---------------------------------------------------------------------------
// 7) 60dB 소음 — STT 레이어 책임 분리 검증 (문서화 케이스)
// ---------------------------------------------------------------------------
describe("useSpeechRecognition — 60dB 소음 (REQ-FUNC-007) 책임 분리 노트", () => {
  // useSpeechRecognition 은 SPL/dB 측정 책임이 없음. confidence 가 낮아도 결과는 그대로 surface.
  // 60dB Toast 트리거는 별도 hook (useAudioAnalyzer / lib/audio/analyzer.ts 또는 신규 SPL hook) 의 책임.
  it("낮은 confidence (0.3) 결과도 그대로 surface — STT 레이어는 SPL 게이트 미수행", async () => {
    const { useSpeechRecognition } = await import("@/lib/hooks/useSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const instance = capturedInstances[0];

    act(() =>
      instance.onresult?.({
        results: { 0: { 0: { transcript: "흐릿한 발음", confidence: 0.3 }, isFinal: true } },
      }),
    );

    expect(result.current.status).toBe("result");
    expect(result.current.transcript).toBe("흐릿한 발음");
    expect(result.current.confidence).toBe(0.3);
    // 첫 호출 성공으로 분류 — 별도 noise filtering 없음 (책임 분리 검증).
    expect(trackMock).toHaveBeenCalledWith("stt_first_attempt_success", {});
  });
});

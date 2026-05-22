// REQ-FUNC-007 — useSplMeter 단위 테스트 (happy-dom + Web Audio API mock).
//
// 검증 시나리오 (총 10건):
//   1) enabled=false → status='idle' + currentDb null (mic stream 안 요청)
//   2) AudioContext 미지원 → status='unsupported'
//   3) getUserMedia 미지원 → status='unsupported'
//   4) getUserMedia 실패 (NotAllowedError) → status='error'
//   5) 정상 측정 시작 → status='measuring' + currentDb 값 노출
//   6) threshold 초과 1초 → isOverThreshold=false, overThresholdMs ≈ 1000
//   7) threshold 초과 5초 → isOverThreshold=true + peakDb 캡처
//   8) 초과 중간 below-threshold 1 tick → 카운터 즉시 리셋 (지속 노이즈만 트리거)
//   9) unmount → AudioContext.close + stream tracks stop
//  10) enabled true → false 전환 → teardown + status='idle' 복귀

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useSplMeter } from "@/lib/audio/useSplMeter";

// ── 헬퍼: getByteTimeDomainData mock —
// dB SPL-like = 20*log10(rms) + 100 (splOffsetDb default 100).
// targetDb 를 만족하는 byte amplitude offset 계산.
//   rms = 10^((targetDb - 100) / 20)
//   byte sample = 128 ± (rms * 128) — 본 mock 은 sin 대신 일정 amplitude 의 alternating 신호 사용.
function fillBufferForDb(buffer: Uint8Array, targetDb: number) {
  const rms = Math.pow(10, (targetDb - 100) / 20);
  const amplitude = Math.min(127, Math.round(rms * 128));
  // alternating 128 + a, 128 - a → RMS = a/128.
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = i % 2 === 0 ? 128 + amplitude : 128 - amplitude;
  }
}

interface MockAnalyser {
  fftSize: number;
  getByteTimeDomainData: (buffer: Uint8Array) => void;
}

interface MockAudioContext {
  state: "suspended" | "running" | "closed";
  sampleRate: number;
  resume: () => Promise<void>;
  close: ReturnType<typeof vi.fn>;
  createMediaStreamSource: () => { connect: (target: unknown) => void };
  createAnalyser: () => MockAnalyser;
}

// 현재 시뮬레이션 dB — 테스트가 동적으로 변경 가능.
let currentSimDb = 30;

function installAudioContextMock() {
  const closeFn = vi.fn(() => Promise.resolve());

  // class 형태로 정의 — `new Ctx()` 호출이 정상 작동하도록.
  class MockCtxClass implements MockAudioContext {
    state: "suspended" | "running" | "closed" = "running";
    sampleRate = 44_100;
    resume() {
      return Promise.resolve();
    }
    close = closeFn;
    createMediaStreamSource() {
      return { connect: () => {} };
    }
    createAnalyser(): MockAnalyser {
      return {
        fftSize: 1024,
        getByteTimeDomainData: (buffer: Uint8Array) => {
          fillBufferForDb(buffer, currentSimDb);
        },
      };
    }
  }

  (window as unknown as { AudioContext: unknown }).AudioContext = MockCtxClass;
  return { closeFn, MockCtxClass };
}

function uninstallAudioContextMock() {
  delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  delete (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
}

type MockTrack = MediaStreamTrack & { stop: ReturnType<typeof vi.fn> };

function makeMockMicStream(): { stream: MediaStream; stopTrack: ReturnType<typeof vi.fn> } {
  const stop = vi.fn();
  const track = { stop, kind: "audio" } as unknown as MockTrack;
  const stream = {
    getTracks: () => [track],
  } as unknown as MediaStream;
  return { stream, stopTrack: stop };
}

function installMediaDevices(getUserMedia: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
}

function uninstallMediaDevices() {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: undefined,
  });
}

beforeEach(() => {
  currentSimDb = 30;
  // setInterval (hook tick) + Date (overSince/elapsed 계산) 만 fake.
  // setTimeout 은 waitFor / React Testing Library 의 polling 에 필요하므로 real 유지.
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  uninstallAudioContextMock();
  uninstallMediaDevices();
});

describe("useSplMeter — REQ-FUNC-007", () => {
  it("enabled=false → status='idle' + currentDb null + getUserMedia 미호출", () => {
    const getUserMedia = vi.fn();
    installMediaDevices(getUserMedia);
    installAudioContextMock();

    const { result } = renderHook(() => useSplMeter({ enabled: false }));

    expect(result.current.status).toBe("idle");
    expect(result.current.currentDb).toBeNull();
    expect(result.current.isOverThreshold).toBe(false);
    expect(result.current.overThresholdMs).toBe(0);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("AudioContext 미지원 → status='unsupported'", () => {
    // AudioContext 부재 (uninstall 후 mediaDevices 만 설치).
    uninstallAudioContextMock();
    const getUserMedia = vi.fn();
    installMediaDevices(getUserMedia);

    const { result } = renderHook(() => useSplMeter({ enabled: true }));

    expect(result.current.status).toBe("unsupported");
    expect(result.current.currentDb).toBeNull();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("getUserMedia 미지원 (navigator.mediaDevices 없음) → status='unsupported'", () => {
    uninstallMediaDevices();
    installAudioContextMock();

    const { result } = renderHook(() => useSplMeter({ enabled: true }));

    expect(result.current.status).toBe("unsupported");
  });

  it("getUserMedia 권한 거부 (NotAllowedError) → status='error'", async () => {
    installAudioContextMock();
    const err = Object.assign(new Error("denied"), { name: "NotAllowedError" });
    const getUserMedia = vi.fn().mockRejectedValue(err);
    installMediaDevices(getUserMedia);

    const { result } = renderHook(() => useSplMeter({ enabled: true }));

    await act(async () => {
      // microtask flush + getUserMedia rejection 처리 대기.
      await vi.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.currentDb).toBeNull();
  });

  it("정상 시작 → status='measuring' + currentDb 값 노출 (1 tick 후)", async () => {
    installAudioContextMock();
    const { stream } = makeMockMicStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);
    // 50dB 시뮬 — 8-bit PCM mock 해상도 한계로 amplitude ≥ 1 이 보장되는 영역.
    currentSimDb = 50;

    const { result } = renderHook(() =>
      useSplMeter({ enabled: true, thresholdDb: 60, persistMs: 5000, tickMs: 100 }),
    );

    // microtask flush — getUserMedia promise / AudioContext.resume 등 처리.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("measuring");
    });
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    // 첫 tick (interval=100ms) 강제 진행 — setState 가 처리되도록 microtask flush.
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.currentDb).not.toBeNull();
    // mock buffer 의 8-bit 양자화 한계로 정확한 50dB 재현은 어려움 — threshold 미만이면 충분.
    expect(result.current.currentDb).toBeLessThan(60);
    expect(result.current.isOverThreshold).toBe(false);
  });

  it("threshold 초과 1초 → overThresholdMs ≈ 1000, isOverThreshold=false (5초 미달)", async () => {
    installAudioContextMock();
    const { stream } = makeMockMicStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);
    currentSimDb = 70; // > 60dB threshold

    const { result } = renderHook(() =>
      useSplMeter({ enabled: true, thresholdDb: 60, persistMs: 5000, tickMs: 100 }),
    );

    // microtask flush — getUserMedia promise / AudioContext.resume 등 처리.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.status).toBe("measuring"));

    // 1초 (10 ticks * 100ms) 진행.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.overThresholdMs).toBeGreaterThanOrEqual(900);
    expect(result.current.overThresholdMs).toBeLessThan(5000);
    expect(result.current.isOverThreshold).toBe(false);
  });

  it("threshold 초과 5초 → isOverThreshold=true + peakDb 캡처", async () => {
    installAudioContextMock();
    const { stream } = makeMockMicStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);
    currentSimDb = 70;

    const { result } = renderHook(() =>
      useSplMeter({ enabled: true, thresholdDb: 60, persistMs: 5000, tickMs: 100 }),
    );

    // microtask flush — getUserMedia promise / AudioContext.resume 등 처리.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe("measuring"));

    // 5초 진행 (50 ticks).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5200);
    });

    expect(result.current.isOverThreshold).toBe(true);
    expect(result.current.peakDb).toBeGreaterThan(60);
    expect(result.current.peakDb).toBeLessThan(80);
    expect(result.current.overThresholdMs).toBeGreaterThanOrEqual(5000);
  });

  it("초과 중간에 below-threshold tick → 카운터 즉시 리셋 (5초 누적 안 됨)", async () => {
    installAudioContextMock();
    const { stream } = makeMockMicStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);
    currentSimDb = 70;

    const { result } = renderHook(() =>
      useSplMeter({ enabled: true, thresholdDb: 60, persistMs: 5000, tickMs: 100 }),
    );

    // microtask flush — getUserMedia promise / AudioContext.resume 등 처리.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe("measuring"));

    // 3초 초과.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(result.current.overThresholdMs).toBeGreaterThanOrEqual(2800);

    // 조용한 환경 — 1초 동안 below-threshold.
    currentSimDb = 30;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.overThresholdMs).toBe(0);
    expect(result.current.isOverThreshold).toBe(false);

    // 다시 시끄러워져도 카운터는 0 부터 다시 시작.
    currentSimDb = 70;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.overThresholdMs).toBeGreaterThanOrEqual(1800);
    expect(result.current.overThresholdMs).toBeLessThan(3000);
    expect(result.current.isOverThreshold).toBe(false);
  });

  it("unmount → AudioContext.close + stream tracks.stop 호출", async () => {
    const { closeFn } = installAudioContextMock();
    const { stream, stopTrack } = makeMockMicStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);

    const { result, unmount } = renderHook(() =>
      useSplMeter({ enabled: true, thresholdDb: 60 }),
    );

    // microtask flush — getUserMedia promise / AudioContext.resume 등 처리.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe("measuring"));

    unmount();

    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(closeFn).toHaveBeenCalledTimes(1);
  });

  it("enabled true → false 전환 → teardown + status='idle' + currentDb null 복귀", async () => {
    const { closeFn } = installAudioContextMock();
    const { stream, stopTrack } = makeMockMicStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);
    currentSimDb = 70;

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useSplMeter({ enabled, thresholdDb: 60, persistMs: 5000, tickMs: 100 }),
      { initialProps: { enabled: true } },
    );

    // microtask flush — getUserMedia promise / AudioContext.resume 등 처리.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe("measuring"));

    // 1초 측정.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.currentDb).not.toBeNull();

    // 비활성화.
    rerender({ enabled: false });

    expect(result.current.status).toBe("idle");
    expect(result.current.currentDb).toBeNull();
    expect(result.current.isOverThreshold).toBe(false);
    expect(result.current.overThresholdMs).toBe(0);
    expect(stopTrack).toHaveBeenCalled();
    expect(closeFn).toHaveBeenCalled();
  });
});

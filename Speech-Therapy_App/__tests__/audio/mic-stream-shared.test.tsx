// #106 후속 — MicStreamProvider 통합 회귀 방지 테스트 (8 시나리오).
//
// 검증 시나리오:
//   1) Provider 없이 useMicStream() 호출 → 명확한 에러 throw (호출 측 가드 유도)
//   2) Provider + activate → getUserMedia 1회 호출 + status='active' + stream 노출
//   3) Provider + 다수 consumer (useSplMeter + useAudioAnalyzer 동시 enable) → getUserMedia 1회만
//   4) Provider deactivate (모든 consumer 해제) → tracks.stop 호출 + status='idle' 복귀
//   5) Provider activate 후 getUserMedia 권한 거부 → status='denied' + errorMessage surface
//   6) useSplMeter 단독 사용 (Provider O, useAudioAnalyzer 없음) → 정상 동작
//   7) 다중 mount → unmount → tracks.stop 호출 (leak 없음)
//   8) Provider 없을 때 useSplMeter / useAudioAnalyzer 는 legacy 직접 getUserMedia 경로 유지 (하위 호환)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";

import { MicStreamProvider, useMicStream } from "@/lib/audio/MicStreamProvider";
import { useSplMeter } from "@/lib/audio/useSplMeter";
import { useAudioAnalyzer } from "@/lib/hooks/useAudioAnalyzer";

// ── Mock helpers (useSplMeter.test.tsx 와 동일 패턴) ──

type MockTrack = MediaStreamTrack & { stop: ReturnType<typeof vi.fn> };

function makeMockStream(): { stream: MediaStream; stopTrack: ReturnType<typeof vi.fn> } {
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

function fillBufferForDb(buffer: Uint8Array, targetDb: number) {
  const rms = Math.pow(10, (targetDb - 100) / 20);
  const amplitude = Math.min(127, Math.round(rms * 128));
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = i % 2 === 0 ? 128 + amplitude : 128 - amplitude;
  }
}

let currentSimDb = 30;

function installAudioContextMock() {
  const closeFn = vi.fn(() => Promise.resolve());
  class MockCtxClass {
    state: "suspended" | "running" | "closed" = "running";
    sampleRate = 44_100;
    resume() {
      return Promise.resolve();
    }
    close = closeFn;
    createMediaStreamSource() {
      return { connect: () => {} };
    }
    createAnalyser() {
      return {
        fftSize: 1024,
        getByteTimeDomainData: (buffer: Uint8Array) => {
          fillBufferForDb(buffer, currentSimDb);
        },
      };
    }
  }
  (window as unknown as { AudioContext: unknown }).AudioContext = MockCtxClass;
  return { closeFn };
}

function uninstallAudioContextMock() {
  delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  delete (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
}

function flushMicrotasks(count = 3) {
  return act(async () => {
    for (let i = 0; i < count; i++) await Promise.resolve();
  });
}

const ProviderWrapper = ({ children }: { children: ReactNode }) => (
  <MicStreamProvider>{children}</MicStreamProvider>
);

beforeEach(() => {
  currentSimDb = 30;
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  uninstallAudioContextMock();
  uninstallMediaDevices();
});

describe("MicStreamProvider — #106 mic stream 통합 refactor", () => {
  it("1) Provider 없이 useMicStream() 호출 → 명확한 에러", () => {
    // renderHook 안에서 throw 되면 result.current 접근 시 error 노출.
    const { result } = renderHook(() => {
      try {
        useMicStream();
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    });
    expect(result.current).toMatch(/MicStreamProvider/);
  });

  it("2) Provider + activate → getUserMedia 1회 + status='active' + stream 노출", async () => {
    installAudioContextMock();
    const { stream } = makeMockStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);

    const { result } = renderHook(() => useMicStream(), { wrapper: ProviderWrapper });

    expect(result.current.status).toBe("idle");
    expect(result.current.stream).toBeNull();

    await act(async () => {
      await result.current.activate();
    });

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    expect(result.current.status).toBe("active");
    expect(result.current.stream).toBe(stream);
  });

  it("3) 다수 consumer (useSplMeter + useAudioAnalyzer) → getUserMedia 1회만", async () => {
    installAudioContextMock();
    const { stream } = makeMockStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);
    currentSimDb = 40;

    const { result } = renderHook(
      () => {
        const spl = useSplMeter({ enabled: true, thresholdDb: 60, persistMs: 5000, tickMs: 100 });
        const analyzer = useAudioAnalyzer();
        return { spl, analyzer };
      },
      { wrapper: ProviderWrapper },
    );

    await flushMicrotasks(5);
    await waitFor(() => expect(result.current.spl.status).toBe("measuring"));

    // analyzer 의 start() 호출 → 같은 stream 재사용 (getUserMedia 추가 호출 없음).
    await act(async () => {
      await result.current.analyzer.start();
    });

    await waitFor(() => expect(result.current.analyzer.status).toBe("recording"));
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("4) 모든 consumer 해제 → tracks.stop 호출 + status='idle' 복귀", async () => {
    installAudioContextMock();
    const { stream, stopTrack } = makeMockStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);

    const { result } = renderHook(() => useMicStream(), { wrapper: ProviderWrapper });

    await act(async () => {
      await result.current.activate();
    });
    expect(result.current.status).toBe("active");
    expect(stopTrack).not.toHaveBeenCalled();

    act(() => {
      result.current.deactivate();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.stream).toBeNull();
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it("5) getUserMedia 권한 거부 → status='denied' + errorMessage surface", async () => {
    installAudioContextMock();
    const err = Object.assign(new Error("user denied"), { name: "NotAllowedError" });
    const getUserMedia = vi.fn().mockRejectedValue(err);
    installMediaDevices(getUserMedia);

    const { result } = renderHook(() => useMicStream(), { wrapper: ProviderWrapper });

    await act(async () => {
      await result.current.activate();
    });

    expect(result.current.status).toBe("denied");
    expect(result.current.errorMessage).toMatch(/user denied/);
    expect(result.current.stream).toBeNull();
  });

  it("6) useSplMeter 단독 사용 (Provider O) → 정상 측정", async () => {
    installAudioContextMock();
    const { stream } = makeMockStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);
    currentSimDb = 70; // > 60dB threshold

    const { result } = renderHook(
      () => useSplMeter({ enabled: true, thresholdDb: 60, persistMs: 5000, tickMs: 100 }),
      { wrapper: ProviderWrapper },
    );

    await flushMicrotasks(5);
    await waitFor(() => expect(result.current.status).toBe("measuring"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5200);
    });

    expect(result.current.isOverThreshold).toBe(true);
    expect(result.current.peakDb).toBeGreaterThan(60);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("7) Provider unmount → tracks.stop 호출 (leak 없음)", async () => {
    installAudioContextMock();
    const { stream, stopTrack } = makeMockStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);

    // useMicStream 직접 호출 + activate await 으로 race 제거.
    const { result, unmount } = renderHook(() => useMicStream(), {
      wrapper: ProviderWrapper,
    });

    await act(async () => {
      await result.current.activate();
    });
    expect(result.current.status).toBe("active");
    expect(stopTrack).not.toHaveBeenCalled();

    unmount();

    // unmount 시 Provider 의 useEffect cleanup 이 stream 강제 teardown.
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it("8) Provider 없을 때 useSplMeter → legacy 직접 getUserMedia (하위 호환)", async () => {
    installAudioContextMock();
    const { stream } = makeMockStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);
    currentSimDb = 50;

    const { result } = renderHook(() =>
      useSplMeter({ enabled: true, thresholdDb: 60, persistMs: 5000, tickMs: 100 }),
    );

    await flushMicrotasks(5);
    await waitFor(() => expect(result.current.status).toBe("measuring"));

    // Provider 없을 때도 stream 정상 획득 — useSplMeter 가 직접 getUserMedia 호출.
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
  });
});

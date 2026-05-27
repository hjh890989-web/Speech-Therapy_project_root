// REQ-FUNC-007 (#106 잔여) — 미션 페이지 SPL 게이트 통합 흐름 테스트.
//
// MissionRunner 컴포넌트 mount → start → 환경 소음 60dB 5초 → Toast 노출 + 이벤트 발송 →
// 5분 cooldown 안 재발 차단 → 5분 후 재발송 → phase 종료 시 teardown 까지 end-to-end.
//
// 시나리오 (총 8건):
//   1) phase=ready → useSplMeter idle (getUserMedia 미호출, Toast 미노출)
//   2) phase=running + 정상 측정 (40dB) → Toast 미노출 + noise_threshold_exceeded 발송 안 함
//   3) phase=running + 70dB 5초 지속 → Toast 노출 + 이벤트 1회 (surface: 'mission')
//   4) 5분 cooldown 안 재발 → 이벤트 발송 안 함 + Toast 재노출 안 함
//   5) 5분 후 재발 → 이벤트 다시 발송 + Toast 재노출
//   6) phase=completed → useSplMeter teardown (track.stop, AudioContext.close)
//   7) getUserMedia 권한 거부 → graceful (미션 진행 정상, Toast 미노출, 이벤트 미발송)
//   8) noise_threshold_exceeded properties shape (peakDb, durationMs, surface='mission')
//
// useMissionIntervention (60s/90s 침묵) 와 SPL 게이트는 독립 축 — 본 파일은 SPL 만 책임 (silence
// 시나리오는 mission-silence-flow.test.tsx 회귀 보장).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";

/**
 * MicStreamProvider activate → getUserMedia(Promise) → setStream → setStatus("active") chain 은
 * micro-task 다수 cycle 후 useSplMeter effect 의 재실행으로 AudioContext + setInterval 을 구성.
 * fake timer 환경에서는 advanceTimers 만으로 microtask 가 흐르지 않으므로, 명시적
 * Promise.resolve() flush + act() 래핑이 필요.
 */
async function flushMicrotasks(cycles = 20): Promise<void> {
  await act(async () => {
    for (let i = 0; i < cycles; i++) {
      await Promise.resolve();
    }
  });
}

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

// MirrorMode 는 getUserMedia 자체 호출 → 본 테스트에서는 mount 안 함 (90s 침묵 시나리오 미진입).
// 그래도 import 시 useMirrorMode 의 hook 정의가 evaluated 되므로 가벼운 stub 으로 격리.
vi.mock("@/components/MirrorMode", () => ({
  MirrorMode: () => null,
}));

import { MissionRunner } from "@/app/(public)/missions/MissionRunner";

// ── Web Audio API mock — useSplMeter.test.tsx 의 fillBufferForDb 패턴 차용 ──
function fillBufferForDb(buffer: Uint8Array, targetDb: number) {
  const rms = Math.pow(10, (targetDb - 100) / 20);
  const amplitude = Math.min(127, Math.round(rms * 128));
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = i % 2 === 0 ? 128 + amplitude : 128 - amplitude;
  }
}

let currentSimDb = 30;
let closeFn: ReturnType<typeof vi.fn>;

function installAudioContextMock() {
  closeFn = vi.fn(() => Promise.resolve());
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
}

function uninstallAudioContextMock() {
  delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  delete (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
}

type MockTrack = MediaStreamTrack & { stop: ReturnType<typeof vi.fn> };
let stopTrack: ReturnType<typeof vi.fn>;
function makeMockMicStream(): MediaStream {
  stopTrack = vi.fn();
  const track = { stop: stopTrack, kind: "audio" } as unknown as MockTrack;
  return { getTracks: () => [track] } as unknown as MediaStream;
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

const baseProps = {
  missionId: "mock-spl-ㅅ-2",
  targetPhoneme: "ㅅ",
  difficultyLevel: 2,
  // SPL 통합 시나리오는 silence intervention (60s) 임계 직전까지만 사용 — 충분히 길게.
  durationSec: 600,
};

let getUserMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  trackMock.mockClear();
  currentSimDb = 30;
  // setInterval (SplMeter tick / MissionRunner mission timer) + Date (overSince/cooldown) 만 fake.
  // setTimeout 은 SplToast auto-dismiss / RTL waitFor 등 real 유지 — getUserMedia 비동기 chain 보호.
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
  installAudioContextMock();
  const stream = makeMockMicStream();
  getUserMedia = vi.fn().mockResolvedValue(stream);
  installMediaDevices(getUserMedia);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  uninstallAudioContextMock();
  uninstallMediaDevices();
});

describe("REQ-FUNC-007 mission SPL 게이트 — 통합 시나리오", () => {
  it("phase=ready → useSplMeter idle (getUserMedia 미호출 + Toast 미노출)", async () => {
    render(<MissionRunner {...baseProps} />);
    // ready 단계에서는 SplMeter enabled=false → MicStreamProvider activate 도 호출 안 됨.
    await act(async () => {
      await Promise.resolve();
    });
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(screen.queryByTestId("spl-toast")).not.toBeInTheDocument();
  });

  it("phase=running + 정상 측정 (40dB) → Toast 미노출 + noise_threshold_exceeded 미발송", async () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();
    currentSimDb = 40; // < 60dB threshold

    await flushMicrotasks();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("spl-toast")).not.toBeInTheDocument();
    expect(
      trackMock.mock.calls.filter((c) => c[0] === "noise_threshold_exceeded"),
    ).toHaveLength(0);
  });

  it("phase=running + 70dB 5초 지속 → Toast 노출 + 이벤트 1회 (surface='mission')", async () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();
    currentSimDb = 70;

    await flushMicrotasks();
    await act(async () => {
      // 5.5초 진행 — useSplMeter persistMs 5000 도달.
      await vi.advanceTimersByTimeAsync(5_500);
    });

    expect(screen.getByTestId("spl-toast")).toBeInTheDocument();
    const noiseCalls = trackMock.mock.calls.filter(
      (c) => c[0] === "noise_threshold_exceeded",
    );
    expect(noiseCalls).toHaveLength(1);
    expect(noiseCalls[0][1].surface).toBe("mission");
  });

  it("5분 cooldown 안 재발 → 이벤트 발송 안 함 + Toast 재노출 안 함", async () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();
    currentSimDb = 70;

    // 1차 발화.
    await flushMicrotasks();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_500);
    });
    expect(
      trackMock.mock.calls.filter((c) => c[0] === "noise_threshold_exceeded"),
    ).toHaveLength(1);

    // 사용자 dismiss 시뮬레이션.
    fireEvent.click(screen.getByTestId("spl-toast-dismiss"));
    expect(screen.queryByTestId("spl-toast")).not.toBeInTheDocument();

    // 일시적으로 조용해져 over-threshold 사이클 종료 → 다시 시끄러워짐.
    currentSimDb = 30;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    currentSimDb = 70;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_500);
    });

    // 2분 경과 (5분 cooldown 미만) — 이벤트 재발송 / Toast 재노출 모두 차단.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    expect(
      trackMock.mock.calls.filter((c) => c[0] === "noise_threshold_exceeded"),
    ).toHaveLength(1);
    expect(screen.queryByTestId("spl-toast")).not.toBeInTheDocument();
  });

  it("5분 cooldown 경과 후 재발 → 이벤트 재발송 + Toast 재노출", async () => {
    render(<MissionRunner {...baseProps} durationSec={1200} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();
    currentSimDb = 70;

    // 1차 발화.
    await flushMicrotasks();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_500);
    });
    expect(
      trackMock.mock.calls.filter((c) => c[0] === "noise_threshold_exceeded"),
    ).toHaveLength(1);
    fireEvent.click(screen.getByTestId("spl-toast-dismiss"));

    // 조용해짐 → over-threshold 사이클 종료 후 cooldown 5분 (300s) 경과.
    currentSimDb = 30;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(301_000);
    });

    // 다시 시끄러워짐 → 5초 지속.
    currentSimDb = 70;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_500);
    });

    expect(
      trackMock.mock.calls.filter((c) => c[0] === "noise_threshold_exceeded"),
    ).toHaveLength(2);
    expect(screen.getByTestId("spl-toast")).toBeInTheDocument();
  });

  it("phase=completed → useSplMeter teardown (track.stop + AudioContext.close)", async () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));

    await flushMicrotasks();
    // FR-Q-003 fix — MIN_MISSION_DURATION_SEC=30 가드 통과 위해 30초 advance.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(getUserMedia).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    expect(screen.getByTestId("mission-runner-completed")).toBeInTheDocument();

    // teardown — Provider deactivate → stream.tracks[0].stop, useSplMeter cleanup → AudioContext.close.
    await flushMicrotasks(5);
    expect(stopTrack).toHaveBeenCalled();
    expect(closeFn).toHaveBeenCalled();
  });

  it("getUserMedia 권한 거부 → graceful (미션 진행 정상, Toast 미노출, 이벤트 미발송)", async () => {
    const err = Object.assign(new Error("denied"), { name: "NotAllowedError" });
    getUserMedia.mockReset().mockRejectedValue(err);

    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();
    currentSimDb = 70;

    await flushMicrotasks();
    // FR-Q-003 fix — MIN_MISSION_DURATION_SEC=30 가드 통과 위해 30초 advance (이전 10s).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    // 미션 자체는 정상 진행 — running 상태 유지 + 완료 버튼 노출.
    expect(screen.getByTestId("mission-runner-running")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "완료" })).toBeInTheDocument();
    expect(screen.queryByTestId("spl-toast")).not.toBeInTheDocument();
    expect(
      trackMock.mock.calls.filter((c) => c[0] === "noise_threshold_exceeded"),
    ).toHaveLength(0);

    // 종료 클릭도 정상 동작.
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    expect(screen.getByTestId("mission-runner-completed")).toBeInTheDocument();
  });

  it("noise_threshold_exceeded properties shape — peakDb / durationMs / surface='mission'", async () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();
    currentSimDb = 70;

    await flushMicrotasks();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_500);
    });

    const call = trackMock.mock.calls.find((c) => c[0] === "noise_threshold_exceeded");
    expect(call).toBeTruthy();
    const props = call![1] as { peakDb: number; durationMs: number; surface: string };
    expect(typeof props.peakDb).toBe("number");
    expect(typeof props.durationMs).toBe("number");
    expect(props.durationMs).toBeGreaterThanOrEqual(5_000);
    expect(props.surface).toBe("mission");
  });
});

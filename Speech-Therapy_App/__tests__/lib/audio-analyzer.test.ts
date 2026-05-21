// Sprint 3 §2 A — Web Audio API analyzer 단위 테스트.
// helper math 함수 + 미지원 환경 분기 검증. 실제 AudioContext 동작은 e2e/manual 영역.

import { describe, it, expect, vi, afterEach } from "vitest";

import { createAudioAnalyzer, isAudioAnalysisSupported, mean, stddev } from "@/lib/audio/analyzer";

describe("mean", () => {
  it("빈 배열 → 0", () => {
    expect(mean([])).toBe(0);
  });

  it("단일 값", () => {
    expect(mean([5])).toBe(5);
  });

  it("정수 배열", () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  it("부동소수", () => {
    expect(mean([1.5, 2.5, 3.5])).toBeCloseTo(2.5);
  });
});

describe("stddev", () => {
  it("길이 1 → 0", () => {
    expect(stddev([42])).toBe(0);
  });

  it("빈 배열 → 0", () => {
    expect(stddev([])).toBe(0);
  });

  it("동일 값 → 0", () => {
    expect(stddev([5, 5, 5, 5])).toBe(0);
  });

  it("표본 표준편차 (n-1 보정)", () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] 의 표본 표준편차 ≈ 2.138
    const result = stddev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(2.138, 2);
  });
});

describe("isAudioAnalysisSupported (jsdom 환경)", () => {
  it("jsdom 에는 AudioContext 가 없어 false 반환", () => {
    // jsdom 은 navigator.mediaDevices.getUserMedia 와 AudioContext 미구현.
    // 본 테스트는 hook 의 graceful fallback 검증.
    expect(isAudioAnalysisSupported()).toBe(false);
  });
});

// SP3_2A-3 (issue #103) — Option A FFT_SIZE 2048 → 4096 회귀 방지 검증.
// 실제 FFT 결과를 jsdom 으로 검증하기 어려우므로, AnalyserNode mock 을 통해
// fftSize 가 4096 으로 세팅되는지 + bin 분해능 산식 (sampleRate / fftSize) 검증.
describe("SP3_2A-3 — FFT_SIZE 옵션 A 회귀 방지", () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    if (originalWindow === undefined) {
      // @ts-expect-error — 테스트 cleanup.
      delete globalThis.window;
    } else {
      Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });
    }
    if (originalNavigator === undefined) {
      // @ts-expect-error — 테스트 cleanup.
      delete globalThis.navigator;
    } else {
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
      });
    }
    vi.restoreAllMocks();
  });

  it("analyser.fftSize 가 4096 으로 설정된다 (옵션 A — bin 분해능 10.7 Hz)", async () => {
    // Mock AnalyserNode + AudioContext — fftSize 세팅값만 캡처.
    const fakeAnalyser: { fftSize: number; frequencyBinCount: number } & Record<string, unknown> = {
      fftSize: 0,
      frequencyBinCount: 2048,
      getFloatTimeDomainData: vi.fn(),
      getFloatFrequencyData: vi.fn(),
    };
    const fakeSource = { connect: vi.fn() };
    const fakeContext = {
      sampleRate: 44100,
      state: "running" as const,
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      createMediaStreamSource: vi.fn().mockReturnValue(fakeSource),
      createAnalyser: vi.fn().mockReturnValue(fakeAnalyser),
    };
    // `new Ctx()` 호출되므로 function 키워드 필수 (arrow function 은 not a constructor).
    const FakeAudioContextCtor = vi.fn(function FakeAudioContextCtor() {
      return fakeContext;
    });
    const fakeStream = { getTracks: () => [{ stop: vi.fn() }] };

    Object.defineProperty(globalThis, "window", {
      value: { AudioContext: FakeAudioContextCtor },
      configurable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) } },
      configurable: true,
    });

    const analyzer = createAudioAnalyzer();
    await analyzer.start();
    expect(fakeAnalyser.fftSize).toBe(4096);

    // bin 분해능 = sampleRate / fftSize = 44100 / 4096 ≈ 10.77 Hz (Option A 목표).
    const binResolution = fakeContext.sampleRate / fakeAnalyser.fftSize;
    expect(binResolution).toBeLessThan(11);
    expect(binResolution).toBeGreaterThan(10);

    analyzer.cancel();
  });
});

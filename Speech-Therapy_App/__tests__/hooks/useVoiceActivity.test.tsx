// FR-Q-003-CONTENT-V3 — useVoiceActivity 단위 테스트.
//
// 검증 시나리오 (총 8건):
//   1) enabled=false → isSpeaking=false + speechCount=0 (입력 db 무관)
//   2) currentDb=null → no-op (idle)
//   3) currentDb < threshold 만 지속 → isSpeaking 영원히 false
//   4) currentDb ≥ threshold 1 tick (100ms) → minDurationMs(150) 미달 → isSpeaking 여전히 false
//   5) currentDb ≥ threshold 2 tick (200ms) → minDurationMs 도달 → isSpeaking=true, speechCount=1, lastSpeechAt 설정
//   6) speaking 중 currentDb < threshold 1 tick → silenceMs(400) 미달 → isSpeaking=true 유지
//   7) speaking 중 currentDb < threshold 5 tick (500ms) → silenceMs 도달 → isSpeaking=false
//   8) 발화 사이클 2회 → speechCount=2, lastSpeechAt 마지막 시각으로 갱신

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useVoiceActivity } from "@/lib/audio/useVoiceActivity";

beforeEach(() => {
  // Date + setTimeout/clearTimeout fake — silence 전환 timeout 까지 advanceTimersByTime 으로 제어.
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  vi.setSystemTime(new Date("2026-05-28T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useVoiceActivity — FR-Q-003-CONTENT-V3 발화 감지", () => {
  it("[1] enabled=false → isSpeaking=false (입력 db 무관)", () => {
    const { result, rerender } = renderHook(
      ({ db }: { db: number | null }) => useVoiceActivity({ currentDb: db, enabled: false }),
      { initialProps: { db: 80 } },
    );
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.speechCount).toBe(0);

    rerender({ db: 90 });
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.speechCount).toBe(0);
  });

  it("[2] currentDb=null → no-op (idle)", () => {
    const { result } = renderHook(() => useVoiceActivity({ currentDb: null, enabled: true }));
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.speechCount).toBe(0);
    expect(result.current.lastSpeechAt).toBeNull();
  });

  it("[3] currentDb < threshold 만 지속 → isSpeaking 영원히 false", () => {
    const { result, rerender } = renderHook(
      ({ db }: { db: number | null }) => useVoiceActivity({ currentDb: db, enabled: true }),
      { initialProps: { db: 30 } },
    );

    for (let i = 0; i < 10; i++) {
      act(() => {
        vi.advanceTimersByTime(100);
      });
      rerender({ db: 35 });
    }
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.speechCount).toBe(0);
  });

  it("[4] threshold 도달 1 tick (100ms) → minDurationMs(150) 미달 → 여전히 false", () => {
    const { result, rerender } = renderHook(
      ({ db }: { db: number | null }) => useVoiceActivity({ currentDb: db, enabled: true }),
      { initialProps: { db: 30 as number | null } },
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 45 });

    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.speechCount).toBe(0);
  });

  it("[5] threshold 2 tick (200ms) → minDurationMs 도달 → isSpeaking=true + speechCount=1", () => {
    const { result, rerender } = renderHook(
      ({ db }: { db: number | null }) => useVoiceActivity({ currentDb: db, enabled: true }),
      { initialProps: { db: 30 as number | null } },
    );

    // tick 1 (t=100): 임계 도달, aboveSinceRef=100
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 45 });

    // tick 2 (t=300): elapsed=200ms ≥ minDurationMs(150) → isSpeaking=true
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ db: 50 });

    expect(result.current.isSpeaking).toBe(true);
    expect(result.current.speechCount).toBe(1);
    expect(result.current.lastSpeechAt).not.toBeNull();
  });

  it("[6] speaking 중 below-threshold 1 tick → silenceMs 미달 → speaking 유지", () => {
    const { result, rerender } = renderHook(
      ({ db }: { db: number | null }) => useVoiceActivity({ currentDb: db, enabled: true }),
      { initialProps: { db: 30 as number | null } },
    );

    // speech detected (2 tick)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 45 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ db: 50 });
    expect(result.current.isSpeaking).toBe(true);

    // below threshold 1 tick (silence 100ms < 400ms)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 30 });

    expect(result.current.isSpeaking).toBe(true);
  });

  it("[7] speaking 중 below-threshold 5 tick (500ms) → silenceMs 도달 → false 전환", () => {
    const { result, rerender } = renderHook(
      ({ db }: { db: number | null }) => useVoiceActivity({ currentDb: db, enabled: true }),
      { initialProps: { db: 30 as number | null } },
    );

    // speech detected
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 45 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ db: 50 });
    expect(result.current.isSpeaking).toBe(true);

    // belowSinceRef 시작 (tick 1, t=400)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 30 });
    // tick 2 (t=900): silenceElapsed=500ms ≥ silenceMs(400) → false
    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender({ db: 30 });

    expect(result.current.isSpeaking).toBe(false);
  });

  it("[8] 발화 사이클 2회 → speechCount=2, lastSpeechAt 갱신", () => {
    const { result, rerender } = renderHook(
      ({ db }: { db: number | null }) => useVoiceActivity({ currentDb: db, enabled: true }),
      { initialProps: { db: 30 as number | null } },
    );

    // 사이클 1: speech detected
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 45 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ db: 50 });
    expect(result.current.speechCount).toBe(1);
    const firstSpeechAt = result.current.lastSpeechAt;
    expect(firstSpeechAt).not.toBeNull();

    // silence → speaking off
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 30 });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender({ db: 30 });
    expect(result.current.isSpeaking).toBe(false);

    // 사이클 2: speech again
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 45 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ db: 50 });

    expect(result.current.speechCount).toBe(2);
    expect(result.current.lastSpeechAt).not.toBeNull();
    expect(result.current.lastSpeechAt).not.toBe(firstSpeechAt);
  });
});

// FR-Q-003-CONTENT-V3 — useVoiceActivity 단위 테스트 (v2: baseline + dynamic threshold).
//
// 검증 시나리오 (총 9건):
//   1) enabled=false → isSpeaking=false + baselineDb=null (입력 db 무관)
//   2) currentDb=null → no-op (idle)
//   3) baseline 측정 중 (samples 미충족) → isSpeaking 항상 false
//   4) baseline 측정 완료 → baselineDb 값 노출
//   5) baseline + offset 미달 db 만 지속 → isSpeaking 영원히 false
//   6) baseline + offset 초과 1 tick (100ms) → minDurationMs(150) 미달 → false
//   7) baseline + offset 초과 2 tick (200ms) → isSpeaking=true + speechCount=1
//   8) speaking 중 silence 5 tick (500ms) → false 전환
//   9) 발화 사이클 2회 → speechCount=2, lastSpeechAt 갱신

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

// 헬퍼: baseline 측정 phase 통과 — N 개 sample 누적 (alternating ±0.1 로 effect dep 변경 보장).
// samples 짝수 시 평균 = baselineDb 정확.
function fillBaseline(
  rerender: (props: { db: number | null }) => void,
  baselineDb: number,
  samples: number,
) {
  for (let i = 0; i < samples; i++) {
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const delta = i % 2 === 0 ? -0.1 : 0.1;
    rerender({ db: baselineDb + delta });
  }
}

describe("useVoiceActivity — FR-Q-003-CONTENT-V3 발화 감지 (baseline + dynamic)", () => {
  it("[1] enabled=false → isSpeaking=false + baselineDb=null", () => {
    const { result, rerender } = renderHook(
      ({ db }: { db: number | null }) =>
        useVoiceActivity({ currentDb: db, enabled: false, baselineSamples: 2 }),
      { initialProps: { db: 80 } },
    );
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.baselineDb).toBeNull();

    rerender({ db: 90 });
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.baselineDb).toBeNull();
  });

  it("[2] currentDb=null → no-op (idle)", () => {
    const { result } = renderHook(() =>
      useVoiceActivity({ currentDb: null, enabled: true, baselineSamples: 2 }),
    );
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.baselineDb).toBeNull();
    expect(result.current.lastSpeechAt).toBeNull();
  });

  it("[3] baseline 측정 중 (samples 미충족) → isSpeaking 항상 false", () => {
    const { result, rerender } = renderHook(
      ({ db }: { db: number | null }) =>
        useVoiceActivity({ currentDb: db, enabled: true, baselineSamples: 5 }),
      { initialProps: { db: null as number | null } },
    );

    // 4 tick 만 진행 (samples=5 미충족) — 큰 db 입력해도 speech 발생 안 함.
    for (let i = 0; i < 4; i++) {
      act(() => {
        vi.advanceTimersByTime(100);
      });
      rerender({ db: 80 });
    }
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.baselineDb).toBeNull();
  });

  it("[4] baseline 측정 완료 → baselineDb 평균값 노출", () => {
    const { result, rerender } = renderHook(
      ({ db }: { db: number | null }) =>
        useVoiceActivity({ currentDb: db, enabled: true, baselineSamples: 4 }),
      { initialProps: { db: null as number | null } },
    );

    // 4 sample 누적 (30, 40, 30, 40 → avg=35)
    const samples = [30, 40, 30, 40];
    for (const s of samples) {
      act(() => {
        vi.advanceTimersByTime(100);
      });
      rerender({ db: s });
    }

    expect(result.current.baselineDb).toBe(35);
  });

  it("[5] baseline+offset 미달 db 만 지속 → isSpeaking 영원히 false", () => {
    const { result, rerender } = renderHook(
      ({ db }: { db: number | null }) =>
        useVoiceActivity({
          currentDb: db,
          enabled: true,
          baselineSamples: 2,
          baselineOffsetDb: 10,
        }),
      { initialProps: { db: null as number | null } },
    );

    // baseline = 30
    fillBaseline(rerender, 30, 2);
    expect(result.current.baselineDb).toBe(30);

    // db=35 (baseline+10=40 미달) 지속 → speech 없음.
    for (let i = 0; i < 10; i++) {
      act(() => {
        vi.advanceTimersByTime(100);
      });
      rerender({ db: 35 });
    }
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.speechCount).toBe(0);
  });

  it("[6] baseline+offset 초과 1 tick (100ms) → minDurationMs(150) 미달 → false", () => {
    const { result, rerender } = renderHook(
      ({ db }: { db: number | null }) =>
        useVoiceActivity({
          currentDb: db,
          enabled: true,
          baselineSamples: 2,
          baselineOffsetDb: 10,
        }),
      { initialProps: { db: null as number | null } },
    );

    fillBaseline(rerender, 30, 2);

    // 임계 도달 1 tick (elapsed=100ms < minDurationMs 150)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 50 }); // baseline+offset=40 초과

    expect(result.current.isSpeaking).toBe(false);
  });

  it("[7] baseline+offset 초과 2 tick (200ms) → isSpeaking=true + speechCount=1", () => {
    const { result, rerender } = renderHook(
      ({ db }: { db: number | null }) =>
        useVoiceActivity({
          currentDb: db,
          enabled: true,
          baselineSamples: 2,
          baselineOffsetDb: 10,
        }),
      { initialProps: { db: null as number | null } },
    );

    fillBaseline(rerender, 30, 2);

    // tick 1: aboveSince=now
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 50 });
    // tick 2: elapsed=200 ≥ 150 → isSpeaking=true
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ db: 55 });

    expect(result.current.isSpeaking).toBe(true);
    expect(result.current.speechCount).toBe(1);
    expect(result.current.lastSpeechAt).not.toBeNull();
  });

  it("[8] speaking 중 silence 5 tick (500ms) → false 전환 (setTimeout)", () => {
    const { result, rerender } = renderHook(
      ({ db }: { db: number | null }) =>
        useVoiceActivity({
          currentDb: db,
          enabled: true,
          baselineSamples: 2,
          baselineOffsetDb: 10,
        }),
      { initialProps: { db: null as number | null } },
    );

    fillBaseline(rerender, 30, 2);

    // speech detected
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 50 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ db: 55 });
    expect(result.current.isSpeaking).toBe(true);

    // silence 시작 (timeout 등록)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 30 });
    // 500ms 후 timeout 실행 → false 전환
    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender({ db: 30 });

    expect(result.current.isSpeaking).toBe(false);
  });

  it("[9] 발화 사이클 2회 → speechCount=2, lastSpeechAt 갱신", () => {
    const { result, rerender } = renderHook(
      ({ db }: { db: number | null }) =>
        useVoiceActivity({
          currentDb: db,
          enabled: true,
          baselineSamples: 2,
          baselineOffsetDb: 10,
        }),
      { initialProps: { db: null as number | null } },
    );

    fillBaseline(rerender, 30, 2);

    // 사이클 1
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 50 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ db: 55 });
    expect(result.current.speechCount).toBe(1);
    const firstSpeechAt = result.current.lastSpeechAt;
    expect(firstSpeechAt).not.toBeNull();

    // silence 5 tick → speaking off
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 30 });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender({ db: 30 });
    expect(result.current.isSpeaking).toBe(false);

    // 사이클 2
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ db: 50 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ db: 55 });

    expect(result.current.speechCount).toBe(2);
    expect(result.current.lastSpeechAt).not.toBeNull();
    expect(result.current.lastSpeechAt).not.toBe(firstSpeechAt);
  });
});

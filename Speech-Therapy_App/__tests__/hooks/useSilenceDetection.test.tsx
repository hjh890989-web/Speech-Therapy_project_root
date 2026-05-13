// FR-C-006 — useSilenceDetection 단위 테스트.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSilenceDetection } from "@/lib/hooks/useSilenceDetection";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSilenceDetection", () => {
  it("초기 silenceMs=0, intervention=null", () => {
    const { result } = renderHook(() =>
      useSilenceDetection({ thresholdMs: 60_000, tickMs: 100 }),
    );
    expect(result.current.silenceMs).toBe(0);
    expect(result.current.intervention).toBeNull();
  });

  it("threshold 초과 시 onSilenceExceeded 1회 호출", () => {
    const onSilenceExceeded = vi.fn();
    renderHook(() =>
      useSilenceDetection({ thresholdMs: 500, tickMs: 100, onSilenceExceeded }),
    );

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(onSilenceExceeded).toHaveBeenCalledTimes(1);

    // 추가 tick 으로 다시 호출되면 안 됨 (1회 보장).
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onSilenceExceeded).toHaveBeenCalledTimes(1);
  });

  it("reportSpeech() 호출 시 카운터 리셋 + intervention=null", () => {
    const onSilenceExceeded = vi.fn();
    const { result } = renderHook(() =>
      useSilenceDetection({ thresholdMs: 500, tickMs: 100, onSilenceExceeded }),
    );

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(onSilenceExceeded).toHaveBeenCalledTimes(1);
    expect(result.current.intervention).not.toBeNull();

    act(() => {
      result.current.reportSpeech();
    });
    expect(result.current.intervention).toBeNull();
    expect(result.current.silenceMs).toBe(0);

    // 재차 임계 초과 시 onSilenceExceeded 2회째 호출.
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(onSilenceExceeded).toHaveBeenCalledTimes(2);
  });

  it("enabled=false 시 카운터 비활성", () => {
    const onSilenceExceeded = vi.fn();
    const { result } = renderHook(() =>
      useSilenceDetection({ thresholdMs: 200, tickMs: 50, enabled: false, onSilenceExceeded }),
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onSilenceExceeded).not.toHaveBeenCalled();
    expect(result.current.silenceMs).toBe(0);
  });

  it("intervention 분기 — mirror 또는 tooltip 둘 중 하나", () => {
    const onSilenceExceeded = vi.fn();
    renderHook(() =>
      useSilenceDetection({ thresholdMs: 200, tickMs: 50, onSilenceExceeded }),
    );
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const arg = onSilenceExceeded.mock.calls[0][0];
    expect(["mirror", "tooltip"]).toContain(arg);
  });
});

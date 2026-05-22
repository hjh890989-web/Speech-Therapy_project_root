// FR-C-006 — useMissionIntervention orchestrator 단위 테스트.
//
// 2단계 intervention (60s tooltip → 90s mirror) + 5min cooldown + 발화 reset 검증.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

import { useMissionIntervention } from "@/lib/hooks/useMissionIntervention";

beforeEach(() => {
  trackMock.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const baseArgs = {
  missionId: "mock-ㅅ-2",
  enabled: true,
  thresholdMs: 60_000,
  mirrorThresholdMs: 90_000,
  tickMs: 500,
  cooldownMs: 300_000,
};

describe("useMissionIntervention — FR-C-006", () => {
  it("enabled=false → 어떤 intervention 도 발생하지 않음", () => {
    const { result } = renderHook(() =>
      useMissionIntervention({ ...baseArgs, enabled: false }),
    );
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(result.current.tooltipVisible).toBe(false);
    expect(result.current.mirrorActive).toBe(false);
    expect(result.current.silenceMs).toBe(0);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("60s 침묵 도달 → tooltip 노출 + mission_silence_intervention(tooltip) 이벤트 1회", () => {
    const { result } = renderHook(() => useMissionIntervention(baseArgs));
    act(() => {
      vi.advanceTimersByTime(60_500);
    });
    expect(result.current.tooltipVisible).toBe(true);
    expect(result.current.mirrorActive).toBe(false);
    const calls = trackMock.mock.calls.filter((c) => c[0] === "mission_silence_intervention");
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toMatchObject({
      missionId: "mock-ㅅ-2",
      intervention: "tooltip",
    });
    expect(calls[0][1].silenceMs).toBeGreaterThanOrEqual(60_000);
  });

  it("60s 침묵 도달 후 발화 감지 → silenceMs=0, tooltip 해제, 카운터 리셋", () => {
    const { result } = renderHook(() => useMissionIntervention(baseArgs));
    act(() => {
      vi.advanceTimersByTime(60_500);
    });
    expect(result.current.tooltipVisible).toBe(true);

    act(() => {
      result.current.reportSpeech();
    });
    expect(result.current.tooltipVisible).toBe(false);
    expect(result.current.silenceMs).toBe(0);

    // 발화 직후 50초 더 흘러도 60s 임계 미달 → 새 tooltip 안 뜸.
    act(() => {
      vi.advanceTimersByTime(50_000);
    });
    expect(result.current.tooltipVisible).toBe(false);
  });

  it("90s 침묵 도달 → tooltip + mirror 동시 활성 + 이벤트 2회 (각 stage 1회씩)", () => {
    const { result } = renderHook(() => useMissionIntervention(baseArgs));
    act(() => {
      vi.advanceTimersByTime(90_500);
    });
    expect(result.current.tooltipVisible).toBe(true);
    expect(result.current.mirrorActive).toBe(true);

    const calls = trackMock.mock.calls.filter((c) => c[0] === "mission_silence_intervention");
    expect(calls).toHaveLength(2);
    const stages = calls.map((c) => c[1].intervention);
    expect(stages).toContain("tooltip");
    expect(stages).toContain("mirror");
  });

  it("5분 cooldown — 같은 stage 재발 시 이벤트 발화 안 함 (UI 는 다시 노출 가능)", () => {
    const { result } = renderHook(() => useMissionIntervention(baseArgs));
    // 1차: 60s 침묵 → tooltip emit.
    act(() => {
      vi.advanceTimersByTime(60_500);
    });
    expect(
      trackMock.mock.calls.filter((c) => c[0] === "mission_silence_intervention"),
    ).toHaveLength(1);

    // 발화 → 리셋.
    act(() => {
      result.current.reportSpeech();
    });
    // 2차: 다시 60s 침묵. cooldown 5분 미경과 (총 ~60s 만 흐름) → 이벤트 emit 안 함.
    act(() => {
      vi.advanceTimersByTime(60_500);
    });
    expect(result.current.tooltipVisible).toBe(true); // UI 는 다시 노출.
    expect(
      trackMock.mock.calls.filter((c) => c[0] === "mission_silence_intervention"),
    ).toHaveLength(1); // 이벤트는 여전히 1회.
  });

  it("5분 cooldown 경과 후 같은 stage 재발 → 이벤트 다시 emit", () => {
    const { result } = renderHook(() => useMissionIntervention(baseArgs));
    // 1차 emit (tooltip).
    act(() => {
      vi.advanceTimersByTime(60_500);
    });
    act(() => {
      result.current.reportSpeech();
    });

    // 5분 + 60s 가 흐르도록 — speech 시각이 갱신되었으므로 다시 60s 침묵 필요.
    // 우선 5분 (cooldown 경과 보장) 만큼 sleep (speech 갱신 없음 → silenceMs 증가).
    // → 60s 시점에 tooltip 재emit 이 되어버려서 의도와 다름. 명시적으로 speech 한 번 더 찍어
    //    cooldown 만 흐르게 한 뒤 60s 침묵 진입.
    act(() => {
      vi.advanceTimersByTime(50_000);
    });
    act(() => {
      result.current.reportSpeech();
    });
    // 누적 wall-clock: 60.5 + 50 = 110.5s. cooldown 300s 까지 추가 250s 가 필요.
    act(() => {
      vi.advanceTimersByTime(250_000);
    });
    act(() => {
      result.current.reportSpeech();
    });
    // 이제 cooldown 경과 — 60s 침묵 진입 시 두 번째 emit 기대.
    act(() => {
      vi.advanceTimersByTime(60_500);
    });
    const calls = trackMock.mock.calls.filter((c) => c[0] === "mission_silence_intervention");
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  it("dismissTooltip → 툴팁만 수동 해제 (mirror / silenceMs 영향 없음)", () => {
    const { result } = renderHook(() => useMissionIntervention(baseArgs));
    act(() => {
      vi.advanceTimersByTime(90_500);
    });
    expect(result.current.tooltipVisible).toBe(true);
    expect(result.current.mirrorActive).toBe(true);

    act(() => {
      result.current.dismissTooltip();
    });
    expect(result.current.tooltipVisible).toBe(false);
    expect(result.current.mirrorActive).toBe(true);
  });

  it("deactivateMirror → 거울만 수동 해제 (tooltip 영향 없음)", () => {
    const { result } = renderHook(() => useMissionIntervention(baseArgs));
    act(() => {
      vi.advanceTimersByTime(90_500);
    });
    expect(result.current.mirrorActive).toBe(true);

    act(() => {
      result.current.deactivateMirror();
    });
    expect(result.current.mirrorActive).toBe(false);
    expect(result.current.tooltipVisible).toBe(true);
  });

  it("unmount → timer cleanup (이후 이벤트 발화 안 함)", () => {
    const { unmount } = renderHook(() => useMissionIntervention(baseArgs));
    unmount();
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("enabled false 전환 → 진행 중 카운터 / UI 모두 초기화", () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useMissionIntervention({ ...baseArgs, enabled }),
      { initialProps: { enabled: true } },
    );
    act(() => {
      vi.advanceTimersByTime(60_500);
    });
    expect(result.current.tooltipVisible).toBe(true);

    rerender({ enabled: false });
    expect(result.current.tooltipVisible).toBe(false);
    expect(result.current.mirrorActive).toBe(false);
    expect(result.current.silenceMs).toBe(0);
  });
});

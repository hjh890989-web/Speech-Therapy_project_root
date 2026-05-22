// FR-C-006 — 미션 침묵 감지 → 거울/툴팁 통합 흐름 시나리오 테스트.
// MissionRunner 컴포넌트 mount → start → 60s/90s 침묵 진행 → cleanup 까지 end-to-end.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

import { MissionRunner } from "@/app/(public)/missions/MissionRunner";

const baseProps = {
  missionId: "mock-flow-ㅅ-2",
  targetPhoneme: "ㅅ",
  difficultyLevel: 2,
  durationSec: 300, // intervention 3분 cooldown 윈도우 안에서 충분히 검증할 수 있도록.
};

beforeEach(() => {
  trackMock.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("FR-C-006 mission silence flow — 통합 시나리오", () => {
  it("ready 상태에서는 intervention UI 없음 (enabled=false)", () => {
    render(<MissionRunner {...baseProps} />);
    expect(screen.queryByTestId("intervention-tooltip")).not.toBeInTheDocument();
    expect(screen.queryByTestId("intervention-mirror")).not.toBeInTheDocument();
  });

  it("미션 시작 직후 59s 까지는 intervention 미발생", async () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(59_000);
      await Promise.resolve();
    });

    expect(screen.queryByTestId("intervention-tooltip")).not.toBeInTheDocument();
    expect(screen.queryByTestId("intervention-mirror")).not.toBeInTheDocument();
    expect(
      trackMock.mock.calls.filter((c) => c[0] === "mission_silence_intervention"),
    ).toHaveLength(0);
  });

  it("60s 침묵 → tooltip 노출 (mirror 는 아직 안 뜸)", async () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(60_500);
      await Promise.resolve();
    });

    expect(screen.getByTestId("intervention-tooltip")).toBeInTheDocument();
    expect(screen.queryByTestId("intervention-mirror")).not.toBeInTheDocument();
  });

  it("90s 침묵 → tooltip + mirror 동시 노출", async () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(90_500);
      await Promise.resolve();
    });

    expect(screen.getByTestId("intervention-tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("intervention-mirror")).toBeInTheDocument();
  });

  it("툴팁 '닫기' 클릭 → 툴팁만 숨김 (mirror 유지)", async () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(90_500);
      await Promise.resolve();
    });

    expect(screen.getByTestId("intervention-tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("intervention-mirror")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "툴팁 닫기" }));

    expect(screen.queryByTestId("intervention-tooltip")).not.toBeInTheDocument();
    expect(screen.getByTestId("intervention-mirror")).toBeInTheDocument();
  });

  it("거울 모드 '닫기' 클릭 → mirror 만 숨김 (툴팁 유지)", async () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(90_500);
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "거울 모드 닫기" }));

    expect(screen.getByTestId("intervention-tooltip")).toBeInTheDocument();
    expect(screen.queryByTestId("intervention-mirror")).not.toBeInTheDocument();
  });

  it("미션 완료 (manual_done) → enabled=false 전환 → intervention UI 정리", async () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));

    await act(async () => {
      vi.advanceTimersByTime(90_500);
      await Promise.resolve();
    });

    expect(screen.getByTestId("intervention-tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("intervention-mirror")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "완료" }));

    expect(screen.getByTestId("mission-runner-completed")).toBeInTheDocument();
    expect(screen.queryByTestId("intervention-tooltip")).not.toBeInTheDocument();
    expect(screen.queryByTestId("intervention-mirror")).not.toBeInTheDocument();
  });

  it("미션 unmount → 이후 시간 흘려도 추가 이벤트 발화 없음 (timer cleanup)", async () => {
    const { unmount } = render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));

    await act(async () => {
      vi.advanceTimersByTime(30_000); // 임계 미달.
      await Promise.resolve();
    });

    unmount();
    trackMock.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(120_000);
      await Promise.resolve();
    });

    expect(
      trackMock.mock.calls.filter((c) => c[0] === "mission_silence_intervention"),
    ).toHaveLength(0);
  });

  it("mission_silence_intervention 이벤트 properties — missionId / intervention / silenceMs 모두 포함", async () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(60_500);
      await Promise.resolve();
    });

    const call = trackMock.mock.calls.find(
      (c) => c[0] === "mission_silence_intervention" && c[1].intervention === "tooltip",
    );
    expect(call).toBeTruthy();
    expect(call![1].missionId).toBe("mock-flow-ㅅ-2");
    expect(call![1].intervention).toBe("tooltip");
    expect(typeof call![1].silenceMs).toBe("number");
    expect(call![1].silenceMs).toBeGreaterThanOrEqual(60_000);
  });
});

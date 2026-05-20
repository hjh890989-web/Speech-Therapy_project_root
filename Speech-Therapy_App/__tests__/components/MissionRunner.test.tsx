// FR-Q-003 — MissionRunner phase 전이 + trackEvent 발송 단위 테스트.
// 검증 범위: ready → running → completed 흐름 + 3종 종료 사유 (timer_ended / manual_done / skipped).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { MissionRunner } from "@/app/(public)/missions/MissionRunner";

// trackEvent 호출 캡처용 mock.
const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

describe("MissionRunner — FR-Q-003 phase 전이", () => {
  beforeEach(() => {
    trackMock.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseProps = {
    missionId: "mock-ㅅ-2",
    targetPhoneme: "ㅅ",
    difficultyLevel: 2,
    durationSec: 5,
  };

  it("초기 phase=ready: '미션 시작하기' 버튼 노출", () => {
    render(<MissionRunner {...baseProps} />);
    expect(screen.getByRole("button", { name: /미션 시작/ })).toBeInTheDocument();
  });

  it("시작 클릭 → running phase 진입 + mission_started 발송", () => {
    render(<MissionRunner {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));

    expect(screen.getByTestId("mission-runner-running")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(trackMock).toHaveBeenCalledWith("mission_started", {
      missionId: "mock-ㅅ-2",
      targetPhoneme: "ㅅ",
      difficultyLevel: 2,
      plannedDurationSec: 5,
    });
  });

  it("완료 버튼 → mission_completed{manual_done} + completed phase", () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "완료" }));

    expect(screen.getByTestId("mission-runner-completed")).toBeInTheDocument();
    expect(trackMock).toHaveBeenCalledWith(
      "mission_completed",
      expect.objectContaining({
        missionId: "mock-ㅅ-2",
        completedReason: "manual_done",
      }),
    );
  });

  it("건너뛰기 → mission_completed{skipped}", () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));

    expect(trackMock).toHaveBeenCalledWith(
      "mission_completed",
      expect.objectContaining({ completedReason: "skipped" }),
    );
  });

  it("타이머 자동 종료 → mission_completed{timer_ended}", async () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();

    // durationSec=5 → 5초 진행 후 timer_ended.
    await act(async () => {
      vi.advanceTimersByTime(5500);
      // queueMicrotask 로 분리된 finish() 호출을 flush.
      await Promise.resolve();
    });

    expect(trackMock).toHaveBeenCalledWith(
      "mission_completed",
      expect.objectContaining({ completedReason: "timer_ended" }),
    );
    expect(screen.getByTestId("mission-runner-completed")).toBeInTheDocument();
  });

  it("running 60s 무인터랙션 → silence intervention banner + mission_silence_intervention 발송", async () => {
    // durationSec 충분히 길게 (180s) 잡아 silence 60s 가 timer 종료 전에 발생하도록.
    render(<MissionRunner {...baseProps} durationSec={180} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();

    await act(async () => {
      // 60s 무인터랙션 → useSilenceDetection threshold (60_000ms) 초과.
      vi.advanceTimersByTime(60_500);
      await Promise.resolve();
    });

    expect(screen.getByTestId("silence-intervention")).toBeInTheDocument();
    expect(trackMock).toHaveBeenCalledWith(
      "mission_silence_intervention",
      expect.objectContaining({
        missionId: "mock-ㅅ-2",
        silenceMs: 60_000,
      }),
    );
    const call = trackMock.mock.calls.find((c) => c[0] === "mission_silence_intervention");
    expect(["mirror", "tooltip"]).toContain(call![1].intervention);
  });
});

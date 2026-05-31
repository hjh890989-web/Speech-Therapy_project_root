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

// FR-C-MISSION-COMPLETION — 서버 영속화 액션 + 익명 id mock (client 테스트에서 서버 의존 차단).
const recordMock = vi.fn();
vi.mock("@/app/actions/mission", () => ({
  recordMissionCompletion: (...args: unknown[]) => recordMock(...args),
}));
vi.mock("@/lib/hooks/useAnonymousUserId", () => ({
  useAnonymousUserId: () => "anon-test-1",
}));

// FR-Q-003-CONTENT-V3 — useVoiceActivity mock 으로 isSpeaking 제어.
// happy-dom 환경에선 getUserMedia 실패 → currentDb=null → 실제 hook 도 idle 이지만,
// indicator UI 검증 위해 명시 stub 노출이 필요.
import { useVoiceActivity } from "@/lib/audio/useVoiceActivity";
vi.mock("@/lib/audio/useVoiceActivity", () => ({
  useVoiceActivity: vi.fn(),
}));

const mockedUseVoiceActivity = vi.mocked(useVoiceActivity);

describe("MissionRunner — FR-Q-003 phase 전이", () => {
  beforeEach(() => {
    trackMock.mockClear();
    recordMock.mockReset();
    recordMock.mockResolvedValue({ success: true, sessionId: "s1", counted: true });
    mockedUseVoiceActivity.mockReset();
    mockedUseVoiceActivity.mockReturnValue({
      isSpeaking: false,
      speechCount: 0,
      lastSpeechAt: null,
      baselineDb: null,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseProps = {
    missionId: "mock-s-2",
    targetPhoneme: "ㅅ",
    difficultyLevel: 2,
    durationSec: 5,
  };
  // FR-Q-003 fix — MIN_MISSION_DURATION_SEC=30 가드 통과용 long-duration props.
  // 완료 분기 테스트만 사용 (시작/타이머 자동 종료/silence intervention 은 5s 유지).
  const longDurationProps = { ...baseProps, durationSec: 120 };

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
      missionId: "mock-s-2",
      targetPhoneme: "ㅅ",
      difficultyLevel: 2,
      plannedDurationSec: 5,
    });
  });

  it("완료 버튼 → mission_completed{manual_done} + completed phase (30s+ 후)", () => {
    render(<MissionRunner {...longDurationProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();

    // FR-Q-003 fix — MIN_MISSION_DURATION_SEC=30 가드 통과 위해 30초 advance.
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    fireEvent.click(screen.getByRole("button", { name: "완료" }));

    expect(screen.getByTestId("mission-runner-completed")).toBeInTheDocument();
    expect(trackMock).toHaveBeenCalledWith(
      "mission_completed",
      expect.objectContaining({
        missionId: "mock-s-2",
        completedReason: "manual_done",
      }),
    );
    // FR-C-MISSION-COMPLETION — 서버 영속화 배선 (anonymousUserId 전달).
    expect(recordMock).toHaveBeenCalledWith({
      missionId: "mock-s-2",
      elapsedSec: 30,
      completedReason: "manual_done",
      anonymousUserId: "anon-test-1",
    });
    // FR-C-MISSION-REWARD-WIRING — 정상 완료 → 별 적립 카피(optimistic).
    expect(screen.getByTestId("mission-completed-headline").textContent).toContain("별 +1");
  });

  it("FR-Q-003 fix — 30s 미만 '완료' 클릭 → warning + mission_completed 미발송 (W-AUR KPI 보호)", () => {
    render(<MissionRunner {...longDurationProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();

    // 5초만 advance (30s 미만).
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    fireEvent.click(screen.getByRole("button", { name: "완료" }));

    // mission_completed 미발송 + warning 노출 + phase 유지 (running).
    expect(trackMock).not.toHaveBeenCalledWith(
      "mission_completed",
      expect.anything(),
    );
    // 30s 미만 차단 시 서버 영속화도 미발생 (W-AUR inflate 차단 — 진실성 가드 정합).
    expect(recordMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("mission-runner-warning")).toBeInTheDocument();
    expect(screen.getByTestId("mission-runner-running")).toBeInTheDocument();
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
    // 건너뛰기도 서버 영속화 호출 (서버가 durationSec=0 으로 저장 — 완수 미카운트).
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({ completedReason: "skipped", anonymousUserId: "anon-test-1" }),
    );
    // 건너뛰기는 별 미적립 — 완료 카피에 '별 +1' 없음(거짓 적립 주장 방지).
    expect(screen.getByTestId("mission-completed-headline").textContent).not.toContain("별 +1");
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

  it("running 60s 무인터랙션 → 부모 개입 tooltip + mission_silence_intervention(tooltip) 발송 (FR-C-006 1단계)", async () => {
    // durationSec 충분히 길게 (180s) 잡아 silence 60s 가 timer 종료 전에 발생하도록.
    render(<MissionRunner {...baseProps} durationSec={180} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();

    await act(async () => {
      // 60s 무인터랙션 → useMissionIntervention thresholdMs (60_000ms) 초과 → tooltip.
      vi.advanceTimersByTime(60_500);
      await Promise.resolve();
    });

    expect(screen.getByTestId("intervention-tooltip")).toBeInTheDocument();
    expect(screen.queryByTestId("intervention-mirror")).not.toBeInTheDocument();
    const tooltipCall = trackMock.mock.calls.find(
      (c) => c[0] === "mission_silence_intervention" && c[1].intervention === "tooltip",
    );
    expect(tooltipCall).toBeTruthy();
    expect(tooltipCall![1]).toMatchObject({ missionId: "mock-s-2", intervention: "tooltip" });
  });

  it("FR-Q-003-CONTENT-V3 — useVoiceActivity.isSpeaking=false → indicator 미노출", () => {
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));

    expect(screen.queryByTestId("voice-activity-indicator")).not.toBeInTheDocument();
  });

  it("FR-Q-003-CONTENT-V3 — useVoiceActivity.isSpeaking=true → '듣고 있어요' indicator 노출", () => {
    mockedUseVoiceActivity.mockReturnValue({
      isSpeaking: true,
      speechCount: 1,
      lastSpeechAt: Date.now(),
      baselineDb: 35,
    });
    render(<MissionRunner {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));

    const indicator = screen.getByTestId("voice-activity-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator.textContent).toContain("듣고 있어요");
  });

  it("running 90s 무인터랙션 → tooltip + 거울 모드 동시 노출 + 2종 이벤트 (FR-C-006 2단계)", async () => {
    render(<MissionRunner {...baseProps} durationSec={180} />);
    fireEvent.click(screen.getByRole("button", { name: /미션 시작/ }));
    trackMock.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(90_500);
      await Promise.resolve();
    });

    expect(screen.getByTestId("intervention-tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("intervention-mirror")).toBeInTheDocument();
    const silenceCalls = trackMock.mock.calls.filter(
      (c) => c[0] === "mission_silence_intervention",
    );
    expect(silenceCalls).toHaveLength(2);
    const stages = silenceCalls.map((c) => c[1].intervention);
    expect(stages).toContain("tooltip");
    expect(stages).toContain("mirror");
  });
});

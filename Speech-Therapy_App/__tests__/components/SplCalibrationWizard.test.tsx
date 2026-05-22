// REQ-FUNC-007 잔여 (#106) — SplCalibrationWizard 컴포넌트 단위 테스트.
//
// useSplMeter / MicStreamProvider 는 본 테스트 scope 외부 — vi.mock 으로 control.
//
// 시나리오 (총 11건):
//   1) idle → "측정 시작" 버튼 + 미보정 라벨 노출
//   2) "측정 시작" 클릭 → measuring 상태 + countdown 텍스트 노출 + useSplMeter enabled=true
//   3) 5초 경과 → measured 상태 + 평균 / 추천 offset 표시
//   4) "이 환경으로 설정" 클릭 → localStorage 저장 + trackEvent 호출 + saved 상태
//   5) saved 상태 → 보정됨 라벨 + 재측정/리셋 버튼
//   6) 리셋 클릭 → localStorage 제거 + idle 복귀
//   7) slider 조정 → pendingOffsetDb 갱신
//   8) 측정 중 cancel → idle 복귀 (저장 안 됨)
//   9) useSplMeter status='error' (권한 거부) → denied UI 노출
//  10) useSplMeter status='unsupported' → unsupported UI
//  11) 다시 측정 (saved → measuring → measured) 사이클 정상 동작

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";

// useSplMeter mock — 본 wizard 의 핵심 의존성 외부화.
vi.mock("@/lib/audio/useSplMeter", () => ({
  useSplMeter: vi.fn(),
}));

// MicStreamProvider 는 pass-through (children 만 렌더). Provider 내부 동작은 별도 테스트 책임.
vi.mock("@/lib/audio/MicStreamProvider", () => ({
  MicStreamProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// trackEvent 호출 검증 — analytics 모듈 mock.
vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

import { useSplMeter } from "@/lib/audio/useSplMeter";
import { trackEvent } from "@/lib/analytics";
import { SplCalibrationWizard } from "@/components/SplCalibrationWizard";
import {
  STORAGE_KEY,
  getCalibrationOffset,
  hasCalibration,
} from "@/lib/audio/spl-calibration";

const mockedUseSplMeter = useSplMeter as unknown as Mock;
const mockedTrackEvent = trackEvent as unknown as Mock;

function configureSplMeter(opts: {
  status: "idle" | "measuring" | "error" | "unsupported";
  currentDb: number | null;
}) {
  mockedUseSplMeter.mockImplementation(() => ({
    currentDb: opts.currentDb,
    isOverThreshold: false,
    overThresholdMs: 0,
    status: opts.status,
    peakDb: 0,
  }));
}

beforeEach(() => {
  window.localStorage.clear();
  mockedUseSplMeter.mockReset();
  mockedTrackEvent.mockReset();
  // 기본 idle — 측정 시작 전.
  configureSplMeter({ status: "idle", currentDb: null });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe("SplCalibrationWizard — REQ-FUNC-007 #106", () => {
  it("idle → '측정 시작' 버튼 + 미보정 라벨 노출", () => {
    render(<SplCalibrationWizard />);

    expect(screen.getByTestId("spl-calibration-wizard")).toBeInTheDocument();
    expect(screen.getByTestId("spl-calibration-start")).toBeInTheDocument();
    expect(screen.getByTestId("spl-calibration-status")).toHaveTextContent(/미보정/);
    // 미보정 상태에서 reset 버튼은 노출 안 됨.
    expect(screen.queryByTestId("spl-calibration-reset")).toBeNull();
  });

  it("'측정 시작' 클릭 → measuring 상태 전환 + countdown + useSplMeter enabled=true", () => {
    // 측정 시작 후 useSplMeter 는 측정 phase 신호 — currentDb 50 가정.
    configureSplMeter({ status: "measuring", currentDb: 50 });

    render(<SplCalibrationWizard />);

    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-start"));
    });

    expect(screen.getByTestId("spl-calibration-measuring")).toBeInTheDocument();
    expect(screen.getByTestId("spl-calibration-countdown")).toHaveTextContent("5s");

    // 마지막 호출의 args — enabled true 확인.
    const lastCall = mockedUseSplMeter.mock.calls[mockedUseSplMeter.mock.calls.length - 1];
    expect(lastCall[0]).toMatchObject({ enabled: true });
  });

  it("5초 경과 → measured 상태 + 평균 / 추천 offset 표시", () => {
    configureSplMeter({ status: "measuring", currentDb: 55 });

    render(<SplCalibrationWizard />);

    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-start"));
    });

    // 200ms 마다 countdown interval — 5000ms 경과 + sample 누적 시간 확보.
    act(() => {
      vi.advanceTimersByTime(5_200);
    });

    expect(screen.getByTestId("spl-calibration-measured")).toBeInTheDocument();
    expect(screen.getByTestId("spl-calibration-save")).toBeInTheDocument();
    expect(screen.getByTestId("spl-calibration-slider")).toBeInTheDocument();
  });

  it("'이 환경으로 설정' 클릭 → localStorage 저장 + trackEvent + saved 상태", () => {
    configureSplMeter({ status: "measuring", currentDb: 55 });

    render(<SplCalibrationWizard />);

    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-start"));
    });
    act(() => {
      vi.advanceTimersByTime(5_200);
    });

    // 측정 평균 ~55 → recommended = 100 + (50 - 55) = 95 dB. (Wizard 가 첫 측정 시 currentOffsetDb 기본 100 사용)
    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-save"));
    });

    expect(screen.getByTestId("spl-calibration-saved")).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(hasCalibration()).toBe(true);

    const calls = mockedTrackEvent.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const [eventName, props] = calls[0];
    expect(eventName).toBe("spl_calibration_completed");
    expect(props).toMatchObject({
      offsetDb: expect.any(Number),
      measuredAvgDb: expect.any(Number),
    });
    // 저장된 값과 trackEvent props.offsetDb 일치.
    expect(props.offsetDb).toBe(getCalibrationOffset());
  });

  it("saved 상태 → 보정됨 라벨 + 재측정 / 리셋 버튼", () => {
    configureSplMeter({ status: "measuring", currentDb: 55 });

    render(<SplCalibrationWizard />);
    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-start"));
    });
    act(() => {
      vi.advanceTimersByTime(5_200);
    });
    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-save"));
    });

    expect(screen.getByTestId("spl-calibration-status")).toHaveTextContent(/보정됨/);
    expect(screen.getByTestId("spl-calibration-remeasure")).toBeInTheDocument();
    expect(screen.getByTestId("spl-calibration-reset")).toBeInTheDocument();
  });

  it("리셋 클릭 → localStorage 제거 + 미보정 라벨 복귀", () => {
    configureSplMeter({ status: "measuring", currentDb: 55 });
    render(<SplCalibrationWizard />);
    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-start"));
    });
    act(() => {
      vi.advanceTimersByTime(5_200);
    });
    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-save"));
    });

    expect(hasCalibration()).toBe(true);

    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-reset"));
    });

    expect(hasCalibration()).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId("spl-calibration-status")).toHaveTextContent(/미보정/);
    expect(screen.getByTestId("spl-calibration-start")).toBeInTheDocument();
  });

  it("slider 조정 → pendingOffsetDb 갱신 + label 반영", () => {
    configureSplMeter({ status: "measuring", currentDb: 55 });
    render(<SplCalibrationWizard />);
    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-start"));
    });
    act(() => {
      vi.advanceTimersByTime(5_200);
    });

    const slider = screen.getByTestId("spl-calibration-slider") as HTMLInputElement;
    act(() => {
      fireEvent.change(slider, { target: { value: "92" } });
    });
    // pending label 에 92 반영. 저장 시 trackEvent.offsetDb=92 확인.
    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-save"));
    });
    expect(getCalibrationOffset()).toBe(92);
  });

  it("측정 중 cancel → idle 복귀 (저장 안 됨)", () => {
    configureSplMeter({ status: "measuring", currentDb: 55 });
    render(<SplCalibrationWizard />);
    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-start"));
    });
    act(() => {
      vi.advanceTimersByTime(1_000); // 측정 중간.
    });

    expect(screen.getByTestId("spl-calibration-measuring")).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-cancel"));
    });

    expect(screen.queryByTestId("spl-calibration-measuring")).toBeNull();
    expect(screen.getByTestId("spl-calibration-start")).toBeInTheDocument();
    expect(hasCalibration()).toBe(false);
  });

  it("useSplMeter status='error' → denied UI 노출 (권한 거부)", () => {
    // 측정 시작 시 mock 이 status='error' 반환 — 권한 거부 시뮬.
    configureSplMeter({ status: "error", currentDb: null });

    render(<SplCalibrationWizard />);
    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-start"));
    });
    // status 변화 effect 가 phase='denied' 로 전환.
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId("spl-calibration-denied")).toBeInTheDocument();
  });

  it("useSplMeter status='unsupported' → unsupported UI", () => {
    configureSplMeter({ status: "unsupported", currentDb: null });

    render(<SplCalibrationWizard />);
    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-start"));
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId("spl-calibration-unsupported")).toBeInTheDocument();
  });

  it("saved → 다시 측정 클릭 → measuring 사이클 정상 진입", () => {
    configureSplMeter({ status: "measuring", currentDb: 55 });
    render(<SplCalibrationWizard />);

    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-start"));
    });
    act(() => {
      vi.advanceTimersByTime(5_200);
    });
    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-save"));
    });
    expect(screen.getByTestId("spl-calibration-saved")).toBeInTheDocument();

    // 다시 측정 → measuring 진입.
    act(() => {
      fireEvent.click(screen.getByTestId("spl-calibration-remeasure"));
    });
    expect(screen.getByTestId("spl-calibration-measuring")).toBeInTheDocument();
  });

  it("CON-04 금칙어 (치료/진단/장애) 사용 0건", () => {
    const { container } = render(<SplCalibrationWizard />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/치료/);
    // "진단" 은 페이지 경로 카피로 노출 가능성 — wizard 내부 카피는 0 보장.
    expect(html).not.toMatch(/진단/);
    expect(html).not.toMatch(/장애/);
  });
});

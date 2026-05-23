// FR-C-007 (#30 Replace D5) — OfflineToast 단위 테스트.
//
// 검증 시나리오 (총 8건):
//   1) 초기 online → Toast 미렌더 (DOM 비어 있음)
//   2) offline 전환 → offline Toast 노출 + offline_detected 이벤트 발송 (path 캡처)
//   3) online 복귀 → reconnected Toast 노출 + online_restored 이벤트 (offlineDurationMs ≥ 0)
//   4) reconnected Toast 3초 (default) 경과 후 자동 사라짐
//   5) 다중 toggle (offline → online → offline) → 각 전환마다 이벤트 1회씩
//   6) 자녀 친화 카피 + 금칙어 ("치료/진단/장애") 0건
//   7) fixed position 클래스 (top-6 + left-1/2) 적용
//   8) reconnectedDisplayMs prop override 동작

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import { OfflineToast } from "@/components/OfflineToast";
import { __resetLastOfflineAtForTest } from "@/lib/hooks/useOnlineStatus";

// trackEvent mock — analytics 모듈을 도입한 컴포넌트가 dev 모드 console.debug 노이즈를 안 내도록.
const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

let onLineValue: boolean;

beforeEach(() => {
  vi.useFakeTimers();
  trackMock.mockClear();
  __resetLastOfflineAtForTest();
  onLineValue = true;
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => onLineValue,
  });
  // window.location.pathname 은 jsdom 기본 "/" — 카탈로그 path 검증에 사용.
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("OfflineToast — FR-C-007 Replace D5", () => {
  it("초기 online → Toast 미렌더", () => {
    onLineValue = true;
    render(<OfflineToast />);

    expect(screen.queryByTestId("offline-toast")).toBeNull();
    expect(screen.queryByTestId("offline-toast-reconnected")).toBeNull();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("offline 전환 → offline Toast 노출 + offline_detected 이벤트 1회", () => {
    render(<OfflineToast />);

    act(() => {
      onLineValue = false;
      window.dispatchEvent(new Event("offline"));
    });

    const toast = screen.getByTestId("offline-toast");
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveAttribute("role", "alert");
    expect(screen.getByText(/지금은 오프라인이에요/)).toBeInTheDocument();
    expect(screen.getByText(/연결 후 다시 시도해 주세요/)).toBeInTheDocument();

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("offline_detected", {
      path: window.location.pathname,
    });
  });

  it("online 복귀 → reconnected Toast 노출 + online_restored 이벤트 (offlineDurationMs ≥ 0)", () => {
    render(<OfflineToast />);

    act(() => {
      onLineValue = false;
      window.dispatchEvent(new Event("offline"));
    });
    expect(trackMock).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      onLineValue = true;
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.queryByTestId("offline-toast")).toBeNull();
    const reconnected = screen.getByTestId("offline-toast-reconnected");
    expect(reconnected).toBeInTheDocument();
    expect(reconnected).toHaveAttribute("role", "status");
    expect(screen.getByText(/다시 연결되었어요/)).toBeInTheDocument();

    expect(trackMock).toHaveBeenCalledTimes(2);
    const restoredCall = trackMock.mock.calls[1];
    expect(restoredCall[0]).toBe("online_restored");
    expect(restoredCall[1].offlineDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("reconnected Toast 3초 (default) 경과 후 자동 사라짐", () => {
    render(<OfflineToast />);

    act(() => {
      onLineValue = false;
      window.dispatchEvent(new Event("offline"));
    });
    act(() => {
      onLineValue = true;
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.getByTestId("offline-toast-reconnected")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(screen.queryByTestId("offline-toast-reconnected")).toBeNull();
    expect(screen.queryByTestId("offline-toast")).toBeNull();
  });

  it("다중 toggle (offline → online → offline) → 각 전환마다 이벤트 1회씩", () => {
    render(<OfflineToast />);

    act(() => {
      onLineValue = false;
      window.dispatchEvent(new Event("offline"));
    });
    act(() => {
      onLineValue = true;
      window.dispatchEvent(new Event("online"));
    });
    // reconnected toast 사라지게 advance.
    act(() => {
      vi.advanceTimersByTime(3_500);
    });
    act(() => {
      onLineValue = false;
      window.dispatchEvent(new Event("offline"));
    });

    // 이벤트 sequence: offline_detected, online_restored, offline_detected.
    expect(trackMock).toHaveBeenCalledTimes(3);
    expect(trackMock.mock.calls[0][0]).toBe("offline_detected");
    expect(trackMock.mock.calls[1][0]).toBe("online_restored");
    expect(trackMock.mock.calls[2][0]).toBe("offline_detected");

    // 두 번째 offline Toast 노출 중.
    expect(screen.getByTestId("offline-toast")).toBeInTheDocument();
  });

  it("자녀 친화 카피 + 금칙어 (치료/진단/장애) 0건", () => {
    render(<OfflineToast />);

    act(() => {
      onLineValue = false;
      window.dispatchEvent(new Event("offline"));
    });

    const offlineToast = screen.getByTestId("offline-toast");
    const html = offlineToast.innerHTML;
    expect(html).not.toMatch(/치료/);
    expect(html).not.toMatch(/진단/);
    expect(html).not.toMatch(/장애/);

    act(() => {
      onLineValue = true;
      window.dispatchEvent(new Event("online"));
    });
    const reconnected = screen.getByTestId("offline-toast-reconnected");
    const html2 = reconnected.innerHTML;
    expect(html2).not.toMatch(/치료/);
    expect(html2).not.toMatch(/진단/);
    expect(html2).not.toMatch(/장애/);
  });

  it("fixed position 클래스 (top-6 + 가운데 정렬) 적용", () => {
    render(<OfflineToast />);

    act(() => {
      onLineValue = false;
      window.dispatchEvent(new Event("offline"));
    });

    const toast = screen.getByTestId("offline-toast");
    const cls = toast.className;
    expect(cls).toMatch(/fixed/);
    expect(cls).toMatch(/top-6/);
    expect(cls).toMatch(/left-1\/2/);
    // 다른 컴포넌트 (SplToast 등) 와 같은 z-50 — 단일 화면 위치 정합.
    expect(cls).toMatch(/z-50/);
  });

  it("reconnectedDisplayMs prop override → 사용자 지정 시간 후 사라짐", () => {
    render(<OfflineToast reconnectedDisplayMs={1_000} />);

    act(() => {
      onLineValue = false;
      window.dispatchEvent(new Event("offline"));
    });
    act(() => {
      onLineValue = true;
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.getByTestId("offline-toast-reconnected")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(screen.getByTestId("offline-toast-reconnected")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByTestId("offline-toast-reconnected")).toBeNull();
  });
});

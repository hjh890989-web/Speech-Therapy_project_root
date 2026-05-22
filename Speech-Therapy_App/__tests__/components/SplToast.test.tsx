// REQ-FUNC-007 — SplToast 컴포넌트 단위 테스트.
//
// 검증 시나리오 (총 5건):
//   1) visible=false → DOM 미렌더
//   2) visible=true → 카피 + role="alert" 노출, 금칙어 (치료/진단/장애) 0건
//   3) X 버튼 클릭 → onDismiss 호출
//   4) auto-dismiss timer → 5초 후 onDismiss 호출
//   5) visible=true → false 전환 시 timer cleanup (false 상태에서 onDismiss 재호출 안 됨)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";

import { SplToast } from "@/components/SplToast";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SplToast — REQ-FUNC-007", () => {
  it("visible=false → DOM 미렌더", () => {
    const onDismiss = vi.fn();
    render(<SplToast visible={false} onDismiss={onDismiss} />);
    expect(screen.queryByTestId("spl-toast")).toBeNull();
  });

  it("visible=true → role=alert + 자녀친화 카피 + 금칙어 0건", () => {
    const onDismiss = vi.fn();
    render(<SplToast visible={true} onDismiss={onDismiss} thresholdDb={60} />);

    const toast = screen.getByTestId("spl-toast");
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveAttribute("role", "alert");

    expect(screen.getByText(/주변이 시끄러워요/)).toBeInTheDocument();
    expect(screen.getByText(/조용한 곳으로 이동/)).toBeInTheDocument();
    expect(screen.getByText(/60dB/)).toBeInTheDocument();

    // CON-04 금칙어 사용 0건 검증.
    const html = toast.innerHTML;
    expect(html).not.toMatch(/치료/);
    expect(html).not.toMatch(/진단/);
    expect(html).not.toMatch(/장애/);
  });

  it("X 버튼 클릭 → onDismiss 호출", () => {
    const onDismiss = vi.fn();
    render(<SplToast visible={true} onDismiss={onDismiss} />);

    const dismissBtn = screen.getByTestId("spl-toast-dismiss");
    fireEvent.click(dismissBtn);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("auto-dismiss — 5초 (default) 경과 후 onDismiss 호출 1회", () => {
    const onDismiss = vi.fn();
    render(<SplToast visible={true} onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("visible=true → false 전환 시 timer cleanup (이후 5초 경과해도 onDismiss 재호출 안 됨)", () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<SplToast visible={true} onDismiss={onDismiss} />);

    // 2초 진행 (auto-dismiss 도달 전).
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    // visible=false 로 전환 (예: 외부 dismiss 또는 over-threshold 해제).
    rerender(<SplToast visible={false} onDismiss={onDismiss} />);

    // 추가 10초 경과 — auto-dismiss timer 가 cleanup 되었으므로 onDismiss 발화 안 됨.
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("autoDismissMs override → 사용자 지정 시간 후 호출", () => {
    const onDismiss = vi.fn();
    render(<SplToast visible={true} onDismiss={onDismiss} autoDismissMs={2_000} />);

    act(() => {
      vi.advanceTimersByTime(1_500);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

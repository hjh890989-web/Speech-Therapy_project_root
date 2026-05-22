// FR-Q-011 (Issue #52) — RoiSimulator Client Component 통합 테스트.
// 검증: 초기 산출 표시, 슬라이더 변경 → useMemo 재계산, roi_simulated 발송.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { RoiSimulator } from "@/app/(public)/roi/RoiSimulator";

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

// Recharts 가 happy-dom 에서 ResponsiveContainer 측정 시 0 width 로 자식 렌더링을 스킵하므로
// 차트 자체는 검증 대상에서 제외 — 산출 카드 + 슬라이더 + 이벤트만 검증.
vi.mock("recharts", () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Stub,
    BarChart: Stub,
    Bar: Stub,
    XAxis: Stub,
    YAxis: Stub,
    CartesianGrid: Stub,
    Tooltip: Stub,
    Legend: Stub,
  };
});

describe("RoiSimulator — FR-Q-011 / REQ-FUNC-048", () => {
  beforeEach(() => {
    trackMock.mockClear();
  });

  it("초기 렌더 — 기본 50명 × ₩20,000 = 월 매출 ₩1,000,000 표시", () => {
    render(<RoiSimulator />);
    expect(screen.getByTestId("roi-monthly-revenue")).toHaveTextContent("₩1,000,000");
    expect(screen.getByTestId("roi-annual-revenue")).toHaveTextContent("₩12,000,000");
    expect(screen.getByTestId("roi-monthly-time-saved")).toHaveTextContent("25.0h");
    expect(screen.getByTestId("roi-annual-savings")).toHaveTextContent("₩30,000,000");
  });

  it("초기 mount 1회 roi_simulated 발송 — 입력값 + 결과 포함", () => {
    render(<RoiSimulator />);
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("roi_simulated", {
      studentCount: 50,
      monthlyFee: 20_000,
      monthlyRevenue: 1_000_000,
    });
  });

  it("studentCount 슬라이더 변경 → 즉시 재계산 + roi_simulated 재발송", () => {
    render(<RoiSimulator />);
    trackMock.mockClear();

    const slider = screen.getByTestId("roi-student-count") as HTMLInputElement;
    act(() => {
      fireEvent.change(slider, { target: { value: "100" } });
    });

    // 100 × 20,000 = 2,000,000
    expect(screen.getByTestId("roi-monthly-revenue")).toHaveTextContent("₩2,000,000");
    expect(screen.getByTestId("roi-monthly-time-saved")).toHaveTextContent("50.0h");
    expect(trackMock).toHaveBeenCalledWith("roi_simulated", {
      studentCount: 100,
      monthlyFee: 20_000,
      monthlyRevenue: 2_000_000,
    });
  });

  it("monthlyFee 슬라이더 변경 → 매출 비례 증가", () => {
    render(<RoiSimulator />);
    const slider = screen.getByTestId("roi-monthly-fee") as HTMLInputElement;
    act(() => {
      fireEvent.change(slider, { target: { value: "30000" } });
    });
    // 50 × 30,000 = 1,500,000
    expect(screen.getByTestId("roi-monthly-revenue")).toHaveTextContent("₩1,500,000");
  });

  it("expertHourlyRate 변경 → 절감 금액만 변동 (매출 불변)", () => {
    render(<RoiSimulator />);
    const slider = screen.getByTestId("roi-expert-hourly-rate") as HTMLInputElement;
    act(() => {
      fireEvent.change(slider, { target: { value: "150000" } });
    });
    // 매출 불변: 50 × 20,000 = 1,000,000
    expect(screen.getByTestId("roi-monthly-revenue")).toHaveTextContent("₩1,000,000");
    // 절감: 25h × 150,000 = 3,750,000/월 → 연 45,000,000
    expect(screen.getByTestId("roi-annual-savings")).toHaveTextContent("₩45,000,000");
  });

  it("같은 값으로 동일 입력 변화 없음 — roi_simulated 중복 발송 X", () => {
    render(<RoiSimulator />);
    trackMock.mockClear();

    const slider = screen.getByTestId("roi-student-count") as HTMLInputElement;
    act(() => {
      fireEvent.change(slider, { target: { value: "50" } }); // 기본값과 동일
    });
    // useMemo 결과도 동일 → useEffect key 변화 없음 → 미발송.
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("슬라이더에 accessible label (aria-label) 부여", () => {
    render(<RoiSimulator />);
    expect(screen.getByLabelText("원아 수")).toBeInTheDocument();
    expect(screen.getByLabelText("원아 1인당 월 비용")).toBeInTheDocument();
    expect(screen.getByLabelText("전문가 시간당 비용 (가정)")).toBeInTheDocument();
  });
});

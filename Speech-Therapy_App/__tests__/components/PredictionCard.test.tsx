// FR-Q-005 Scenario 2 / FR-C-011 — PredictionCard 통합 후 단위 테스트.
// 검증: initialPrediction 분기 (null / present / stale), 시뮬레이션 슬라이더 동작, 이벤트 발송 3종.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { PredictionCard } from "@/app/(public)/reports/PredictionCard";
import type { PredictionResult } from "@/lib/schemas/prediction";

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

const predictMock = vi.fn();
vi.mock("@/app/actions/prediction", () => ({
  predictNextScore: (...args: unknown[]) => predictMock(...args),
}));

const SAMPLE: PredictionResult = {
  predictedNextScore: 76,
  predictionConfidence: 0.85,
  lowerBound: 71,
  upperBound: 81,
  basedOnWeeks: 4,
  cached: false,
};

describe("PredictionCard — FR-C-011 통합", () => {
  beforeEach(() => {
    trackMock.mockClear();
    predictMock.mockClear();
  });

  it("initialPrediction=null → empty 분기 + '4주 누적 후' 카피", () => {
    render(<PredictionCard initialPrediction={null} weekNumber={20} userId="user-a" />);
    expect(screen.getByTestId("prediction-card-empty")).toBeInTheDocument();
    expect(screen.getByText(/4주 누적 후/)).toBeInTheDocument();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("initialPrediction 존재 → mount 1회 prediction_calculated 발송", () => {
    render(<PredictionCard initialPrediction={SAMPLE} weekNumber={20} userId="user-a" />);
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("prediction_calculated", {
      predicted: 76,
      confidence: 0.85,
      cached: false,
      staleFromRateLimit: false,
    });
  });

  it("실 예측 표시 — 점수 + 신뢰구간 + 신뢰도", () => {
    render(<PredictionCard initialPrediction={SAMPLE} weekNumber={20} userId="user-a" />);
    expect(screen.getByText("76점")).toBeInTheDocument();
    expect(screen.getByText(/71~81점/)).toBeInTheDocument();
    expect(screen.getByText(/신뢰도 85%/)).toBeInTheDocument();
  });

  it("staleFromRateLimit=true → '잠시 후 다시' 배지", () => {
    render(
      <PredictionCard
        initialPrediction={{ ...SAMPLE, staleFromRateLimit: true }}
        weekNumber={20}
        userId="user-a"
      />,
    );
    expect(screen.getByTestId("prediction-stale-badge")).toBeInTheDocument();
  });

  it("카드 클릭 → prediction_clicked 발송", () => {
    render(<PredictionCard initialPrediction={SAMPLE} weekNumber={20} userId="user-a" />);
    trackMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /다음 주 예상/ }));

    expect(trackMock).toHaveBeenCalledWith("prediction_clicked", {
      predictedScore: 76,
      confidence: 0.85,
      weekNumber: 20,
    });
  });

  it("시뮬레이션 슬라이더 변경 → prediction_simulation_changed + predictNextScore 재호출", async () => {
    predictMock.mockResolvedValueOnce({ ...SAMPLE, predictedNextScore: 80, cached: false });
    render(<PredictionCard initialPrediction={SAMPLE} weekNumber={20} userId="user-a" />);
    trackMock.mockClear();
    predictMock.mockClear();

    fireEvent.click(screen.getByRole("radio", { name: /주 5회/ }));

    expect(trackMock).toHaveBeenCalledWith("prediction_simulation_changed", {
      missionFrequency: "high",
    });
    expect(predictMock).toHaveBeenCalledWith({ userId: "user-a", missionFrequency: "high" });

    await waitFor(() => {
      expect(screen.getByText("80점")).toBeInTheDocument();
    });
    // 재호출 후 mount 이벤트 외에 prediction_calculated 추가 1회.
    expect(trackMock.mock.calls.filter((c) => c[0] === "prediction_calculated").length).toBe(1);
  });

  it("userId=null (무로그인) → 시뮬레이션 슬라이더 미노출", () => {
    render(<PredictionCard initialPrediction={SAMPLE} weekNumber={20} userId={null} />);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("정수 반올림 표시 — 75.6 → 76점", () => {
    render(
      <PredictionCard
        initialPrediction={{ ...SAMPLE, predictedNextScore: 75.6 }}
        weekNumber={20}
        userId="user-a"
      />,
    );
    expect(screen.getByText("76점")).toBeInTheDocument();
  });
});

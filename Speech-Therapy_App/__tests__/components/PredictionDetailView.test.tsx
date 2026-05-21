// FR-Q-012 — PredictionDetailView 단위 테스트.
// 검증: 메인 카드 / 신뢰구간 막대 / 향상 폭 분기 / CTA 클릭 / mount 이벤트 / R1 disclaimer X (page 측 책임).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { PredictionDetailView } from "@/app/(public)/predictions/PredictionDetailView";
import type { PredictionResult } from "@/lib/schemas/prediction";

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

const SAMPLE: PredictionResult = {
  predictedNextScore: 76,
  predictionConfidence: 0.85,
  lowerBound: 71,
  upperBound: 81,
  basedOnWeeks: 4,
  cached: false,
};

describe("PredictionDetailView — FR-Q-012 시각화", () => {
  beforeEach(() => {
    trackMock.mockClear();
  });

  it("AC1 — 메인 카드 + 신뢰도 + 신뢰구간 막대", () => {
    render(<PredictionDetailView prediction={SAMPLE} currentWeekAverage={67} />);

    expect(screen.getByTestId("prediction-main-card")).toBeInTheDocument();
    expect(screen.getByText("76")).toBeInTheDocument();
    expect(screen.getByText(/신뢰도 85%/)).toBeInTheDocument();
    expect(screen.getByTestId("prediction-confidence-range")).toBeInTheDocument();
    expect(screen.getByText("71점 ~ 81점")).toBeInTheDocument();
    // ARIA 검증 — 막대그래프의 aria-label.
    expect(screen.getByRole("img", { name: /예상 범위 71점부터 81점, 예상 평균 76점/ })).toBeInTheDocument();
  });

  it("AC2 — 향상 폭 +9점 표시 (67 → 76)", () => {
    render(<PredictionDetailView prediction={SAMPLE} currentWeekAverage={67} />);

    const improvement = screen.getByTestId("prediction-improvement");
    expect(improvement).toBeInTheDocument();
    expect(improvement).toHaveTextContent("67점");
    expect(improvement).toHaveTextContent("76점");
    expect(improvement).toHaveTextContent("↑ +9");
    // 격려 카피.
    expect(screen.getByText(/9점 향상이 예상돼요/)).toBeInTheDocument();
  });

  it("향상 폭 0 또는 음수 — 격려 카피 미노출 + 회색 화살표", () => {
    render(<PredictionDetailView prediction={{ ...SAMPLE, predictedNextScore: 65 }} currentWeekAverage={70} />);

    const improvement = screen.getByTestId("prediction-improvement");
    expect(improvement).toHaveTextContent("→ -5"); // 음수 — 회색
    // 격려 카피 없음 (불안 자극 회피, CON-04).
    expect(screen.queryByText(/향상이 예상돼요/)).not.toBeInTheDocument();
  });

  it("currentWeekAverage null → 향상 폭 섹션 미노출", () => {
    render(<PredictionDetailView prediction={SAMPLE} currentWeekAverage={null} />);

    expect(screen.queryByTestId("prediction-improvement")).not.toBeInTheDocument();
    // 메인 카드 + 신뢰구간 막대는 여전히 노출.
    expect(screen.getByTestId("prediction-main-card")).toBeInTheDocument();
  });

  it("AC3 — CTA 클릭 → prediction_cta_clicked + /missions 링크", () => {
    render(<PredictionDetailView prediction={SAMPLE} currentWeekAverage={67} />);
    trackMock.mockClear();

    const cta = screen.getByTestId("prediction-cta");
    expect(cta).toHaveAttribute("href", "/missions");

    fireEvent.click(cta);

    expect(trackMock).toHaveBeenCalledWith("prediction_cta_clicked", {
      predicted: 76,
      improvementDelta: 9,
    });
  });

  it("mount 1회 prediction_page_viewed 발송 (Strict Mode 가드)", () => {
    render(<PredictionDetailView prediction={SAMPLE} currentWeekAverage={67} />);

    const calls = trackMock.mock.calls.filter((c) => c[0] === "prediction_page_viewed");
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toEqual({
      predicted: 76,
      confidence: 0.85,
      improvementDelta: 9,
    });
  });

  it("staleFromRateLimit=true → '잠시 후 다시' 배지", () => {
    render(
      <PredictionDetailView
        prediction={{ ...SAMPLE, staleFromRateLimit: true }}
        currentWeekAverage={67}
      />,
    );
    expect(screen.getByTestId("prediction-stale-badge")).toBeInTheDocument();
  });

  it("정수 반올림 — 75.6 → 76 + 신뢰도 0.847 → 85%", () => {
    render(
      <PredictionDetailView
        prediction={{ ...SAMPLE, predictedNextScore: 75.6, predictionConfidence: 0.847 }}
        currentWeekAverage={67.4}
      />,
    );
    expect(screen.getByText("76")).toBeInTheDocument(); // 반올림
    expect(screen.getByText(/신뢰도 85%/)).toBeInTheDocument(); // 0.847 * 100 ≈ 85
    expect(screen.getByTestId("prediction-improvement")).toHaveTextContent("67점"); // 67.4 → 67
  });

  it("CON-04 — 의료 금칙어 0건", () => {
    const { container } = render(
      <PredictionDetailView prediction={SAMPLE} currentWeekAverage={67} />,
    );
    const text = container.textContent ?? "";
    for (const word of ["치료", "진단", "장애"]) {
      expect(text).not.toContain(word);
    }
  });
});

// FR-Q-005 Scenario 2 / REQ-FUNC-028 — PredictionCard 클릭 트래킹 단위 테스트.
// 검증: 클릭 시 prediction_clicked 이벤트 발송, 베타 라벨 분기, confidence 표시 분기.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { PredictionCard } from "@/app/(public)/reports/PredictionCard";

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

describe("PredictionCard — FR-Q-005 Scenario 2 (REQ-FUNC-028)", () => {
  beforeEach(() => {
    trackMock.mockClear();
  });

  it("mock 단계 (isMock=true, confidence=null) — 베타 라벨 + 예상치 카피 노출", () => {
    render(
      <PredictionCard predictedScore={76} confidence={null} weekNumber={20} isMock={true} />,
    );

    expect(screen.getByTestId("prediction-card")).toBeInTheDocument();
    expect(screen.getByTestId("prediction-beta-badge")).toBeInTheDocument();
    expect(screen.getByText("76점")).toBeInTheDocument();
    expect(screen.getByText("예상치 (베타)")).toBeInTheDocument();
  });

  it("클릭 → prediction_clicked 이벤트 발송 (predictedScore + confidence + weekNumber)", () => {
    render(
      <PredictionCard predictedScore={76} confidence={null} weekNumber={20} isMock={true} />,
    );

    fireEvent.click(screen.getByTestId("prediction-card"));

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("prediction_clicked", {
      predictedScore: 76,
      confidence: null,
      weekNumber: 20,
    });
  });

  it("FR-C-011 통합 후 (isMock=false, confidence=0.85) — 신뢰도 표시 + 베타 라벨 미노출", () => {
    render(
      <PredictionCard predictedScore={82} confidence={0.85} weekNumber={21} isMock={false} />,
    );

    expect(screen.queryByTestId("prediction-beta-badge")).not.toBeInTheDocument();
    expect(screen.getByText("82점")).toBeInTheDocument();
    expect(screen.getByText("신뢰도 85%")).toBeInTheDocument();
  });

  it("정수 반올림 표시 — 75.6 → 76점", () => {
    render(
      <PredictionCard predictedScore={75.6} confidence={null} weekNumber={20} isMock={true} />,
    );

    expect(screen.getByText("76점")).toBeInTheDocument();
  });

  it("클릭 후 trackEvent payload 의 confidence 가 실 값일 때 정확히 전달", () => {
    render(
      <PredictionCard predictedScore={82} confidence={0.85} weekNumber={21} isMock={false} />,
    );

    fireEvent.click(screen.getByTestId("prediction-card"));

    expect(trackMock).toHaveBeenCalledWith("prediction_clicked", {
      predictedScore: 82,
      confidence: 0.85,
      weekNumber: 21,
    });
  });
});

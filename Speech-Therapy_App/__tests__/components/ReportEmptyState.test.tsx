// FR-Q-006 — ReportEmptyState 3 variants 단위 테스트.
// 검증: 카피 분기, mount empty_state_viewed 발송, CTA 클릭 empty_state_cta_clicked 발송, 부정 어휘 0건.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ReportEmptyState } from "@/app/(public)/reports/ReportEmptyState";

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

describe("ReportEmptyState — FR-Q-006 3 variants", () => {
  beforeEach(() => {
    trackMock.mockClear();
  });

  it("new_user variant — 첫 발화 안내 + start_diagnose CTA + empty_state_viewed 발송", () => {
    render(<ReportEmptyState variant="new_user" weekSessionCount={0} />);

    expect(screen.getByTestId("report-empty-new_user")).toBeInTheDocument();
    expect(screen.getByText(/첫 발화/)).toBeInTheDocument();
    expect(screen.getByText("지금 시작하기")).toBeInTheDocument();

    expect(trackMock).toHaveBeenCalledWith("empty_state_viewed", {
      variant: "new_user",
      weekSessionCount: 0,
    });
  });

  it("week_empty variant — 직전 주 평균 카드 표시", () => {
    render(<ReportEmptyState variant="week_empty" weekSessionCount={0} previousWeekAverage={73.4} />);

    expect(screen.getByTestId("report-empty-week_empty")).toBeInTheDocument();
    expect(screen.getByText(/잠시 쉬어가는 중/)).toBeInTheDocument();
    expect(screen.getByText("직전 주 평균")).toBeInTheDocument();
    expect(screen.getByText("73점")).toBeInTheDocument();
    expect(screen.getByText("오늘의 미션 보기")).toBeInTheDocument();
  });

  it("week_empty variant — previousWeekAverage 없으면 카드 미노출", () => {
    render(<ReportEmptyState variant="week_empty" weekSessionCount={0} />);
    expect(screen.queryByText("직전 주 평균")).not.toBeInTheDocument();
  });

  it("long_absent variant — 환영 메시지 + start_mission CTA", () => {
    render(<ReportEmptyState variant="long_absent" weekSessionCount={0} />);

    expect(screen.getByTestId("report-empty-long_absent")).toBeInTheDocument();
    expect(screen.getByText(/오랜만이에요/)).toBeInTheDocument();
    expect(screen.getByText("다시 시작하기")).toBeInTheDocument();
  });

  it("CTA 클릭 → empty_state_cta_clicked 발송", () => {
    render(<ReportEmptyState variant="new_user" weekSessionCount={0} />);
    trackMock.mockClear();

    fireEvent.click(screen.getByText("지금 시작하기"));

    expect(trackMock).toHaveBeenCalledWith("empty_state_cta_clicked", {
      variant: "new_user",
      cta: "start_diagnose",
    });
  });

  it("CON-04 — 모든 variant 텍스트에 부정 어휘 (실패/장애/X/안 했어요) 0건", () => {
    const forbidden = ["실패", "장애", "치료", "진단을 받", "X표시"];
    for (const variant of ["new_user", "week_empty", "long_absent"] as const) {
      const { container, unmount } = render(
        <ReportEmptyState variant={variant} weekSessionCount={0} previousWeekAverage={70} />,
      );
      const text = container.textContent ?? "";
      for (const word of forbidden) {
        expect(text).not.toContain(word);
      }
      unmount();
    }
  });
});

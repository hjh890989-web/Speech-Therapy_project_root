// Performance 감사 2차 — Recharts dynamic import wrapper 동작 확인.
//
// 검증 (각 wrapper 별):
//   1) 빈 data input 시 fallback / empty 분기 노출 (FunnelDailyChart)
//   2) 정상 input 시 throw 없이 render 성공 (chart 모듈은 next/dynamic 으로 lazy-loaded
//      → happy-dom 환경에서는 skeleton 우선 노출 가능. throw 만 검증).
//   3) wrapper 의 데이터/contract 가 직전 PR 과 동일 (testid 보존).
//
// 격리:
//   - recharts 전체를 stub — happy-dom 의 ResponsiveContainer 측정 부재로 chart 렌더 잡음 방지.
//   - next/dynamic 은 actual 사용 (skeleton + lazy 모듈 둘 다 render path 검증).

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// recharts 전체 stub — chart 모듈 (Impl) import 시 recharts 호출 0건 + 측정 잡음 0건.
vi.mock("recharts", () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Stub,
    BarChart: Stub,
    Bar: Stub,
    LineChart: Stub,
    Line: Stub,
    XAxis: Stub,
    YAxis: Stub,
    CartesianGrid: Stub,
    Tooltip: Stub,
    Legend: Stub,
  };
});

import { FunnelDailyChart } from "@/app/admin/funnel/FunnelChart";
import { WeeklyReportChart } from "@/app/(public)/reports/WeeklyReportChart";
import { RoiSimulator } from "@/app/(public)/roi/RoiSimulator";
import { WeeklyReviewTrend } from "@/components/weekly-review/WeeklyReviewTrend";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

describe("Performance 감사 2차 — Recharts dynamic wrapper", () => {
  describe("FunnelDailyChart wrapper", () => {
    it("빈 days[] → funnel-chart-empty 분기 노출 (chart 모듈 미로드)", () => {
      const { getByTestId, queryByTestId } = render(<FunnelDailyChart days={[]} />);
      expect(getByTestId("funnel-chart-empty")).toBeInTheDocument();
      // chart 자체는 미렌더 → testid 부재.
      expect(queryByTestId("funnel-daily-chart")).toBeNull();
    });

    it("days[] non-empty → throw 없이 render (skeleton 또는 chart 둘 중 하나)", () => {
      const days = [
        {
          date: "2026-05-24",
          steps: [
            { name: "landing" as const, count: 10, conversionFromPrev: null, cumulativeConversion: 1 },
          ],
          totalUsers: 10,
        },
      ];
      // throw 0 + empty 분기 미진입.
      const { queryByTestId } = render(<FunnelDailyChart days={days} />);
      expect(queryByTestId("funnel-chart-empty")).toBeNull();
    });
  });

  describe("WeeklyReportChart wrapper", () => {
    it("scoreTrend 빈 배열 → throw 없이 render + aria-label 존재", () => {
      const { container } = render(<WeeklyReportChart scoreTrend={[]} />);
      const wrapper = container.querySelector('[aria-label="주간 추이 그래프"]');
      expect(wrapper).not.toBeNull();
    });

    it("scoreTrend 정상 입력 → throw 없이 render", () => {
      const scoreTrend = [
        {
          date: "2026-05-20",
          phoneme: "ㅅ",
          articulation: 80,
          linguistic: 70,
          acoustic: 75,
          peerPercentile: 60,
        },
      ];
      const { container } = render(<WeeklyReportChart scoreTrend={scoreTrend} />);
      const wrapper = container.querySelector('[aria-label="주간 추이 그래프"]');
      expect(wrapper).not.toBeNull();
    });
  });

  describe("WeeklyReviewTrend wrapper (1차 후속 회귀 가드)", () => {
    it("weeks 정상 입력 → throw 없이 render + 컨테이너 testid 노출", () => {
      const weeks = [
        {
          year: 2026,
          weekNumber: 20,
          articulationAvg: 80,
          linguisticAvg: 70,
          acousticAvg: 75,
        },
      ];
      const { getByTestId } = render(<WeeklyReviewTrend weeks={weeks} />);
      expect(getByTestId("weekly-review-trend")).toBeInTheDocument();
    });
  });

  describe("RoiSimulator (chart dynamic 분리 후 회귀 가드)", () => {
    it("초기 render — roi-simulator + roi-monthly-revenue testid 노출 (chart wrapper 분리 후에도 동일)", () => {
      const { getByTestId } = render(<RoiSimulator />);
      expect(getByTestId("roi-simulator")).toBeInTheDocument();
      expect(getByTestId("roi-monthly-revenue")).toHaveTextContent("₩1,000,000");
    });
  });
});

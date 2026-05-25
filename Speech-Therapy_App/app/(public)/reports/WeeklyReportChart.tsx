"use client";

// FR-Q-005 / Performance 감사 2차 — 주간 추이 차트 wrapper (next/dynamic, ssr: false).
//
// Performance 감사 2차 (1차 63fbccf 후속):
//   본 wrapper 는 Recharts (~80KB gzip) 본체 (`WeeklyReportChartImpl`) 를 `next/dynamic`
//   으로 lazy-load → /reports 진입한 경우에만 chart bundle 로드. 부모/익명 사용자의 다른
//   페이지 (홈/diagnose/missions) 초기 bundle 영향 0건.
//
// 회귀 0건:
//   호출 측 (page.tsx) 의 import 경로 `./WeeklyReportChart` 와 named export
//   `WeeklyReportChart` 및 props (`scoreTrend`) 는 변경 없음. 기존 vi.mock("@/app/(public)
//   /reports/WeeklyReportChart", () => ({ WeeklyReportChart: () => null })) 도 그대로 동작.

import dynamic from "next/dynamic";
import type { ScoreTrend } from "@/lib/weekly-report";

interface Props {
  scoreTrend: ScoreTrend;
}

// Recharts 본체 (`WeeklyReportChartImpl`) 는 client only — ResponsiveContainer 가 window
// 측정에 의존 → ssr=false 안전. loading: skeleton 으로 300px 자리 유지 (layout shift 0).
const WeeklyReportChartImpl = dynamic(() => import("./WeeklyReportChartImpl"), {
  ssr: false,
  loading: () => (
    <div
      data-testid="weekly-report-chart-skeleton"
      aria-hidden="true"
      className="h-[300px] w-full animate-pulse rounded-md bg-slate-100 dark:bg-slate-800"
    />
  ),
});

export function WeeklyReportChart({ scoreTrend }: Props) {
  return (
    <div className="w-full" aria-label="주간 추이 그래프">
      <WeeklyReportChartImpl scoreTrend={scoreTrend} />
    </div>
  );
}

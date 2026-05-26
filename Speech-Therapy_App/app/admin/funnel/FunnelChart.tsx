// MON-001 (#64) — 일자별 단계 카운트 BarChart wrapper (next/dynamic, ssr: false).
//
// Performance 감사 2차 (1차 63fbccf 후속):
//   본 wrapper 는 Recharts (~80KB gzip) 본체 (`FunnelChartImpl`) 를 `next/dynamic` 으로
//   lazy-load → /admin/funnel 진입한 경우에만 chart bundle 로드. 다른 /admin/* 페이지의
//   초기 bundle / critical path 영향 0건.
//
// 회귀 0건:
//   호출 측 (page.tsx) 의 import 경로 `./FunnelChart` 및 named export `FunnelDailyChart` 와
//   props (`days`) 는 변경 없음. 기존 vi.mock 단위 테스트도 본 wrapper 만 mock 으로 교체하면 동작.
//
// 디자인 (sub-component 와 동일):
//   - data-testid="funnel-daily-chart" / data-testid="funnel-chart-empty" 보존.
//   - skeleton 은 h-72 (288px) chart container 와 동일 높이 → layout shift 0.

"use client";

import dynamic from "next/dynamic";
// FR-PERF-3-USE-SERVER-REFACTOR 후속 — Client Component 는 prisma 비의존 shape 모듈만 import.
import type { FunnelSummary } from "@/lib/analytics/funnel-shape";

interface Props {
  days: FunnelSummary[];
}

// Recharts 본체 (`FunnelDailyChartImpl`) 는 client only — ResponsiveContainer 가 window
// 측정에 의존 → ssr=false 안전. loading: skeleton 으로 h-72 자리 유지 (layout shift 0).
const FunnelDailyChartImpl = dynamic(() => import("./FunnelChartImpl"), {
  ssr: false,
  loading: () => (
    <div
      data-testid="funnel-daily-chart-skeleton"
      aria-hidden="true"
      className="h-72 w-full animate-pulse rounded-lg border border-slate-200 bg-slate-100"
    />
  ),
});

export function FunnelDailyChart({ days }: Props) {
  if (days.length === 0) {
    return (
      <p
        data-testid="funnel-chart-empty"
        className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
      >
        차트 표시 가능한 일자 데이터가 없습니다.
      </p>
    );
  }
  return <FunnelDailyChartImpl days={days} />;
}

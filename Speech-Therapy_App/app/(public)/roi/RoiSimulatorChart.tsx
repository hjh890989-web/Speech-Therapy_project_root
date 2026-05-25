"use client";

// FR-Q-011 / Performance 감사 2차 — RoiSimulator 의 Recharts BarChart inner Chart.
//
// RoiSimulator.tsx 의 chart 본문만 분리. RoiSimulator (parent) 가 `next/dynamic` 으로
// 본 컴포넌트를 lazy-import → recharts (~80KB gzip) 가 /roi 초기 bundle 에서 분리된다.
//
// 분리 이유:
//   1) 호출 측 (RoiSimulator.tsx) 의 import 경로 (`./RoiSimulator`) 는 그대로 — 회귀 0.
//   2) parent 는 슬라이더/카드 SSR-safe — dynamic 경계는 chart 만.
//   3) recharts 는 ResponsiveContainer 의 window 측정 의존 → client only 안전.
//
// 회귀 0건:
//   기존 RoiSimulator.test.tsx 가 vi.mock("recharts", ...) 로 recharts 전체를 stub 하므로
//   본 컴포넌트의 recharts import 도 자동 mock 됨. data-testid 변경 0.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface RoiChartRow {
  month: number;
  cumulativeRevenue: number;
  cumulativeSavings: number;
}

interface Props {
  data: RoiChartRow[];
}

function formatKRW(value: number): string {
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function formatCompactKRW(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`;
  if (value >= 10_000) return `${Math.round(value / 10_000)}만`;
  return `${value}`;
}

export default function RoiSimulatorChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          fontSize={12}
          tickFormatter={(m: number) => `${m}월차`}
        />
        <YAxis fontSize={12} tickFormatter={(v: number) => formatCompactKRW(v)} />
        <Tooltip
          formatter={(value) =>
            formatKRW(typeof value === "number" ? value : Number(value))
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="cumulativeRevenue" name="누적 매출" fill="#10b981" />
        <Bar dataKey="cumulativeSavings" name="누적 절감" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}

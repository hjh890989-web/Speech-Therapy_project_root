"use client";

// FR-Q-WEEKLY-REVIEW + Performance 감사 1차 — Recharts 본체를 담는 inner Chart.
//
// WeeklyReviewTrend.tsx 의 chart 본문만 분리. WeeklyReviewTrend (wrapper) 가
// `next/dynamic` 으로 본 컴포넌트를 lazy-import → recharts (~80KB gzip) 가
// 초기 page bundle / critical path 에서 분리된다.
//
// 분리 이유:
//   1) 호출 측 (page) 의 import 경로는 그대로 두어야 vitest mock 호환 유지.
//   2) wrapper 는 SSR-safe (skeleton) — Suspense / dynamic 경계는 컴포넌트 내부.
//   3) recharts 는 ResponsiveContainer 의 window 측정 의존 → client only 안전.
//
// 본 컴포넌트의 props / 디자인은 WeeklyReviewTrend 1.0 과 동일 (회귀 0건).

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { WeeklyReviewTrendWeek } from "./WeeklyReviewTrend";

export interface WeeklyReviewTrendChartProps {
  weeks: WeeklyReviewTrendWeek[];
}

export default function WeeklyReviewTrendChart({
  weeks,
}: WeeklyReviewTrendChartProps) {
  const data = weeks.map((w) => ({
    label: `${String(w.year).slice(2)}w${w.weekNumber}`,
    조음: Math.round(w.articulationAvg),
    언어: Math.round(w.linguisticAvg),
    음향: Math.round(w.acousticAvg),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" fontSize={12} />
        <YAxis domain={[0, 100]} fontSize={12} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="조음"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="언어"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="음향"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

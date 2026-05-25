"use client";

// FR-Q-005 / Performance 감사 2차 — Recharts 본체 (LineChart) inner Chart.
//
// WeeklyReportChart.tsx 의 chart 본문만 분리. WeeklyReportChart (wrapper) 가 `next/dynamic`
// 으로 본 컴포넌트를 lazy-import → recharts (~80KB gzip) 가 초기 bundle 에서 분리된다.
//
// 분리 이유:
//   1) 호출 측 (page.tsx) 의 import 경로 (`./WeeklyReportChart`) 는 그대로 — 회귀 0.
//   2) wrapper 는 SSR-safe (skeleton) — dynamic 경계는 컴포넌트 내부.
//   3) recharts 는 ResponsiveContainer 의 window 측정 의존 → client only 안전.

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ScoreTrend } from "@/lib/weekly-report";

interface Props {
  scoreTrend: ScoreTrend;
}

export default function WeeklyReportChartImpl({ scoreTrend }: Props) {
  // ScoreTrend → chart data (X축: 일자 MM/DD, Y축: 0~100).
  const data = scoreTrend.map((entry) => ({
    date: entry.date.slice(5).replace("-", "/"),
    조음: entry.articulation,
    언어: entry.linguistic,
    음향: entry.acoustic,
    또래백분위: entry.peerPercentile,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" fontSize={12} />
        <YAxis domain={[0, 100]} fontSize={12} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="조음" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="언어" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="음향" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
        <Line
          type="monotone"
          dataKey="또래백분위"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

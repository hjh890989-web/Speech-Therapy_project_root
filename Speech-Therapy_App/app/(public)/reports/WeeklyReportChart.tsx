"use client";

// FR-Q-005 — 주간 추이 차트 (Recharts LineChart).
// 음소별 다중 라인 (실제 데이터에선 다중 음소, 단순화로 백분위 1 라인).

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

export function WeeklyReportChart({ scoreTrend }: Props) {
  // ScoreTrend → chart data (X축: 일자 MM/DD, Y축: 0~100).
  const data = scoreTrend.map((entry) => ({
    date: entry.date.slice(5).replace("-", "/"),
    조음: entry.articulation,
    언어: entry.linguistic,
    음향: entry.acoustic,
    또래백분위: entry.peerPercentile,
  }));

  return (
    <div className="w-full" aria-label="주간 추이 그래프">
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
          <Line type="monotone" dataKey="또래백분위" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

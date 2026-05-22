// MON-001 (#64) — 일자별 단계 카운트 BarChart (Client Component, Recharts).
//
// Server Component (page.tsx) 에서 days: FunnelSummary[] 를 props 로 받아 시각화.
// Recharts 는 브라우저 의존 (ResponsiveContainer + window 측정) → "use client" 필수.
//
// R4: 표시값은 단계 라벨 + 카운트만. userId / sessionId 0건.

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FUNNEL_STEP_LABEL,
  FUNNEL_STEP_ORDER,
  type FunnelSummary,
} from "@/lib/analytics/funnel";

interface Props {
  days: FunnelSummary[];
}

interface ChartRow {
  date: string;
  landing: number;
  diagnose_started: number;
  diagnose_completed: number;
  mission_started: number;
  mission_completed: number;
  reward_granted: number;
}

function toChartRows(days: FunnelSummary[]): ChartRow[] {
  return days.map((day) => {
    const lookup = new Map(day.steps.map((s) => [s.name, s.count]));
    return {
      date: day.date,
      landing: lookup.get("landing") ?? 0,
      diagnose_started: lookup.get("diagnose_started") ?? 0,
      diagnose_completed: lookup.get("diagnose_completed") ?? 0,
      mission_started: lookup.get("mission_started") ?? 0,
      mission_completed: lookup.get("mission_completed") ?? 0,
      reward_granted: lookup.get("reward_granted") ?? 0,
    };
  });
}

const STEP_COLORS: Record<(typeof FUNNEL_STEP_ORDER)[number], string> = {
  landing: "#6366f1", // indigo-500
  diagnose_started: "#0ea5e9", // sky-500
  diagnose_completed: "#10b981", // emerald-500
  mission_started: "#f59e0b", // amber-500
  mission_completed: "#ef4444", // rose-500
  reward_granted: "#a855f7", // purple-500
};

export function FunnelDailyChart({ days }: Props) {
  const rows = toChartRows(days);
  if (rows.length === 0) {
    return (
      <p
        data-testid="funnel-chart-empty"
        className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
      >
        차트 표시 가능한 일자 데이터가 없습니다.
      </p>
    );
  }
  return (
    <div
      data-testid="funnel-daily-chart"
      className="h-72 w-full rounded-lg border border-slate-200 bg-white p-2"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {FUNNEL_STEP_ORDER.map((name) => (
            <Bar
              key={name}
              dataKey={name}
              fill={STEP_COLORS[name]}
              name={FUNNEL_STEP_LABEL[name]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

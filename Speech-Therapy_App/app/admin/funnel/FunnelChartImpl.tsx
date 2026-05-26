// MON-001 (#64) / Performance 감사 2차 — Recharts 본체 (BarChart) inner Chart.
//
// FunnelChart.tsx 의 chart 본문만 분리. FunnelChart (wrapper) 가 `next/dynamic` 으로
// 본 컴포넌트를 lazy-import → recharts (~80KB gzip) 가 초기 bundle 에서 분리된다.
//
// 분리 이유:
//   1) 호출 측 (page.tsx) 의 import 경로 (`./FunnelChart`) 는 그대로 두어야 회귀 0.
//   2) wrapper 는 SSR-safe (skeleton) — dynamic / suspense 경계는 컴포넌트 내부.
//   3) recharts 는 ResponsiveContainer 의 window 측정 의존 → client only 안전.

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
// FR-PERF-3-USE-SERVER-REFACTOR 후속 — Client Component 는 prisma 비의존 shape 모듈만 import.
// `@/lib/analytics/funnel` (server-only, prisma 의존) 직접 import 시 build 실패.
import {
  FUNNEL_STEP_LABEL,
  FUNNEL_STEP_ORDER,
  type FunnelSummary,
} from "@/lib/analytics/funnel-shape";

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

export default function FunnelDailyChartImpl({ days }: Props) {
  const rows = toChartRows(days);
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

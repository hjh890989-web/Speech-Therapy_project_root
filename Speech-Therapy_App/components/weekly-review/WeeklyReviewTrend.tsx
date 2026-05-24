"use client";

// FR-Q-WEEKLY-REVIEW — 직전 4주 trend chart (Recharts LineChart).
//
// 입력:
//   - weeks: 시간 오름차순 ([{year, weekNumber, 3축 avg}]) — 호출 측 (page) 가 정렬 책임.
//   - 4건 미만이면 page 측에서 본 컴포넌트 미렌더 (의미 있는 추이 어려움).
//
// 디자인:
//   - X축: "YYwww" (예: "26w19") — 자릿수 짧고 정렬 안정.
//   - Y축: 0~100 고정 (다른 차트와 일관).
//   - 3축 (조음/언어/음향) 만 노출 — peerPercentile 은 별도 카드 (Summary) 에서 처리.

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

export interface WeeklyReviewTrendWeek {
  year: number;
  weekNumber: number;
  articulationAvg: number;
  linguisticAvg: number;
  acousticAvg: number;
}

export interface WeeklyReviewTrendProps {
  /// 시간 오름차순 (가장 과거 → 최근). 호출 측 책임.
  weeks: WeeklyReviewTrendWeek[];
}

export function WeeklyReviewTrend({ weeks }: WeeklyReviewTrendProps) {
  const data = weeks.map((w) => ({
    label: `${String(w.year).slice(2)}w${w.weekNumber}`,
    조음: Math.round(w.articulationAvg),
    언어: Math.round(w.linguisticAvg),
    음향: Math.round(w.acousticAvg),
  }));

  return (
    <div
      data-testid="weekly-review-trend"
      className="w-full"
      aria-label="최근 주차별 3축 평균 추이"
    >
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
    </div>
  );
}

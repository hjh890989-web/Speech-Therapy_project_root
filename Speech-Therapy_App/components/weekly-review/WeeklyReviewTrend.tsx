"use client";

// FR-Q-WEEKLY-REVIEW — 직전 4주 trend chart (Recharts LineChart) wrapper.
//
// Performance 감사 1차:
//   본 wrapper 는 Recharts (~80KB gzip) 본체를 `next/dynamic` 으로 lazy-load.
//   → 초기 page bundle 에서 Recharts 분리, weekly-review 만 진입한 경우에만 로드.
//   → critical path / LCP 영향 최소화. SSR 측은 skeleton 으로 layout shift 0.
//
// 회귀 0건:
//   호출 측 (page) 의 import 경로 `@/components/weekly-review/WeeklyReviewTrend` 와
//   props (`weeks`) 는 변경 없음 → 기존 vi.mock 단위 테스트 그대로 통과.
//
// 입력:
//   - weeks: 시간 오름차순 ([{year, weekNumber, 3축 avg}]) — 호출 측 (page) 가 정렬 책임.
//   - 4건 미만이면 page 측에서 본 컴포넌트 미렌더 (의미 있는 추이 어려움).
//
// 디자인 (sub-component 와 동일):
//   - X축: "YYwww" (예: "26w19") — 자릿수 짧고 정렬 안정.
//   - Y축: 0~100 고정 (다른 차트와 일관).
//   - 3축 (조음/언어/음향) 만 노출 — peerPercentile 은 별도 카드 (Summary) 에서 처리.

import dynamic from "next/dynamic";

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

// Recharts 본체 (`WeeklyReviewTrendChart`) 는 client only — ResponsiveContainer 가
// window 측정에 의존 → ssr=false 안전. loading: skeleton 으로 260px 자리 유지
// (layout shift 0). 본 wrapper 는 client component ("use client") 라 layout shift
// 최소화를 위해 chart 와 동일 height 의 placeholder 노출.
const WeeklyReviewTrendChart = dynamic(
  () => import("./WeeklyReviewTrendChart"),
  {
    ssr: false,
    loading: () => (
      <div
        data-testid="weekly-review-trend-skeleton"
        aria-hidden="true"
        className="h-[260px] w-full animate-pulse rounded-md bg-slate-100 dark:bg-slate-800"
      />
    ),
  },
);

export function WeeklyReviewTrend({ weeks }: WeeklyReviewTrendProps) {
  return (
    <div
      data-testid="weekly-review-trend"
      className="w-full"
      aria-label="최근 주차별 3축 평균 추이"
    >
      <WeeklyReviewTrendChart weeks={weeks} />
    </div>
  );
}

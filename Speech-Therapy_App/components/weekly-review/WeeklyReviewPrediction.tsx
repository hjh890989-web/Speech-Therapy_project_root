// FR-Q-WEEKLY-REVIEW — 다음 주 예측 점수 카드 (clickable → /predictions 상세).
//
// 입력:
//   - predictedNextScore: WeeklyReport.predictedNextScore (Gemini 회귀 또는 mock fallback).
//   - predictionConfidence: 0~1 또는 null.
//   - currentAvg: 이번 주 3축 평균의 평균 — 향상 폭 (+α) 표시용.
//
// 분기:
//   - predictedNextScore === null → 본 카드 미렌더 (page 측 책임 — 본 컴포넌트는 null 입력 가정 안 함).
//
// SSR 친화: 본 카드 자체는 순수 presentation — Link 만 client navigation.
// CON-04: "예상", "기대" 등 비-의료 어휘만 사용.

import Link from "next/link";

export interface WeeklyReviewPredictionProps {
  /// 0~100 — null 입력 시 page 측에서 미렌더 책임 (본 컴포넌트는 number 만 받음).
  predictedNextScore: number;
  /// 0~1, null 가능. null = 신뢰도 미노출.
  predictionConfidence: number | null;
  /// 이번 주 3축 평균의 평균. null = 향상 폭 미노출.
  currentAvg: number | null;
}

export function WeeklyReviewPrediction({
  predictedNextScore,
  predictionConfidence,
  currentAvg,
}: WeeklyReviewPredictionProps) {
  const predicted = Math.round(predictedNextScore);
  const confidencePct =
    predictionConfidence !== null
      ? Math.round(predictionConfidence * 100)
      : null;
  const improvementDelta =
    currentAvg !== null ? Math.round(predicted - currentAvg) : null;

  return (
    <Link
      data-testid="weekly-review-prediction-card"
      href="/predictions"
      className="block rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 transition hover:bg-emerald-100/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
      aria-label="다음 주 예상 점수 상세 보기"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">
        다음 주 예상 평균
      </p>
      <p
        data-testid="weekly-review-prediction-value"
        className="mt-1 text-4xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300"
      >
        {predicted}
        <span className="text-2xl text-slate-500 dark:text-slate-400">점</span>
      </p>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        {confidencePct !== null && (
          <span data-testid="weekly-review-prediction-confidence">
            신뢰도 {confidencePct}%
          </span>
        )}
        {improvementDelta !== null && improvementDelta > 0 && (
          <span
            data-testid="weekly-review-prediction-delta"
            className="font-semibold text-emerald-700 dark:text-emerald-300"
          >
            +{improvementDelta}점 향상 기대
          </span>
        )}
        {improvementDelta !== null && improvementDelta <= 0 && (
          <span
            data-testid="weekly-review-prediction-delta"
            className="text-slate-500 dark:text-slate-400"
          >
            비슷한 수준 예상
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        자세한 신뢰구간 보기 →
      </p>
    </Link>
  );
}

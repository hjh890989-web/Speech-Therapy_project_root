// FR-Q-012 / REQ-FUNC-028, 044 — 예측 점수 상세 시각화 + 신뢰구간 + 향상 폭.
//
// EXP-2 핵심 검증 페이지 — "예측 클릭 유저 익월 유지율 +20%p" 가설 측정.
//
// 시각화 구성:
//   1. 메인 카드 — text-6xl 예상 점수 + 신뢰도 %
//   2. 신뢰구간 막대 — lowerBound~upperBound 시각 범위 (0~100 트랙 + 음영 영역)
//   3. 향상 폭 — 이번 주 평균 → 예상 점수 차이 (+N점 상승 / 동일 / 하락)
//   4. CTA — "이번 주 미션 시작" → /missions (prediction_cta_clicked 트래킹)
//
// 분기:
//   - improvement > 0 → 초록 + ↑ (격려)
//   - improvement = 0 → 회색 (중립)
//   - improvement < 0 → 회색 (불안 자극 회피 — CON-04 정신)
//
// CON-04 / R1: "예측은 보장이 아닙니다" Disclaimer 는 page 측에서 ≥ 2곳 강제.
//              본 컴포넌트는 신뢰도 % 노출로 보조.

"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import type { PredictionResult } from "@/lib/schemas/prediction";

export interface PredictionDetailViewProps {
  prediction: PredictionResult;
  /// 본 주 종합 평균 (3축 평균의 평균). 향상 폭 계산용. null 가능 (이번 주 0건일 때).
  currentWeekAverage: number | null;
}

export function PredictionDetailView({
  prediction,
  currentWeekAverage,
}: PredictionDetailViewProps) {
  const predicted = Math.round(prediction.predictedNextScore);
  const lower = Math.round(prediction.lowerBound);
  const upper = Math.round(prediction.upperBound);
  const confidencePct = Math.round(prediction.predictionConfidence * 100);
  const improvementDelta =
    currentWeekAverage !== null ? Math.round(predicted - currentWeekAverage) : 0;

  // mount 1회 prediction_page_viewed — Strict Mode 더블 마운트 가드.
  const sentMountRef = useRef(false);
  useEffect(() => {
    if (sentMountRef.current) return;
    sentMountRef.current = true;
    trackEvent("prediction_page_viewed", {
      predicted,
      confidence: prediction.predictionConfidence,
      improvementDelta,
    });
  }, [predicted, prediction.predictionConfidence, improvementDelta]);

  function handleCtaClick() {
    trackEvent("prediction_cta_clicked", {
      predicted,
      improvementDelta,
    });
  }

  return (
    <div className="space-y-6">
      {/* 메인 점수 카드 — text-6xl */}
      <section
        data-testid="prediction-main-card"
        className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 text-center dark:border-emerald-800 dark:bg-emerald-950/30"
      >
        <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">다음 주 예상 평균</p>
        <p className="text-6xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
          {predicted}
          <span className="text-3xl text-gray-500 dark:text-gray-400">점</span>
        </p>
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          신뢰도 {confidencePct}%
          {prediction.staleFromRateLimit && (
            <span
              data-testid="prediction-stale-badge"
              className="ml-2 rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
            >
              잠시 후 다시
            </span>
          )}
        </p>
      </section>

      {/* 신뢰구간 막대 — 0~100 트랙 + 음영 영역 (lower~upper) + 점선 (predicted) */}
      <section
        data-testid="prediction-confidence-range"
        className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
      >
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">예상 범위</p>
          <p className="text-sm font-medium tabular-nums">
            {lower}점 ~ {upper}점
          </p>
        </div>
        <ConfidenceRangeBar lower={lower} upper={upper} predicted={predicted} />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          ※ 신뢰도가 높을수록 범위가 좁아져요. 예측은 보장이 아닙니다.
        </p>
      </section>

      {/* 향상 폭 (현재 → 예상) */}
      {currentWeekAverage !== null && (
        <section
          data-testid="prediction-improvement"
          className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
        >
          <div className="grid grid-cols-3 items-center gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">이번 주 평균</p>
              <p className="text-2xl font-bold tabular-nums">
                {Math.round(currentWeekAverage)}점
              </p>
            </div>
            <div className="text-2xl">
              {improvementDelta > 0 ? (
                <span className="text-emerald-700 dark:text-emerald-300" aria-label={`${improvementDelta}점 상승 예상`}>
                  ↑ +{improvementDelta}
                </span>
              ) : improvementDelta < 0 ? (
                <span className="text-gray-500 dark:text-gray-400" aria-label={`${Math.abs(improvementDelta)}점 차이`}>
                  → {improvementDelta}
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400" aria-label="동일 수준 예상">
                  → 0
                </span>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">다음 주 예상</p>
              <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                {predicted}점
              </p>
            </div>
          </div>
          {improvementDelta > 0 && (
            <p className="mt-3 text-center text-sm text-emerald-700 dark:text-emerald-300">
              {improvementDelta}점 향상이 예상돼요. 이번 주 미션으로 이어가 보세요.
            </p>
          )}
        </section>
      )}

      {/* CTA */}
      <section className="rounded-lg bg-emerald-600 p-1 dark:bg-emerald-700">
        <Link
          href="/missions"
          onClick={handleCtaClick}
          data-testid="prediction-cta"
          className="block min-h-[44px] rounded-md bg-emerald-600 px-5 py-3 text-center text-base font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-white"
        >
          이번 주 미션 시작하기
        </Link>
      </section>
    </div>
  );
}

/// 0~100 트랙 위 lower~upper 범위 음영 + predicted 점 표시.
function ConfidenceRangeBar({
  lower,
  upper,
  predicted,
}: {
  lower: number;
  upper: number;
  predicted: number;
}) {
  // SSR 안전 — 모두 결정적 계산.
  const lowerPct = Math.max(0, Math.min(100, lower));
  const upperPct = Math.max(0, Math.min(100, upper));
  const predictedPct = Math.max(0, Math.min(100, predicted));
  const widthPct = upperPct - lowerPct;

  return (
    <div
      className="relative h-4 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
      role="img"
      aria-label={`예상 범위 ${lower}점부터 ${upper}점, 예상 평균 ${predicted}점`}
    >
      {/* 음영 영역 — lower~upper */}
      <div
        className="absolute h-full bg-emerald-200 dark:bg-emerald-900"
        style={{ left: `${lowerPct}%`, width: `${widthPct}%` }}
        aria-hidden="true"
      />
      {/* predicted 점 marker */}
      <div
        className="absolute top-0 h-full w-1 bg-emerald-700 dark:bg-emerald-300"
        style={{ left: `calc(${predictedPct}% - 2px)` }}
        aria-hidden="true"
      />
      {/* 눈금: 0 / 50 / 100 */}
      <div className="absolute inset-x-0 -bottom-5 flex justify-between text-[10px] text-gray-400">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}

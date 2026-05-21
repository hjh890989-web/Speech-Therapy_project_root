// FR-Q-005 Scenario 2 / FR-C-011 / REQ-FUNC-028, 044, 045 — 다음 주 예상 점수 카드.
//
// 입력:
//   - initialPrediction: 서버에서 1회 미리 산출된 예측. null = 데이터 부족 (4주 미만).
//   - userId: 시뮬레이션 변경 시 재호출용 (인증 사용자만). null = 무로그인 → 슬라이더 비활성.
//
// 동작:
//   - mount 1회 prediction_calculated 발송 (initialPrediction 존재 시)
//   - 카드 클릭 → prediction_clicked
//   - 슬라이더 변경 → predictNextScore() 재호출 + prediction_simulation_changed
//
// 분기:
//   - initialPrediction === null → "예상치 준비 중" 메시지 (4주 데이터 누적 후 자동 활성)
//   - staleFromRateLimit === true → "잠시 후 다시" 배지
//   - 그 외 → 실 예측 + lowerBound~upperBound 신뢰구간 노출
//
// CON-04: 의료 어휘 0건.

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { trackEvent } from "@/lib/analytics";
import { predictNextScore } from "@/app/actions/prediction";
import type {
  MissionFrequency,
  PredictionResult,
} from "@/lib/schemas/prediction";

export interface PredictionCardProps {
  /// 서버 1차 산출. null = 데이터 부족 (4주 미만 또는 일부 주 0건).
  initialPrediction: PredictionResult | null;
  /// ISO 주차 (UI 표시 + 이벤트 페이로드).
  weekNumber: number;
  /// 인증 사용자 ID. null = 무로그인 → 시뮬레이션 비활성.
  userId: string | null;
}

const FREQ_LABEL: Record<MissionFrequency, string> = {
  low: "주 1~2회",
  normal: "주 3~4회",
  high: "주 5회+",
};

export function PredictionCard({ initialPrediction, weekNumber, userId }: PredictionCardProps) {
  const [prediction, setPrediction] = useState<PredictionResult | null>(initialPrediction);
  const [freq, setFreq] = useState<MissionFrequency>("normal");
  const [isPending, startTransition] = useTransition();
  const sentMountRef = useRef(false);

  // mount 1회 prediction_calculated — Strict Mode 더블 마운트 가드.
  useEffect(() => {
    if (sentMountRef.current) return;
    if (initialPrediction === null) return;
    sentMountRef.current = true;
    trackEvent("prediction_calculated", {
      predicted: initialPrediction.predictedNextScore,
      confidence: initialPrediction.predictionConfidence,
      cached: initialPrediction.cached,
      staleFromRateLimit: initialPrediction.staleFromRateLimit ?? false,
    });
  }, [initialPrediction]);

  function handleCardClick() {
    if (prediction === null) return;
    trackEvent("prediction_clicked", {
      predictedScore: prediction.predictedNextScore,
      confidence: prediction.predictionConfidence,
      weekNumber,
    });
  }

  function handleFrequencyChange(next: MissionFrequency) {
    if (!userId || next === freq) return;
    setFreq(next);
    trackEvent("prediction_simulation_changed", { missionFrequency: next });
    startTransition(async () => {
      try {
        const result = await predictNextScore({ userId, missionFrequency: next });
        setPrediction(result);
        if (result) {
          trackEvent("prediction_calculated", {
            predicted: result.predictedNextScore,
            confidence: result.predictionConfidence,
            cached: result.cached,
            staleFromRateLimit: result.staleFromRateLimit ?? false,
          });
        }
      } catch (err) {
        console.error("predictNextScore failed", err);
      }
    });
  }

  // 데이터 부족 — 4주 미만.
  if (prediction === null) {
    return (
      <article
        data-testid="prediction-card-empty"
        className="rounded-lg border border-dashed border-gray-200 p-4 dark:border-gray-700"
      >
        <p className="text-xs text-gray-600 dark:text-gray-400">다음 주 예상</p>
        <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">—</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          4주 누적 후 예상치가 표시돼요.
        </p>
      </article>
    );
  }

  const lower = Math.round(prediction.lowerBound);
  const upper = Math.round(prediction.upperBound);
  const isStale = prediction.staleFromRateLimit === true;

  return (
    <article
      data-testid="prediction-card"
      className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
    >
      <button
        type="button"
        onClick={handleCardClick}
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <p className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          다음 주 예상
          {isStale && (
            <span
              data-testid="prediction-stale-badge"
              className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
            >
              잠시 후 다시
            </span>
          )}
        </p>
        <p className="text-2xl font-bold tabular-nums">
          {Math.round(prediction.predictedNextScore)}점
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {lower}~{upper}점 · 신뢰도 {Math.round(prediction.predictionConfidence * 100)}%
        </p>
      </button>

      {userId && (
        <fieldset className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <legend className="text-[11px] text-gray-500 dark:text-gray-400">
            미션 빈도 시뮬레이션
          </legend>
          <div
            role="radiogroup"
            aria-label="미션 빈도 시뮬레이션"
            className="mt-1 flex gap-1"
          >
            {(["low", "normal", "high"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={freq === value}
                disabled={isPending}
                onClick={() => handleFrequencyChange(value)}
                className={`min-h-[32px] flex-1 rounded-sm px-2 text-[11px] transition ${
                  freq === value
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                } disabled:opacity-50`}
              >
                {FREQ_LABEL[value]}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </article>
  );
}

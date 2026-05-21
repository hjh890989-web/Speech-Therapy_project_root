// FR-Q-005 Scenario 2 / REQ-FUNC-028 — 다음 주 예상 점수 카드.
//
// 클릭 시 prediction_clicked 이벤트 발송 (Vercel Analytics).
// FR-C-011 (Gemini 회귀) 통합 전에는 mock 예상치 + "베타" 라벨 노출 — confidence: null.
//
// 본 컴포넌트는 Client Component — onClick + trackEvent 호출이 필요.

"use client";

import { trackEvent } from "@/lib/analytics";

export interface PredictionCardProps {
  /// 예상 점수 (0~100). mock 단계에서는 직전 주 평균 + 5점.
  predictedScore: number;
  /// 신뢰도 (0~1). FR-C-011 통합 전에는 null.
  confidence: number | null;
  /// ISO 주차 번호 (이번 주, 예측 대상 주의 직전).
  weekNumber: number;
  /// 베타 라벨 노출 여부 (mock 단계 = true). FR-C-011 통합 후 false.
  isMock?: boolean;
}

export function PredictionCard({
  predictedScore,
  confidence,
  weekNumber,
  isMock = true,
}: PredictionCardProps) {
  const handleClick = () => {
    trackEvent("prediction_clicked", {
      predictedScore,
      confidence,
      weekNumber,
    });
  };

  return (
    <button
      type="button"
      data-testid="prediction-card"
      onClick={handleClick}
      className="w-full rounded-lg border border-gray-200 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:hover:bg-emerald-950/20"
    >
      <p className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        다음 주 예상
        {isMock && (
          <span
            data-testid="prediction-beta-badge"
            className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
          >
            베타
          </span>
        )}
      </p>
      <p className="text-2xl font-bold tabular-nums">{Math.round(predictedScore)}점</p>
      {confidence != null ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          신뢰도 {Math.round(confidence * 100)}%
        </p>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">예상치 (베타)</p>
      )}
    </button>
  );
}

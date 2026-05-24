// FR-Q-WEEKLY-REVIEW — 3축 평균 + W-AUR 달성 + peerPercentile 요약 카드.
//
// 부모용 화면 — 정보 밀도 OK 하나 핵심 숫자는 강조 (text-3xl+).
// SSR 친화: 본 컴포넌트는 순수 presentation — Server Component 안에서 렌더 가능
// (use client 미사용 — re-hydration 비용 0). 클릭/이벤트 없는 카드만 노출.
//
// CON-04 의료 금칙어 0건 — "발음 발달", "활동" 등 비-의료 표현만 사용.
// R4: 자녀 이름/email 미수신 — 점수 숫자 + 회수만.

import type { ReactNode } from "react";

import { W_AUR_MIN_SESSIONS } from "@/lib/reports/weekly-aggregator";

export interface WeeklyReviewSummaryProps {
  /// 0~100, latest WeeklyReport.articulationAvg.
  articulationAvg: number;
  /// 0~100, latest WeeklyReport.linguisticAvg.
  linguisticAvg: number;
  /// 0~100, latest WeeklyReport.acousticAvg.
  acousticAvg: number;
  /// 0~100. null 가능 (Phase 0 데이터 부재 — 폴백 카피 노출).
  peerPercentileAvg: number | null;
  /// 본 주 evaluationResult 회수.
  sessionCount: number;
}

/// 점수 색상 분기 — 의료 판단 아님 (격려 vs 중립). CON-04: 빨강 (불안 자극) 회피.
function scoreToneClass(value: number): string {
  if (value >= 80) return "text-emerald-700 dark:text-emerald-300";
  if (value >= 60) return "text-sky-700 dark:text-sky-300";
  return "text-slate-700 dark:text-slate-300";
}

export function WeeklyReviewSummary({
  articulationAvg,
  linguisticAvg,
  acousticAvg,
  peerPercentileAvg,
  sessionCount,
}: WeeklyReviewSummaryProps) {
  const wAurAchieved = sessionCount >= W_AUR_MIN_SESSIONS;
  const remainingForWAur = Math.max(0, W_AUR_MIN_SESSIONS - sessionCount);

  return (
    <section
      data-testid="weekly-review-summary"
      aria-label="이번 주 요약"
      className="space-y-4"
    >
      {/* 3축 평균 — 큰 숫자 + 색상 분기 */}
      <div
        className="grid grid-cols-3 gap-3"
        aria-label="3축 평균 점수"
        data-testid="weekly-review-axes"
      >
        <AxisCard
          testId="weekly-review-axis-articulation"
          label="조음"
          value={articulationAvg}
          toneClass={scoreToneClass(articulationAvg)}
        />
        <AxisCard
          testId="weekly-review-axis-linguistic"
          label="언어"
          value={linguisticAvg}
          toneClass={scoreToneClass(linguisticAvg)}
        />
        <AxisCard
          testId="weekly-review-axis-acoustic"
          label="음향"
          value={acousticAvg}
          toneClass={scoreToneClass(acousticAvg)}
        />
      </div>

      {/* W-AUR 달성 / 미달성 분기 */}
      {wAurAchieved ? (
        <article
          data-testid="weekly-review-waur-achieved"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30"
          role="status"
        >
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            이번 주 활동 목표 달성!
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            주 {W_AUR_MIN_SESSIONS}회 활동을 채웠어요 — 이번 주도 수고하셨어요.
          </p>
        </article>
      ) : (
        <article
          data-testid="weekly-review-waur-pending"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30"
        >
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {remainingForWAur}회 더 하면 이번 주 목표 달성이에요
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            오늘은 {sessionCount}회 — 주 {W_AUR_MIN_SESSIONS}회를 채우면 다음 주가 더
            기대돼요.
          </p>
        </article>
      )}

      {/* peerPercentile — null 폴백 */}
      <article
        data-testid="weekly-review-peer"
        className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
      >
        <p className="text-xs text-slate-600 dark:text-slate-400">또래 비교</p>
        {peerPercentileAvg === null ? (
          <p
            data-testid="weekly-review-peer-empty"
            className="mt-1 text-sm text-slate-500 dark:text-slate-400"
          >
            또래 비교 데이터를 모으는 중이에요. 한 주 더 활동하면 안내해 드릴게요.
          </p>
        ) : (
          <PeerPercentileLine value={peerPercentileAvg} />
        )}
      </article>
    </section>
  );
}

function AxisCard({
  testId,
  label,
  value,
  toneClass,
}: {
  testId: string;
  label: string;
  value: number;
  toneClass: string;
}): ReactNode {
  const rounded = Math.round(value);
  return (
    <article
      data-testid={testId}
      className="rounded-lg border border-slate-200 p-4 text-center dark:border-slate-700"
    >
      <p className="text-xs text-slate-600 dark:text-slate-400">{label}</p>
      <p
        data-testid={`${testId}-value`}
        className={`mt-1 text-3xl font-bold tabular-nums ${toneClass}`}
      >
        {rounded}
        <span className="text-base text-slate-500 dark:text-slate-400">점</span>
      </p>
    </article>
  );
}

function PeerPercentileLine({ value }: { value: number }) {
  // 백분위 값 의미: peerPercentileAvg 가 50 = 또래 중간.
  // PRD 정책 — 상위 N% 로 표현 (직관적). 백분위 80 = 상위 20%.
  const topPct = Math.max(0, Math.min(100, Math.round(100 - value)));
  return (
    <p
      data-testid="weekly-review-peer-text"
      className="mt-1 text-sm text-slate-800 dark:text-slate-200"
    >
      또래 평균 대비 <span className="font-semibold">상위 {topPct}%</span> 수준이에요.
    </p>
  );
}

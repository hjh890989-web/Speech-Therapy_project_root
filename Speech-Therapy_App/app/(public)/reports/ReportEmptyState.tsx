// FR-Q-006 — 데이터 부족 시 긍정 메시지 EmptyState (3 variants).
//
// REQ-FUNC-029: 그래프 대신 긍정적 안내 + 미션 독려 + 이전 성과 표시.
// CON-04: 의료/실패 어휘 금지 — 모든 카피 긍정형.
//
// variants:
//   - new_user: 평생 0건 → "첫 발화를 들려주세요" + /missions CTA
//   - week_empty: 이번 주 0건 + 직전 데이터 있음 → "잠시 쉬어가는 중" + 직전 주 평균 표시 (optional)
//   - long_absent: 21일+ 미접속 → "오랜만이에요" + 환영 + /missions CTA
//
// mount 1회 empty_state_viewed 발송. CTA 클릭 시 empty_state_cta_clicked 발송.

"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import type { EmptyVariant } from "@/lib/weekly-report";

export interface ReportEmptyStateProps {
  variant: EmptyVariant;
  weekSessionCount: number;
  /// 옵션: week_empty variant 에서 직전 주 평균 표시. 없으면 미노출.
  previousWeekAverage?: number;
}

const COPY: Record<
  EmptyVariant,
  { title: string; body: string; cta: string; ctaHref: string; ctaKind: "start_mission" | "start_diagnose" }
> = {
  new_user: {
    title: "첫 발화를 들려주세요!",
    body: "오늘 5분이면 아이의 발음 발달을 또래와 비교해 확인할 수 있어요.",
    cta: "지금 시작하기",
    ctaHref: "/diagnose",
    ctaKind: "start_diagnose",
  },
  week_empty: {
    title: "이번 주는 잠시 쉬어가는 중이네요",
    body: "오늘 짧은 미션 하나만 이어가 보세요. 작은 한 걸음도 충분해요.",
    cta: "오늘의 미션 보기",
    ctaHref: "/missions",
    ctaKind: "start_mission",
  },
  long_absent: {
    title: "오랜만이에요!",
    body: "다시 만나 반가워요. 가볍게 한 번 발음을 들려주실까요?",
    cta: "다시 시작하기",
    ctaHref: "/missions",
    ctaKind: "start_mission",
  },
};

export function ReportEmptyState({
  variant,
  weekSessionCount,
  previousWeekAverage,
}: ReportEmptyStateProps) {
  // mount 1회만 발송 — Strict Mode 더블 마운트 대비 ref.
  const sentRef = useRef(false);
  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    trackEvent("empty_state_viewed", { variant, weekSessionCount });
  }, [variant, weekSessionCount]);

  const copy = COPY[variant];

  return (
    <section
      data-testid={`report-empty-${variant}`}
      className="rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-8 text-center dark:border-emerald-800 dark:bg-emerald-950/20"
    >
      <p className="mb-3 text-5xl" aria-hidden="true">
        {variant === "new_user" ? "🌱" : variant === "long_absent" ? "🌳" : "🌿"}
      </p>
      <h2 className="mb-2 text-xl font-semibold">{copy.title}</h2>
      <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">{copy.body}</p>

      {variant === "week_empty" && previousWeekAverage != null && (
        <div className="mx-auto mb-6 max-w-xs rounded-md border border-emerald-200 bg-white p-4 dark:border-emerald-800 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400">직전 주 평균</p>
          <p className="text-2xl font-bold tabular-nums">{Math.round(previousWeekAverage)}점</p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">잘했어요!</p>
        </div>
      )}

      <Link
        href={copy.ctaHref}
        onClick={() =>
          trackEvent("empty_state_cta_clicked", { variant, cta: copy.ctaKind })
        }
        className="inline-block min-h-[44px] rounded-md bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
      >
        {copy.cta}
      </Link>
    </section>
  );
}

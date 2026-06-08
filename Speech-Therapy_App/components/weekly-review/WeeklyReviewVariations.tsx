// FR-Q-LIT-02 — 주간 "이번 주 발음 패턴" 카드 (음운 변동 추이 요약).
//
// 부모용 — display-only. 채점/저장 무관 (lib/weekly-report.summarizeWeeklyVariations 입력).
// CON-04 의료 금칙어 0건 ("치료"/"진단"/"장애"/"지연"/"지체" 미사용) — 발달 격려 톤.
// R4: 자녀 식별 정보 0 — 추상 음운 패턴 라벨 + 빈도만.
// SSR 친화: 순수 presentation (use client 미사용 — re-hydration 비용 0).

import type { WeeklyVariationSummary } from "@/lib/weekly-report";

export interface WeeklyReviewVariationsProps {
  summary: WeeklyVariationSummary;
}

export function WeeklyReviewVariations({ summary }: WeeklyReviewVariationsProps) {
  // 탐지된 변동 없으면 미렌더 (page 측도 가드하나 방어적).
  if (summary.detectedSessions === 0) return null;
  const top = summary.topPatterns.slice(0, 3);

  return (
    <section
      data-testid="weekly-review-variations"
      aria-label="이번 주 발음 패턴"
      className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
    >
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        이번 주 자주 나온 발음 패턴
      </p>
      <ul className="mt-2 space-y-1" data-testid="weekly-review-variations-list">
        {top.map((p) => (
          <li
            key={p.label}
            className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300"
          >
            <span>{p.label}</span>
            <span className="tabular-nums text-slate-500 dark:text-slate-400">{p.count}회</span>
          </li>
        ))}
      </ul>
      {/* 발달 톤 — 모두 발달적이면 안심, 일부 비발달적이면 연습 격려 (금칙어 0). */}
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
        {summary.hasDelayed
          ? "미션으로 꾸준히 함께 연습하면 또렷해질 거예요."
          : "대부분 또래에서 흔히 거치는 단계예요. 잘하고 있어요!"}
      </p>
    </section>
  );
}

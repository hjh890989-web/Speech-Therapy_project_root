// FR-Q-012 — /predictions 예측 점수 상세 페이지 (EXP-2 검증).
//
// 흐름:
//   1. resolveUserId — 인증 / 익명 cookie (동일 패턴, /missions /reports 와 일치)
//   2. predictNextScore (FR-C-011) 호출
//   3. 이번 주 평균 (currentWeekAverage) 별도 집계 — 향상 폭 계산용
//   4. 분기:
//      - userId null → new_user EmptyState
//      - prediction null → EmptyState (4주 미만)
//      - 그 외 → PredictionDetailView
//
// CON-04 / R1: Disclaimer 2곳 강제 (상단 + 하단).

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ANONYMOUS_USER_COOKIE } from "@/lib/anonymous-user";
import {
  aggregateWeeklyScores,
  getCurrentWeekNumber,
} from "@/lib/weekly-report";
import { predictNextScore } from "@/app/actions/prediction";
import { ReportEmptyState } from "@/app/(public)/reports/ReportEmptyState";
import { PredictionDetailView } from "./PredictionDetailView";

export const metadata = {
  title: "다음 주 예상 — Speech-Therapy",
  description: "다음 주 발음 발달 예상 점수와 신뢰구간을 안내합니다. 의료적 평가가 아닌 발달 참고 자료입니다.",
};

export const dynamic = "force-dynamic";

async function resolveUserId(): Promise<string | undefined> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
  } catch {
    /* env 미설정 시 익명 폴백 */
  }
  const cookieStore = await cookies();
  return cookieStore.get(ANONYMOUS_USER_COOKIE)?.value;
}

export default async function PredictionsPage() {
  const userId = await resolveUserId();

  // 무로그인 — 즉시 new_user EmptyState.
  if (!userId) {
    return (
      <PageShell>
        <ReportEmptyState variant="new_user" weekSessionCount={0} />
      </PageShell>
    );
  }

  // 예측 + 이번 주 평균 병렬 fetch.
  const { year, week } = getCurrentWeekNumber();
  const [prediction, currentWeek] = await Promise.all([
    predictNextScore({ userId }).catch((err) => {
      console.error("predictions: predictNextScore failed", err);
      return null;
    }),
    aggregateWeeklyScores(userId, year, week),
  ]);

  // 데이터 부족 (4주 미만 또는 0건) — FR-Q-006 EmptyState 분기.
  if (prediction === null) {
    return (
      <PageShell>
        <ReportEmptyState variant="week_empty" weekSessionCount={currentWeek?.sessionCount ?? 0} />
      </PageShell>
    );
  }

  // 이번 주 종합 평균 — null 가능 (0건).
  const currentWeekAverage =
    currentWeek === null
      ? null
      : (currentWeek.articulationAvg + currentWeek.linguisticAvg + currentWeek.acousticAvg) / 3;

  return (
    <PageShell>
      <PredictionDetailView prediction={prediction} currentWeekAverage={currentWeekAverage} />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      {/* Disclaimer #1 — 상단 (R1 의료 규제 + 예측 보장 X 명시) */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 예상치는 보장이 아닌 발달 참고 자료입니다. 의료적 평가가 아닙니다.
      </p>

      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">다음 주 예상</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          직전 4주 추이를 바탕으로 다음 주 발달 점수를 추정해 보여드려요.
        </p>
      </header>

      {children}

      {/* Disclaimer #2 — 하단 (R1 강조) */}
      <p
        data-testid="disclaimer"
        className="mt-8 rounded-md border border-gray-200 px-4 py-3 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400"
      >
        예측은 보장이 아닙니다. 발달이 우려되는 경우 전문가 상담을 권장합니다.
      </p>
    </main>
  );
}

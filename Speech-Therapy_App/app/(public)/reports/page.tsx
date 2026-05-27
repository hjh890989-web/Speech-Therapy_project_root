// FR-Q-005 + FR-Q-006 — 주간 발달 추이 리포트 (실 데이터 + EmptyState 분기).
//
// 단순화 모드 (Sprint 1 이후) — Cron / DB-007 weekly_reports 없이 진입 시점 SQL 집계.
//
// 흐름:
//   1. resolveUserId() — 인증 / 익명 cookie 동일 패턴 (/missions, /rewards)
//   2. aggregateWeeklyScores(userId, year, week) — 본 주 evaluation_results 집계
//   3. lifetime + last session 조회 (assessDataSufficiency 입력)
//   4. assessDataSufficiency() → full / partial / insufficient
//   5. insufficient → ReportEmptyState 분기 (3 variants), 그 외 → 기존 차트 + 카드 UI
//   6. 익명 미사용자 = lifetime 0 → new_user EmptyState (mock 폴백 폐기)

import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ANONYMOUS_USER_COOKIE } from "@/lib/anonymous-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  aggregateWeeklyScores,
  assessDataSufficiency,
  computeWeekOverWeekDelta,
  getCurrentWeekNumber,
  previousWeek,
} from "@/lib/weekly-report";
import { predictNextScore } from "@/app/actions/prediction";
import { WeeklyReportChart } from "./WeeklyReportChart";
import { PrintButton } from "./PrintButton";
import { PredictionCard } from "./PredictionCard";
import { ReportEmptyState } from "./ReportEmptyState";
// F17-UI (V07) — 부모 본인 케어로그 입력 + 주간 요약.
import { ParentCareLogForm } from "@/components/parent-care-log/ParentCareLogForm";
import { loadParentCareLogWeeklySummary } from "@/lib/parent-care-log/weekly-summary";

export const metadata = {
  title: "주간 발달 리포트 — Speech-Therapy",
  description: "지난 한 주의 발음 발달 추이를 또래 비교와 함께 안내합니다.",
};

// cookie 가 client mount 이후 설정되므로 매 요청 fresh.
export const dynamic = "force-dynamic";

async function resolveUserId(): Promise<string | undefined> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
  } catch {
    // env 미설정 시 익명 폴백.
  }
  const cookieStore = await cookies();
  return cookieStore.get(ANONYMOUS_USER_COOKIE)?.value;
}

/**
 * F17-UI-B: 부모 케어로그 섹션은 인증 user 만 표시.
 * 익명 user (Server Action 이 401 반환) 에게는 폼 노출 안 함.
 */
async function isAuthenticated(): Promise<boolean> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return Boolean(data.user?.id);
  } catch {
    return false;
  }
}

interface LifetimeStats {
  lifetimeSessionCount: number;
  lastSessionDaysAgo: number | null;
}

async function fetchLifetimeStats(userId: string): Promise<LifetimeStats> {
  try {
    const [count, latest] = await Promise.all([
      prisma.evaluationResult.count({ where: { userId } }),
      prisma.evaluationResult.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);
    const lastSessionDaysAgo = latest
      ? Math.floor((Date.now() - latest.createdAt.getTime()) / 86_400_000)
      : null;
    return { lifetimeSessionCount: count, lastSessionDaysAgo };
  } catch (err) {
    console.error("reports: lifetime stats fetch failed", err);
    return { lifetimeSessionCount: 0, lastSessionDaysAgo: null };
  }
}

export default async function ReportsPage() {
  const userId = await resolveUserId();
  const { year, week: weekNumber } = getCurrentWeekNumber();

  // 익명 + 평생 0건 사용자 → 즉시 new_user EmptyState.
  if (!userId) {
    return (
      <PageShell year={year} weekNumber={weekNumber} sessionCount={0}>
        <ReportEmptyState variant="new_user" weekSessionCount={0} />
      </PageShell>
    );
  }

  const { year: prevYear, week: prevWeekNum } = previousWeek(year, weekNumber);
  const [weekAgg, lifetime, previousWeekAgg] = await Promise.all([
    aggregateWeeklyScores(userId, year, weekNumber),
    fetchLifetimeStats(userId),
    aggregateWeeklyScores(userId, prevYear, prevWeekNum),
  ]);
  const weekSessionCount = weekAgg?.sessionCount ?? 0;

  const { sufficiency, emptyVariant } = assessDataSufficiency({
    weekSessionCount,
    lastSessionDaysAgo: lifetime.lastSessionDaysAgo,
    lifetimeSessionCount: lifetime.lifetimeSessionCount,
  });

  // FR-Q-006 — insufficient 분기.
  if (sufficiency === "insufficient" || weekAgg === null) {
    const variant = emptyVariant ?? "new_user";
    return (
      <PageShell year={year} weekNumber={weekNumber} sessionCount={weekSessionCount}>
        <ReportEmptyState variant={variant} weekSessionCount={weekSessionCount} />
      </PageShell>
    );
  }

  // 정상 차트 분기 (partial / full).
  // FR-Q-005 Scenario 4 — 직전 주 평균과 비교한 WoW delta (실 집계).
  const wowDelta = computeWeekOverWeekDelta(weekAgg, previousWeekAgg);

  // FR-C-011 — Gemini 회귀 예측 (Server Action 호출, 4주 미만 시 null).
  // RateLimited / Gemini 실패 시 graceful null. Client 측 PredictionCard 가 분기 렌더.
  let initialPrediction = null;
  try {
    initialPrediction = await predictNextScore({ userId });
  } catch (err) {
    console.error("reports: predictNextScore failed", err);
  }

  return (
    <PageShell year={year} weekNumber={weekNumber} sessionCount={weekAgg.sessionCount}>
      <section className="mb-6 grid grid-cols-2 gap-3">
        {wowDelta != null ? (
          <article
            data-testid="wow-delta-card"
            className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
          >
            <p className="text-xs text-gray-600 dark:text-gray-400">직전 주 대비</p>
            <p
              className={`text-2xl font-bold ${
                wowDelta > 0
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {wowDelta > 0 ? `+${wowDelta}` : wowDelta}점{wowDelta > 0 ? " ↑" : ""}
            </p>
          </article>
        ) : (
          <article
            data-testid="wow-delta-card-empty"
            className="rounded-lg border border-dashed border-gray-200 p-4 dark:border-gray-700"
          >
            <p className="text-xs text-gray-600 dark:text-gray-400">직전 주 대비</p>
            <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">—</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">직전 주 기록 없음</p>
          </article>
        )}
        <PredictionCard
          initialPrediction={initialPrediction}
          weekNumber={weekNumber}
          userId={userId}
        />
      </section>

      <section className="mb-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <WeeklyReportChart scoreTrend={weekAgg.scoreTrend} />
      </section>

      <section className="mb-6 grid grid-cols-3 gap-3" aria-label="3축 평균">
        <Card label="조음 평균" value={Math.round(weekAgg.articulationAvg)} />
        <Card label="언어 평균" value={Math.round(weekAgg.linguisticAvg)} />
        <Card label="음향 평균" value={Math.round(weekAgg.acousticAvg)} />
      </section>

      {/* FR-Q-NEW-F17-UI (V07) — 부모 본인 케어로그 (인증 user 만 노출) */}
      <ParentCareLogSection userId={userId} />
    </PageShell>
  );
}

/**
 * F17-UI-A + B: 부모 본인 케어로그 섹션 — 주간 요약 + 입력 폼.
 *
 * - 인증 user 만 표시 (Server Action 이 익명 시 401 반환 — 폼 노출 의미 없음).
 * - 주간 요약: 직전 7일 합계 + kind 별 카운트 + 마지막 입력.
 * - 입력 폼: ParentCareLogForm (Client Component).
 *
 * R4: 자녀 식별 정보 미노출 — 메트릭 + label 만.
 */
async function ParentCareLogSection({ userId }: { userId: string }) {
  if (!(await isAuthenticated())) return null;

  const summary = await loadParentCareLogWeeklySummary(userId);
  return (
    <>
      <section
        className="mb-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
        aria-label="부모 직접 기록"
        data-testid="parent-care-log-summary"
      >
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          부모 직접 기록 — 직전 7일
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card
            label="가정 놀이"
            value={summary.byKind.parent_play ?? 0}
            data-testid="parent-care-log-count-play"
          />
          <Card
            label="외부 센터 세션"
            value={summary.byKind.parent_external_session ?? 0}
            data-testid="parent-care-log-count-external"
          />
          <Card
            label="총 기록"
            value={summary.totalCount}
            data-testid="parent-care-log-count-total"
          />
        </div>
        {summary.lastObservedAt && (
          <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
            마지막 입력:{" "}
            <time dateTime={summary.lastObservedAt.toISOString()}>
              {summary.lastObservedAt.toLocaleString("ko-KR")}
            </time>
          </p>
        )}
      </section>

      <section className="mb-6" aria-label="부모 기록 입력">
        <ParentCareLogForm />
      </section>
    </>
  );
}

function PageShell({
  year,
  weekNumber,
  sessionCount,
  children,
}: {
  year: number;
  weekNumber: number;
  sessionCount: number;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* Disclaimer #1 — 상단 */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 결과는 의료적 평가가 아닌 발달 참고 자료입니다.
      </p>

      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {year}년 {weekNumber}주차 발달 추이
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            지난 한 주 {sessionCount}회의 발화 결과를 안내해 드려요.
          </p>
        </div>
        <PrintButton />
      </header>

      {children}

      {/* Disclaimer #2 — 하단 */}
      <p
        data-testid="disclaimer"
        className="mt-6 rounded-md border border-gray-200 px-4 py-3 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400"
      >
        본 결과는 의료적 평가가 아니며, 발달이 우려되는 경우 전문가 상담을 권장합니다.
      </p>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link
          href="/missions"
          className="text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-300"
        >
          오늘의 미션으로 이어가기
        </Link>
        <Link
          href="/diagnose"
          className="text-gray-600 underline hover:text-gray-900 dark:text-gray-400"
        >
          새 발음 확인하기
        </Link>
      </div>
    </main>
  );
}

function Card({
  label,
  value,
  "data-testid": dataTestId,
}: {
  label: string;
  value: number;
  "data-testid"?: string;
}) {
  return (
    <article
      className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-700"
      data-testid={dataTestId}
    >
      <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </article>
  );
}

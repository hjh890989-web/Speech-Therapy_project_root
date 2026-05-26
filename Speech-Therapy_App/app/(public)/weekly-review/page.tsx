// FR-Q-WEEKLY-REVIEW — 부모용 weekly review 페이지 (Server Component).
//
// 책임:
//   1) Supabase auth → user.id 단건 조회. 비로그인 → redirect("/login?next=/weekly-review")
//      (다른 화면 — /reports, /predictions — 은 익명 cookie 폴백 허용하나, 본 화면은
//       retention surface 로서 로그인 사용자 전용 — 가입 인센티브 + cron 연동성 보장)
//   2) loadWeeklyReview(userId) — 본인 user.id 만 (R4 cross-user 차단)
//   3) hasData=false → 빈 상태 안내 + /diagnose CTA
//   4) hasData=true → 헤더 (자녀 월령 + 주차) + 3축 Summary + W-AUR + peerPercentile
//      + 다음 주 예측 카드 (predictedNextScore 있을 때만) + 4주 trend (history ≥ 1)
//      + 액션 버튼 (공유 / 다음 주 미션)
//   5) mount beacon: weekly_review_viewed 발송 (Strict Mode 가드)
//
// 접근 제어 (R4):
//   - 본인 user.id (Supabase auth) 만 사용 — URL search param 없음.
//   - share 본문 / UI 전반에 자녀 이름/email 노출 0건.
//
// 금칙어 (CON-04): "치료" / "진단" / "장애" 사용 금지.
//
// REQ-NF-004: RSC LCP ≤ 3,000ms — loader 는 단일 findMany 1회.

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCachedUser } from "@/lib/auth/cached-get-user";
import { prisma } from "@/lib/db";
import { loadWeeklyReview } from "@/lib/reports/weekly-review-loader";
import { getCurrentWeekNumber } from "@/lib/weekly-report";

import { WeeklyReviewSummary } from "@/components/weekly-review/WeeklyReviewSummary";
// Performance 감사 1차 — Recharts (~80KB gzip) dynamic import 는 본 컴포넌트
// 내부에서 `next/dynamic` 으로 처리한다 (WeeklyReviewTrend.tsx). page 측은 일반
// import 로 유지 — 기존 test mock (`vi.mock("@/components/weekly-review/WeeklyReviewTrend")`)
// 호환성 + 호출 측 단순성 보존.
import { WeeklyReviewTrend } from "@/components/weekly-review/WeeklyReviewTrend";
import { WeeklyReviewPrediction } from "@/components/weekly-review/WeeklyReviewPrediction";
import { WeeklyReviewShareButton } from "@/components/weekly-review/WeeklyReviewShareButton";
import { WeeklyReviewBeacon } from "@/components/weekly-review/WeeklyReviewBeacon";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "이번 주 리뷰 — Speech-Therapy",
  description:
    "지난 한 주의 발음 발달 결과와 다음 주 예상치를 부모님께 한눈에 안내합니다. 의학적 평가가 아닌 발달 참고 자료입니다.",
};

interface CurrentUser {
  userId: string;
  childAgeMonths: number | null;
}

async function loadCurrentUser(): Promise<CurrentUser | null> {
  // Performance: getCachedUser (React cache()) — layout 의 AuthHeader/MainNav 와 dedup.
  const user = await getCachedUser();
  if (!user) return null;
  const userId = user.id;

  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { childAgeMonths: true },
    });
    return { userId, childAgeMonths: row?.childAgeMonths ?? null };
  } catch (err) {
    console.error("weekly-review: user fetch failed", err);
    // 사용자 row 조회 실패 — childAgeMonths 만 미노출, page 자체는 진행.
    return { userId, childAgeMonths: null };
  }
}

export default async function WeeklyReviewPage() {
  const me = await loadCurrentUser();
  if (!me) {
    redirect("/login?next=/weekly-review");
  }

  const data = await loadWeeklyReview(me.userId);

  // FR-WEEKLY-UNREAD — 첫 열람 시각 기록. latest.viewedAt === null 일 때만 1회 UPDATE.
  // - R4: 본인 user.id + latest.id 만 사용 (page 단에서 보장).
  // - graceful: UPDATE 실패해도 페이지 렌더 차단 0 (badge 가 다음 요청에 다시 떴다가 다시 갱신될 뿐).
  // - parent 외 role 도 이 페이지에 들어올 수 있으나, nav badge 는 parent 만 — 다른 role 의 viewedAt 갱신은
  //   사이드이펙트 무해 (UPDATE 1건). cross-user 0건 (latest.userId === me.userId 가정).
  if (data.latest !== null && data.latest.viewedAt === null) {
    try {
      await prisma.weeklyReport.update({
        where: { id: data.latest.id },
        data: { viewedAt: new Date() },
      });
    } catch (err) {
      console.error("weekly-review: viewedAt update failed (graceful)", err);
    }
  }

  const { year: currentYear, week: currentWeek } = getCurrentWeekNumber();
  const displayWeekNumber = data.latest?.weekNumber ?? currentWeek;
  const displayYear = data.latest?.year ?? currentYear;

  // ---- 빈 상태 분기 (가입 직후 / cron 미실행) ----
  if (!data.hasData || data.latest === null) {
    return (
      <PageShell childAgeMonths={me.childAgeMonths} year={displayYear} weekNumber={displayWeekNumber}>
        <WeeklyReviewBeacon
          userId={me.userId}
          hasData={false}
          wAurAchieved={false}
          weekNumber={displayWeekNumber}
        />
        <section
          data-testid="weekly-review-empty"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
          aria-live="polite"
        >
          <h2 className="text-lg font-semibold">
            이번 주 데이터를 모으는 중이에요. 곧 만나요!
          </h2>
          <p className="mt-2 text-sm">
            첫 발음 확인을 시작하면 다음 주 일요일에 한 주 결과를 정리해 보여드릴게요.
          </p>
          <Link
            href="/diagnose"
            data-testid="weekly-review-empty-cta"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            발음 확인 시작하기
          </Link>
        </section>
      </PageShell>
    );
  }

  const latest = data.latest;
  const currentAvg =
    (latest.articulationAvg + latest.linguisticAvg + latest.acousticAvg) / 3;

  // 4주 trend chart 입력 — history desc → 시간 오름차순 변환 + latest 추가.
  // 의미 있는 추이는 ≥ 2주부터 — history 0건이면 chart 미렌더.
  const chartWeeks = [...data.history].reverse().concat([
    {
      id: latest.id,
      userId: latest.userId,
      year: latest.year,
      weekNumber: latest.weekNumber,
      articulationAvg: latest.articulationAvg,
      linguisticAvg: latest.linguisticAvg,
      acousticAvg: latest.acousticAvg,
      peerPercentileAvg: latest.peerPercentileAvg,
      sessionCount: latest.sessionCount,
      predictedNextScore: latest.predictedNextScore,
      predictionConfidence: latest.predictionConfidence,
      generatedAt: latest.generatedAt,
      scoreTrend: latest.scoreTrend,
      // FR-PERF-3-USE-SERVER-REFACTOR — pre-existing 타입 회귀 보정 (viewedAt 누락).
      // 본 chartWeeks 합성 시점에 latest 의 viewedAt 가 누락되어 WeeklyReviewRow 타입 어긋남.
      // 0121bc3 (viewedAt 컬럼 추가) 이후 본 literal 미동기화 — 본 PR 의 build 회복 위해 보정.
      viewedAt: latest.viewedAt ?? null,
    },
  ]);

  return (
    <PageShell
      childAgeMonths={me.childAgeMonths}
      year={displayYear}
      weekNumber={displayWeekNumber}
    >
      <WeeklyReviewBeacon
        userId={me.userId}
        hasData={true}
        wAurAchieved={data.wAurAchieved}
        weekNumber={displayWeekNumber}
      />

      {/* 1) 3축 요약 + W-AUR + peerPercentile */}
      <div className="mb-6">
        <WeeklyReviewSummary
          articulationAvg={latest.articulationAvg}
          linguisticAvg={latest.linguisticAvg}
          acousticAvg={latest.acousticAvg}
          peerPercentileAvg={latest.peerPercentileAvg}
          sessionCount={latest.sessionCount}
        />
      </div>

      {/* 2) 다음 주 예측 카드 — predictedNextScore null 이면 미렌더 */}
      {latest.predictedNextScore !== null && (
        <div className="mb-6">
          <WeeklyReviewPrediction
            predictedNextScore={latest.predictedNextScore}
            predictionConfidence={latest.predictionConfidence}
            currentAvg={currentAvg}
          />
        </div>
      )}

      {/* 3) 4주 trend chart — history 가 1주 이상 있을 때만 (즉 chartWeeks.length ≥ 2) */}
      {chartWeeks.length >= 2 && (
        <section
          aria-label="최근 주차 추이"
          className="mb-6 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
        >
          <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            최근 주차 추이
          </p>
          <WeeklyReviewTrend weeks={chartWeeks} />
        </section>
      )}

      {/* 4) 액션 — 공유 + 다음 주 미션 */}
      <section className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <WeeklyReviewShareButton
          articulationAvg={latest.articulationAvg}
          sessionCount={latest.sessionCount}
        />
        <Link
          href="/missions"
          data-testid="weekly-review-mission-cta"
          className="inline-flex min-h-[44px] items-center rounded-md border border-emerald-600 px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:border-emerald-400 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
        >
          다음 주 미션 보기 →
        </Link>
      </section>
    </PageShell>
  );
}

function PageShell({
  childAgeMonths,
  year,
  weekNumber,
  children,
}: {
  childAgeMonths: number | null;
  year: number;
  weekNumber: number;
  children: React.ReactNode;
}) {
  return (
    <main
      data-testid="weekly-review-page"
      className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12"
      aria-labelledby="weekly-review-heading"
    >
      {/* Disclaimer (상단) */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 결과는 의학적 평가가 아닌 발달 참고 자료입니다.
      </p>

      <header className="mb-6 space-y-1">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {year}년 {weekNumber}주차 리뷰
          {childAgeMonths !== null && (
            <span data-testid="weekly-review-child-age" className="ml-2">
              · 자녀 {childAgeMonths}개월
            </span>
          )}
        </p>
        <h1
          id="weekly-review-heading"
          className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100"
        >
          이번 주 리뷰
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          한 주 활동 결과를 부모님께 정리해 보여드려요. 이번 주도 수고하셨어요.
        </p>
      </header>

      {children}

      {/* Disclaimer (하단) */}
      <p
        data-testid="disclaimer"
        className="mt-8 rounded-md border border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400"
      >
        본 결과는 의학적 평가가 아니며, 발달이 우려되는 경우 전문가 상담을 권장합니다.
      </p>
    </main>
  );
}

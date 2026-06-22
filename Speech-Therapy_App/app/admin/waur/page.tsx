// 북극성 KPI W-AUR(주간 미션 완수율) 추세 대시보드 (Server Component).
//
// 배경: per-user WeeklyReport 는 있으나 owner 가 읽을 *집단 W-AUR rate* 표면이 없었음
//   (funnel-bottleneck-readiness 감사, 2026-06-03). 본 페이지가 라이브 집계로 그 갭을 채운다.
//
// 책임:
//   - 최근 12주 W-AUR(분자=미션 4회+ 완료 사용자 / 분모=주간 활성 사용자) 추세 + 60% 목표 대비.
//   - 현재(진행중) 주 제외 — 직전 주부터.
//
// 접근 제어: proxy.ts 가 /admin/* RBAC(admin/principal/expert) 이미 적용 — 본 페이지 추가 검사 X.
// R4: 모든 표시값은 집계 카운트/비율. userId/자녀 식별 정보 0건.
// CON-04: 카피에 "치료/진단/장애" 금칙어 0건("발음 확인" 표현).

import {
  getRecentWaurTrend,
  W_AUR_TARGET_RATE,
  type WaurWeek,
} from "@/lib/reports/waur-trend";
import { W_AUR_MIN_MISSIONS } from "@/lib/reports/weekly-aggregator";
import {
  getRecentWlerTrend,
  W_LER_MIN_DAYS,
  type WlerWeek,
} from "@/lib/reports/wler-trend";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "W-AUR 추세 — Speech-Therapy",
  description:
    "북극성 KPI 주간 미션 완수율(W-AUR)의 최근 12주 추세입니다. 관리자/원장/전문가 전용 화면.",
};

const TREND_WEEKS = 12;

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/// rate 대비 목표(60%) 배경/텍스트 색.
function rateClass(rate: number): string {
  if (rate >= W_AUR_TARGET_RATE) return "bg-emerald-50 text-emerald-800 font-semibold";
  if (rate >= W_AUR_TARGET_RATE * 0.66) return "text-amber-800";
  return "bg-rose-50 text-rose-800 font-semibold";
}

export default async function WaurTrendPage() {
  const trend = await getRecentWaurTrend(new Date(), TREND_WEEKS);
  const latest = trend[0];
  const hasData = trend.some((w) => w.activeUsers > 0);

  // 보조지표 W-LER(주간 문해 활동률, engagement) — ADR_NorthStar_2track (옵션 C 지향·A 1차).
  //   발음 W-AUR 과 별개 집계(문해 만2~12). 연습-only: target 없음(baseline 축적 중), 추세만.
  const wlerTrend = await getRecentWlerTrend(new Date(), TREND_WEEKS);
  const wlerLatest = wlerTrend[0];
  const wlerHasData = wlerTrend.some((w) => w.activeUsers > 0);

  return (
    <main
      data-testid="admin-waur-page"
      className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10"
      aria-labelledby="waur-heading"
    >
      <header className="mb-6">
        <h1 id="waur-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl">
          주간 미션 완수율 (W-AUR) 추세
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          북극성 KPI — 주 {W_AUR_MIN_MISSIONS}회 이상 미션을 완료한 사용자 비율입니다.
          목표는 <strong>{formatPercent(W_AUR_TARGET_RATE)}</strong> 이상. 최근 {TREND_WEEKS}주
          (현재 진행 중인 주 제외) 추이입니다.
        </p>
      </header>

      {!hasData ? (
        <section
          data-testid="waur-empty-state"
          aria-label="데이터 없음"
          className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700"
        >
          <p className="mb-2 font-semibold text-slate-900">최근 {TREND_WEEKS}주 활성 사용자 없음</p>
          <p>아직 집계할 활동(발음 확인 / 미션 완료)이 없어요. 데이터가 쌓이면 추세가 표시됩니다.</p>
        </section>
      ) : (
        <>
          {/* 최신 주 강조 카드 */}
          <section aria-labelledby="latest-heading" className="mb-8">
            <h2 id="latest-heading" className="sr-only">
              최신 주 W-AUR
            </h2>
            <div
              data-testid="waur-latest-card"
              className={`rounded-lg border-2 p-5 ${
                latest.rate >= W_AUR_TARGET_RATE
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-amber-400 bg-amber-50"
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                최신 주 ({latest.year}-W{latest.week})
              </p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-slate-900">
                {formatPercent(latest.rate)}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                미션 {W_AUR_MIN_MISSIONS}회+ 완료 {latest.achievedUsers}명 / 활성{" "}
                {latest.activeUsers}명 · 목표 {formatPercent(W_AUR_TARGET_RATE)}
                {latest.rate >= W_AUR_TARGET_RATE ? " 달성 🎉" : " 미달"}
              </p>
            </div>
          </section>

          {/* 추세 표 */}
          <section aria-labelledby="trend-heading">
            <h2 id="trend-heading" className="mb-3 text-lg font-semibold text-slate-900">
              주별 추세 (최신 → 과거)
            </h2>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table
                data-testid="waur-trend-table"
                className="w-full min-w-[480px] text-left text-sm"
              >
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2">주차</th>
                    <th scope="col" className="px-3 py-2">활성 사용자</th>
                    <th scope="col" className="px-3 py-2">달성 (미션 {W_AUR_MIN_MISSIONS}회+)</th>
                    <th scope="col" className="px-3 py-2">W-AUR</th>
                    <th scope="col" className="px-3 py-2">목표 대비</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((w: WaurWeek) => (
                    <tr
                      key={`${w.year}-${w.week}`}
                      data-testid={`waur-row-${w.year}-${w.week}`}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {w.year}-W{w.week}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">
                        {w.activeUsers}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">
                        {w.achievedUsers}
                      </td>
                      <td className={`px-3 py-2 ${rateClass(w.rate)}`}>
                        <span data-testid={`waur-rate-${w.year}-${w.week}`}>
                          {formatPercent(w.rate)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {w.rate >= W_AUR_TARGET_RATE ? "✅ 달성" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <footer
        aria-label="안내"
        className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"
      >
        <p className="mb-1 font-semibold text-slate-800">집계 정책</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            분자 = 그 주 미션 <strong>{W_AUR_MIN_MISSIONS}회 이상 완료</strong>(SessionLog
            durationSec&gt;0) distinct 사용자.
          </li>
          <li>
            분모 = 그 주 <strong>활성 distinct 사용자</strong> = 발음 확인(EvaluationResult) ∪
            미션 완료 사용자. (cron 의 진단-게이팅 분모와 달리 미션전용 사용자 포함 — 더 정확.)
          </li>
          <li>현재 진행 중인 주는 제외 — 직전 주부터 {TREND_WEEKS}주. 라이브 집계(과거 주 raw 안정).</li>
          <li>자녀 식별 정보 0건 — 모든 표시값은 집계 카운트 + 비율.</li>
          <li>activation funnel(/admin/funnel)은 단일 완료까지 — retention 은 본 W-AUR 표면에서 확인.</li>
        </ul>
      </footer>

      {/* ── 보조지표: W-LER (주간 문해 활동률, engagement) — ADR_NorthStar_2track ── */}
      <section
        data-testid="wler-section"
        aria-labelledby="wler-heading"
        className="mt-10 border-t border-slate-200 pt-8"
      >
        <h2 id="wler-heading" className="text-xl font-bold text-slate-900 sm:text-2xl">
          주간 문해 활동률 (W-LER){" "}
          <span className="text-sm font-normal text-slate-500">· 보조지표</span>
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          읽기·말 놀이 트랙(만 2~12세)의 주간 <strong>활동 참여(engagement)</strong> 지표입니다.
          점수·완수율이 아니라 — 그 주 서로 다른 날 <strong>{W_LER_MIN_DAYS}일 이상</strong> 놀이한
          사용자 비율이에요. baseline 축적 중이라 목표선은 아직 없습니다(추세만).
        </p>

        {!wlerHasData ? (
          <div
            data-testid="wler-empty-state"
            aria-label="문해 활동 데이터 없음"
            className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700"
          >
            <p className="mb-2 font-semibold text-slate-900">
              최근 {TREND_WEEKS}주 문해 활동 없음
            </p>
            <p>아직 집계할 읽기·말 놀이 활동이 없어요. 데이터가 쌓이면 활동률 추세가 표시됩니다.</p>
          </div>
        ) : (
          <>
            <div
              data-testid="wler-latest-card"
              className="mt-4 rounded-lg border-2 border-violet-300 bg-violet-50 p-5"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                최신 주 ({wlerLatest.year}-W{wlerLatest.week}) · 보조지표
              </p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-slate-900">
                {formatPercent(wlerLatest.rate)}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                활동일 {W_LER_MIN_DAYS}일+ 참여 {wlerLatest.engagedUsers}명 / 문해 활동{" "}
                {wlerLatest.activeUsers}명 · 활동 참여(engagement)
              </p>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table
                data-testid="wler-trend-table"
                className="w-full min-w-[420px] text-left text-sm"
              >
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2">주차</th>
                    <th scope="col" className="px-3 py-2">문해 활동 사용자</th>
                    <th scope="col" className="px-3 py-2">참여 (활동일 {W_LER_MIN_DAYS}일+)</th>
                    <th scope="col" className="px-3 py-2">W-LER</th>
                  </tr>
                </thead>
                <tbody>
                  {wlerTrend.map((w: WlerWeek) => (
                    <tr
                      key={`${w.year}-${w.week}`}
                      data-testid={`wler-row-${w.year}-${w.week}`}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {w.year}-W{w.week}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">
                        {w.activeUsers}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">
                        {w.engagedUsers}
                      </td>
                      <td className="px-3 py-2 text-slate-800">
                        <span data-testid={`wler-rate-${w.year}-${w.week}`}>
                          {formatPercent(w.rate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              ⚠️ W-LER 은 <strong>활동 참여(engagement)</strong> 지표입니다 — 발음 W-AUR(미션 완수율)과
              달리 점수·또래 비교·판정을 산출하지 않아요. 목표값은 baseline 확보 후 산정합니다.
            </p>
          </>
        )}
      </section>
    </main>
  );
}

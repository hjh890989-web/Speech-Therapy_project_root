// FR-Q-005~007 — 주간 발달 추이 리포트 (Sprint 1 DEMO 모드).
//
// Sprint 1 한계:
// - 무로그인 사용자 → user.id cookie 추적 미구현 → mock 데이터 표시
// - 실 데이터 연결은 API-010 (Auth) 또는 cookie 기반 anonymousId 추적 후 별도 PR
//
// 본 페이지가 보여주는 것:
// - 주간 추이 LineChart (Recharts, Client Component)
// - week-over-week 변동 + 예측 점수
// - "PDF 로 저장" (window.print() 활용)
// - 데이터 부족 시 EmptyState 분기 (FR-Q-006 — 본 데모에선 미사용)
// - Disclaimer 2중

import Link from "next/link";
import { mockWeeklyReportPayload } from "@/lib/mocks/weekly-report";
import { WeeklyReportChart } from "./WeeklyReportChart";
import { PrintButton } from "./PrintButton";

export const metadata = {
  title: "주간 발달 리포트 — Speech-Therapy",
  description: "지난 한 주의 발음 발달 추이를 또래 비교와 함께 안내합니다.",
};

export default function ReportsPage() {
  const report = mockWeeklyReportPayload;

  // week-over-week 변동 (단순화 데모: 5점 상승 가정).
  const wowDelta = 5;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* Disclaimer #1 — 상단 */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 결과는 의료적 판단이 아닌 발달 참고 자료입니다.
      </p>

      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {report.year}년 {report.weekNumber}주차 발달 추이
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            지난 한 주 {report.sessionCount}회의 발화 결과를 안내해 드려요.
          </p>
        </div>
        <PrintButton />
      </header>

      {/* week-over-week 변동 + 예측 점수 */}
      <section className="mb-6 grid grid-cols-2 gap-3">
        <article className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400">직전 주 대비</p>
          <p
            className={`text-2xl font-bold ${
              wowDelta >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-gray-600"
            }`}
          >
            {wowDelta >= 0 ? `+${wowDelta}` : wowDelta}점 {wowDelta >= 0 ? "↑" : ""}
          </p>
        </article>
        <article className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400">다음 주 예상</p>
          <p className="text-2xl font-bold tabular-nums">
            {report.predictedNextScore != null ? Math.round(report.predictedNextScore) : "—"}점
          </p>
          {report.predictionConfidence != null && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              신뢰도 {Math.round(report.predictionConfidence * 100)}%
            </p>
          )}
        </article>
      </section>

      {/* 주간 추이 차트 */}
      <section className="mb-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <WeeklyReportChart scoreTrend={report.scoreTrend} />
      </section>

      {/* 3축 평균 */}
      <section className="mb-6 grid grid-cols-3 gap-3" aria-label="3축 평균">
        <Card label="조음 평균" value={Math.round(report.articulationAvg)} />
        <Card label="언어 평균" value={Math.round(report.linguisticAvg)} />
        <Card label="음향 평균" value={Math.round(report.acousticAvg)} />
      </section>

      <p className="mb-6 text-xs text-gray-500 dark:text-gray-400">
        ※ Sprint 1 데모 데이터입니다. 회원 가입 후 실제 발화 결과가 본 페이지에 반영될 예정이에요.
      </p>

      {/* Disclaimer #2 — 하단 */}
      <p
        data-testid="disclaimer"
        className="rounded-md border border-gray-200 px-4 py-3 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400"
      >
        본 결과는 의료적 판단이 아니며, 발달이 우려되는 경우 전문가 상담을 권장합니다.
      </p>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/missions" className="text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-300">
          오늘의 미션으로 이어가기
        </Link>
        <Link href="/diagnose" className="text-gray-600 underline hover:text-gray-900 dark:text-gray-400">
          새 진단 시도
        </Link>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-700">
      <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </article>
  );
}

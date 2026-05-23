// FR-Q-009 (#50) — 원장 대시보드 요약 카드 4종 (Server Component).
//
// 책임: 단순 데이터 표시 — 로직 0. 부모 page.tsx 가 loadPrincipalDashboard 결과 prop 전달.
// R4 보호: userId / 자녀 식별 정보 prop 미수신 — 집계 카운트 + 평균만.
// 금칙어 (CON-04): "치료" / "진단" / "장애" 사용 금지. "발음 확인 / 발달 점수" 로 표현.

import type { PrincipalDashboardData } from "@/lib/admin/principal-aggregator";

export interface StatsCardsProps {
  data: Pick<
    PrincipalDashboardData,
    "classCount" | "studentCount" | "thisWeekDiagnoseCount" | "articulationAvg"
  >;
}

interface CardSpec {
  testid: string;
  label: string;
  value: string;
  hint: string;
}

function formatScore(value: number | null): string {
  if (value === null) return "-";
  return value.toFixed(1);
}

export function StatsCards({ data }: StatsCardsProps) {
  const cards: CardSpec[] = [
    {
      testid: "stats-card-class-count",
      label: "반 수",
      value: `${data.classCount}`,
      hint: "현재 등록된 반",
    },
    {
      testid: "stats-card-student-count",
      label: "등록 원아 수",
      value: `${data.studentCount}`,
      hint: "보호자 계정 기준",
    },
    {
      testid: "stats-card-week-count",
      label: "이번 주 발음 확인",
      value: `${data.thisWeekDiagnoseCount}`,
      hint: "최근 7일 누적",
    },
    {
      testid: "stats-card-avg-score",
      label: "평균 발음 점수",
      value: formatScore(data.articulationAvg),
      hint: "최근 7일 articulation 평균",
    },
  ];

  return (
    <section
      data-testid="principal-stats-cards"
      aria-labelledby="stats-heading"
      className="mb-8"
    >
      <h2 id="stats-heading" className="mb-3 text-lg font-semibold text-slate-900">
        기관 요약
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {cards.map((card) => (
          <article
            key={card.testid}
            data-testid={card.testid}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <dl>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {card.label}
              </dt>
              <dd className="mt-1 text-2xl font-bold text-slate-900">
                <span data-testid={`${card.testid}-value`}>{card.value}</span>
              </dd>
              <dd className="mt-1 text-xs text-slate-500">{card.hint}</dd>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

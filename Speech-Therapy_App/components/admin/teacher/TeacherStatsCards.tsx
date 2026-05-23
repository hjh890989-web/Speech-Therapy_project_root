// FR-Q-TEACHER — 선생님 대시보드 요약 카드 4종 (Server Component).
//
// 책임: 단순 데이터 표시 — 로직 0. 부모 page.tsx 가 loadTeacherDashboard 결과 prop 전달.
// R4 보호: userId / 자녀 식별 정보 prop 미수신 — 집계 카운트 + 평균만.
// CON-04 (의료 금칙어): "치료" / "진단" / "장애" 사용 금지. "발음 확인 / 발달 점수" 로 표현.
// principal StatsCards 와 패턴 일치 — 카드 4개 grid 2x2 / sm:1x4.

import type { TeacherDashboardData } from "@/lib/admin/teacher-aggregator";

export interface TeacherStatsCardsProps {
  data: Pick<
    TeacherDashboardData,
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

export function TeacherStatsCards({ data }: TeacherStatsCardsProps) {
  const cards: CardSpec[] = [
    {
      testid: "teacher-stats-card-class-count",
      label: "담당 반 수",
      value: `${data.classCount}`,
      hint: "본인이 담임으로 지정된 반",
    },
    {
      testid: "teacher-stats-card-student-count",
      label: "담당 원아 수",
      value: `${data.studentCount}`,
      hint: "보호자 계정 기준",
    },
    {
      testid: "teacher-stats-card-week-count",
      label: "이번 주 발음 확인",
      value: `${data.thisWeekDiagnoseCount}`,
      hint: "최근 7일 누적",
    },
    {
      testid: "teacher-stats-card-avg-score",
      label: "평균 발음 점수",
      value: formatScore(data.articulationAvg),
      hint: "최근 7일 articulation 평균",
    },
  ];

  return (
    <section
      data-testid="teacher-stats-cards"
      aria-labelledby="teacher-stats-heading"
      className="mb-8"
    >
      <h2 id="teacher-stats-heading" className="mb-3 text-lg font-semibold text-slate-900">
        담당 반 요약
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

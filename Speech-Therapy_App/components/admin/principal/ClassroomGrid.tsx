// FR-Q-009 (#50) — 원장 대시보드 반(class) 단위 카드 그리드 (Server Component).
//
// 책임: ClassroomSummary[] 를 grid 로 렌더. 단일 책임 (표시만).
// R4 보호: userId / 자녀 식별 정보 prop 미수신 — class.id / name / 집계 카운트만.
// 금칙어 (CON-04): "치료" / "진단" / "장애" 사용 금지.
// 빈 데이터 fallback: 호출 측 (page.tsx) 이 classroomsEmpty 분기 후 본 컴포넌트 미렌더.

import type { ClassroomSummary } from "@/lib/admin/principal-aggregator";

export interface ClassroomGridProps {
  classrooms: ClassroomSummary[];
}

function formatScore(value: number | null): string {
  if (value === null) return "-";
  return value.toFixed(1);
}

export function ClassroomGrid({ classrooms }: ClassroomGridProps) {
  return (
    <section
      data-testid="principal-classroom-grid"
      aria-labelledby="classrooms-heading"
      className="mb-8"
    >
      <h2 id="classrooms-heading" className="mb-3 text-lg font-semibold text-slate-900">
        반 단위 발달 현황
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {classrooms.map((cls) => (
          <article
            key={cls.id}
            data-testid={`classroom-card-${cls.id}`}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <header className="mb-2 flex items-baseline justify-between">
              <h3
                data-testid="classroom-name"
                className="text-base font-semibold text-slate-900"
              >
                {cls.name}
              </h3>
              <span className="text-xs text-slate-500">
                원아 <span data-testid="classroom-student-count">{cls.studentCount}</span>명
              </span>
            </header>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">최근 7일 발음 확인</dt>
                <dd data-testid="classroom-diagnose-count" className="font-mono text-slate-800">
                  {cls.diagnoseCount}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">평균 발음 점수</dt>
                <dd data-testid="classroom-avg-score" className="font-mono text-slate-800">
                  {formatScore(cls.avgScore)}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

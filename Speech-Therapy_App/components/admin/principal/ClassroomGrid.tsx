// FR-Q-009 (#50) — 원장 대시보드 반(class) 단위 카드 그리드 (Server Component).
//
// 책임: ClassroomSummary[] 를 grid 로 렌더. 단일 책임 (표시만).
// R4 보호:
//   - class.id / name / 집계 카운트는 prop 그대로 표시 (식별 정보 아님).
//   - cls.students[].id (UUID) 는 StudentRow 가 4자리 truncate 표기 + tooltip 으로만 풀길이 노출.
// 금칙어 (CON-04): "치료" / "진단" / "장애" 사용 금지.
// 빈 데이터 fallback: 호출 측 (page.tsx) 이 classroomsEmpty 분기 후 본 컴포넌트 미렌더.
//
// FR-Q-009 후속 — 자녀별 timeline/PDF navigation:
//   각 반 카드 안에 <details> disclosure 로 학생 목록(StudentRow) 노출.
//   - 기본 닫힘 (정보 밀도 우선, 운영자 톤).
//   - cls.studentCount 0건 → details 자체 미렌더 (펼칠 게 없음).
//   - cursor 페이지네이션: aggregator 가 hasMoreStudents=true 일 때 안내 메시지 노출.
//     본 PR 은 서버 side cursor 지원 + UI 안내만 — 실제 cursor 진입 UI (다음 페이지 버튼)
//     는 후속 PR (search param Server Component 재 fetch).

import type { ClassroomSummary } from "@/lib/admin/principal-aggregator";

import { StudentRow } from "./StudentRow";

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
        {classrooms.map((cls) => {
          const hasStudents = cls.students.length > 0;
          return (
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
              {hasStudents ? (
                <details
                  data-testid={`classroom-students-disclosure-${cls.id}`}
                  className="mt-3 rounded border border-slate-200 bg-white"
                >
                  <summary className="cursor-pointer select-none rounded px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    원아 목록 펼치기 ({cls.students.length}명)
                  </summary>
                  <ul
                    data-testid={`classroom-students-list-${cls.id}`}
                    className="mt-2 flex flex-col gap-1 px-2 pb-2"
                  >
                    {cls.students.map((s) => (
                      <StudentRow key={s.id} student={s} />
                    ))}
                  </ul>
                  {cls.hasMoreStudents ? (
                    <p
                      data-testid={`classroom-students-more-${cls.id}`}
                      className="px-2 pb-2 text-[11px] text-slate-500"
                      role="note"
                    >
                      원아가 30명을 넘어서 일부만 표시되었어요. 더 많은 원아 보기는
                      후속 업데이트에서 지원될 예정이에요.
                    </p>
                  ) : null}
                </details>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

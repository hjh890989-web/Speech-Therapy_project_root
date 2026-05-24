// FR-Q-TEACHER — 선생님 대시보드 반(class) 단위 카드 그리드 (Server Component).
//
// 책임: TeacherClassroomSummary[] 를 grid 로 렌더 + <details> disclosure 로 학생 목록 펼치기.
// R4 보호:
//   - class.id / name / 집계 카운트는 prop 그대로 표시.
//   - cls.students[].id 는 StudentRow (principal 재사용) 가 4자리 truncate 표기 + tooltip.
// CON-04 (의료 금칙어): "치료" / "진단" / "장애" 사용 금지.
// principal ClassroomGrid 와 패턴 일치 — StudentRow 재사용 (commit 36444f7).

import type { TeacherClassroomSummary } from "@/lib/admin/teacher-aggregator";

import { StudentRow } from "@/components/admin/principal/StudentRow";
import { SendClassroomCushionButton } from "@/components/admin/teacher/SendClassroomCushionButton";

export interface TeacherClassroomGridProps {
  classrooms: TeacherClassroomSummary[];
}

function formatScore(value: number | null): string {
  if (value === null) return "-";
  return value.toFixed(1);
}

export function TeacherClassroomGrid({ classrooms }: TeacherClassroomGridProps) {
  return (
    <section
      data-testid="teacher-classroom-grid"
      aria-labelledby="teacher-classrooms-heading"
      className="mb-8"
    >
      <h2
        id="teacher-classrooms-heading"
        className="mb-3 text-lg font-semibold text-slate-900"
      >
        담당 반 발달 현황
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {classrooms.map((cls) => {
          const hasStudents = cls.students.length > 0;
          return (
            <article
              key={cls.id}
              data-testid={`teacher-classroom-card-${cls.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <header className="mb-2 flex items-baseline justify-between">
                <h3
                  data-testid="teacher-classroom-name"
                  className="text-base font-semibold text-slate-900"
                >
                  {cls.name}
                </h3>
                <span className="text-xs text-slate-500">
                  원아{" "}
                  <span data-testid="teacher-classroom-student-count">
                    {cls.studentCount}
                  </span>
                  명
                </span>
              </header>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600">최근 7일 발음 확인</dt>
                  <dd
                    data-testid="teacher-classroom-diagnose-count"
                    className="font-mono text-slate-800"
                  >
                    {cls.diagnoseCount}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">평균 발음 점수</dt>
                  <dd
                    data-testid="teacher-classroom-avg-score"
                    className="font-mono text-slate-800"
                  >
                    {formatScore(cls.avgScore)}
                  </dd>
                </div>
              </dl>
              {hasStudents ? (
                <>
                  <details
                    data-testid={`teacher-classroom-students-disclosure-${cls.id}`}
                    className="mt-3 rounded border border-slate-200 bg-white"
                  >
                    <summary className="cursor-pointer select-none rounded px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      원아 목록 펼치기 ({cls.students.length}명)
                    </summary>
                    <ul
                      data-testid={`teacher-classroom-students-list-${cls.id}`}
                      className="mt-2 flex flex-col gap-1 px-2 pb-2"
                    >
                      {cls.students.map((s) => (
                        <StudentRow key={s.id} student={s} />
                      ))}
                    </ul>
                    {cls.hasMoreStudents ? (
                      <p
                        data-testid={`teacher-classroom-students-more-${cls.id}`}
                        className="px-2 pb-2 text-[11px] text-slate-500"
                        role="note"
                      >
                        원아가 30명을 넘어서 일부만 표시되었어요. 더 많은 원아
                        보기는 후속 업데이트에서 지원될 예정이에요.
                      </p>
                    ) : null}
                  </details>
                  {/* FR-Q-TEACHER + FR-C-017+ — 반 단위 학부모 알림장 일괄 발송 (학생 0명 반 미노출). */}
                  <SendClassroomCushionButton
                    classId={cls.id}
                    studentCount={cls.students.length}
                  />
                </>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

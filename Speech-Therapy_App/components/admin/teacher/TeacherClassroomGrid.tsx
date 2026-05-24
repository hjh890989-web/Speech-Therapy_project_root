// FR-Q-TEACHER — 선생님 대시보드 반(class) 단위 카드 그리드 (Server Component).
//
// 책임: TeacherClassroomSummary[] 를 grid 로 렌더 + <details> disclosure 로 학생 목록 펼치기.
// R4 보호:
//   - class.id / name / 집계 카운트는 prop 그대로 표시.
//   - cls.students[].id 는 StudentRow (principal 재사용) 가 4자리 truncate 표기 + tooltip.
// CON-04 (의료 금칙어): "치료" / "진단" / "장애" 사용 금지.
// principal ClassroomGrid 와 패턴 일치 — StudentRow 재사용 (commit 36444f7).
//
// 9f204cd 후속 — cursor 페이지네이션 UI 진입 (본 PR):
//   - aggregator 가 hasMoreStudents=true + nextStudentsCursor 를 반환 → "더 보기" Link 노출
//     (URL search param `students_cursor` 갱신 → RSC 재 fetch).
//   - 현재 backend 는 단일 cursor 가 모든 반에 동일 적용 — 본 UI 도 동일 (반별 cursor 분리는 후속 PR).
//   - 페이지가 cursor 있는 상태로 진입 시 grid 상단에 "처음으로" Link 노출.

import Link from "next/link";

import type { TeacherClassroomSummary } from "@/lib/admin/teacher-aggregator";

import { StudentRow } from "@/components/admin/principal/StudentRow";
import { SendClassroomCushionButton } from "@/components/admin/teacher/SendClassroomCushionButton";

export interface TeacherClassroomGridProps {
  classrooms: TeacherClassroomSummary[];
  /**
   * 현재 페이지 진입이 cursor 가 있는 "다음 페이지" 인가?
   *   - true → 상단에 "처음으로" Link 노출 (cursor 없는 첫 페이지 복귀).
   *   - false → 첫 페이지 진입.
   * 기본 false.
   */
  hasCursor?: boolean;
}

function formatScore(value: number | null): string {
  if (value === null) return "-";
  return value.toFixed(1);
}

export function TeacherClassroomGrid({
  classrooms,
  hasCursor = false,
}: TeacherClassroomGridProps) {
  // 단일 cursor 정책 — 첫 번째로 발견된 nextStudentsCursor 를 "더 보기" Link href 에 사용.
  // (현재 backend 도 단일 cursor 가 모든 반에 동일 적용 — 반별 분리는 후속 PR).
  const nextCursorClass = classrooms.find(
    (c) => c.hasMoreStudents && typeof c.nextStudentsCursor === "string",
  );
  const nextCursor = nextCursorClass?.nextStudentsCursor;
  const hasNextPage = Boolean(nextCursor);

  return (
    <section
      data-testid="teacher-classroom-grid"
      aria-labelledby="teacher-classrooms-heading"
      className="mb-8"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="teacher-classrooms-heading"
          className="text-lg font-semibold text-slate-900"
        >
          담당 반 발달 현황
        </h2>
        {hasCursor ? (
          <Link
            href="/admin/teacher"
            data-testid="teacher-students-cursor-reset"
            className="inline-flex min-h-[36px] items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            처음으로
          </Link>
        ) : null}
      </div>
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
      {hasNextPage && nextCursor ? (
        <div className="mt-4 flex justify-center">
          <Link
            href={{ pathname: "/admin/teacher", query: { students_cursor: nextCursor } }}
            data-testid="teacher-students-cursor-next"
            className="inline-flex min-h-[44px] items-center rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            더 보기
          </Link>
        </div>
      ) : null}
    </section>
  );
}

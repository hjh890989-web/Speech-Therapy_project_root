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
//
// FR-DASH-CURSOR-PER-CLASSROOM (본 PR) — 반별 cursor 분리 UI:
//   - 각 반 카드 안에 "더 보기" Link 노출 (hasMoreStudents=true 일 때만).
//     · href 는 OTHER classrooms 의 cursor 를 보존 + 현재 반의 nextStudentsCursor 만 갱신.
//   - 각 반 카드 안에 "처음으로" Link 노출 (해당 반에 현재 cursor 적용된 상태일 때만).
//     · href 는 OTHER classrooms 의 cursor 를 보존 + 현재 반의 cursor 만 제거.
//   - 모든 cursor 가 제거된 첫 페이지 진입 시 "처음으로" 미노출 (불필요).

import Link from "next/link";

import type { ClassroomSummary } from "@/lib/admin/principal-aggregator";

import { StudentRow } from "./StudentRow";

export interface ClassroomGridProps {
  classrooms: ClassroomSummary[];
  /**
   * 현재 페이지에 적용된 반별 cursor 맵 (Record<classroomId, cursor>).
   * "더 보기" / "처음으로" Link URL 생성 시 OTHER classrooms 의 cursor 를 보존하기 위해 사용.
   */
  studentsCursors?: Record<string, string>;
  /**
   * 임의의 반에 cursor 가 1개라도 적용되어 있는지 — true 면 grid 상단에 "전체 처음으로"
   * Link 노출 (모든 반 cursor 동시 제거). 반별 "처음으로" 와는 별도.
   */
  hasAnyCursor?: boolean;
}

function formatScore(value: number | null): string {
  if (value === null) return "-";
  return value.toFixed(1);
}

/**
 * OTHER classrooms 의 cursor 를 보존한 채 currentClassroomId 의 cursor 만 갱신/제거.
 *   - newCursor=undefined → 해당 반 cursor 제거.
 *   - newCursor=string → 해당 반 cursor 갱신.
 * 결과 query 는 다른 반의 cursor 키들을 그대로 유지.
 */
function buildCursorQuery(
  current: Record<string, string>,
  classroomId: string,
  newCursor: string | undefined,
): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [otherId, cursor] of Object.entries(current)) {
    if (otherId === classroomId) continue;
    query[`students_cursor_${otherId}`] = cursor;
  }
  if (newCursor !== undefined) {
    query[`students_cursor_${classroomId}`] = newCursor;
  }
  return query;
}

export function ClassroomGrid({
  classrooms,
  studentsCursors = {},
  hasAnyCursor = false,
}: ClassroomGridProps) {
  return (
    <section
      data-testid="principal-classroom-grid"
      aria-labelledby="classrooms-heading"
      className="mb-8"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 id="classrooms-heading" className="text-lg font-semibold text-slate-900">
          반 단위 발달 현황
        </h2>
        {hasAnyCursor ? (
          <Link
            href="/admin/principal"
            data-testid="principal-students-cursor-reset"
            className="inline-flex min-h-[36px] items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            전체 처음으로
          </Link>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {classrooms.map((cls) => {
          const hasStudents = cls.students.length > 0;
          const classHasCursor = typeof studentsCursors[cls.id] === "string";
          const showNext = cls.hasMoreStudents && typeof cls.nextStudentsCursor === "string";
          const nextQuery = showNext
            ? buildCursorQuery(studentsCursors, cls.id, cls.nextStudentsCursor)
            : null;
          const resetQuery = classHasCursor
            ? buildCursorQuery(studentsCursors, cls.id, undefined)
            : null;
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
                </details>
              ) : null}
              {showNext && nextQuery ? (
                <div className="mt-3 flex justify-end">
                  <Link
                    href={{ pathname: "/admin/principal", query: nextQuery }}
                    data-testid={`principal-students-cursor-next-${cls.id}`}
                    className="inline-flex min-h-[36px] items-center rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
                  >
                    더 보기
                  </Link>
                </div>
              ) : null}
              {classHasCursor && resetQuery ? (
                <div className="mt-2 flex justify-end">
                  <Link
                    href={
                      Object.keys(resetQuery).length === 0
                        ? "/admin/principal"
                        : { pathname: "/admin/principal", query: resetQuery }
                    }
                    data-testid={`principal-students-cursor-reset-${cls.id}`}
                    className="inline-flex min-h-[32px] items-center rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    이 반 처음으로
                  </Link>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

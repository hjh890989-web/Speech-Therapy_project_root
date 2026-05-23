// FR-Q-009 (#50) 후속 — 원장 대시보드 → 자녀별 timeline/PDF navigation 진입 행 (Server Component).
//
// 책임:
//   - 1명 원아(보호자 계정) 단위 1행 표시 + 두 가지 진입 링크
//     · 타임라인 보기 → /admin/timeline/[userId]
//     · 센터 제출용 PDF → /admin/centers/pdf/[userId]
//   - displayName: studentId 의 앞 4자리 truncate 표기 (R4 — 풀길이 미노출, tooltip 만 풀길이).
//
// R4 (자녀 식별 정보 보호):
//   - 표시 텍스트 = studentId.slice(0, 4) + "..." — UUID 풀길이 노출 0.
//   - title (tooltip) 에는 풀길이 노출 허용 — 원장(운영자) 가 본인 기관 범위에서 접근 시 가능.
//   - 자녀 본명/이메일 prop 미수신 — 본 컴포넌트는 navigation 만 책임.
//
// CON-04 (의료 금칙어): "치료" / "진단" / "장애" 사용 금지 — "타임라인" / "PDF" / "발음 기록" 만.
//
// 운영자 톤: 부모 친화 카피 (이모지 위주) 가 아닌 운영자(원장) 친화 — 간결, 정보 밀도 우선.

import Link from "next/link";

import type { ClassroomStudent } from "@/lib/admin/principal-aggregator";

export interface StudentRowProps {
  /// 1명 원아(보호자 계정) 식별자 — User.id (UUID).
  student: ClassroomStudent;
}

/**
 * UUID 의 앞 4자리만 노출하는 안전한 라벨.
 * 입력이 4자 미만이면 그대로 + "..." (defensive — 정상 UUID 는 4자 이상 보장).
 */
export function truncateStudentId(id: string): string {
  const head = id.slice(0, 4);
  return `${head}...`;
}

export function StudentRow({ student }: StudentRowProps) {
  const label = truncateStudentId(student.id);
  const timelineHref = `/admin/timeline/${student.id}`;
  const pdfHref = `/admin/centers/pdf/${student.id}`;

  return (
    <li
      data-testid={`principal-student-row-${student.id}`}
      data-student-id={student.id}
      className="flex items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 px-2 py-1.5 text-xs"
    >
      <span
        data-testid="principal-student-label"
        title={student.id}
        className="font-mono text-slate-700"
      >
        원아 {label}
      </span>
      <span className="flex items-center gap-1.5">
        <Link
          href={timelineHref}
          data-testid={`principal-student-timeline-${student.id}`}
          aria-label={`원아 ${label} 타임라인 보기`}
          className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-sky-300 bg-white px-2 py-1 text-xs font-medium text-sky-800 hover:bg-sky-50"
        >
          <span aria-hidden="true">📅</span>
          <span>타임라인</span>
        </Link>
        <Link
          href={pdfHref}
          data-testid={`principal-student-pdf-${student.id}`}
          aria-label={`원아 ${label} 센터 제출용 PDF 페이지`}
          className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
        >
          <span aria-hidden="true">📄</span>
          <span>PDF</span>
        </Link>
      </span>
    </li>
  );
}

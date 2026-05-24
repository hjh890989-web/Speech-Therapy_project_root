// FR-Q-TEACHER — /admin/teacher 선생님 대시보드 (Server Component).
//
// 책임:
//   1) Supabase auth.getUser() → User.role / User.id 단건 조회 (proxy.ts RBAC 이후 2차 가드)
//   2) teacher/admin/principal 만 통과 — expert / parent 차단 (403 안내)
//   3) loadTeacherDashboard(userId, { studentsCursor }) — 본인 담당 반 만 fetch
//      · admin/principal 도 본 페이지에서는 teacher 시점 view (본인 user.id 가 담당 teacherId 인 반)
//        — 다른 teacher 의 반을 보려면 별도 admin 페이지 (후속 PR) 사용. R4 단순화.
//      · searchParams.students_cursor 가 있으면 "다음 페이지" 진입 (9f204cd 후속 UI cursor).
//   4) TeacherStatsCards + TeacherClassroomGrid 또는 빈 데이터 CTA 렌더.
//   5) teacher_dashboard_viewed telemetry (server-side console.log — Vercel Logs).
//
// 접근 제어 계층:
//   - L1: proxy.ts 가 /admin/teacher 의 RBAC 1차 통과 (admin / principal / expert / teacher)
//   - L2: 본 페이지가 expert 차단 + cross-teacher 차단 (R4 — 본인 user.id 만)
//
// R4 (자녀 식별 정보 노출 금지):
//   - 본인 user.id (Supabase auth) 만 사용 → cross-teacher 시도 차단 (URL search param 없음)
//   - 자녀 본명 / userId / email 표시 0건 — 집계 카운트 + 반 이름만 + StudentRow truncate
//
// 금칙어 (CON-04): "치료" / "진단" / "장애" 사용 금지.
//
// REQ-NF-004: RSC LCP ≤ 3,000ms — loadTeacherDashboard 내부 Promise.all 로 fan-out.

import Link from "next/link";
import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import {
  loadTeacherDashboard,
  type TeacherDashboardData,
} from "@/lib/admin/teacher-aggregator";
import { TeacherStatsCards } from "@/components/admin/teacher/TeacherStatsCards";
import { TeacherClassroomGrid } from "@/components/admin/teacher/TeacherClassroomGrid";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "선생님 대시보드 — Speech-Therapy",
  description:
    "담당 반 단위 발음 발달 현황을 반·원아별로 한눈에 확인합니다. 선생님/원장/관리자 전용 화면.",
};

/// 본 페이지 진입 허용 role — proxy.ts allow-list 의 subset (expert 제외).
/// admin / principal 은 본인 user.id 가 teacherId 로 매칭된 Class 만 노출 — teacher 시점 view.
const PAGE_ALLOWED_ROLES = new Set(["admin", "principal", "teacher"]);

interface CurrentUserContext {
  userId: string;
  role: string | null;
}

async function loadCurrentUserContext(): Promise<CurrentUserContext | null> {
  let userId: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    return null;
  }
  if (!userId) return null;

  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return {
      userId,
      role: row?.role ?? null,
    };
  } catch {
    return null;
  }
}

/// server-side telemetry — Vercel Logs (R4: userId 는 server-side telemetry 해시 가정).
function logDashboardView(data: TeacherDashboardData) {
  try {
    console.log(
      JSON.stringify({
        level: "info",
        event: "teacher_dashboard_viewed",
        teacherId: data.teacherId,
        classCount: data.classCount,
        studentCount: data.studentCount,
      }),
    );
  } catch {
    // logging 실패는 무시 — UI 렌더 차단 금지.
  }
}

/**
 * Page props — Next.js 16 (15+) 부터 searchParams 는 Promise 로 변경됨.
 *   students_cursor: 직전 페이지 마지막 학생 User.id (UUID). aggregator 가 본 값보다 큰 id 부터 fetch.
 *     · 빈 값 / 미지정 → 첫 페이지 진입.
 *     · cross-teacher 우회 차단: aggregator 의 where: { teacherId } scope 가 그대로 적용되어
 *       다른 teacher 의 반은 절대 도달 못함 (teacher-aggregator.ts §해설).
 */
interface TeacherDashboardPageProps {
  searchParams: Promise<{ students_cursor?: string }>;
}

export default async function TeacherDashboardPage({
  searchParams,
}: TeacherDashboardPageProps) {
  const { students_cursor: rawCursor } = await searchParams;
  const cursor =
    typeof rawCursor === "string" && rawCursor.trim().length > 0 ? rawCursor.trim() : undefined;
  const hasCursor = Boolean(cursor);

  const ctx = await loadCurrentUserContext();

  // L2 — 비로그인 fallback (proxy.ts 가 통상 차단하나, Supabase 일시 장애 대응).
  if (!ctx) {
    redirect("/login?next=/admin/teacher");
  }

  // L2 — expert / parent 차단. proxy.ts 는 expert 통과, parent 는 차단하나 방어적 가드.
  if (!ctx.role || !PAGE_ALLOWED_ROLES.has(ctx.role)) {
    return (
      <main
        data-testid="teacher-forbidden"
        className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6"
        role="alert"
        aria-live="polite"
      >
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-xl font-semibold">선생님 대시보드 접근 권한이 없어요</h1>
          <p className="mt-2 text-sm">
            본 페이지는 선생님/원장/관리자 전용입니다. 권한이 필요하시면 운영자에게
            요청해 주세요.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  // L2 — cross-teacher 차단: loadTeacherDashboard 의 teacherId 는 본인 user.id 만 전달.
  // searchParams.students_cursor 는 학생 페이지네이션 cursor — aggregator 의 where: { teacherId }
  // scope 가 상위에서 적용되므로 다른 teacher 의 반에는 절대 도달 못함 (teacher-aggregator.ts §해설).
  const data = await loadTeacherDashboard(ctx.userId, { studentsCursor: cursor });
  logDashboardView(data);

  const hasAnyData =
    data.classCount > 0 || data.studentCount > 0 || data.thisWeekDiagnoseCount > 0;

  return (
    <main
      data-testid="admin-teacher-page"
      data-teacher-id={data.teacherId}
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
      aria-labelledby="teacher-heading"
    >
      <header className="mb-6">
        <h1
          id="teacher-heading"
          className="text-2xl font-bold text-slate-900 sm:text-3xl"
        >
          선생님 대시보드
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          담당 반의 원아별 발음 발달 현황을 요약해 보여드려요. 최근 7일 기준 평균 점수와
          반별 활동량을 한눈에 확인할 수 있어요.
        </p>
      </header>

      <TeacherStatsCards data={data} />

      {data.classroomsEmpty ? (
        <section
          data-testid="teacher-classrooms-empty"
          aria-label="담당 반 없음"
          className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700"
        >
          <p className="mb-2 font-semibold text-slate-900">
            아직 담당으로 지정된 반이 없어요
          </p>
          <p className="mb-3">
            반 지정은 원장 또는 관리자가 수행해요. 본인이 담당해야 할 반이 있다면 원장에게
            요청해 주세요. 반 지정 후 본 페이지에서 반별 현황 카드가 자동으로 표시돼요.
          </p>
        </section>
      ) : (
        <TeacherClassroomGrid classrooms={data.classrooms} hasCursor={hasCursor} />
      )}

      {!hasAnyData ? (
        <section
          data-testid="teacher-empty-state"
          aria-label="데이터 없음"
          className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900"
        >
          <p className="mb-2 font-semibold">
            아직 등록된 활동 데이터가 없어요.
          </p>
          <p className="mb-3 text-emerald-800">
            원아가 발음 확인을 시작하면 본 페이지에 카운트와 평균 점수가 누적돼요.
          </p>
        </section>
      ) : null}

      <footer
        aria-label="안내"
        className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"
      >
        <p className="mb-1 font-semibold text-slate-800">표시 정책</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>모든 수치는 본인 담당 반 범위로 한정돼요 (R4 cross-teacher 차단).</li>
          <li>자녀 본명/이메일은 표시되지 않아요 — 집계 카운트와 반 이름만 보여드려요.</li>
          <li>본 결과는 의학적 판단이 아닌 발달 참고 자료입니다.</li>
        </ul>
      </footer>
    </main>
  );
}

// FR-Q-009 (#50) — /admin/principal 원장 대시보드 (Server Component).
//
// 책임:
//   1) Supabase auth.getUser() → User.role / User.institutionId 단건 조회 (proxy.ts RBAC 이후 2차 가드)
//   2) principal/admin 만 통과 (expert 제외) — expert 는 HITL 큐 전용 사용자.
//   3) institutionId 부재 → 안내 메시지 (원장 가입은 됐으나 운영자 매칭 전).
//   4) loadPrincipalDashboard(institutionId, { studentsCursor }) 1회 호출 — Promise.all fan-out.
//      · searchParams.students_cursor 가 있으면 "다음 페이지" 진입 (9f204cd 후속 UI cursor).
//   5) StatsCards + ClassroomGrid (또는 빈 데이터 CTA) 렌더.
//   6) principal_dashboard_viewed telemetry (server-side console.log — Vercel Logs).
//
// 접근 제어 계층:
//   - L1: proxy.ts 가 /admin/* 의 RBAC 1차 통과 (admin / principal / expert)
//   - L2: 본 페이지가 expert 차단 + institutionId 부재 분기 + cross-tenant 차단 (R4)
//
// R4 (자녀 식별 정보 노출 금지):
//   - 사용자 본인 institutionId 로 한정 — 다른 institution 데이터 절대 접근 불가
//   - 자녀 본명 / userId / email 표시 0건 — 집계 카운트 + 반 이름만
//
// 금칙어 (CON-04): "치료" / "진단" / "장애" 사용 금지 — UI / aria-label / hint 모두.
//
// REQ-NF-004: RSC LCP ≤ 3,000ms — loadPrincipalDashboard 내부 Promise.all 로 fan-out.

import Link from "next/link";
import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import {
  loadPrincipalDashboard,
  type PrincipalDashboardData,
} from "@/lib/admin/principal-aggregator";
import { StatsCards } from "@/components/admin/principal/StatsCards";
import { ClassroomGrid } from "@/components/admin/principal/ClassroomGrid";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "원장 대시보드 — Speech-Therapy",
  description:
    "기관(어린이집/유치원) 단위 발음 발달 현황을 반·원아별로 한눈에 확인합니다. 원장/관리자 전용 화면.",
};

/// 본 페이지 진입 허용 role — proxy.ts allow-list 의 subset (expert 제외).
/// expert 는 HITL 검토 전용 — 운영상 institutionId 없을 가능성 높아 별도 가드.
const PAGE_ALLOWED_ROLES = new Set(["admin", "principal"]);

interface CurrentUserContext {
  userId: string;
  role: string | null;
  institutionId: string | null;
}

async function loadCurrentUserContext(): Promise<CurrentUserContext | null> {
  let userId: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    // Supabase env 미설정 / 네트워크 — 비로그인 취급.
    return null;
  }
  if (!userId) return null;

  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, institutionId: true },
    });
    return {
      userId,
      role: row?.role ?? null,
      institutionId: row?.institutionId ?? null,
    };
  } catch {
    return null;
  }
}

/// server-side telemetry — Vercel Logs 가 수집 (R4 — userId / 자녀 식별 정보 0).
function logDashboardView(data: PrincipalDashboardData) {
  try {
    console.log(
      JSON.stringify({
        level: "info",
        event: "principal_dashboard_viewed",
        institutionId: data.institutionId,
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
 *     · 외부에서 다른 institution 의 user id 를 입력해도 aggregator 의 where: institutionId scope
 *       가 그대로 적용되어 본인 기관 users 안에서만 매칭됨 (cross-tenant 안전).
 */
interface PrincipalDashboardPageProps {
  searchParams: Promise<{ students_cursor?: string }>;
}

export default async function PrincipalDashboardPage({
  searchParams,
}: PrincipalDashboardPageProps) {
  const { students_cursor: rawCursor } = await searchParams;
  const cursor =
    typeof rawCursor === "string" && rawCursor.trim().length > 0 ? rawCursor.trim() : undefined;
  const hasCursor = Boolean(cursor);

  const ctx = await loadCurrentUserContext();

  // L2 — 비로그인 fallback (proxy.ts 가 통상 차단하나, 직접 호출 / Supabase 일시 장애 대응).
  if (!ctx) {
    redirect("/login?next=/admin/principal");
  }

  // L2 — expert 차단. proxy.ts 는 expert 통과시키나 본 페이지는 admin/principal 만 허용.
  if (!ctx.role || !PAGE_ALLOWED_ROLES.has(ctx.role)) {
    return (
      <main
        data-testid="principal-forbidden"
        className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6"
        role="alert"
        aria-live="polite"
      >
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-xl font-semibold">원장 대시보드 접근 권한이 없어요</h1>
          <p className="mt-2 text-sm">
            본 페이지는 원장/관리자 전용입니다. 권한이 필요하시면 운영자에게 요청해 주세요.
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

  // L2 — institutionId 부재 (원장 가입은 완료, 운영자가 institution 매칭 전 상태).
  if (!ctx.institutionId) {
    return (
      <main
        data-testid="principal-no-institution"
        className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6"
        aria-labelledby="no-institution-heading"
      >
        <div className="rounded-lg border border-sky-300 bg-sky-50 p-6 text-sky-900">
          <h1 id="no-institution-heading" className="text-xl font-semibold">
            기관 정보가 아직 설정되지 않았어요
          </h1>
          <p className="mt-2 text-sm">
            계정에 기관(어린이집/유치원)이 연결되어야 대시보드를 볼 수 있어요.
            운영자(admin)에게 기관 매칭을 요청해 주세요.
          </p>
        </div>
      </main>
    );
  }

  // L2 — cross-tenant 차단 보장: 호출 institutionId 는 본인 user 의 institutionId 만 사용.
  // searchParams.students_cursor 는 페이지네이션 cursor (User.id UUID) — aggregator 가
  // where: { institutionId } scope 안에서 { id: { gt: cursor } } 로 필터링하므로 다른 기관
  // user id 를 입력해도 본 기관 users 안에서만 매칭 (안전, principal-aggregator.ts §해설).
  const data = await loadPrincipalDashboard(ctx.institutionId, { studentsCursor: cursor });
  logDashboardView(data);

  const hasAnyData =
    data.classCount > 0 || data.studentCount > 0 || data.thisWeekDiagnoseCount > 0;

  return (
    <main
      data-testid="admin-principal-page"
      data-institution-id={data.institutionId}
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
      aria-labelledby="principal-heading"
    >
      <header className="mb-6">
        <h1
          id="principal-heading"
          className="text-2xl font-bold text-slate-900 sm:text-3xl"
        >
          원장 대시보드
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          본 기관의 반·원아 단위 발음 발달 현황을 요약해 보여드려요.
          최근 7일 기준 발음 점수 평균 + 반별 활동량을 한눈에 확인할 수 있어요.
        </p>
      </header>

      <StatsCards data={data} />

      {data.classroomsEmpty ? (
        <section
          data-testid="principal-classrooms-empty"
          aria-label="반 정보 없음"
          className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700"
        >
          <p className="mb-2 font-semibold text-slate-900">아직 등록된 반이 없어요</p>
          <p className="mb-3">
            반(class) 데이터가 등록되면 반별 발달 현황 카드가 여기에 표시돼요.
            먼저 원아를 등록해서 데이터를 모아 보세요.
          </p>
          <Link
            href="/admin/students/import"
            data-testid="principal-import-cta"
            className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            원아 등록하러 가기
          </Link>
        </section>
      ) : (
        <ClassroomGrid classrooms={data.classrooms} hasCursor={hasCursor} />
      )}

      {!hasAnyData ? (
        <section
          data-testid="principal-empty-state"
          aria-label="데이터 없음"
          className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900"
        >
          <p className="mb-2 font-semibold">
            아직 등록된 원아가 없어요. 원아 등록 페이지에서 시작해 보세요.
          </p>
          <p className="mb-3 text-emerald-800">
            원아 등록이 완료되면 발음 확인 결과가 누적되면서 요약 카드와 반별 카드가 채워져요.
          </p>
          <Link
            href="/admin/students/import"
            data-testid="principal-empty-cta"
            className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            원아 일괄 등록
          </Link>
        </section>
      ) : null}

      <footer
        aria-label="안내"
        className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"
      >
        <p className="mb-1 font-semibold text-slate-800">표시 정책</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>모든 수치는 본 기관(institution) 범위로 한정돼요 (R4 cross-tenant 차단).</li>
          <li>자녀 본명/이메일은 표시되지 않아요 — 집계 카운트와 반 이름만 보여드려요.</li>
          <li>본 결과는 의학적 판단이 아닌 발달 참고 자료입니다.</li>
        </ul>
      </footer>
    </main>
  );
}

// FR-Q-007 (#48) — 센터 제출용 PDF 다운로드 페이지 (Server Component).
//
// Route: /admin/centers/pdf/[userId]
//
// 책임:
//   1) proxy.ts L1 RBAC (admin / principal / expert) 통과 후 진입.
//   2) L2 RBAC: expert 차단, parent 차단. admin / principal 만 통과.
//   3) L2 RBAC (cross-tenant): principal → 본인 institutionId 와 대상 user.institutionId 일치 필수.
//      admin → 모든 user 접근 가능 (운영자 권한).
//   4) loadCenterReportData(userId) 호출 → CenterPdfDownloadClient 에 input 전달.
//   5) 빈 데이터 / 미존재 user → 404 안내 (notFound() 또는 page-level 분기).
//
// R4 (자녀 식별 정보):
//   - childName 은 PDF 본문에 포함 (admin/principal RBAC 통과 후).
//   - URL 의 userId 는 admin/principal 만 받을 수 있음 → cross-tenant 차단.
//
// CON-04: 본 페이지의 모든 UI 카피는 "치료/진단/장애" 미포함.

import Link from "next/link";

import { prisma } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadCenterReportData } from "@/lib/pdf/aggregator";
import { CenterPdfDownloadClient } from "@/components/admin/CenterPdfDownloadClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "센터 제출용 PDF — Speech-Therapy",
  description:
    "원아의 발음 발달 요약 보고서를 1페이지 PDF 로 내려받아 센터/학부모에게 제출할 수 있는 화면입니다. 원장/관리자 전용.",
};

/// 본 페이지 진입 허용 role — proxy.ts allow-list 의 subset (expert 제외).
/// admin: 모든 user, principal: 본인 institution user 만.
const PAGE_ALLOWED_ROLES = new Set(["admin", "principal"]);

interface CurrentUserContext {
  userId: string;
  role: string | null;
  institutionId: string | null;
}

async function loadCurrentUserContext(): Promise<CurrentUserContext | null> {
  let viewerId: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    viewerId = data.user?.id ?? null;
  } catch {
    return null;
  }
  if (!viewerId) return null;

  try {
    const row = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { role: true, institutionId: true },
    });
    return {
      userId: viewerId,
      role: row?.role ?? null,
      institutionId: row?.institutionId ?? null,
    };
  } catch {
    return null;
  }
}

/// L2 cross-tenant 차단 — admin 은 모두 통과, principal 은 동일 institution 만.
function isCrossTenantAllowed(
  viewerRole: string,
  viewerInstitutionId: string | null,
  targetInstitutionId: string | null,
): boolean {
  if (viewerRole === "admin") return true;
  if (viewerRole === "principal") {
    if (!viewerInstitutionId || !targetInstitutionId) return false;
    return viewerInstitutionId === targetInstitutionId;
  }
  return false;
}

interface PageParams {
  params: Promise<{ userId: string }>;
}

export default async function CenterPdfPage({ params }: PageParams) {
  const ctx = await loadCurrentUserContext();
  const { userId: targetUserId } = await params;

  // L2 비로그인 — proxy.ts 가 1차 차단하나 직접 호출 / env 미설정 fallback.
  if (!ctx) {
    return (
      <main
        data-testid="center-pdf-anonymous"
        className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6"
        role="alert"
      >
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-xl font-semibold">로그인이 필요해요</h1>
          <p className="mt-2 text-sm">
            본 페이지는 관리자/원장 전용입니다. 로그인 후 다시 시도해 주세요.
          </p>
          <Link
            href={`/login?next=/admin/centers/pdf/${encodeURIComponent(targetUserId)}`}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            로그인 페이지로 이동
          </Link>
        </div>
      </main>
    );
  }

  // L2 — admin / principal 만 통과.
  if (!ctx.role || !PAGE_ALLOWED_ROLES.has(ctx.role)) {
    return (
      <main
        data-testid="center-pdf-forbidden"
        className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6"
        role="alert"
        aria-live="polite"
      >
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-xl font-semibold">PDF 다운로드 권한이 없어요</h1>
          <p className="mt-2 text-sm">
            본 페이지는 관리자/원장 전용입니다. 권한이 필요하시면 운영자에게 요청해 주세요.
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

  // 대상 user 데이터 로딩 (cross-tenant 검증 전에 institutionId 확인 필요).
  const loaded = await loadCenterReportData(targetUserId);
  if (!loaded) {
    return (
      <main
        data-testid="center-pdf-notfound"
        className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6"
        role="alert"
      >
        <div className="rounded-lg border border-slate-300 bg-slate-50 p-6 text-slate-900">
          <h1 className="text-xl font-semibold">대상 원아를 찾을 수 없어요</h1>
          <p className="mt-2 text-sm">
            요청한 사용자가 존재하지 않거나 접근할 수 없는 데이터입니다.
          </p>
        </div>
      </main>
    );
  }

  // L2 — cross-tenant 차단.
  if (!isCrossTenantAllowed(ctx.role, ctx.institutionId, loaded.institutionId)) {
    return (
      <main
        data-testid="center-pdf-cross-tenant"
        className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6"
        role="alert"
        aria-live="polite"
      >
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-xl font-semibold">접근 권한이 없어요</h1>
          <p className="mt-2 text-sm">
            본 원아는 다른 기관에 속해 있어 접근할 수 없습니다. 본인 기관의 원아만 PDF
            를 내려받을 수 있어요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      data-testid="center-pdf-page"
      data-target-user-id={targetUserId}
      className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10"
      aria-labelledby="center-pdf-page-heading"
    >
      <header className="mb-6">
        <h1
          id="center-pdf-page-heading"
          className="text-2xl font-bold text-slate-900 sm:text-3xl"
        >
          센터 제출용 PDF
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          원아의 발음 발달 요약을 1페이지 PDF 로 내려받아 센터/학부모에게 전달할 수 있어요.
          본 PDF 는 발달 보조 자료이며 의학적 판단을 제공하지 않습니다.
        </p>
      </header>

      <CenterPdfDownloadClient
        input={loaded.input}
        userId={targetUserId}
        institutionId={loaded.institutionId ?? undefined}
      />

      <footer
        aria-label="안내"
        className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"
      >
        <p className="mb-1 font-semibold text-slate-800">사용 안내</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>PDF 는 사용자의 브라우저에서 직접 생성됩니다 (서버에 저장되지 않아요).</li>
          <li>본 자료는 발달 보조용이며, 의학적 판단은 전문 기관 상담을 권장해요.</li>
          <li>모든 자녀 식별 정보는 본인 기관 범위로 한정돼요 (R4 cross-tenant 차단).</li>
        </ul>
      </footer>
    </main>
  );
}

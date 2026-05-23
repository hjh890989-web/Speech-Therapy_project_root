// FR-C-016 (#39) — /admin/students/import 진입 페이지 (Server Component).
//
// 책임:
//   1) Supabase auth 확인 — 없으면 /login 으로 안내 (proxy 가 이미 막지만, 직접 진입 fallback)
//   2) User.role + institutionId 조회 — admin / principal 만 통과 (expert 제외)
//   3) institutionId 가 부재면 안내 (대량 등록은 institution scope 필수)
//   4) <StudentBulkImportClient institutionId={...} /> 렌더
//
// RBAC:
//   - proxy.ts 가 /admin 경로 RBAC 이미 적용 (admin/principal/expert 통과)
//   - 본 페이지는 expert 추가 차단 — UI 측 명시적 가이드
//
// 금칙어: "치료" / "진단" / "장애" 사용 금지.

import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { StudentBulkImportClient } from "@/components/admin/StudentBulkImportClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "원아 일괄 등록 — Speech-Therapy",
  description:
    "어린이집/유치원 원아 100명을 CSV 파일로 한 번에 등록할 수 있어요. 원장/관리자 전용.",
};

const PRINCIPAL_ALLOWED_ROLES = ["admin", "principal"] as const;

export default async function StudentBulkImportPage() {
  let supabase;
  try {
    supabase = await getSupabaseServerClient();
  } catch {
    // 환경 변수 부재 — proxy 가 차단했어야 하나 fallback.
    redirect("/login?next=/admin/students/import");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/admin/students/import");
  }

  // role + institutionId 조회.
  const { data: userRow } = await supabase
    .from("User")
    .select("role, institutionId")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null; institutionId: string | null }>();

  const role = userRow?.role ?? null;
  const institutionId = userRow?.institutionId ?? null;

  if (!role || !(PRINCIPAL_ALLOWED_ROLES as readonly string[]).includes(role)) {
    return (
      <main
        data-testid="student-bulk-import-forbidden"
        className="mx-auto w-full max-w-3xl px-4 py-12"
        aria-labelledby="forbidden-heading"
      >
        <h1
          id="forbidden-heading"
          className="text-2xl font-bold text-slate-900"
        >
          접근 권한이 없어요
        </h1>
        <p className="mt-3 text-sm text-slate-700">
          원아 일괄 등록은 원장 또는 관리자만 사용할 수 있어요. 권한이 필요하면
          기관 운영자에게 문의해 주세요.
        </p>
      </main>
    );
  }

  if (!institutionId) {
    return (
      <main
        data-testid="student-bulk-import-no-institution"
        className="mx-auto w-full max-w-3xl px-4 py-12"
        aria-labelledby="no-institution-heading"
      >
        <h1
          id="no-institution-heading"
          className="text-2xl font-bold text-slate-900"
        >
          기관 정보가 없어요
        </h1>
        <p className="mt-3 text-sm text-slate-700">
          원아 일괄 등록은 기관(어린이집/유치원) 소속 계정만 사용할 수 있어요.
          소속 기관 등록을 먼저 진행해 주세요.
        </p>
      </main>
    );
  }

  // FR-Q-009 / FR-C-005 — 부모 초대 이메일 본문에 표시할 기관 이름 조회.
  // 조회 실패 / 기관 미존재 시 Client default ("우리 기관") 으로 폴백.
  let institutionName: string | undefined;
  try {
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { name: true },
    });
    institutionName = institution?.name ?? undefined;
  } catch {
    // 조회 실패는 graceful — 기본 라벨 사용.
    institutionName = undefined;
  }

  return (
    <main
      data-testid="student-bulk-import-page"
      className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10"
      aria-labelledby="student-bulk-import-heading"
    >
      <header className="mb-6">
        <h1
          id="student-bulk-import-heading"
          className="text-2xl font-bold text-slate-900 sm:text-3xl"
        >
          원아 일괄 등록
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          CSV 파일을 업로드하면 원아 정보를 한 번에 등록할 수 있어요. 한 번에 최대
          1,000명까지 처리합니다.
        </p>
      </header>

      <StudentBulkImportClient
        institutionId={institutionId}
        institutionName={institutionName}
      />

      <footer
        aria-label="안내"
        className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"
      >
        <p className="mb-1 font-semibold text-slate-800">파일 형식 가이드</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>첫 행은 header 여야 해요 — 예: <code>학번,이름,생년월일,반,부모이메일</code></li>
          <li>학번: 영숫자/-/_ 만, 4~20자. 이름: 1~30자(별명 권장).</li>
          <li>생년월일: <code>YYYY-MM-DD</code> 또는 <code>YYYY/MM/DD</code>.</li>
          <li>Excel 사용 시 “다른 이름으로 저장 → CSV UTF-8(쉼표로 분리)” 을 권장해요.</li>
          <li>R4 보호 — 본명/주민번호 같은 추가 컬럼은 자동으로 무시됩니다.</li>
        </ul>
      </footer>
    </main>
  );
}

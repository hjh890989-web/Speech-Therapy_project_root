// FR-C-PARENT-ONBOARDING — 신규 부모 first-time wizard 진입 페이지 (Server Component).
//
// 책임:
//   1) Supabase auth 확인 — 비로그인 시 /login?next=/onboarding 으로 redirect.
//   2) User row fetch — 이미 childAgeMonths 있는 사용자에게는 prefill.
//   3) <OnboardingWizardClient> 렌더 — wizard 본체는 Client Component.
//
// 라우트:
//   - 본 PR 에선 (public)/onboarding 이 아닌 app/onboarding/page.tsx 로 직접 배치.
//     이유: 로그인 필수 페이지 — (public) layout (AuthHeader) 와 별도 단순 layout 으로 분리.
//   - layout 자동 redirect 통합은 후속 PR (본 PR 범위 외).
//
// metadata: SEO 보다 명확한 안내 우선 — 비공개 페이지지만 외부 검색 차단 효과 (noindex 헤더는 별도).
//
// CON-04: 본 페이지의 모든 카피 / 주석에 의료 단정 금칙어 0건.

import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingWizardClient } from "@/components/onboarding/OnboardingWizardClient";
import { getOnboardingStartStep } from "@/lib/onboarding/start-step";

export const metadata = {
  title: "환영합니다 — Speech-Therapy",
  description:
    "신규 부모님께 발음 가이드 첫 사용 흐름을 안내해 드려요. 자녀의 발음 발달 확인과 보상 모으기를 함께 시작합니다.",
};

// auth 결과는 매 요청 fresh — 정적 캐시 차단.
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  // 1) auth — 비로그인이면 login 으로 next return.
  let userId: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    // env 미설정 / 네트워크 — 보수적으로 login redirect.
    userId = null;
  }
  if (!userId) {
    redirect("/login?next=/onboarding");
  }

  // 2) User 정보 fetch — prefill 용. 실패해도 wizard 는 default 로 진행.
  let prefillChildAgeMonths: number | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { childAgeMonths: true },
    });
    prefillChildAgeMonths = user?.childAgeMonths ?? null;
  } catch {
    // graceful — DB 실패 시 default 로 진행.
    prefillChildAgeMonths = null;
  }

  const initialStep = getOnboardingStartStep(prefillChildAgeMonths);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-emerald-50 to-amber-50">
      <OnboardingWizardClient
        initialStep={initialStep}
        prefillChildAgeMonths={prefillChildAgeMonths}
        hasExistingChildInfo={prefillChildAgeMonths !== null}
      />
    </main>
  );
}

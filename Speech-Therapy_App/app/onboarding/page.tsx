// FR-C-PARENT-ONBOARDING — 신규 부모 first-time wizard 진입 페이지 (Server Component).
//
// 책임:
//   1) Supabase auth 확인 — 비로그인 시 /login?next=/onboarding 으로 redirect.
//   2) User row fetch — 이미 childAgeMonths 있는 사용자에게는 prefill.
//   3) onboardingCompletedAt 조회 → initialDbCompleted 로 전달 (다중 디바이스 동기화).
//   4) <OnboardingWizardClient> 렌더 — wizard 본체는 Client Component.
//
// 라우트:
//   - 본 페이지는 (public) layout 외부 — AuthHeader 없이 단순 노출.
//   - follow-up: (public)/layout.tsx 의 OnboardingRedirectGate 가 미완료 user 를
//     자동으로 /onboarding 으로 안내 (수동 URL 입력 불필요).
//
// metadata: SEO 보다 명확한 안내 우선 — 비공개 페이지지만 외부 검색 차단 효과 (noindex 헤더는 별도).
//
// CON-04: 본 페이지의 모든 카피 / 주석에 의료 단정 금칙어 0건.

import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingWizardClient } from "@/components/onboarding/OnboardingWizardClient";
import { getOnboardingStartStep } from "@/lib/onboarding/start-step";
import { hasCompletedOnboardingServerSide } from "@/lib/onboarding/server-state";

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

  // 3) onboardingCompletedAt 조회 — wizard 가 이미 완료된 user 라면 client 측이 /missions
  //    로 즉시 redirect. 본 페이지의 Server Component 단계에서 직접 redirect 하지 않는
  //    이유는 localStorage 동기화 로직 (sync 가능 user 경험) 을 client 가 책임지기 때문.
  const initialDbCompleted = await hasCompletedOnboardingServerSide();

  const initialStep = getOnboardingStartStep(prefillChildAgeMonths);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-emerald-50 to-amber-50">
      <OnboardingWizardClient
        initialStep={initialStep}
        prefillChildAgeMonths={prefillChildAgeMonths}
        hasExistingChildInfo={prefillChildAgeMonths !== null}
        initialDbCompleted={initialDbCompleted}
      />
    </main>
  );
}

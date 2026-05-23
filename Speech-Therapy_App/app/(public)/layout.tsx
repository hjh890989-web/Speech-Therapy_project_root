// API-010 §1 — 공개 라우트 그룹 layout. AuthHeader 모든 (public) 페이지 상단 표시.
//
// FR-C-PARENT-ONBOARDING (follow-up):
//   인증된 신규 user (onboardingCompletedAt 미설정) 가 본 layout 하위 페이지에 진입하면
//   자동으로 /onboarding 으로 안내. 본 layout 은 (public) 그룹에만 적용되므로 /admin,
//   /api, /onboarding, /signup, /auth, /admin 등 별도 그룹은 영향 없음 (라우트 격리).
//
//   layout 내부에서 /login* 같은 (public) 그룹 _안_ 의 인증 흐름 경로는 OnboardingRedirectGate
//   가 path-prefix 기준 제외 처리. 결과적으로 (public) 그룹 안에서 redirect 대상은
//   /diagnose, /missions, /predictions, /reports, /rewards, /roi, /settings, /status 등.
//
//   proxy.ts 는 RBAC 중심 (admin 만 처리) 으로 유지 — onboarding 은 application layer 분리.

import { Suspense } from "react";

import { AuthHeader } from "./AuthHeader";
import { OnboardingRedirectGate } from "@/components/onboarding/OnboardingRedirectGate";
import { hasCompletedOnboardingServerSide } from "@/lib/onboarding/server-state";

// Supabase auth + DB 상태는 매 요청 fresh — 정적 캐시 차단.
export const dynamic = "force-dynamic";

/**
 * 서버 측 onboarding 상태 조회 + 게이트 prop drop.
 * Suspense fallback (null) 으로 wrap → 초기 페이지 렌더 차단 X.
 */
async function OnboardingRedirectShim() {
  const dbCompleted = await hasCompletedOnboardingServerSide();
  return <OnboardingRedirectGate dbCompleted={dbCompleted} />;
}

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AuthHeader />
      <Suspense fallback={null}>
        <OnboardingRedirectShim />
      </Suspense>
      {children}
    </>
  );
}

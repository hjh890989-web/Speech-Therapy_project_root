// 공개 라우트 그룹 layout.
//
// 헤더 구조 (drift 정리, 5/27):
//   - root layout (app/layout.tsx) 의 InstitutionHeader: 브랜드 + 기관 로고
//   - 본 (public) layout 의 MainNav: 메뉴 + email + 로그아웃
//   - 이전 AuthHeader (API-010 §1 legacy) 는 MainNav 와 email/로그아웃/브랜드 모두
//     중복되어 5/27 제거됨. 사용자 보고로 헤더 3중 표시 (브랜드 2번 + email/로그아웃 2번)
//     drift 발견 → AuthHeader 단일 삭제로 해소.
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

import { OnboardingRedirectGate } from "@/components/onboarding/OnboardingRedirectGate";
import { hasCompletedOnboardingServerSide } from "@/lib/onboarding/server-state";
import { MainNav } from "@/components/nav/MainNav";
import { ConsentRedirectGate } from "@/components/consent/ConsentRedirectGate";
import { hasCompletedPrivacyConsentServerSide } from "@/lib/auth/consent-status";

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

/**
 * 서버 측 PIPA 동의 상태 조회 + 게이트 prop drop.
 * 미동의 인증 user 가 (public) 페이지 진입 시 /settings/privacy-consent 로 안내.
 */
async function ConsentRedirectShim() {
  const hasConsented = await hasCompletedPrivacyConsentServerSide();
  return <ConsentRedirectGate hasConsented={hasConsented} />;
}

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* FR-NAV — 부모/원장/선생님/expert role 별 메인 navigation. RSC 내부에서 Supabase + Prisma role
          단건 조회 후 메뉴 항목을 산출. Suspense fallback (null) 으로 wrap 되어 page LCP 차단 0.
          인증/익명 분기는 MainNav 가 단독 담당 (5/27 AuthHeader 제거 후). */}
      <Suspense fallback={null}>
        <MainNav />
      </Suspense>
      <Suspense fallback={null}>
        <OnboardingRedirectShim />
      </Suspense>
      <Suspense fallback={null}>
        <ConsentRedirectShim />
      </Suspense>
      <main>{children}</main>
    </>
  );
}

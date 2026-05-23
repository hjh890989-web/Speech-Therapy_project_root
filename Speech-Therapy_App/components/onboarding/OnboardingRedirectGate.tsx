"use client";

// FR-C-PARENT-ONBOARDING (follow-up) — (public) layout 자동 redirect 게이트 (Client Component).
//
// 역할:
//   Server Component layout 이 hasCompletedOnboardingServerSide() 결과를 prop 으로 주입
//   → 본 컴포넌트가 usePathname() 으로 현재 경로 확인 → 제외 path 가 아니면 /onboarding 으로
//     router.replace 호출.
//
// 분리 이유 (Server 측에서 직접 redirect 못 하는 사유):
//   - layouts 는 자식 페이지의 pathname 을 직접 prop 으로 받지 못함 (Next.js 16 App Router).
//   - proxy.ts 는 RBAC 책임 (수정 금지) — onboarding 은 application layer.
//   - usePathname() 은 client-only hook — 따라서 본 컴포넌트만 'use client'.
//
// 제외 경로 정책:
//   - /onboarding         : wizard 본체.
//   - /login*             : 로그인 페이지 자체 (인증 흐름 중간).
//   - /signup*            : 가입 흐름.
//   - /auth/*             : Supabase callback / OAuth.
//   - (public) layout 자체가 wraps 하지 않는 경로 (/admin, /api 등) 는 본 컴포넌트 미실행.
//
// redirect 조건:
//   - dbCompleted === false: 인증된 user 가 wizard 미완료 — /onboarding 으로 안내.
//   - dbCompleted === null : 비인증 / 미확정 — redirect 하지 않음 (사용자 흐름 보존).
//   - dbCompleted === true : 완료 user — redirect 불필요.
//
// graceful UX:
//   - 본 컴포넌트는 시각적 출력 없음 (return null) — layout 안에서 부수효과만 수행.
//   - router.replace 사용 (history stack 미오염).
//
// CON-04: 본 모듈의 주석에 의료 단정 금칙어 0건.

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/** 본 게이트가 redirect 를 _수행하지 않는_ 경로 prefix 모음. */
export const ONBOARDING_REDIRECT_EXCLUDED_PREFIXES: ReadonlyArray<string> = [
  "/onboarding",
  "/login",
  "/signup",
  "/auth",
];

/**
 * 주어진 pathname 이 redirect 대상에서 제외되는지 판정.
 * 정확 매칭 + prefix 매칭 (예: "/login/parent", "/auth/callback") 모두 지원.
 */
export function isOnboardingRedirectExcluded(pathname: string): boolean {
  if (!pathname) return true; // 안전 기본값 — 경로 미확정이면 redirect 안 함.
  return ONBOARDING_REDIRECT_EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export interface OnboardingRedirectGateProps {
  /**
   * 서버 측 onboardingCompletedAt 조회 결과.
   *   - null  : 비인증 / 미확정 — redirect 안 함.
   *   - true  : 완료 user — redirect 안 함.
   *   - false : 미완료 인증 user — 제외 path 가 아니면 /onboarding 으로 router.replace.
   */
  dbCompleted: boolean | null;
}

export function OnboardingRedirectGate({ dbCompleted }: OnboardingRedirectGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  // mount 1회 trigger guard — fast-refresh / 재렌더 시 중복 redirect 회피.
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (triggeredRef.current) return;
    if (dbCompleted !== false) return; // null / true → 미실행.
    if (isOnboardingRedirectExcluded(pathname ?? "")) return;
    triggeredRef.current = true;
    router.replace("/onboarding");
  }, [dbCompleted, pathname, router]);

  return null;
}

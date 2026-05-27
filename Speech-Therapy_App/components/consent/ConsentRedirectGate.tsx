"use client";

// SEC-COMP-PIPA (Grill #3A A1+A2) — PIPA 미동의 인증 user 의 (public) 페이지 차단 게이트.
//
// 역할:
//   Server Component layout 이 hasCompletedPrivacyConsentServerSide() 결과를 prop 으로 주입
//   → 본 컴포넌트가 usePathname() 으로 현재 경로 확인 → 제외 path 가 아니면
//     /settings/privacy-consent 로 router.replace 호출.
//
// 분리 이유 (Server 측 직접 redirect 못 하는 사유):
//   - layouts 는 자식 페이지의 pathname 을 직접 prop 으로 받지 못함 (Next.js 16 App Router).
//   - usePathname() 은 client-only hook — 따라서 본 컴포넌트만 'use client'.
//
// 제외 경로 정책 (redirect 안 함):
//   - /                         : 홈 (둘러보기 — "나중에 결정할게요" 출구).
//   - /settings/privacy-consent : 동의 페이지 자체.
//   - /onboarding               : wizard Step2 가 동의 받는 흐름 (중복 redirect 방지).
//   - /login*                   : 로그인 흐름 중간.
//   - /signup*                  : 가입 흐름.
//   - /auth/*                   : Supabase OAuth / callback.
//   - /privacy, /terms          : 정책 / 약관 페이지 (동의 검토용).
//   - /settings/account         : 계정 삭제 / 데이터 다운로드 (GDPR 잊혀질 권리 보장).
//
// redirect 조건:
//   - hasConsented === false : 인증된 user 가 미동의 — /settings/privacy-consent 로 안내.
//   - hasConsented === null  : 비인증 또는 상태 미확정 — redirect 하지 않음.
//   - hasConsented === true  : 동의 완료 — redirect 불필요.
//
// 익명 user 정책:
//   - 본 가드는 인증 user 만 cover (hasConsented === null 시 redirect 안 함).
//   - 익명 진단 흐름의 PIPA §22-6 부모 동의는 별도 설계 (cookie 권위 흐름과 통합 필요).
//
// graceful UX:
//   - 본 컴포넌트는 시각적 출력 없음 (return null).
//   - router.replace 사용 (history stack 미오염).
//
// CON-04: 본 모듈의 주석 / aria-label 에 의료 단정 금칙어 0건.

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/** 본 게이트가 redirect 를 _수행하지 않는_ 경로 prefix 모음. */
export const CONSENT_REDIRECT_EXCLUDED_PREFIXES: ReadonlyArray<string> = [
  "/settings/privacy-consent",
  "/onboarding",
  "/login",
  "/signup",
  "/auth",
  "/privacy",
  "/terms",
  "/settings/account",
];

/**
 * 주어진 pathname 이 redirect 대상에서 제외되는지 판정.
 * 정확 매칭 + prefix 매칭 (예: "/login/parent", "/auth/callback") 모두 지원.
 *
 * "/" 는 single-char path 라 prefix 매칭 (`startsWith("/")`) 시 모든 path 와 충돌하므로
 * exact match 만 별도 처리. CONSENT_REDIRECT_EXCLUDED_PREFIXES 에서는 의도적으로 제외.
 */
export function isConsentRedirectExcluded(pathname: string): boolean {
  if (!pathname) return true; // 안전 기본값 — 경로 미확정이면 redirect 안 함.
  if (pathname === "/") return true; // 홈은 exact match 만 제외 (둘러보기 출구).
  return CONSENT_REDIRECT_EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export interface ConsentRedirectGateProps {
  /**
   * 서버 측 PIPA 두 동의 완료 여부.
   *   - null  : 비인증 / 미확정 — redirect 안 함.
   *   - true  : 두 동의 모두 완료 — redirect 안 함.
   *   - false : 미동의 인증 user — 제외 path 가 아니면 /settings/privacy-consent 로 router.replace.
   */
  hasConsented: boolean | null;
}

export function ConsentRedirectGate({ hasConsented }: ConsentRedirectGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (triggeredRef.current) return;
    if (hasConsented !== false) return; // null / true → 미실행.
    if (isConsentRedirectExcluded(pathname ?? "")) return;
    triggeredRef.current = true;
    router.replace("/settings/privacy-consent");
  }, [hasConsented, pathname, router]);

  return null;
}

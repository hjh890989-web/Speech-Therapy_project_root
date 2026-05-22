// Next.js 16 `proxy` convention (옛 middleware).
// REQ-NF-019 RBAC + FR-C-005 금칙어 검사 + Sprint 2 §3 anonymousUserId cookie 권위.
//
// Sprint 2 §3 추가: cookie 부재 시 서버 측 Set-Cookie 응답 헤더로 발급.
//   - iOS Safari ITP 의 JS-set cookie 7-day 캡 우회 (Set-Cookie 응답은 full TTL 존중)
//   - 모든 페이지 진입 시 cookie 보장 → /rewards 가 RSC 단계에서 안정적으로 cookie 조회
//   - 클라이언트 hook 은 이 cookie 를 읽어 localStorage 와 동기화
//
// SEC-002 INFO #4 추가 (2026-05-22):
//   /admin 경로 진입 시 사용자 role 검증 (admin / principal / expert 만 통과).
//   비로그인 → /login redirect, 권한 없음 → / redirect (403 효과).
//   lib/auth-role.ts 의 lookupUserRole + isAdminAllowed 사용.
//
// Next.js 16 변경점:
// - 파일명: middleware.ts → proxy.ts (root)
// - 함수명: export function middleware → proxy
// - runtime: edge 미지원, nodejs 고정 (config 불가)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ANONYMOUS_USER_COOKIE, COOKIE_MAX_AGE_SEC } from "@/lib/anonymous-user";
import { isAdminAllowed, isAdminPath, lookupUserRole } from "@/lib/auth-role";

export async function proxy(request: NextRequest) {
  // API-010 §1 — Supabase signup confirmation 이메일은 Site URL 로 redirect 됨
  // (emailRedirectTo 무시). 따라서 `/?code=...` 가 루트로 도착 시 `/auth/callback?code=...`
  // 으로 서버측 redirect. Magic Link 와 signup confirmation 둘 다 호환.
  const url = new URL(request.url);
  if (url.pathname === "/" && url.searchParams.has("code")) {
    const target = new URL("/auth/callback", request.url);
    target.searchParams.set("code", url.searchParams.get("code")!);
    const next = url.searchParams.get("next");
    if (next) target.searchParams.set("next", next);
    return NextResponse.redirect(target);
  }

  const response = NextResponse.next();

  // Sprint 2 §3 — cookie 부재 시 서버 측 발급.
  if (!request.cookies.has(ANONYMOUS_USER_COOKIE)) {
    response.cookies.set({
      name: ANONYMOUS_USER_COOKIE,
      value: crypto.randomUUID(),
      path: "/",
      maxAge: COOKIE_MAX_AGE_SEC,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false, // 클라이언트 hook 도 읽어 localStorage 동기화 필요.
    });
  }

  // SEC-002 INFO #4 — /admin RBAC 분기.
  if (isAdminPath(url.pathname)) {
    const lookup = await lookupUserRole(request, response);

    if (lookup.status === "anonymous") {
      // 비로그인 → /login?next=/admin/...
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", url.pathname + url.search);
      return NextResponse.redirect(loginUrl, { status: 302 });
    }

    if (lookup.status === "error") {
      // Supabase 환경 미설정 / 일시 장애 — 안전한 기본값 = 403 처리.
      const home = new URL("/", request.url);
      home.searchParams.set("forbidden", "admin");
      return NextResponse.redirect(home, { status: 303 });
    }

    if (!isAdminAllowed(lookup.role)) {
      // 인증은 됐으나 권한 부족 → 홈 리다이렉트 + ?forbidden=admin (UI 메시지 분기 가능).
      const home = new URL("/", request.url);
      home.searchParams.set("forbidden", "admin");
      return NextResponse.redirect(home, { status: 303 });
    }
    // 통과 — admin / principal / expert.
  }

  // P1 (FR-C-005): 응답 본문 정규식 스캔 + audit log INSERT.
  return response;
}

// matcher: 정적 자산·이미지 제외, 모든 페이지·API 만 통과.
export const config = {
  matcher: [
    /*
     * 다음 경로 제외:
     * - _next/static (정적 빌드 산출물)
     * - _next/image (next/image 최적화)
     * - favicon, robots, sitemap
     * - public 폴더 (확장자 매칭)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};

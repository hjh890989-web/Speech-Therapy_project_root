// Next.js 16 `proxy` convention (옛 middleware).
// REQ-NF-019 RBAC + FR-C-005 금칙어 검사 + Sprint 2 §3 anonymousUserId cookie 권위.
//
// Sprint 2 §3 추가: cookie 부재 시 서버 측 Set-Cookie 응답 헤더로 발급.
//   - iOS Safari ITP 의 JS-set cookie 7-day 캡 우회 (Set-Cookie 응답은 full TTL 존중)
//   - 모든 페이지 진입 시 cookie 보장 → /rewards 가 RSC 단계에서 안정적으로 cookie 조회
//   - 클라이언트 hook 은 이 cookie 를 읽어 localStorage 와 동기화
//
// Next.js 16 변경점:
// - 파일명: middleware.ts → proxy.ts (root)
// - 함수명: export function middleware → proxy
// - runtime: edge 미지원, nodejs 고정 (config 불가)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ANONYMOUS_USER_COOKIE, COOKIE_MAX_AGE_SEC } from "@/lib/anonymous-user";

export function proxy(request: NextRequest) {
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

  // P1 (API-010): 보호 경로 prefix 체크 + Supabase 세션 갱신 + 역할 기반 차단.
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

// Next.js 16 `proxy` convention (옛 middleware).
// REQ-NF-019 RBAC + FR-C-005 (#28) 금칙어 검사 + Sprint 2 §3 anonymousUserId cookie 권위.
//
// FR-C-005 (#28) 확장:
//   - URL search params 금칙어 스캔 → sanitize 후 303 redirect (`?sanitized=1`).
//   - dev 모드: 응답에 X-Forbidden-Words-Scan: enabled 헤더 부착 (e2e/dev console 마커).
//   - 응답 본문 자체는 stream 이라 미들웨어 단계에서 스캔 불가능 → URL params + 헤더 layer.
//   - 후속 작업: 빌드 타임 정적 스캔 (pre-commit), dev console 페이지 본문 스캔 도구.
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
// FR-Q-TEACHER 확장:
//   /admin/teacher (정확히 또는 /admin/teacher/*) 진입 시 teacher 도 추가 통과.
//   다른 /admin/* 경로는 기존 admin/principal/expert allow-list 유지 (회귀 0건).
//   isTeacherPathAllowed(pathname, role) 가 path scope 제한 보장.
//
// Next.js 16 변경점:
// - 파일명: middleware.ts → proxy.ts (root)
// - 함수명: export function middleware → proxy
// - runtime: edge 미지원, nodejs 고정 (config 불가)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ANONYMOUS_USER_COOKIE, COOKIE_MAX_AGE_SEC } from "@/lib/anonymous-user";
import {
  isAdminAllowed,
  isAdminPath,
  isTeacherPathAllowed,
  lookupUserRole,
} from "@/lib/auth-role";
import {
  FORBIDDEN_WORDS_SANITIZED_HEADER,
  FORBIDDEN_WORDS_SCAN_HEADER,
  scanSearchParams,
} from "@/lib/forbidden-words";

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

  // FR-C-005 (#28) — URL search params 금칙어 스캔.
  //
  // 응답 본문 자체는 NextResponse stream 이라 미들웨어에서 스캔 불가능. 대신 사용자가
  // 직접 입력한 search param value (`?q=치료` 등) 를 sanitize 후 rewrite 한다.
  //   - 차단(redirect) 대신 sanitize → 사용자 흐름 유지 (graceful).
  //   - 시스템 key (`code`, `next`, `forbidden`, `tab`) 는 SCANNED_SEARCH_PARAM_KEYS
  //     allow-list 로 제외 → oauth callback / RBAC redirect 흐름 무영향.
  //   - admin RBAC 분기보다 먼저 수행 — admin path 의 query string 도 정화 대상.
  //
  // sanitize 발생 시 redirect 가 아닌 rewrite (URL 표시는 유지) 를 고려했으나,
  // SEO/북마크 시 금칙어가 남는 문제 + 사용자 안내 (`?sanitized=1`) 가 명확하므로
  // 308 → 303 redirect 로 query 를 깨끗이 비운다.
  if (url.search) {
    const scan = scanSearchParams(url.searchParams);
    if (scan.hits.length > 0) {
      const sanitized = new URL(url.toString());
      for (const key of scan.removedKeys) sanitized.searchParams.delete(key);
      sanitized.searchParams.set("sanitized", "1");
      const redirect = NextResponse.redirect(sanitized, { status: 303 });
      // 디버깅용 — 어떤 key 가 정화됐는지 헤더로 노출 (값 자체는 비공개).
      redirect.headers.set(
        FORBIDDEN_WORDS_SANITIZED_HEADER,
        scan.removedKeys.join(","),
      );
      return redirect;
    }
  }

  const response = NextResponse.next();

  // FR-C-005 (#28) — 개발 모드 전용 응답 헤더. 후속 PR 에서 dev console / e2e 가
  // 본 헤더를 보고 페이지 본문 스캔 트리거.
  if (process.env.NODE_ENV !== "production") {
    response.headers.set(FORBIDDEN_WORDS_SCAN_HEADER, "enabled");
  }

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

    // FR-Q-TEACHER — /admin/teacher path 만 teacher 도 추가 통과.
    // 다른 admin path (예: /admin/principal) 는 기존 RBAC (admin/principal/expert) 유지.
    if (!isAdminAllowed(lookup.role) && !isTeacherPathAllowed(url.pathname, lookup.role)) {
      // 인증은 됐으나 권한 부족 → 홈 리다이렉트 + ?forbidden=admin (UI 메시지 분기 가능).
      const home = new URL("/", request.url);
      home.searchParams.set("forbidden", "admin");
      return NextResponse.redirect(home, { status: 303 });
    }
    // 통과 — admin / principal / expert, 또는 teacher (path = /admin/teacher).
  }

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

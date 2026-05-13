// Next.js 16 `proxy` convention (옛 middleware).
// REQ-NF-019 RBAC + FR-C-005 금칙어 검사의 진입점.
//
// Sprint 1 단계 범위:
// - 모든 요청에 대해 통과만 (no-op). 향후 API-010 (Supabase Auth + RBAC) 가
//   확장 가능한 골격 마련.
// - 금칙어 검사는 lib/text-safety.ts 의 페이지 인라인 sanitize 가 담당.
// - 응답 본문 스트리밍 스캔은 P1 단계에서 본 proxy 에 흡수 (FR-C-005 §AC).
//
// Next.js 16 변경점:
// - 파일명: middleware.ts → proxy.ts (root)
// - 함수명: export function middleware → proxy
// - runtime: edge 미지원, nodejs 고정 (config 불가)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(_request: NextRequest) {
  // P1 (API-010): 보호 경로 prefix 체크 + Supabase 세션 갱신 + 역할 기반 차단.
  // P1 (FR-C-005): 응답 본문 정규식 스캔 + audit log INSERT.
  return NextResponse.next();
}

// matcher: 정적 자산·이미지 제외, 모든 페이지·API 만 통과.
// (Sprint 1 엔 no-op 라 부담 없음 — P1 확장 시 인증 가드 필요한 경로만 좁힐 수 있음.)
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

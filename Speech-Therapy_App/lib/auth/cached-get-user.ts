// Performance 감사 1차 — React cache() 기반 request-scope Supabase auth + role 캐싱.
//
// 동기 (Why):
//   (public) layout.tsx 한 번 렌더 시 다음 RSC 들이 모두 `supabase.auth.getUser()` 를
//   호출한다 — AuthHeader / MainNav / OnboardingRedirectShim / 본 페이지(settings/account 등).
//   현재는 동일 request 안에서 동일 user 에 대해 Supabase 왕복이 3~4 회 발생.
//
//   React 의 `cache()` 는 **단일 request scope** memoization 을 제공한다 (Next.js 16
//   App Router 의 RSC 단위 cache). 동일 인자로 동일 호출은 1회만 실제 실행.
//
// 보완 관계:
//   - `lib/auth-role.ts::lookupUserRole` 은 in-process LRU 60s — middleware (proxy.ts)
//     전용. 본 helper 는 RSC / Server Component 전용. signature 도 다름 (proxy 의 것은
//     NextRequest/Response 어댑터 필수).
//   - 두 캐시는 **scope 가 다름** — request-scope (React cache) vs time-scope (LRU 60s).
//     본 PR 은 RSC 측만 추가, middleware LRU 는 그대로 유지.
//
// 시맨틱:
//   - getCachedUser(): Supabase auth.getUser() 결과를 request scope 1회만 실행.
//     결과는 `{ id, email } | null` — graceful 실패 시 null.
//   - getCachedUserRoleResult(): user 의 DB Role 조회. 호출 측이 "DB 에러" 와 "row 존재 +
//     role=null" 을 구분해야 하므로 discriminated union 반환.
//
// 회귀 0건 보장:
//   - 호출 측 (RSC) 의 try/catch 는 helper 내부에서 동일하게 처리.
//   - 결과 객체 shape 은 호출 측이 의존하는 최소 필드만 노출 (id / email / role).
//   - 인증 우회 / 다른 user 의 role 누설 위험 0 — userId 는 호출 측 외부 입력 미허용.
//
// 비고 (테스트 모킹):
//   `React.cache` 는 dedup 만 보장하며, 테스트 환경에서는 단일 호출 단위로 fresh 하다.
//   따라서 본 helper 의 단위 테스트는 "내부 mock 이 1회만 호출되는지" 를 단일 dedup
//   request 단위로 검증한다 (`getCachedUser()` 를 같은 test 내에서 2번 호출 → mock 1회).

import { cache } from "react";

import { prisma } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** request-scope 캐시된 인증 사용자 정보. */
export interface CachedAuthUser {
  id: string;
  email: string | null;
}

/**
 * DB Role 조회 결과 — discriminated union.
 *
 *  - status="ok": Supabase 인증 + Prisma row 조회 성공. row 가 있으면 role (null 가능),
 *    row 자체가 없을 수도 있음 (호출 측은 미가입 사용자로 처리).
 *  - status="anonymous": 비인증.
 *  - status="error": DB 또는 Supabase 호출 실패. 호출 측은 보수적 fallback.
 */
export type CachedUserRoleResult =
  | { status: "ok"; userId: string; email: string | null; role: string | null }
  | { status: "anonymous" }
  | { status: "error" };

/**
 * Supabase auth.getUser() 의 request-scope 캐시 wrapper.
 *
 * - 동일 request 안에서 N 회 호출 시 1회만 Supabase 왕복.
 * - 실패 (env 미설정 / 네트워크 / 비로그인) 는 일괄 `null` 로 graceful 처리.
 */
export const getCachedUser = cache(async (): Promise<CachedAuthUser | null> => {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    // env 미설정 / Supabase 일시 장애 — 비인증 fallback.
    return null;
  }
});

/**
 * request-scope 캐시된 user.role 조회 — discriminated union.
 *
 * 호출 측은 status 로 분기:
 *   - "anonymous" → 비로그인 처리 (redirect 등).
 *   - "error" → 보수적 fallback (nav 차단 금지 등).
 *   - "ok" → role 값 (null 가능) 사용.
 */
export const getCachedUserRoleResult = cache(
  async (): Promise<CachedUserRoleResult> => {
    const user = await getCachedUser();
    if (!user) return { status: "anonymous" };
    try {
      const row = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      });
      return {
        status: "ok",
        userId: user.id,
        email: user.email,
        role: row?.role ?? null,
      };
    } catch {
      return { status: "error" };
    }
  },
);

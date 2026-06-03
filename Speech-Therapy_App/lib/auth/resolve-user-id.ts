// 공유 사용자 식별자 해소 — 인증 Supabase uid 우선, 없으면 익명 쿠키.
//
// 그동안 app/(public)/missions/page.tsx 에 인라인으로 있던 resolveUserId 를 추출.
// Server Component + Server Action 양쪽에서 재사용(funnel 진입/시작 이벤트 영속 등).
//
// 익명 쿠키(ANONYMOUS_USER_COOKIE)는 proxy.ts 가 모든 페이지 진입 시 보장 발급하므로,
// 대개 인증/익명 중 하나의 id 를 반환. 둘 다 없으면 undefined(graceful — 호출 측 무시).

import { cookies } from "next/headers";

import { ANONYMOUS_USER_COOKIE } from "@/lib/anonymous-user";
import { getCachedUser } from "@/lib/auth/cached-get-user";

/**
 * 현재 사용자 식별자.
 *   1순위: 인증 Supabase uid (getCachedUser — request-scope 캐시, graceful).
 *   2순위: 익명 쿠키 값(anonymous_user_id).
 * 둘 다 없으면 undefined.
 */
export async function resolveUserId(): Promise<string | undefined> {
  const user = await getCachedUser();
  if (user?.id) return user.id;
  const cookieStore = await cookies();
  return cookieStore.get(ANONYMOUS_USER_COOKIE)?.value;
}

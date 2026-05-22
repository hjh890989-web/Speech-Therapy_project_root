// SEC-002 INFO #4 — Middleware RBAC helper.
//
// Refs: GitHub Issue #72, REQ-NF-019 (RBAC), API-010 §2 (Middleware Role 분기).
//
// proxy.ts 가 /admin 경로 진입 사용자 role 을 검증할 때 사용하는 공용 helper.
// proxy.ts (Next.js 16 root middleware 대체) 는 nodejs runtime 으로 고정되므로
// `@supabase/ssr` 의 createServerClient + NextRequest cookies 어댑터를 사용한다.
//
// Prisma 7 은 Edge runtime 미지원 + middleware 부팅 시 connection cost 위험 →
// 본 helper 는 _Supabase 만_ 사용하여 User.role 을 1회 SELECT 한다. (RLS users_select_own 통과)
//
// 캐싱: middleware 는 매 요청 호출되므로 동일 user.id 에 대해 in-process LRU
// 로 60초 캐싱 → Supabase round-trip 최소화. 캐시는 in-memory (per Node.js 인스턴스)
// 라 클러스터 / serverless cold start 마다 초기화 → invalidation 부담 0.
//
// Role enum (prisma/schema.prisma):
//   parent | teacher | principal | expert | admin

import type { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** /admin 진입 허용 role — SEC-002 명세. */
export const ADMIN_ALLOWED_ROLES = ["admin", "principal", "expert"] as const;
export type AdminAllowedRole = (typeof ADMIN_ALLOWED_ROLES)[number];

/** Role 조회 결과. */
export type RoleLookup =
  | { status: "anonymous" } // user 없음
  | { status: "ok"; userId: string; role: string | null }
  | { status: "error"; reason: string };

const ROLE_CACHE_TTL_MS = 60_000;
const roleCache = new Map<string, { role: string | null; expiresAt: number }>();

function cacheGet(userId: string): string | null | undefined {
  const entry = roleCache.get(userId);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    roleCache.delete(userId);
    return undefined;
  }
  return entry.role;
}

function cacheSet(userId: string, role: string | null) {
  roleCache.set(userId, { role, expiresAt: Date.now() + ROLE_CACHE_TTL_MS });
  // 단순 cap — 1000 항목 초과 시 oldest 50개 정리.
  if (roleCache.size > 1000) {
    const drop = Array.from(roleCache.keys()).slice(0, 50);
    for (const k of drop) roleCache.delete(k);
  }
}

/** 테스트용 — 캐시 초기화. */
export function _resetRoleCacheForTesting() {
  roleCache.clear();
}

/**
 * proxy.ts 안에서 사용자 인증 + role 을 lookup.
 *
 * - Supabase auth session (cookies) 부재 → status="anonymous"
 * - User 테이블 SELECT 실패 (env 미설정 / RLS) → status="error"
 * - 성공 → status="ok" + role (DB User.role, 미가입 사용자는 null)
 */
export async function lookupUserRole(
  request: NextRequest,
  response: NextResponse,
): Promise<RoleLookup> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { status: "error", reason: "supabase_env_missing" };
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        // session refresh 시 response cookie 갱신.
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set({ name, value, ...options });
        }
      },
    },
  });

  let userId: string | undefined;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { status: "anonymous" };
    userId = data.user.id;
  } catch {
    return { status: "anonymous" };
  }

  const cached = cacheGet(userId);
  if (cached !== undefined) {
    return { status: "ok", userId, role: cached };
  }

  try {
    const { data, error } = await supabase
      .from("User")
      .select("role")
      .eq("id", userId)
      .maybeSingle<{ role: string | null }>();
    if (error) return { status: "error", reason: error.message };
    const role = data?.role ?? null;
    cacheSet(userId, role);
    return { status: "ok", userId, role };
  } catch (e) {
    return { status: "error", reason: (e as Error).message };
  }
}

/** role 이 /admin 진입 허용 목록에 있는지. */
export function isAdminAllowed(role: string | null | undefined): role is AdminAllowedRole {
  if (!role) return false;
  return (ADMIN_ALLOWED_ROLES as readonly string[]).includes(role);
}

/** 경로가 /admin RBAC 보호 대상인지 (정확히 /admin 또는 /admin/* subpath). */
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

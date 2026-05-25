// FR-NAV-SEARCH — GlobalSearchSlot (Server Component).
//
// 책임:
//   - getCachedUserRoleResult() 로 viewer role 조회 (React cache — 동일 request 안에서 1회만 실제 호출)
//   - 운영자 (admin/principal/teacher) 만 GlobalSearch 클라이언트 컴포넌트 mount
//   - parent / expert / anonymous → null 반환 (검색 비활성)
//
// admin layout 안에서 mount — 본 slot 이 fetch 책임을 가지므로 layout 은 단순히 import 만.
// MainNav 와는 별도 Suspense — fetch 캐시는 React cache() 가 dedupe.

import { Suspense } from "react";

import { getCachedUserRoleResult } from "@/lib/auth/cached-get-user";
import { isSearchEnabledRole } from "@/lib/search/global";

import { GlobalSearch } from "./GlobalSearch";

async function GlobalSearchInner() {
  const result = await getCachedUserRoleResult();
  if (result.status !== "ok") return null;
  const { role } = result;
  if (!role || !isSearchEnabledRole(role)) return null;
  // role 타입 narrowing — isSearchEnabledRole 보장 후 cast 안전.
  return <GlobalSearch role={role as "admin" | "principal" | "teacher"} />;
}

export function GlobalSearchSlot() {
  return (
    <Suspense fallback={null}>
      <GlobalSearchInner />
    </Suspense>
  );
}

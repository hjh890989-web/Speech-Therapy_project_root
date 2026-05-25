// FR-NAV (메인 navigation 통합 — admin 영역) — /admin/* 경로 layout.
//
// 배경:
//   기존 commit f6fa2d0 가 (public)/layout.tsx 에만 MainNav 를 mount → /admin/* 페이지는
//   nav 미노출 상태였음. 본 layout 으로 /admin/principal, /admin/teacher, /admin/hitl,
//   /admin/cushion-notes 등 admin 영역 전반에 MainNav 를 동일하게 노출.
//
// 책임:
//   1) Suspense 로 wrap 된 <MainNav /> 1개 mount — role 별 메뉴 (admin / principal / teacher /
//      expert) 가 그대로 RSC 내부에서 산출됨.
//   2) 기존 admin 페이지 구조 (page.tsx + error.tsx + loading.tsx) 보존 — 본 layout 은
//      <main> wrap 만 추가.
//
// 의도적으로 미포함:
//   - OnboardingRedirectGate : admin / principal / teacher 운영자 계정은 onboarding 대상 X.
//   - AuthHeader            : (public) 그룹 전용 helper. admin 영역은 MainNav 만 노출.
//   - L1/L2 RBAC            : proxy.ts (admin/principal/expert L1) + 각 page.tsx 의 L2 가드 분리.
//
// 회귀 0건:
//   - 기존 admin 페이지 (principal/teacher/hitl/cushion-notes 등) 는 본 layout 의 children 으로
//     동일하게 마운트 — 페이지 내부 redirect / 데이터 로딩 / RBAC 흐름 미변경.
//   - <main> 으로 wrap 하므로 글로벌 CSS 의 layout selector 가 (public) 와 동일하게 적용.
//
// LCP 영향:
//   - <Suspense fallback={null}> 으로 MainNav 자체가 page LCP 차단 0건.
//   - MainNav 내부 fetchCurrentNavRole (Supabase + Prisma 단건) 는 (public) layout 과 동일 비용.

import { Suspense } from "react";

import { MainNav } from "@/components/nav/MainNav";
import { GlobalSearchSlot } from "@/components/search/GlobalSearchSlot";

// admin 영역도 (public) 와 동일하게 매 요청 fresh 렌더 — Supabase auth + DB role 변경 반영.
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Suspense fallback={null}>
        <MainNav />
      </Suspense>
      {/* FR-NAV-SEARCH — 글로벌 검색 box (admin/principal/teacher 만 노출, 내부 RBAC). */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-end px-4 py-2">
        <GlobalSearchSlot />
      </div>
      <main>{children}</main>
    </>
  );
}

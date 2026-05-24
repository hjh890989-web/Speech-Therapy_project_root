// FR-NAV (admin 영역) — app/admin/layout.tsx 통합 테스트.
//
// 배경:
//   기존 commit f6fa2d0 가 (public)/layout.tsx 에만 MainNav mount → /admin/* 페이지는
//   nav 미노출. 본 layout 추가로 admin 영역 전반에 동일 nav 통합.
//
// 격리:
//   - @/lib/supabase/server.getSupabaseServerClient mock (auth.getUser)
//   - @/lib/db.prisma.user.findUnique mock (role 단건 조회)
//   - next/navigation usePathname mock (MainNavClient active path 강조)
//   - @/lib/analytics / @/app/actions/auth stub (mount 동작만 검증)
//
// 검증 시나리오 (총 5건):
//   1. AdminLayout 구조 — Suspense + main 으로 children 노출 (admin 페이지 회귀 0)
//   2. admin role → MainNav 노출 + admin 전용 메뉴 (/admin/principal, /admin/teacher, /admin/hitl)
//   3. principal role → /admin/principal + /admin/teacher 노출, /admin/hitl 미노출
//   4. teacher role → /admin/teacher 노출, principal/hitl 미노출
//   5. expert role → /admin/hitl 노출, principal/teacher 미노출

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// ============================================================================
// Mocks
// ============================================================================
const usePathnameMock = vi.fn<() => string | null>(() => "/admin/principal");
vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));

const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
  },
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/app/actions/auth", () => ({
  signOut: vi.fn(async () => {}),
}));

import AdminLayout from "@/app/admin/layout";
import {
  MainNav,
  buildNavItemsForRole,
} from "@/components/nav/MainNav";
import { MainNavClient, type MainNavRole } from "@/components/nav/MainNavClient";

beforeEach(() => {
  usePathnameMock.mockReset();
  usePathnameMock.mockReturnValue("/admin/principal");
  getUserMock.mockReset();
  findUniqueMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("app/admin/layout.tsx — MainNav 통합", () => {
  it("시나리오 1: AdminLayout 구조 — Suspense + <main> children 보존 (회귀 0)", () => {
    const { container } = render(
      <AdminLayout>
        <div data-testid="admin-child">admin page contents</div>
      </AdminLayout>,
    );
    // children 노출 + <main> wrap.
    const child = screen.getByTestId("admin-child");
    expect(child.textContent).toBe("admin page contents");
    const main = child.closest("main");
    expect(main).toBeTruthy();
    // <main> 이 layout 안에 정확히 1개.
    expect(container.querySelectorAll("main").length).toBe(1);
  });

  it("시나리오 2: MainNav (admin role 주입) → admin 전용 메뉴 (/admin/principal + /admin/teacher + /admin/hitl)", async () => {
    // AdminLayout 내부 <Suspense> 의 async MainNav 는 test renderer 가 resolve 못 함 →
    // MainNav 자체를 await 후 MainNavClient 단위로 마운트 검증.
    // 본 시나리오는 layout 안에서 mount 될 동일 컴포넌트가 admin role 메뉴를 산출함을 검증.
    const node = await MainNav({ role: "admin", userEmail: "admin@example.com" });
    render(node);
    const nav = await screen.findByTestId("main-nav");
    expect(nav.getAttribute("data-role")).toBe("admin");
    const desktop = screen.getByTestId("main-nav-desktop");
    const hrefs = Array.from(desktop.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/admin/principal");
    expect(hrefs).toContain("/admin/teacher");
    expect(hrefs).toContain("/admin/hitl");
  });

  it("시나리오 3: principal role → /admin/principal + /admin/teacher, /admin/hitl 미노출", () => {
    const items = buildNavItemsForRole("principal");
    render(<MainNavClient items={items} role="principal" userEmail={null} />);
    const nav = screen.getByTestId("main-nav");
    expect(nav.getAttribute("data-role")).toBe("principal");
    const desktop = screen.getByTestId("main-nav-desktop");
    const hrefs = Array.from(desktop.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/admin/principal");
    expect(hrefs).toContain("/admin/teacher");
    expect(hrefs).not.toContain("/admin/hitl");
  });

  it("시나리오 4: teacher role → /admin/teacher 노출, principal/hitl 미노출", () => {
    usePathnameMock.mockReturnValue("/admin/teacher");
    const items = buildNavItemsForRole("teacher");
    render(<MainNavClient items={items} role="teacher" userEmail={null} />);
    const nav = screen.getByTestId("main-nav");
    expect(nav.getAttribute("data-role")).toBe("teacher");
    const desktop = screen.getByTestId("main-nav-desktop");
    const hrefs = Array.from(desktop.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/admin/teacher");
    expect(hrefs).not.toContain("/admin/principal");
    expect(hrefs).not.toContain("/admin/hitl");
  });

  it("시나리오 5: expert role → /admin/hitl 노출, principal/teacher 미노출", () => {
    usePathnameMock.mockReturnValue("/admin/hitl");
    const items = buildNavItemsForRole("expert" as MainNavRole);
    render(<MainNavClient items={items} role="expert" userEmail={null} />);
    const nav = screen.getByTestId("main-nav");
    expect(nav.getAttribute("data-role")).toBe("expert");
    const desktop = screen.getByTestId("main-nav-desktop");
    const hrefs = Array.from(desktop.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/admin/hitl");
    expect(hrefs).not.toContain("/admin/principal");
    expect(hrefs).not.toContain("/admin/teacher");
  });
});

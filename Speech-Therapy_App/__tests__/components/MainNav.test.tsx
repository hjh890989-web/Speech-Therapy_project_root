// FR-NAV — MainNav (Server Component) + MainNavClient (Client Component) 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server.getSupabaseServerClient mock (auth.getUser)
//   - @/lib/db.prisma.user.findUnique mock (role 단건 조회)
//   - @/app/actions/auth.signOut mock (form action 동작 검증)
//   - @/lib/analytics.trackEvent mock (nav_clicked 발송 검증)
//   - next/navigation usePathname mock (active path 강조)
//
// 검증 시나리오 (총 14건 + "설정" 추가 4건):
//   pure helpers:
//     1) buildNavItemsForRole("anonymous") → diagnose 1개
//     2) buildNavItemsForRole("parent") → 5개 (weekly-review / missions / rewards/collection / predictions / settings)
//     3) buildNavItemsForRole("teacher") → 부모 3개 + /admin/teacher + /settings
//     4) buildNavItemsForRole("principal") → 부모 4개 + admin/principal + admin/teacher + /settings
//     5) buildNavItemsForRole("admin") → 부모 4개 + principal + teacher + hitl + /settings
//     6) buildNavItemsForRole("expert") → 부모 3개 + /admin/hitl + /settings
//     7) isPathActive — 정확 매치 + prefix 매치 + null 분기
//   client component:
//     8) anonymous → 로그인 링크 + diagnose 노출 (/settings 미노출)
//     9) parent → 부모 메뉴 4개 + /settings + 로그아웃 form 노출
//    10) active path (/weekly-review) → aria-current="page" + data-active="true"
//    11) admin → admin/principal + admin/teacher + admin/hitl 동시 노출
//    12) expert → admin/hitl 노출, principal/teacher 미노출
//   server component fetch:
//    13) MainNav fetch — 인증 + DB role=principal → role=principal 으로 렌더
//    14) MainNav fetch — Supabase 에러 → anonymous fallback
//   CON-04:
//    15) 모든 role 의 메뉴 라벨 + aria-label 에 금칙어 (진단/치료/장애/환자/병/증상) 0건
//   "설정" 메뉴 (신규 4건):
//    16) buildNavItemsForRole — anonymous 제외 모든 인증 role 에 /settings 포함
//    17) MainNavClient — parent 데스크탑 nav 에 "설정" 링크 (href=/settings, emoji=⚙️) 노출
//    18) MainNavClient — 모바일 hamburger 안에도 "설정" 노출 + teacher role 검증
//    19) isPathActive — /settings/calibration / /settings/child sub-route 진입 시 "설정" 강조

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// ----- Mocks -----
const usePathnameMock = vi.fn<() => string | null>(() => "/");
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

const signOutMock = vi.fn(async (..._args: unknown[]) => {});
vi.mock("@/app/actions/auth", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

import {
  MainNav,
  buildNavItemsForRole,
  fetchCurrentNavRole,
} from "@/components/nav/MainNav";
import {
  MainNavClient,
  isPathActive,
  type MainNavRole,
} from "@/components/nav/MainNavClient";
import { containsBannedTerms } from "@/lib/text-safety";

async function renderAsync(node: Promise<React.ReactElement>) {
  const resolved = await node;
  return render(resolved);
}

beforeEach(() => {
  usePathnameMock.mockReset();
  usePathnameMock.mockReturnValue("/");
  getUserMock.mockReset();
  findUniqueMock.mockReset();
  signOutMock.mockReset();
  trackMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("buildNavItemsForRole — role 별 메뉴 매트릭스", () => {
  it("시나리오 1: anonymous → diagnose 1개", () => {
    const items = buildNavItemsForRole("anonymous");
    expect(items.map((i) => i.href)).toEqual(["/diagnose"]);
  });

  it("시나리오 2: parent → 5개 (weekly-review / missions / rewards/collection / predictions / settings)", () => {
    const items = buildNavItemsForRole("parent");
    expect(items.map((i) => i.href)).toEqual([
      "/weekly-review",
      "/missions",
      "/rewards/collection",
      "/predictions",
      "/settings",
    ]);
  });

  it("시나리오 3: teacher → 부모 일부 (3개) + /admin/teacher + /settings", () => {
    const items = buildNavItemsForRole("teacher");
    const hrefs = items.map((i) => i.href);
    expect(hrefs).toContain("/weekly-review");
    expect(hrefs).toContain("/missions");
    expect(hrefs).toContain("/rewards/collection");
    expect(hrefs).toContain("/admin/teacher");
    expect(hrefs).toContain("/settings");
    // teacher 는 /predictions / /admin/principal / /admin/hitl 접근 안 함.
    expect(hrefs).not.toContain("/predictions");
    expect(hrefs).not.toContain("/admin/principal");
    expect(hrefs).not.toContain("/admin/hitl");
  });

  it("시나리오 4: principal → 부모 4개 + /admin/principal + /admin/teacher + /settings", () => {
    const items = buildNavItemsForRole("principal");
    const hrefs = items.map((i) => i.href);
    expect(hrefs).toContain("/weekly-review");
    expect(hrefs).toContain("/missions");
    expect(hrefs).toContain("/rewards/collection");
    expect(hrefs).toContain("/predictions");
    expect(hrefs).toContain("/admin/principal");
    expect(hrefs).toContain("/admin/teacher");
    expect(hrefs).toContain("/settings");
    expect(hrefs).not.toContain("/admin/hitl");
  });

  it("시나리오 5: admin → principal 메뉴 + HITL + /settings", () => {
    const items = buildNavItemsForRole("admin");
    const hrefs = items.map((i) => i.href);
    expect(hrefs).toContain("/admin/principal");
    expect(hrefs).toContain("/admin/teacher");
    expect(hrefs).toContain("/admin/hitl");
    expect(hrefs).toContain("/weekly-review");
    expect(hrefs).toContain("/settings");
  });

  it("시나리오 6: expert → 부모 일부 + /admin/hitl + /settings (principal/teacher 미포함)", () => {
    const items = buildNavItemsForRole("expert");
    const hrefs = items.map((i) => i.href);
    expect(hrefs).toContain("/admin/hitl");
    expect(hrefs).not.toContain("/admin/principal");
    expect(hrefs).not.toContain("/admin/teacher");
    expect(hrefs).toContain("/weekly-review");
    expect(hrefs).toContain("/settings");
  });

  it("시나리오 16: anonymous 제외 모든 인증 role 에 /settings 노출 (parent/teacher/principal/admin/expert)", () => {
    const authedRoles: MainNavRole[] = [
      "parent",
      "teacher",
      "principal",
      "admin",
      "expert",
    ];
    for (const role of authedRoles) {
      const hrefs = buildNavItemsForRole(role).map((i) => i.href);
      expect(hrefs, `role=${role} 에 /settings 미포함`).toContain("/settings");
    }
    // anonymous 는 /settings 미노출 — 로그인 우선.
    expect(buildNavItemsForRole("anonymous").map((i) => i.href)).not.toContain(
      "/settings",
    );
  });

  it("'설정' 메뉴 메타 — label='설정', emoji='⚙️' (모든 인증 role 일관)", () => {
    const authedRoles: MainNavRole[] = [
      "parent",
      "teacher",
      "principal",
      "admin",
      "expert",
    ];
    for (const role of authedRoles) {
      const settingsItem = buildNavItemsForRole(role).find(
        (i) => i.href === "/settings",
      );
      expect(settingsItem, `role=${role} settings 항목 누락`).toBeTruthy();
      expect(settingsItem!.label).toBe("설정");
      expect(settingsItem!.emoji).toBe("⚙️");
    }
  });

  // FR-Q-022 — F15 챗봇 nav 게이팅 (f15ChatEnabled 입력 기반).
  it("F15 비활성(default) → '이야기 친구'(/chat) 미노출 (전 role)", () => {
    for (const role of ["anonymous", "parent", "teacher", "principal", "admin", "expert"] as MainNavRole[]) {
      expect(buildNavItemsForRole(role).map((i) => i.href)).not.toContain("/chat");
      // 명시적 false 도 동일.
      expect(buildNavItemsForRole(role, { f15ChatEnabled: false }).map((i) => i.href)).not.toContain("/chat");
    }
  });

  it("F15 활성 → parent/principal/admin 에 '이야기 친구'(/chat) 노출, teacher/expert·anonymous 는 미노출", () => {
    const has = (role: MainNavRole) =>
      buildNavItemsForRole(role, { f15ChatEnabled: true }).map((i) => i.href).includes("/chat");
    expect(has("parent")).toBe(true);
    expect(has("principal")).toBe(true);
    expect(has("admin")).toBe(true);
    // 운영자(부분 부모메뉴)·익명은 미노출.
    expect(has("teacher")).toBe(false);
    expect(has("expert")).toBe(false);
    expect(has("anonymous")).toBe(false);
    // parent 위치 — 예측 뒤, 설정 앞.
    const parentHrefs = buildNavItemsForRole("parent", { f15ChatEnabled: true }).map((i) => i.href);
    expect(parentHrefs).toEqual([
      "/weekly-review",
      "/missions",
      "/rewards/collection",
      "/predictions",
      "/chat",
      "/settings",
    ]);
  });
});

describe("isPathActive — 정확 매치 + prefix", () => {
  it.each([
    ["/weekly-review", "/weekly-review", true],
    ["/weekly-review/", "/weekly-review", true], // trailing slash 도 prefix 매칭 (startsWith("href/"))
    ["/missions/123", "/missions", true], // sub-route
    ["/admin/teacher/students", "/admin/teacher", true],
    ["/admin/principal", "/admin/teacher", false],
    ["/", "/diagnose", false],
    ["", "/diagnose", false],
  ] as const)("isPathActive('%s', '%s') → %s", (current, href, expected) => {
    expect(isPathActive(current || null, href)).toBe(expected);
  });

  it("null path → false", () => {
    expect(isPathActive(null, "/missions")).toBe(false);
  });
});

describe("MainNavClient — role 별 렌더 + active 강조 + 로그아웃 + nav_clicked", () => {
  function renderClient(role: MainNavRole, pathname = "/", email: string | null = null) {
    usePathnameMock.mockReturnValue(pathname);
    const items = buildNavItemsForRole(role);
    return render(
      <MainNavClient items={items} role={role} userEmail={email} />,
    );
  }

  it("시나리오 8: anonymous → 로그인 링크 + diagnose 노출", () => {
    renderClient("anonymous");
    const nav = screen.getByTestId("main-nav");
    expect(nav).toHaveAttribute("data-role", "anonymous");
    // 데스크탑 영역에서 발음 발달 확인 + 로그인 노출.
    const desktop = screen.getByTestId("main-nav-desktop");
    expect(desktop.textContent ?? "").toContain("발음 발달 확인");
    // 데스크탑 프로필 영역에 로그인 노출.
    const profile = screen.getByTestId("main-nav-profile");
    expect(profile.textContent ?? "").toContain("로그인");
    // 로그아웃 form 미노출.
    expect(screen.queryByRole("button", { name: "로그아웃" })).toBeNull();
  });

  it("시나리오 9: parent → 부모 메뉴 4개 + 설정 + 로그아웃 form 노출", () => {
    renderClient("parent", "/", "parent@example.com");
    const desktop = screen.getByTestId("main-nav-desktop");
    const text = desktop.textContent ?? "";
    expect(text).toContain("우리 아이 주간 리뷰");
    expect(text).toContain("미션 도전");
    expect(text).toContain("보상 도감");
    expect(text).toContain("예측 보기");
    expect(text).toContain("설정");
    // 로그아웃 버튼 존재.
    const logoutButtons = screen.getAllByRole("button", { name: "로그아웃" });
    expect(logoutButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("시나리오 17: parent 데스크탑 nav 에 '설정' 링크 (href=/settings) 노출", () => {
    renderClient("parent", "/");
    const desktop = screen.getByTestId("main-nav-desktop");
    const links = Array.from(desktop.querySelectorAll("a"));
    const settingsLink = links.find((a) => a.getAttribute("href") === "/settings");
    expect(settingsLink).toBeTruthy();
    expect(settingsLink!.textContent ?? "").toContain("설정");
  });

  it("시나리오 18: teacher 모바일 hamburger 안에도 '설정' 노출 (vertical list)", () => {
    renderClient("teacher", "/");
    const mobileList = screen.getByTestId("main-nav-mobile-list");
    const hrefs = Array.from(mobileList.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/settings");
    // 동시에 teacher 의 다른 메뉴도 hamburger 안에 노출 (회귀 0건).
    expect(hrefs).toContain("/admin/teacher");
    expect(hrefs).toContain("/weekly-review");
  });

  it("시나리오 19: /settings/calibration sub-route 진입 시 '설정' 메뉴 강조 (aria-current=page)", () => {
    renderClient("parent", "/settings/calibration");
    const desktop = screen.getByTestId("main-nav-desktop");
    const settingsLink = Array.from(desktop.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/settings",
    );
    expect(settingsLink).toBeTruthy();
    expect(settingsLink!.getAttribute("aria-current")).toBe("page");
    expect(settingsLink!.getAttribute("data-active")).toBe("true");
    // 다른 링크 (예: /missions) 는 active 가 아님.
    const missionsLink = Array.from(desktop.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/missions",
    );
    expect(missionsLink?.getAttribute("data-active")).toBe("false");
  });

  it("시나리오 19b: /settings 정확 진입 시에도 강조", () => {
    renderClient("parent", "/settings");
    const desktop = screen.getByTestId("main-nav-desktop");
    const settingsLink = Array.from(desktop.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/settings",
    );
    expect(settingsLink!.getAttribute("aria-current")).toBe("page");
  });

  it("시나리오 10: active path (/weekly-review) → aria-current=page + data-active=true", () => {
    renderClient("parent", "/weekly-review");
    // 데스크탑 link 중 weekly-review 만 aria-current="page".
    const desktop = screen.getByTestId("main-nav-desktop");
    const links = Array.from(desktop.querySelectorAll("a"));
    const activeLink = links.find((a) => a.getAttribute("href") === "/weekly-review");
    expect(activeLink).toBeTruthy();
    expect(activeLink!.getAttribute("aria-current")).toBe("page");
    expect(activeLink!.getAttribute("data-active")).toBe("true");
    // 다른 링크는 active 아님.
    const inactiveLink = links.find((a) => a.getAttribute("href") === "/missions");
    expect(inactiveLink?.getAttribute("aria-current")).toBeNull();
    expect(inactiveLink?.getAttribute("data-active")).toBe("false");
  });

  it("시나리오 11: admin → admin/principal + admin/teacher + admin/hitl 동시 노출", () => {
    renderClient("admin");
    const desktop = screen.getByTestId("main-nav-desktop");
    const hrefs = Array.from(desktop.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/admin/principal");
    expect(hrefs).toContain("/admin/teacher");
    expect(hrefs).toContain("/admin/hitl");
  });

  it("시나리오 12: expert → /admin/hitl 노출 + principal/teacher 미노출", () => {
    renderClient("expert");
    const desktop = screen.getByTestId("main-nav-desktop");
    const hrefs = Array.from(desktop.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/admin/hitl");
    expect(hrefs).not.toContain("/admin/principal");
    expect(hrefs).not.toContain("/admin/teacher");
  });

  it("nav 링크 클릭 시 trackEvent('nav_clicked') 발송 — destination + role", () => {
    renderClient("parent", "/");
    const desktop = screen.getByTestId("main-nav-desktop");
    const missionsLink = Array.from(desktop.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/missions",
    );
    expect(missionsLink).toBeTruthy();
    fireEvent.click(missionsLink!);
    expect(trackMock).toHaveBeenCalledWith("nav_clicked", {
      destination: "/missions",
      role: "parent",
    });
  });

  it("로그아웃 form 의 action 은 signOut Server Action 으로 wiring 됨", () => {
    renderClient("parent", "/");
    const buttons = screen.getAllByRole("button", { name: "로그아웃" });
    // 첫 번째 form 확인 — form action prop 은 React 가 hidden input 으로 inject 하므로
    // 본 단위 테스트는 form 자체 존재 + signOut import 식별만 검증.
    expect(buttons[0]?.closest("form")).toBeTruthy();
    // signOut Server Action 자체 실 호출은 통합 테스트에서 검증 — 본 단위는 module wiring 만.
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("모바일 hamburger — details/summary 존재 + 모바일 메뉴 list 렌더", () => {
    renderClient("parent", "/");
    const mobile = screen.getByTestId("main-nav-mobile");
    expect(mobile.tagName.toLowerCase()).toBe("details");
    // summary 존재.
    const summary = mobile.querySelector("summary");
    expect(summary).toBeTruthy();
    expect(summary?.getAttribute("aria-label")).toBe("메뉴 열기");
    // 메뉴 list 안에 부모 메뉴 4개 렌더.
    const mobileList = screen.getByTestId("main-nav-mobile-list");
    const hrefs = Array.from(mobileList.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/weekly-review");
    expect(hrefs).toContain("/missions");
  });
});

describe("MainNav (RSC) — fetchCurrentNavRole + 렌더 통합", () => {
  it("시나리오 13: 인증 + DB role=principal → role=principal 으로 렌더", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "u-1", email: "p@example.com" } },
    });
    findUniqueMock.mockResolvedValueOnce({ role: "principal" });

    await renderAsync(MainNav({ role: undefined }));
    // Suspense fallback 안의 async — render 가 await 했으므로 즉시 DOM 노출.
    const nav = await screen.findByTestId("main-nav");
    expect(nav.getAttribute("data-role")).toBe("principal");
  });

  it("시나리오 14: Supabase 에러 (env 미설정) → anonymous fallback", async () => {
    // getSupabaseServerClient mock 이 throw 하도록 swap.
    getUserMock.mockImplementationOnce(() => {
      throw new Error("supabase env missing");
    });

    const result = await fetchCurrentNavRole();
    expect(result.role).toBe("anonymous");
    expect(result.userEmail).toBeNull();
  });

  it("fetchCurrentNavRole — 인증 + DB role 미정 (null) → parent 폴백", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "u-2", email: "x@example.com" } },
    });
    findUniqueMock.mockResolvedValueOnce({ role: null });
    const result = await fetchCurrentNavRole();
    expect(result.role).toBe("parent");
    expect(result.userEmail).toBe("x@example.com");
  });

  it("fetchCurrentNavRole — Prisma 에러 → anonymous fallback", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "u-3", email: "x@example.com" } },
    });
    findUniqueMock.mockRejectedValueOnce(new Error("db down"));
    const result = await fetchCurrentNavRole();
    expect(result.role).toBe("anonymous");
  });

  it("fetchCurrentNavRole — 비인증 (user null) → anonymous", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    const result = await fetchCurrentNavRole();
    expect(result.role).toBe("anonymous");
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});

describe("CON-04 — 메뉴 라벨에 금칙어 0건", () => {
  it("시나리오 15: 모든 role 의 메뉴 라벨 + emoji 텍스트에 금칙어 (진단/치료/장애/환자/병/증상) 0건", () => {
    const roles: MainNavRole[] = [
      "anonymous",
      "parent",
      "teacher",
      "principal",
      "expert",
      "admin",
    ];
    for (const role of roles) {
      const items = buildNavItemsForRole(role);
      for (const item of items) {
        expect(
          containsBannedTerms(item.label),
          `role=${role} item.label="${item.label}" 가 금칙어 매칭됨`,
        ).toBe(false);
      }
    }
  });

  it("nav 렌더 결과 DOM 텍스트에도 금칙어 0건 (parent 시나리오)", () => {
    usePathnameMock.mockReturnValue("/");
    const items = buildNavItemsForRole("parent");
    render(<MainNavClient items={items} role="parent" userEmail={null} />);
    const nav = screen.getByTestId("main-nav");
    const text = nav.textContent ?? "";
    expect(containsBannedTerms(text)).toBe(false);
  });
});

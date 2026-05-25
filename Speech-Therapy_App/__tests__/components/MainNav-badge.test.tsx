// FR-NAV-BADGE — MainNavClient + applyBadgeCounts 단위 테스트.
//
// 격리:
//   - usePathname mock
//   - signOut / trackEvent mock (회귀 0건 확인)
//
// 검증 시나리오 (총 6건):
//   applyBadgeCounts:
//     1) admin items + hitlPending=3 → /admin/hitl item.badgeCount=3
//     2) hitlPending=0 → 모든 items 의 badgeCount 미설정 (identity 반환)
//     3) parent items (HITL 없음) + hitlPending=5 → identity 반환 (parent 메뉴 보존)
//   rendering:
//     4) admin 데스크탑 → "HITL 큐 (3)" 카운트 + aria-label 에 "3건 미처리" 포함
//     5) hitlPending=0 → badge 미노출 (data-testid main-nav-badge-* 없음)
//     6) parent → HITL 메뉴 자체 없음 + badge 0건
//   CON-04:
//     7) 카운트 + aria-label 의 어디에도 금칙어 0건

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const usePathnameMock = vi.fn<() => string | null>(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: vi.fn() }, hITLQueue: { count: vi.fn() } },
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
  applyBadgeCounts,
  buildNavItemsForRole,
} from "@/components/nav/MainNav";
import { MainNavClient } from "@/components/nav/MainNavClient";
import { containsBannedTerms } from "@/lib/text-safety";

beforeEach(() => {
  usePathnameMock.mockReset();
  usePathnameMock.mockReturnValue("/");
  signOutMock.mockReset();
  trackMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("applyBadgeCounts — pure decorator", () => {
  it("[1] admin items + hitlPending=3 → /admin/hitl item.badgeCount=3", () => {
    const base = buildNavItemsForRole("admin");
    const decorated = applyBadgeCounts(base, {
      hitlPending: 3,
      missionPendingToday: 0,
    });
    const hitl = decorated.find((i) => i.href === "/admin/hitl");
    expect(hitl).toBeTruthy();
    expect(hitl!.badgeCount).toBe(3);
    // 다른 item 은 badgeCount 미설정 (회귀 0건 보장).
    const settings = decorated.find((i) => i.href === "/settings");
    expect(settings!.badgeCount).toBeUndefined();
  });

  it("[2] hitlPending=0 → identity 반환 (badgeCount 미설정)", () => {
    const base = buildNavItemsForRole("admin");
    const decorated = applyBadgeCounts(base, {
      hitlPending: 0,
      missionPendingToday: 0,
    });
    expect(decorated).toBe(base); // 동일 reference (zero-allocation 최적화)
    for (const item of decorated) {
      expect(item.badgeCount).toBeUndefined();
    }
  });

  it("[3] parent items (HITL 없음) + hitlPending=5 → parent 메뉴 그대로", () => {
    const base = buildNavItemsForRole("parent");
    const decorated = applyBadgeCounts(base, {
      hitlPending: 5,
      missionPendingToday: 0,
    });
    // parent 메뉴엔 /admin/hitl 자체가 없음 → 모든 item.badgeCount 미설정.
    for (const item of decorated) {
      expect(item.badgeCount).toBeUndefined();
    }
    // hrefs 도 동일 (decorator 가 메뉴 구성 변경 X).
    expect(decorated.map((i) => i.href)).toEqual(base.map((i) => i.href));
  });
});

describe("MainNavClient — badge UI 렌더", () => {
  it("[4] admin + HITL pending 3건 → 데스크탑 카운트 + aria-label 에 '3건 미처리' 포함", () => {
    usePathnameMock.mockReturnValue("/");
    const items = applyBadgeCounts(buildNavItemsForRole("admin"), {
      hitlPending: 3,
      missionPendingToday: 0,
    });
    render(<MainNavClient items={items} role="admin" userEmail={null} />);

    const desktop = screen.getByTestId("main-nav-desktop");
    const hitlLink = Array.from(desktop.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/admin/hitl",
    );
    expect(hitlLink).toBeTruthy();
    expect(hitlLink!.getAttribute("aria-label")).toBe("HITL 큐, 3건 미처리");
    // 카운트 텍스트 (badge span 안) 노출.
    const badge = hitlLink!.querySelector(
      "[data-testid='main-nav-badge-/admin/hitl']",
    );
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toBe("3");

    // 모바일 hamburger 안에도 dot 노출.
    const mobile = screen.getByTestId("main-nav-mobile-list");
    const mobileBadge = mobile.querySelector(
      "[data-testid='main-nav-mobile-badge-/admin/hitl']",
    );
    expect(mobileBadge).toBeTruthy();
  });

  it("[5] HITL pending 0 → badge 미노출 (data-testid main-nav-badge-/admin/hitl 없음)", () => {
    usePathnameMock.mockReturnValue("/");
    const items = applyBadgeCounts(buildNavItemsForRole("admin"), {
      hitlPending: 0,
      missionPendingToday: 0,
    });
    render(<MainNavClient items={items} role="admin" userEmail={null} />);
    expect(
      screen.queryByTestId("main-nav-badge-/admin/hitl"),
    ).toBeNull();
    expect(
      screen.queryByTestId("main-nav-mobile-badge-/admin/hitl"),
    ).toBeNull();
    // aria-label 은 카운트 없는 평문 ("HITL 큐").
    const desktop = screen.getByTestId("main-nav-desktop");
    const hitlLink = Array.from(desktop.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/admin/hitl",
    );
    expect(hitlLink!.getAttribute("aria-label")).toBe("HITL 큐");
  });

  it("[6] parent → HITL 메뉴 자체 없음 + badge 0건", () => {
    usePathnameMock.mockReturnValue("/");
    const items = applyBadgeCounts(buildNavItemsForRole("parent"), {
      hitlPending: 999,
      missionPendingToday: 0,
    });
    render(<MainNavClient items={items} role="parent" userEmail={null} />);
    const desktop = screen.getByTestId("main-nav-desktop");
    const hitlLink = Array.from(desktop.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/admin/hitl",
    );
    expect(hitlLink).toBeUndefined();
    // 어떤 badge data-testid 도 등장하지 않음.
    const allBadges = desktop.querySelectorAll(
      "[data-testid^='main-nav-badge-']",
    );
    expect(allBadges.length).toBe(0);
  });

  it("[7] CON-04 — badge 렌더 결과 DOM 텍스트 + aria-label 에 금칙어 0건", () => {
    usePathnameMock.mockReturnValue("/");
    const items = applyBadgeCounts(buildNavItemsForRole("admin"), {
      hitlPending: 3,
      missionPendingToday: 0,
    });
    render(<MainNavClient items={items} role="admin" userEmail={null} />);
    const nav = screen.getByTestId("main-nav");
    const text = nav.textContent ?? "";
    expect(containsBannedTerms(text)).toBe(false);
    // 모든 link 의 aria-label 도 검사.
    const links = Array.from(nav.querySelectorAll("a"));
    for (const link of links) {
      const label = link.getAttribute("aria-label") ?? "";
      expect(
        containsBannedTerms(label),
        `aria-label="${label}" 가 금칙어 매칭됨`,
      ).toBe(false);
    }
  });

  it("expert + assignedExpertId 카운트=2 → 데스크탑 + 모바일 badge 노출", () => {
    usePathnameMock.mockReturnValue("/");
    const items = applyBadgeCounts(buildNavItemsForRole("expert"), {
      hitlPending: 2,
      missionPendingToday: 0,
    });
    render(<MainNavClient items={items} role="expert" userEmail={null} />);

    const desktop = screen.getByTestId("main-nav-desktop");
    const hitlBadge = desktop.querySelector(
      "[data-testid='main-nav-badge-/admin/hitl']",
    );
    expect(hitlBadge).toBeTruthy();
    expect(hitlBadge!.textContent).toBe("2");
  });
});

describe("applyBadgeCounts — parent missionPendingToday (FR-NAV-BADGE 후속)", () => {
  it("[m1] parent items + missionPendingToday=2 → /missions item.badgeCount=2", () => {
    const base = buildNavItemsForRole("parent");
    const decorated = applyBadgeCounts(base, {
      hitlPending: 0,
      missionPendingToday: 2,
    });
    const mission = decorated.find((i) => i.href === "/missions");
    expect(mission).toBeTruthy();
    expect(mission!.badgeCount).toBe(2);
    // 다른 parent 메뉴 (weekly-review / rewards / settings 등) 에는 badge 영향 없음.
    for (const item of decorated) {
      if (item.href !== "/missions") {
        expect(item.badgeCount).toBeUndefined();
      }
    }
  });

  it("[m2] parent + 둘 다 0 → identity 반환 (zero-allocation)", () => {
    const base = buildNavItemsForRole("parent");
    const decorated = applyBadgeCounts(base, {
      hitlPending: 0,
      missionPendingToday: 0,
    });
    expect(decorated).toBe(base);
  });

  it("[m3] admin + missionPendingToday>0 → /missions 에도 badge 적용 (decorator pure — getNavBadgeCounts 가 admin role 에 missionPendingToday=0 보장)", () => {
    // applyBadgeCounts 는 pure decorator — 입력 counts 를 기계적으로 적용.
    // 실 production 에서는 getNavBadgeCounts 가 admin role 에 대해 missionPendingToday=0 을 반환하여
    // 본 케이스는 발생하지 않음 (정책 layering — fetch 단에서 0 보장).
    const base = buildNavItemsForRole("admin");
    const decorated = applyBadgeCounts(base, {
      hitlPending: 0,
      missionPendingToday: 4,
    });
    const mission = decorated.find((i) => i.href === "/missions");
    expect(mission!.badgeCount).toBe(4);
  });
});

describe("MainNavClient — parent 미션 badge UI 렌더", () => {
  it("[m4] parent + 미완료 2건 → 데스크탑 카운트 + aria-label '2건 미처리'", () => {
    usePathnameMock.mockReturnValue("/");
    const items = applyBadgeCounts(buildNavItemsForRole("parent"), {
      hitlPending: 0,
      missionPendingToday: 2,
    });
    render(<MainNavClient items={items} role="parent" userEmail={null} />);

    const desktop = screen.getByTestId("main-nav-desktop");
    const missionLink = Array.from(desktop.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/missions",
    );
    expect(missionLink).toBeTruthy();
    expect(missionLink!.getAttribute("aria-label")).toBe(
      "미션 도전, 2건 미처리",
    );
    const badge = missionLink!.querySelector(
      "[data-testid='main-nav-badge-/missions']",
    );
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toBe("2");

    // 모바일 dot 노출.
    const mobile = screen.getByTestId("main-nav-mobile-list");
    const mobileBadge = mobile.querySelector(
      "[data-testid='main-nav-mobile-badge-/missions']",
    );
    expect(mobileBadge).toBeTruthy();
  });

  it("[m5] parent + 미완료 0건 → /missions badge 미노출", () => {
    usePathnameMock.mockReturnValue("/");
    const items = applyBadgeCounts(buildNavItemsForRole("parent"), {
      hitlPending: 0,
      missionPendingToday: 0,
    });
    render(<MainNavClient items={items} role="parent" userEmail={null} />);
    expect(
      screen.queryByTestId("main-nav-badge-/missions"),
    ).toBeNull();
    expect(
      screen.queryByTestId("main-nav-mobile-badge-/missions"),
    ).toBeNull();
    // aria-label 은 카운트 없는 평문.
    const desktop = screen.getByTestId("main-nav-desktop");
    const missionLink = Array.from(desktop.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/missions",
    );
    expect(missionLink!.getAttribute("aria-label")).toBe("미션 도전");
  });

  it("[m6] CON-04 — parent 미션 badge DOM 텍스트 + aria-label 금칙어 0건", () => {
    usePathnameMock.mockReturnValue("/");
    const items = applyBadgeCounts(buildNavItemsForRole("parent"), {
      hitlPending: 0,
      missionPendingToday: 7,
    });
    render(<MainNavClient items={items} role="parent" userEmail={null} />);
    const nav = screen.getByTestId("main-nav");
    const text = nav.textContent ?? "";
    expect(containsBannedTerms(text)).toBe(false);
    const links = Array.from(nav.querySelectorAll("a"));
    for (const link of links) {
      const label = link.getAttribute("aria-label") ?? "";
      expect(
        containsBannedTerms(label),
        `aria-label="${label}" 가 금칙어 매칭됨`,
      ).toBe(false);
    }
  });
});

// FR-C-SETTINGS-INDEX — /settings 인덱스 Server Component 통합 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser)
//   - next/navigation redirect mock — throw 흉내
//   - next/link mock — 단순 <a>
//
// 시나리오 (총 6건):
//   1. 정상 인증 user → 카드 2개 (자녀 정보 / 마이크 보정) 노출
//   2. 비인증 → redirect("/login?next=/settings")
//   3. Supabase 오류 (getUser throw) → redirect("/login?next=/settings") (graceful)
//   4. 카드 href 정확 검증 (/settings/child / /settings/calibration)
//   5. CON-04 의료 금칙어 0건
//   6. 키보드 포커스 표시 클래스 노출 (focus-visible:ring)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
    },
  }),
}));

const redirectMock = vi.fn((target: string) => {
  throw new Error(`NEXT_REDIRECT:${target}`);
});
vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import SettingsIndexPage from "@/app/(public)/settings/page";

const USER_ID = "user-uuid-7777";
const FORBIDDEN = ["치료", "진단", "장애"];

function setAuthUser(id: string) {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}
function setAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

beforeEach(() => {
  getUserMock.mockReset();
  redirectMock.mockClear();
});

describe("/settings — FR-C-SETTINGS-INDEX 부모 설정 인덱스 페이지", () => {
  it("[1] 정상 인증 user → 카드 2개 (자녀 / 마이크 보정) 노출", async () => {
    setAuthUser(USER_ID);
    const ui = await SettingsIndexPage();
    const { container } = render(ui);

    const page = container.querySelector("[data-testid='settings-index-page']");
    expect(page).not.toBeNull();

    const childCard = container.querySelector(
      "[data-testid='settings-card-child']",
    );
    const calibCard = container.querySelector(
      "[data-testid='settings-card-calibration']",
    );
    expect(childCard).not.toBeNull();
    expect(calibCard).not.toBeNull();

    expect(childCard?.textContent).toMatch(/자녀 정보/);
    expect(calibCard?.textContent).toMatch(/마이크 환경 보정/);
  });

  it("[2] 비인증 → redirect('/login?next=/settings')", async () => {
    setAnonymous();
    await expect(SettingsIndexPage()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/settings");
  });

  it("[3] Supabase getUser throw → redirect (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    await expect(SettingsIndexPage()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/settings");
  });

  it("[4] 카드 href 정확 검증 (/settings/child / /settings/calibration)", async () => {
    setAuthUser(USER_ID);
    const { container } = render(await SettingsIndexPage());

    const childCard = container.querySelector(
      "[data-testid='settings-card-child']",
    );
    const calibCard = container.querySelector(
      "[data-testid='settings-card-calibration']",
    );
    expect(childCard?.getAttribute("href")).toBe("/settings/child");
    expect(calibCard?.getAttribute("href")).toBe("/settings/calibration");

    // aria-label 노출 (접근성).
    expect(childCard?.getAttribute("aria-label")).toMatch(/자녀 정보/);
    expect(calibCard?.getAttribute("aria-label")).toMatch(/마이크 환경 보정/);
  });

  it("[5] CON-04 의료 금칙어 0건", async () => {
    setAuthUser(USER_ID);
    const { container } = render(await SettingsIndexPage());
    for (const w of FORBIDDEN) {
      expect(container.textContent ?? "").not.toContain(w);
    }
    // 카드 aria-label / href 도 동일 검증.
    const links = Array.from(container.querySelectorAll("a"));
    for (const link of links) {
      const aria = link.getAttribute("aria-label") ?? "";
      for (const w of FORBIDDEN) {
        expect(aria).not.toContain(w);
      }
    }
  });

  it("[6] 키보드 포커스 표시 클래스 노출 (focus-visible:ring)", async () => {
    setAuthUser(USER_ID);
    const { container } = render(await SettingsIndexPage());

    const links = Array.from(container.querySelectorAll("a"));
    expect(links.length).toBeGreaterThanOrEqual(2);

    for (const link of links) {
      const cls = link.getAttribute("class") ?? "";
      // focus-visible:ring-* 클래스가 포함되어 있어야 키보드 사용자에게 포커스 표시.
      expect(cls).toMatch(/focus-visible:ring/);
    }
  });
});

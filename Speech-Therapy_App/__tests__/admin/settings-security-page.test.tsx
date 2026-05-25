// FR-C-SECURITY — /settings/security Server Component 통합 테스트.
//
// 격리:
//   - @/lib/auth/cached-get-user mock (getCachedUser)
//   - @/lib/supabase/server mock (auth.mfa.listFactors)
//   - next/navigation redirect mock — throw 흉내
//   - @/components/security/EnrollTotpFlow mock — stub
//   - @/components/security/DisableTotpFlow mock — stub
//
// 시나리오 (총 5건):
//   1. 인증 user + 미등록 → EnrollFlow 렌더 (Enroll 카드 노출, Disable 카드 X)
//   2. 인증 user + 등록됨 → DisableFlow 렌더 (Disable 카드 노출, Enroll 카드 X)
//   3. 비인증 → redirect("/login?next=/settings/security")
//   4. Supabase listFactors throw → 미등록 보수적 처리 (EnrollFlow 렌더)
//   5. CON-04 — 의료 금칙어 0건

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const getCachedUserMock = vi.fn();
vi.mock("@/lib/auth/cached-get-user", () => ({
  getCachedUser: () => getCachedUserMock(),
}));

const listFactorsMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      mfa: {
        listFactors: (...args: unknown[]) => listFactorsMock(...args),
      },
    },
  }),
}));

const redirectMock = vi.fn((target: string) => {
  throw new Error(`NEXT_REDIRECT:${target}`);
});
vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

vi.mock("@/components/security/EnrollTotpFlow", () => ({
  EnrollTotpFlow: () => (
    <div data-testid="enroll-totp-flow-stub">enroll stub</div>
  ),
}));

vi.mock("@/components/security/DisableTotpFlow", () => ({
  DisableTotpFlow: () => (
    <div data-testid="disable-totp-flow-stub">disable stub</div>
  ),
}));

import SettingsSecurityPage from "@/app/(public)/settings/security/page";

const USER_ID = "user-uuid-sec-page-7777";
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function setUser() {
  getCachedUserMock.mockResolvedValue({
    id: USER_ID,
    email: "u@example.com",
  });
}
function setAnonymous() {
  getCachedUserMock.mockResolvedValue(null);
}
function setListVerified() {
  listFactorsMock.mockResolvedValue({
    data: { totp: [{ id: "factor-x", status: "verified" }] },
    error: null,
  });
}
function setListEmpty() {
  listFactorsMock.mockResolvedValue({
    data: { totp: [] },
    error: null,
  });
}

beforeEach(() => {
  getCachedUserMock.mockReset();
  listFactorsMock.mockReset();
  redirectMock.mockClear();
});

describe("/settings/security — FR-C-SECURITY 보안 / 2단계 인증 페이지", () => {
  it("[1] 인증 user + 미등록 → EnrollFlow 렌더 (Enroll 카드 노출, Disable 카드 X)", async () => {
    setUser();
    setListEmpty();

    const ui = await SettingsSecurityPage();
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='settings-security-page']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='settings-security-enroll-card']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='enroll-totp-flow-stub']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='settings-security-disable-card']"),
    ).toBeNull();
    expect(
      container.querySelector("[data-testid='disable-totp-flow-stub']"),
    ).toBeNull();
  });

  it("[2] 인증 user + 등록됨 → DisableFlow 렌더 (Disable 카드 노출, Enroll 카드 X)", async () => {
    setUser();
    setListVerified();

    const ui = await SettingsSecurityPage();
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='settings-security-disable-card']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='disable-totp-flow-stub']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='settings-security-enroll-card']"),
    ).toBeNull();
    expect(
      container.querySelector("[data-testid='enroll-totp-flow-stub']"),
    ).toBeNull();
  });

  it("[3] 비인증 → redirect('/login?next=/settings/security')", async () => {
    setAnonymous();
    await expect(SettingsSecurityPage()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith(
      "/login?next=/settings/security",
    );
    expect(listFactorsMock).not.toHaveBeenCalled();
  });

  it("[4] Supabase listFactors throw → 미등록 보수적 처리 (EnrollFlow 렌더)", async () => {
    setUser();
    listFactorsMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const ui = await SettingsSecurityPage();
    const { container } = render(ui);
    warnSpy.mockRestore();

    expect(
      container.querySelector("[data-testid='settings-security-enroll-card']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='settings-security-disable-card']"),
    ).toBeNull();
  });

  it("[5] CON-04 — 의료 금칙어 0건 (미등록 + 등록 양 분기)", async () => {
    // 미등록 분기.
    setUser();
    setListEmpty();
    let { container } = render(await SettingsSecurityPage());
    for (const w of FORBIDDEN_MEDICAL_WORDS) {
      expect(container.textContent ?? "").not.toContain(w);
    }

    // 등록 분기.
    setUser();
    setListVerified();
    ({ container } = render(await SettingsSecurityPage()));
    for (const w of FORBIDDEN_MEDICAL_WORDS) {
      expect(container.textContent ?? "").not.toContain(w);
    }
  });
});

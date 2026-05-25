// FR-C-ACCOUNT — /settings/account Server Component 통합 테스트.
//
// 격리:
//   - @/lib/db Prisma mock (user.findUnique)
//   - @/lib/supabase/server mock (auth.getUser)
//   - next/navigation redirect mock — throw 흉내
//   - @/components/settings/DataExportButton mock — stub
//   - @/components/settings/AccountDeleteButton mock — stub
//   - @/components/settings/EmailChangeForm mock — stub (FR-C-ACCOUNT 확장)
//   - @/components/settings/RequestPasswordResetButton mock — stub (FR-C-ACCOUNT 확장)
//
// 시나리오 (총 7건):
//   1. 정상 인증 user → 5 카드 (info / export / email / password / delete) 노출
//   2. 비인증 → redirect("/login?next=/settings/account")
//   3. Supabase 오류 (getUser throw) → redirect (graceful)
//   4. 가입일 / 이메일 / 역할 표시 정확 (한국어 포맷)
//   5. CON-04 의료 금칙어 0건
//   6. User row 없음 (DB findUnique null) → "정보 없음" fallback 정상 렌더
//   7. prisma findUnique throw → graceful

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

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

vi.mock("@/components/settings/DataExportButton", () => ({
  DataExportButton: ({ userId }: { userId: string }) => (
    <div data-testid="data-export-button-stub" data-user-id={userId}>
      export stub
    </div>
  ),
}));

vi.mock("@/components/settings/AccountDeleteButton", () => ({
  AccountDeleteButton: () => (
    <div data-testid="account-delete-button-stub">delete stub</div>
  ),
}));

vi.mock("@/components/settings/EmailChangeForm", () => ({
  EmailChangeForm: ({ currentEmail }: { currentEmail: string | null }) => (
    <div
      data-testid="email-change-form-stub"
      data-current-email={currentEmail ?? ""}
    >
      email change stub
    </div>
  ),
}));

vi.mock("@/components/settings/RequestPasswordResetButton", () => ({
  RequestPasswordResetButton: () => (
    <div data-testid="password-reset-button-stub">password reset stub</div>
  ),
}));

import SettingsAccountPage from "@/app/(public)/settings/account/page";

const USER_ID = "user-uuid-account-2222";
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function setAuthUser(id: string) {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}
function setAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

beforeEach(() => {
  findUniqueMock.mockReset();
  getUserMock.mockReset();
  redirectMock.mockClear();
});

describe("/settings/account — FR-C-ACCOUNT 계정 정보 + GDPR 페이지", () => {
  it("[1] 정상 인증 user → 5 카드 (info / export / email / password / delete) 노출", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce({
      email: "parent@example.com",
      role: "parent",
      createdAt: new Date("2026-05-01T00:00:00Z"),
      institutionId: null,
    });

    const ui = await SettingsAccountPage();
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='settings-account-page']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='settings-account-info-card']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='settings-account-export-card']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='settings-account-email-card']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='settings-account-password-card']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='settings-account-delete-card']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='data-export-button-stub']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='account-delete-button-stub']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='email-change-form-stub']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='password-reset-button-stub']"),
    ).not.toBeNull();

    // findUnique 가 본인 user.id 만 사용.
    const findArg = findUniqueMock.mock.calls[0]![0] as {
      where: { id: string };
    };
    expect(findArg.where.id).toBe(USER_ID);

    // DataExportButton 에 userId 전달.
    const exportStub = container.querySelector(
      "[data-testid='data-export-button-stub']",
    );
    expect(exportStub?.getAttribute("data-user-id")).toBe(USER_ID);

    // EmailChangeForm 에 현재 이메일 prop 전달.
    const emailStub = container.querySelector(
      "[data-testid='email-change-form-stub']",
    );
    expect(emailStub?.getAttribute("data-current-email")).toBe(
      "parent@example.com",
    );
  });

  it("[2] 비인증 → redirect('/login?next=/settings/account')", async () => {
    setAnonymous();
    await expect(SettingsAccountPage()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/settings/account");
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("[3] Supabase getUser throw → redirect (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    await expect(SettingsAccountPage()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/settings/account");
  });

  it("[4] 가입일 / 이메일 / 역할 표시 정확", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce({
      email: "user@speech.example",
      role: "principal",
      createdAt: new Date("2026-01-15T00:00:00Z"),
      institutionId: "inst-1",
    });
    const { container } = render(await SettingsAccountPage());

    const emailNode = container.querySelector(
      "[data-testid='settings-account-email']",
    );
    const createdAtNode = container.querySelector(
      "[data-testid='settings-account-created-at']",
    );
    const roleNode = container.querySelector(
      "[data-testid='settings-account-role']",
    );

    expect(emailNode?.textContent).toMatch(/user@speech\.example/);
    expect(createdAtNode?.textContent).toMatch(/2026년 1월 15일/);
    // role 'principal' → 한국어 라벨 '원장'.
    expect(roleNode?.textContent).toMatch(/원장/);
  });

  it("[5] CON-04 의료 금칙어 0건", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce({
      email: "p@example.com",
      role: "parent",
      createdAt: new Date("2026-05-01T00:00:00Z"),
      institutionId: null,
    });
    const { container } = render(await SettingsAccountPage());
    for (const w of FORBIDDEN_MEDICAL_WORDS) {
      expect(container.textContent ?? "").not.toContain(w);
    }
  });

  it("[6] User row 없음 → '정보 없음' fallback 정상 렌더 + 카드들 표시", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce(null);
    const { container } = render(await SettingsAccountPage());

    expect(
      container.querySelector("[data-testid='settings-account-info-card']"),
    ).not.toBeNull();
    // 이메일 / role 모두 "정보 없음".
    expect(
      container.querySelector("[data-testid='settings-account-email']")
        ?.textContent,
    ).toMatch(/정보 없음/);
    expect(
      container.querySelector("[data-testid='settings-account-role']")
        ?.textContent,
    ).toMatch(/정보 없음/);
    // 카드 2/3/4/5 는 여전히 정상 렌더 (다운로드 / 이메일 / 비밀번호 / 삭제 가능).
    expect(
      container.querySelector("[data-testid='data-export-button-stub']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='email-change-form-stub']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='password-reset-button-stub']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='account-delete-button-stub']"),
    ).not.toBeNull();
  });

  it("[7] prisma findUnique throw → graceful 렌더 (페이지는 정상 표시)", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockRejectedValueOnce(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ui = await SettingsAccountPage();
    const { container } = render(ui);
    errSpy.mockRestore();

    expect(
      container.querySelector("[data-testid='settings-account-page']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='settings-account-email']")
        ?.textContent,
    ).toMatch(/정보 없음/);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

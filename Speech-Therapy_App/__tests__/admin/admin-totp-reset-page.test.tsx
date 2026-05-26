// FR-2FA-RECOVERY — /admin/security/totp-reset Server Component 통합 테스트.
//
// 격리:
//   - @/lib/auth/cached-get-user (getCachedUserRoleResult) mock
//   - @/components/security/AdminTotpResetForm mock — props 검증만
//   - next/link mock — 단순 <a>
//   - next/navigation redirect mock
//
// 시나리오:
//   [1] admin role → page 렌더 + form 마운트
//   [2] principal role → 403 (admin-totp-reset-forbidden)
//   [3] teacher role → 403
//   [4] expert role → 403
//   [5] parent role → 403
//   [6] anonymous → redirect("/login?next=/admin/security/totp-reset")
//   [7] DB error → 403 (보수적 fallback)
//   [8] ?email=... 미리채우기 — prefilledTargetEmail prop 으로 전달
//   [9] 잘못된 email 형식 ?email=... → prefill 빈 문자열 (sanitize 차단)
//  [10] CON-04 의료 금칙어 0건

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const getCachedUserRoleResultMock = vi.fn();
vi.mock("@/lib/auth/cached-get-user", () => ({
  getCachedUserRoleResult: (...args: unknown[]) =>
    getCachedUserRoleResultMock(...args),
}));

const adminTotpResetFormMock = vi.fn();
vi.mock("@/components/security/AdminTotpResetForm", () => ({
  AdminTotpResetForm: (props: { prefilledTargetEmail?: string }) => {
    adminTotpResetFormMock(props);
    return (
      <div
        data-testid="admin-totp-reset-form-stub"
        data-prefilled={props.prefilledTargetEmail ?? ""}
      />
    );
  },
}));

const redirectMock = vi.fn((target: string) => {
  throw new Error(`NEXT_REDIRECT:${target}`);
});
vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
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

import AdminTotpResetPage from "@/app/admin/security/totp-reset/page";

const USER_ADMIN = "11111111-1111-4111-8111-111111111111";
const USER_PRINCIPAL = "22222222-2222-4222-8222-222222222222";
const USER_TEACHER = "33333333-3333-4333-8333-333333333333";
const USER_EXPERT = "44444444-4444-4444-8444-444444444444";
const USER_PARENT = "55555555-5555-4555-8555-555555555555";

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function assertNoMedicalTerms(text: string) {
  for (const word of FORBIDDEN_MEDICAL_WORDS) {
    expect(text).not.toContain(word);
  }
}

function setAuthRole(userId: string, role: string | null) {
  getCachedUserRoleResultMock.mockResolvedValue({
    status: "ok",
    userId,
    email: null,
    role,
  });
}

function setAnonymous() {
  getCachedUserRoleResultMock.mockResolvedValue({ status: "anonymous" });
}

function setDbError() {
  getCachedUserRoleResultMock.mockResolvedValue({ status: "error" });
}

beforeEach(() => {
  getCachedUserRoleResultMock.mockReset();
  adminTotpResetFormMock.mockReset();
  redirectMock.mockClear();
});

describe("/admin/security/totp-reset — FR-2FA-RECOVERY admin TOTP reset 페이지", () => {
  it("[1] admin role → page 렌더 + form 마운트", async () => {
    setAuthRole(USER_ADMIN, "admin");
    const ui = await AdminTotpResetPage({
      searchParams: Promise.resolve({}),
    });
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='admin-totp-reset-page']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='admin-totp-reset-forbidden']"),
    ).toBeNull();
    expect(
      container.querySelector("[data-testid='admin-totp-reset-form-stub']"),
    ).not.toBeNull();
    expect(adminTotpResetFormMock).toHaveBeenCalledWith({
      prefilledTargetEmail: "",
    });
  });

  it("[2] principal role → 403 (admin-totp-reset-forbidden)", async () => {
    setAuthRole(USER_PRINCIPAL, "principal");
    const ui = await AdminTotpResetPage({
      searchParams: Promise.resolve({}),
    });
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='admin-totp-reset-forbidden']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='admin-totp-reset-page']"),
    ).toBeNull();
    expect(adminTotpResetFormMock).not.toHaveBeenCalled();
  });

  it("[3] teacher role → 403", async () => {
    setAuthRole(USER_TEACHER, "teacher");
    const ui = await AdminTotpResetPage({
      searchParams: Promise.resolve({}),
    });
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='admin-totp-reset-forbidden']"),
    ).not.toBeNull();
    expect(adminTotpResetFormMock).not.toHaveBeenCalled();
  });

  it("[4] expert role → 403", async () => {
    setAuthRole(USER_EXPERT, "expert");
    const ui = await AdminTotpResetPage({
      searchParams: Promise.resolve({}),
    });
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='admin-totp-reset-forbidden']"),
    ).not.toBeNull();
    expect(adminTotpResetFormMock).not.toHaveBeenCalled();
  });

  it("[5] parent role → 403", async () => {
    setAuthRole(USER_PARENT, "parent");
    const ui = await AdminTotpResetPage({
      searchParams: Promise.resolve({}),
    });
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='admin-totp-reset-forbidden']"),
    ).not.toBeNull();
    expect(adminTotpResetFormMock).not.toHaveBeenCalled();
  });

  it("[6] anonymous → redirect('/login?next=/admin/security/totp-reset')", async () => {
    setAnonymous();
    await expect(
      AdminTotpResetPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith(
      "/login?next=/admin/security/totp-reset",
    );
    expect(adminTotpResetFormMock).not.toHaveBeenCalled();
  });

  it("[7] DB error → 403 (보수적 fallback)", async () => {
    setDbError();
    const ui = await AdminTotpResetPage({
      searchParams: Promise.resolve({}),
    });
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='admin-totp-reset-forbidden']"),
    ).not.toBeNull();
    expect(adminTotpResetFormMock).not.toHaveBeenCalled();
  });

  it("[8] ?email=victim@example.com → prefilledTargetEmail 으로 전달", async () => {
    setAuthRole(USER_ADMIN, "admin");
    const ui = await AdminTotpResetPage({
      searchParams: Promise.resolve({ email: "victim@example.com" }),
    });
    const { container } = render(ui);

    const stub = container.querySelector(
      "[data-testid='admin-totp-reset-form-stub']",
    );
    expect(stub).not.toBeNull();
    expect(stub!.getAttribute("data-prefilled")).toBe("victim@example.com");
    expect(adminTotpResetFormMock).toHaveBeenCalledWith({
      prefilledTargetEmail: "victim@example.com",
    });
  });

  it("[9] 잘못된 email 형식 → sanitize 로 prefill 빈 문자열", async () => {
    setAuthRole(USER_ADMIN, "admin");
    const ui = await AdminTotpResetPage({
      searchParams: Promise.resolve({ email: "not-an-email" }),
    });
    render(ui);

    expect(adminTotpResetFormMock).toHaveBeenCalledWith({
      prefilledTargetEmail: "",
    });
  });

  it("[10] CON-04 의료 금칙어 0건 (admin / forbidden 분기 모두)", async () => {
    // (a) admin
    setAuthRole(USER_ADMIN, "admin");
    const adminUi = await AdminTotpResetPage({
      searchParams: Promise.resolve({}),
    });
    const { container: adminC } = render(adminUi);
    assertNoMedicalTerms(adminC.textContent ?? "");

    // (b) forbidden — teacher
    setAuthRole(USER_TEACHER, "teacher");
    const forbUi = await AdminTotpResetPage({
      searchParams: Promise.resolve({}),
    });
    const { container: forbC } = render(forbUi);
    assertNoMedicalTerms(forbC.textContent ?? "");
  });
});

// FR-CONSENT-REMINDER-UI — /settings/consent Server Component 통합 테스트.
//
// 격리:
//   - @/lib/db Prisma mock (consentSignature.findMany)
//   - @/lib/supabase/server mock (auth.getUser)
//   - next/navigation redirect mock — throw 흉내
//   - @/components/settings/ConsentResendButton mock — stub
//
// 시나리오 (총 7건):
//   1. 비인증 → redirect("/login?next=/settings/consent")
//   2. user.email null → empty state 노출 (findMany 호출 0회)
//   3. 정상 부모 + 0건 pending → empty state
//   4. 정상 부모 + 2건 pending → list 렌더 + ConsentResendButton 2개
//   5. findMany 호출은 본인 parentEmail 만 (R4)
//   6. prisma findMany throw → error state 노출 (graceful)
//   7. CON-04 — 모든 분기 텍스트에 의료 금칙어 0건

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const findManyMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    consentSignature: {
      findMany: (...args: unknown[]) => findManyMock(...args),
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

vi.mock("@/components/settings/ConsentResendButton", () => ({
  ConsentResendButton: ({
    consentSignatureId,
  }: {
    consentSignatureId: string;
  }) => (
    <div
      data-testid="consent-resend-button-stub"
      data-consent-id={consentSignatureId}
    >
      resend stub
    </div>
  ),
}));

import SettingsConsentPage from "@/app/(public)/settings/consent/page";

const USER_ID = "user-uuid-consent-page-1111";
const USER_EMAIL = "parent@example.com";
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function setAuthUser(id: string, email: string | null = USER_EMAIL) {
  getUserMock.mockResolvedValue({ data: { user: { id, email } }, error: null });
}
function setAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

function pendingRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    childNickname: "민지",
    consentType: "data_usage",
    sentAt: new Date("2026-05-20T00:00:00Z"),
    remindedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  findManyMock.mockReset();
  getUserMock.mockReset();
  redirectMock.mockClear();
});

describe("/settings/consent — FR-CONSENT-REMINDER-UI 부모 self-service 페이지", () => {
  it("[1] 비인증 → redirect('/login?next=/settings/consent')", async () => {
    setAnonymous();
    await expect(SettingsConsentPage()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/settings/consent");
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("[2] user.email null → empty state (findMany 호출 0회)", async () => {
    setAuthUser(USER_ID, null);
    const { container } = render(await SettingsConsentPage());
    expect(
      container.querySelector("[data-testid='settings-consent-empty']"),
    ).not.toBeNull();
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("[3] 정상 부모 + 0건 pending → empty state", async () => {
    setAuthUser(USER_ID);
    findManyMock.mockResolvedValueOnce([]);
    const { container } = render(await SettingsConsentPage());
    expect(
      container.querySelector("[data-testid='settings-consent-empty']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='settings-consent-list']"),
    ).toBeNull();
    expect(
      container.querySelector("[data-testid='settings-consent-back-link']"),
    ).not.toBeNull();
  });

  it("[4] 정상 부모 + 2건 pending → list 렌더 + ConsentResendButton 2개", async () => {
    setAuthUser(USER_ID);
    findManyMock.mockResolvedValueOnce([
      pendingRow("aaaa-1111", {
        childNickname: "민지",
        remindedAt: new Date("2026-05-23T00:00:00Z"),
      }),
      pendingRow("bbbb-2222", {
        childNickname: "지호",
        remindedAt: null,
      }),
    ]);
    const { container } = render(await SettingsConsentPage());
    const rows = container.querySelectorAll(
      "[data-testid='settings-consent-row']",
    );
    expect(rows.length).toBe(2);

    const stubs = container.querySelectorAll(
      "[data-testid='consent-resend-button-stub']",
    );
    expect(stubs.length).toBe(2);
    expect(stubs[0]?.getAttribute("data-consent-id")).toBe("aaaa-1111");
    expect(stubs[1]?.getAttribute("data-consent-id")).toBe("bbbb-2222");

    // 자녀 이름 표시.
    const text = container.textContent ?? "";
    expect(text).toContain("민지");
    expect(text).toContain("지호");

    // 첫 row remindedAt 표기.
    const remindedNodes = container.querySelectorAll(
      "[data-testid='settings-consent-reminded-at']",
    );
    expect(remindedNodes[0]?.textContent).toMatch(/2026년 5월 23일/);
    // 두번째 row remindedAt null → '안내 전'.
    expect(remindedNodes[1]?.textContent).toMatch(/안내 전/);

    // 만료일 = sentAt + 7일 = 2026-05-27.
    const expiresNodes = container.querySelectorAll(
      "[data-testid='settings-consent-expires-at']",
    );
    expect(expiresNodes[0]?.textContent).toMatch(/2026년 5월 27일/);
  });

  it("[5] findMany 호출은 본인 parentEmail 만 (R4)", async () => {
    setAuthUser(USER_ID, "me@example.com");
    findManyMock.mockResolvedValueOnce([]);
    await SettingsConsentPage();
    expect(findManyMock).toHaveBeenCalledTimes(1);
    const args = findManyMock.mock.calls[0]![0] as {
      where: { parentEmail: string; status: string };
    };
    expect(args.where.parentEmail).toBe("me@example.com");
    expect(args.where.status).toBe("pending");
  });

  it("[6] prisma findMany throw → error state (graceful, redirect 안 함)", async () => {
    setAuthUser(USER_ID);
    findManyMock.mockRejectedValueOnce(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(await SettingsConsentPage());
    errSpy.mockRestore();

    expect(
      container.querySelector("[data-testid='settings-consent-error']"),
    ).not.toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("[7] CON-04 — 모든 분기 텍스트에 의료 금칙어 0건", async () => {
    // empty state.
    setAuthUser(USER_ID);
    findManyMock.mockResolvedValueOnce([]);
    const emptyUi = render(await SettingsConsentPage());
    for (const w of FORBIDDEN_MEDICAL_WORDS) {
      expect(emptyUi.container.textContent ?? "").not.toContain(w);
    }
    emptyUi.unmount();

    // list state.
    findManyMock.mockResolvedValueOnce([
      pendingRow("aaaa-1111", { childNickname: "민지" }),
    ]);
    const listUi = render(await SettingsConsentPage());
    for (const w of FORBIDDEN_MEDICAL_WORDS) {
      expect(listUi.container.textContent ?? "").not.toContain(w);
    }
    listUi.unmount();

    // error state.
    findManyMock.mockRejectedValueOnce(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const errorUi = render(await SettingsConsentPage());
    errSpy.mockRestore();
    for (const w of FORBIDDEN_MEDICAL_WORDS) {
      expect(errorUi.container.textContent ?? "").not.toContain(w);
    }
  });
});

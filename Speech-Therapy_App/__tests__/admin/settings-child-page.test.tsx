// FR-C-PARENT-SETTINGS — /settings/child Server Component 통합 테스트.
//
// 격리:
//   - @/lib/db Prisma mock (user.findUnique)
//   - @/lib/supabase/server mock (auth.getUser)
//   - next/navigation redirect mock — throw 흉내
//   - next/link mock — 단순 <a>
//   - @/components/settings/ChildProfileForm mock — 폼 자체 검증은 별도 컴포넌트 테스트
//
// 시나리오 (총 6건):
//   1. 정상 인증 user → form 렌더 + prefill props 전달 (childAgeMonths + preferredPhonemes)
//   2. 비인증 (auth.getUser data.user null) → redirect("/login?next=/settings/child")
//   3. Supabase 오류 (getUser throw) → redirect("/login?next=/settings/child")
//   4. User 정보 부재 → form 렌더 + initialChildAgeMonths null 전달
//   5. prisma findUnique throw → form 렌더 + 빈 prefill (graceful)
//   6. CON-04 의료 금칙어 0건 (정상 분기 텍스트 검증)

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

// ChildProfileForm 자체는 별도 테스트가 검증 — 본 페이지 테스트는 props 전달만.
vi.mock("@/components/settings/ChildProfileForm", () => ({
  ChildProfileForm: ({
    initialChildAgeMonths,
    initialPreferredPhonemes,
  }: {
    initialChildAgeMonths: number | null;
    initialPreferredPhonemes: ReadonlyArray<string> | null;
  }) => (
    <div
      data-testid="child-profile-form-stub"
      data-initial-age={String(initialChildAgeMonths)}
      data-initial-phonemes={JSON.stringify(initialPreferredPhonemes ?? [])}
    >
      form stub
    </div>
  ),
}));

import SettingsChildPage from "@/app/(public)/settings/child/page";

const USER_ID = "user-uuid-3333";
const FORBIDDEN = ["치료", "진단", "장애"];

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

describe("/settings/child — FR-C-PARENT-SETTINGS 부모 자녀 프로필 설정 페이지", () => {
  it("[1] 정상 인증 user → form 렌더 + prefill props 전달", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce({
      childAgeMonths: 60,
      preferredPhonemes: ["ㅅ", "ㄴ"],
    });

    const ui = await SettingsChildPage();
    const { container } = render(ui);

    const page = container.querySelector("[data-testid='settings-child-page']");
    expect(page).not.toBeNull();
    const formStub = container.querySelector(
      "[data-testid='child-profile-form-stub']",
    );
    expect(formStub).not.toBeNull();
    expect(formStub?.getAttribute("data-initial-age")).toBe("60");
    expect(formStub?.getAttribute("data-initial-phonemes")).toBe(
      JSON.stringify(["ㅅ", "ㄴ"]),
    );

    // findUnique 가 본인 user.id 만 사용했는지.
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    const findArg = findUniqueMock.mock.calls[0]![0] as { where: { id: string } };
    expect(findArg.where.id).toBe(USER_ID);
  });

  it("[2] 비인증 → redirect('/login?next=/settings/child')", async () => {
    setAnonymous();
    await expect(SettingsChildPage()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/settings/child");
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("[3] Supabase getUser throw → redirect (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    await expect(SettingsChildPage()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/settings/child");
  });

  it("[4] User 정보 부재 → form 렌더 + initialChildAgeMonths null", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce(null);
    const ui = await SettingsChildPage();
    const { container } = render(ui);

    const formStub = container.querySelector(
      "[data-testid='child-profile-form-stub']",
    );
    expect(formStub).not.toBeNull();
    expect(formStub?.getAttribute("data-initial-age")).toBe("null");
    expect(formStub?.getAttribute("data-initial-phonemes")).toBe("[]");
  });

  it("[5] prisma findUnique throw → form 렌더 + 빈 prefill (graceful)", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockRejectedValueOnce(new Error("db down"));
    // console.error 호출되지만 throw X.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ui = await SettingsChildPage();
    const { container } = render(ui);
    errSpy.mockRestore();

    const formStub = container.querySelector(
      "[data-testid='child-profile-form-stub']",
    );
    expect(formStub).not.toBeNull();
    expect(formStub?.getAttribute("data-initial-age")).toBe("null");
    expect(formStub?.getAttribute("data-initial-phonemes")).toBe("[]");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("[6] CON-04 의료 금칙어 0건 (정상 + 부재 분기)", async () => {
    // (a) 정상 분기
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce({
      childAgeMonths: 48,
      preferredPhonemes: [],
    });
    const { container: a } = render(await SettingsChildPage());
    for (const w of FORBIDDEN) {
      expect(a.textContent ?? "").not.toContain(w);
    }

    // (b) 부재 분기
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce(null);
    const { container: b } = render(await SettingsChildPage());
    for (const w of FORBIDDEN) {
      expect(b.textContent ?? "").not.toContain(w);
    }
  });
});

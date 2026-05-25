// FR-C-SECURITY (MFA 마무리) — /auth/mfa-challenge Server Component 통합 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser + auth.mfa.{getAuthenticatorAssuranceLevel, listFactors})
//   - next/navigation redirect mock — throw 흉내
//   - @/components/auth/MfaChallengeForm mock — props 캡처
//
// 시나리오 (≥ 4):
//   1. AAL1 + verified factor 있음 → form 렌더 + factorId/next 전달
//   2. AAL2 이미 인증 → next 로 redirect (form 미렌더)
//   3. 비인증 → /login?next= redirect
//   4. AAL nextLevel != 'aal2' (미등록) → next 로 redirect
//   5. verified factor 부재 → next 로 redirect (회귀 안전)
//   6. next sanitize — open redirect 차단 (외부 URL → "/")
//   7. CON-04 — 의료 금칙어 0건

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const getUserMock = vi.fn();
const getAalMock = vi.fn();
const listFactorsMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
      mfa: {
        getAuthenticatorAssuranceLevel: (...args: unknown[]) =>
          getAalMock(...args),
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

const formPropsCapture = vi.fn();
vi.mock("@/components/auth/MfaChallengeForm", () => ({
  MfaChallengeForm: (props: { factorId: string; next?: string }) => {
    formPropsCapture(props);
    return (
      <div
        data-testid="mfa-challenge-form-stub"
        data-factor={props.factorId}
        data-next={props.next ?? ""}
      >
        form stub
      </div>
    );
  },
}));

import MfaChallengePage from "@/app/auth/mfa-challenge/page";

const USER_ID = "user-uuid-mfa-page-7";
const FACTOR_ID = "factor-mfa-page-1";
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function setAuthUser(id: string) {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}
function setAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}
function setAal(current: string, next: string) {
  getAalMock.mockResolvedValue({
    data: { currentLevel: current, nextLevel: next },
    error: null,
  });
}
function setListFactorsVerified() {
  listFactorsMock.mockResolvedValue({
    data: { totp: [{ id: FACTOR_ID, status: "verified" }] },
    error: null,
  });
}
function setListFactorsEmpty() {
  listFactorsMock.mockResolvedValue({
    data: { totp: [] },
    error: null,
  });
}

beforeEach(() => {
  getUserMock.mockReset();
  getAalMock.mockReset();
  listFactorsMock.mockReset();
  redirectMock.mockClear();
  formPropsCapture.mockReset();
});

async function renderPage(next: string | undefined) {
  const ui = await MfaChallengePage({
    searchParams: Promise.resolve(next ? { next } : {}),
  });
  return render(ui as React.ReactElement);
}

describe("/auth/mfa-challenge — FR-C-SECURITY 로그인 MFA challenge 페이지", () => {
  it("[1] AAL1 + verified factor → form 렌더 + factorId/next 전달", async () => {
    setAuthUser(USER_ID);
    setAal("aal1", "aal2");
    setListFactorsVerified();

    const { container } = await renderPage("/rewards");

    expect(
      container.querySelector("[data-testid='mfa-challenge-page']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='mfa-challenge-form-stub']"),
    ).not.toBeNull();
    expect(formPropsCapture).toHaveBeenCalledWith({
      factorId: FACTOR_ID,
      next: "/rewards",
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("[2] AAL2 이미 인증 → next 로 redirect (form 미렌더)", async () => {
    setAuthUser(USER_ID);
    setAal("aal2", "aal2");
    // listFactors 까지 도달하면 안 됨.
    setListFactorsVerified();

    await expect(renderPage("/rewards")).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/rewards");
    expect(formPropsCapture).not.toHaveBeenCalled();
  });

  it("[3] 비인증 → /login?next= redirect", async () => {
    setAnonymous();
    await expect(renderPage("/rewards")).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith(
      `/login?next=${encodeURIComponent("/rewards")}`,
    );
    expect(getAalMock).not.toHaveBeenCalled();
  });

  it("[4] AAL nextLevel != 'aal2' (미등록 사용자) → next 로 redirect", async () => {
    setAuthUser(USER_ID);
    setAal("aal1", "aal1");
    setListFactorsVerified();

    await expect(renderPage("/")).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/");
    expect(formPropsCapture).not.toHaveBeenCalled();
  });

  it("[5] verified factor 부재 → next 로 redirect (회귀 안전)", async () => {
    setAuthUser(USER_ID);
    setAal("aal1", "aal2");
    setListFactorsEmpty();

    await expect(renderPage("/rewards")).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/rewards");
    expect(formPropsCapture).not.toHaveBeenCalled();
  });

  it("[6] next sanitize — 외부 URL → '/' (open redirect 차단)", async () => {
    setAuthUser(USER_ID);
    setAal("aal1", "aal2");
    setListFactorsVerified();

    await renderPage("https://evil.com/phish");
    expect(formPropsCapture).toHaveBeenCalledWith({
      factorId: FACTOR_ID,
      next: "/",
    });
  });

  it("[6b] next sanitize — protocol-relative URL → '/'", async () => {
    setAuthUser(USER_ID);
    setAal("aal1", "aal2");
    setListFactorsVerified();

    await renderPage("//evil.com/phish");
    expect(formPropsCapture).toHaveBeenCalledWith({
      factorId: FACTOR_ID,
      next: "/",
    });
  });

  it("[7] CON-04 — 의료 금칙어 0건", async () => {
    setAuthUser(USER_ID);
    setAal("aal1", "aal2");
    setListFactorsVerified();

    const { container } = await renderPage("/rewards");
    for (const w of FORBIDDEN_MEDICAL_WORDS) {
      expect(container.textContent ?? "").not.toContain(w);
    }
  });
});

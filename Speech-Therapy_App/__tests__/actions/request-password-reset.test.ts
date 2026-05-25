// FR-C-ACCOUNT — requestPasswordReset Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser + auth.resetPasswordForEmail)
//
// 시나리오 (총 7건):
//   1. 비로그인 → unauthorized
//   2. auth throw → unauthorized (graceful)
//   3. user.email null → no_email
//   4. 정상 → resetPasswordForEmail 호출 + success + analytics meta
//   5. redirectTo URL 검증 — NEXT_PUBLIC_BASE_URL 기반
//   6. Supabase resetPasswordForEmail error → supabase_error
//   7. Supabase resetPasswordForEmail throw → supabase_error
//   8. CON-04 — 모든 분기 message 에 의료 금칙어 0건

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const resetPasswordMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
      resetPasswordForEmail: (...args: unknown[]) =>
        resetPasswordMock(...args),
    },
  }),
}));

import { requestPasswordReset } from "@/app/actions/request-password-reset";

const USER_ID = "user-uuid-reset-2222";
const USER_EMAIL = "parent@example.com";
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function setAuthUser(id: string, email: string | null = USER_EMAIL) {
  getUserMock.mockResolvedValue({
    data: { user: { id, email } },
    error: null,
  });
}
function setAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

beforeEach(() => {
  getUserMock.mockReset();
  resetPasswordMock.mockReset();
  resetPasswordMock.mockResolvedValue({ data: {}, error: null });
  // env reset.
  delete process.env.NEXT_PUBLIC_BASE_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requestPasswordReset — FR-C-ACCOUNT 비밀번호 reset 링크 발송 Server Action", () => {
  it("[1] 비로그인 → unauthorized", async () => {
    setAnonymous();
    const result = await requestPasswordReset();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("[2] auth throw → unauthorized (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    const result = await requestPasswordReset();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
  });

  it("[3] user.email null → no_email", async () => {
    setAuthUser(USER_ID, null);
    const result = await requestPasswordReset();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("no_email");
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("[4] 정상 → resetPasswordForEmail 호출 + success + analytics meta", async () => {
    setAuthUser(USER_ID, USER_EMAIL);
    const result = await requestPasswordReset();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.sentToEmail).toBe(USER_EMAIL);
    expect(result.analytics.userId).toBe(USER_ID);
    expect(resetPasswordMock).toHaveBeenCalledTimes(1);
    const callArgs = resetPasswordMock.mock.calls[0] as [
      string,
      { redirectTo: string },
    ];
    expect(callArgs[0]).toBe(USER_EMAIL);
    expect(callArgs[1].redirectTo).toContain("/auth/reset-password");
  });

  it("[5] redirectTo URL — NEXT_PUBLIC_BASE_URL 기반 절대 URL", async () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://speech-therapy.example.com/";
    setAuthUser(USER_ID, USER_EMAIL);
    await requestPasswordReset();
    const callArgs = resetPasswordMock.mock.calls[0] as [
      string,
      { redirectTo: string },
    ];
    expect(callArgs[1].redirectTo).toBe(
      "https://speech-therapy.example.com/auth/reset-password",
    );
  });

  it("[6] Supabase resetPasswordForEmail error → supabase_error", async () => {
    setAuthUser(USER_ID, USER_EMAIL);
    resetPasswordMock.mockResolvedValueOnce({
      data: {},
      error: { message: "rate limited" },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await requestPasswordReset();
    warnSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("supabase_error");
  });

  it("[7] Supabase resetPasswordForEmail throw → supabase_error (graceful)", async () => {
    setAuthUser(USER_ID, USER_EMAIL);
    resetPasswordMock.mockImplementation(() => {
      throw new Error("network 5xx");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await requestPasswordReset();
    errSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("supabase_error");
  });

  it("[8] CON-04 — 모든 실패 분기 message 에 의료 금칙어 0건", async () => {
    const cases: Array<() => Promise<unknown>> = [
      async () => {
        setAnonymous();
        return requestPasswordReset();
      },
      async () => {
        setAuthUser(USER_ID, null);
        return requestPasswordReset();
      },
      async () => {
        setAuthUser(USER_ID, USER_EMAIL);
        resetPasswordMock.mockResolvedValueOnce({
          data: {},
          error: { message: "x" },
        });
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
          return await requestPasswordReset();
        } finally {
          warnSpy.mockRestore();
        }
      },
    ];
    for (const run of cases) {
      const r = (await run()) as { success: boolean; message?: string };
      if (!r.success && r.message) {
        for (const w of FORBIDDEN_MEDICAL_WORDS) {
          expect(r.message).not.toContain(w);
        }
      }
    }
  });
});

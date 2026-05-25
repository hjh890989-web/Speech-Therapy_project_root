// FR-C-ACCOUNT — requestEmailChange Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser + auth.updateUser)
//
// 시나리오 (총 8건):
//   1. 빈 이메일 → invalid_email (auth 호출 X)
//   2. 잘못된 이메일 형식 → invalid_email
//   3. 비로그인 → unauthorized
//   4. auth throw → unauthorized (graceful)
//   5. 현재 이메일과 동일 → same_as_current
//   6. 정상 → supabase.auth.updateUser 호출 + success + analytics meta
//   7. Supabase updateUser error → supabase_error
//   8. Supabase updateUser throw → supabase_error (graceful)
//   9. CON-04 — 모든 분기 message 에 의료 금칙어 0건

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const updateUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
      updateUser: (...args: unknown[]) => updateUserMock(...args),
    },
  }),
}));

import { requestEmailChange } from "@/app/actions/change-email";

const USER_ID = "user-uuid-email-1111";
const CURRENT_EMAIL = "old@example.com";
const NEW_EMAIL = "new@example.com";
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function setAuthUser(id: string, email: string | null = CURRENT_EMAIL) {
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
  updateUserMock.mockReset();
  // default — Supabase updateUser 정상 응답.
  updateUserMock.mockResolvedValue({ data: { user: null }, error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requestEmailChange — FR-C-ACCOUNT 이메일 변경 Server Action", () => {
  it("[1] 빈 이메일 → invalid_email (auth 호출 X)", async () => {
    const result = await requestEmailChange({ newEmail: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_email");
    expect(getUserMock).not.toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("[2] 잘못된 이메일 형식 → invalid_email", async () => {
    const result = await requestEmailChange({ newEmail: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_email");
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("[3] 비로그인 → unauthorized", async () => {
    setAnonymous();
    const result = await requestEmailChange({ newEmail: NEW_EMAIL });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("[4] auth throw → unauthorized (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    const result = await requestEmailChange({ newEmail: NEW_EMAIL });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
  });

  it("[5] 현재 이메일과 동일 (대소문자 무시) → same_as_current", async () => {
    setAuthUser(USER_ID, CURRENT_EMAIL);
    const result = await requestEmailChange({
      newEmail: CURRENT_EMAIL.toUpperCase(),
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("same_as_current");
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("[6] 정상 → supabase.auth.updateUser 호출 + success + analytics meta", async () => {
    setAuthUser(USER_ID, CURRENT_EMAIL);
    const result = await requestEmailChange({ newEmail: NEW_EMAIL });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.pendingEmail).toBe(NEW_EMAIL.toLowerCase());
    expect(result.analytics.userId).toBe(USER_ID);
    expect(updateUserMock).toHaveBeenCalledTimes(1);
    expect(updateUserMock).toHaveBeenCalledWith({
      email: NEW_EMAIL.toLowerCase(),
    });
  });

  it("[7] Supabase updateUser error → supabase_error", async () => {
    setAuthUser(USER_ID, CURRENT_EMAIL);
    updateUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "email already in use" },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await requestEmailChange({ newEmail: NEW_EMAIL });
    warnSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("supabase_error");
  });

  it("[8] Supabase updateUser throw → supabase_error (graceful)", async () => {
    setAuthUser(USER_ID, CURRENT_EMAIL);
    updateUserMock.mockImplementation(() => {
      throw new Error("network 5xx");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await requestEmailChange({ newEmail: NEW_EMAIL });
    errSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("supabase_error");
  });

  it("[9] CON-04 — 모든 실패 분기 message 에 의료 금칙어 0건", async () => {
    const cases: Array<() => Promise<unknown>> = [
      async () => requestEmailChange({ newEmail: "" }),
      async () => requestEmailChange({ newEmail: "not-email" }),
      async () => {
        setAnonymous();
        return requestEmailChange({ newEmail: NEW_EMAIL });
      },
      async () => {
        setAuthUser(USER_ID, CURRENT_EMAIL);
        return requestEmailChange({ newEmail: CURRENT_EMAIL });
      },
      async () => {
        setAuthUser(USER_ID, CURRENT_EMAIL);
        updateUserMock.mockResolvedValueOnce({
          data: { user: null },
          error: { message: "x" },
        });
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
          return await requestEmailChange({ newEmail: NEW_EMAIL });
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

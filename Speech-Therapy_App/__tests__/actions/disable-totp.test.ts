// FR-C-SECURITY — disableTotp Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock
//     (auth.getUser + auth.mfa.{listFactors, challenge, verify, unenroll})
//
// 시나리오 (총 9건):
//   1. 6자리 아닌 코드 → invalid_input (auth 호출 X)
//   2. 비인증 → unauthorized
//   3. auth throw → unauthorized (graceful)
//   4. listFactors 응답에 verified factor 없음 → not_enrolled
//   5. listFactors error → supabase_error
//   6. challenge error → supabase_error
//   7. verify invalid → invalid_code (unenroll 호출 X)
//   8. unenroll error → supabase_error
//   9. 정상 → success + analytics.userId + unenroll(factorId) 호출
//  10. CON-04 — 모든 실패 분기 message 에 의료 금칙어 0건

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const listFactorsMock = vi.fn();
const challengeMock = vi.fn();
const verifyMock = vi.fn();
const unenrollMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
      mfa: {
        listFactors: (...args: unknown[]) => listFactorsMock(...args),
        challenge: (...args: unknown[]) => challengeMock(...args),
        verify: (...args: unknown[]) => verifyMock(...args),
        unenroll: (...args: unknown[]) => unenrollMock(...args),
      },
    },
  }),
}));

import { disableTotp } from "@/app/actions/disable-totp";

const USER_ID = "user-uuid-disable-3333";
const FACTOR_ID = "factor-ccc";
const CHALLENGE_ID = "ch-ddd";
const VALID_CODE = "654321";
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function setAuthUser(id: string) {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}
function setAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}
function setListVerified() {
  listFactorsMock.mockResolvedValue({
    data: { totp: [{ id: FACTOR_ID, status: "verified" }] },
    error: null,
  });
}
function setChallengeOk() {
  challengeMock.mockResolvedValue({
    data: { id: CHALLENGE_ID },
    error: null,
  });
}
function setVerifyOk() {
  verifyMock.mockResolvedValue({
    data: { user: { id: USER_ID } },
    error: null,
  });
}
function setUnenrollOk() {
  unenrollMock.mockResolvedValue({ data: { id: FACTOR_ID }, error: null });
}

beforeEach(() => {
  getUserMock.mockReset();
  listFactorsMock.mockReset();
  challengeMock.mockReset();
  verifyMock.mockReset();
  unenrollMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("disableTotp — FR-C-SECURITY 2FA 비활성화 Server Action", () => {
  it("[1] 6자리 아닌 코드 → invalid_input (auth 호출 X)", async () => {
    const result = await disableTotp({ totpCode: "12" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_input");
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("[2] 비인증 → unauthorized", async () => {
    setAnonymous();
    const result = await disableTotp({ totpCode: VALID_CODE });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
    expect(listFactorsMock).not.toHaveBeenCalled();
  });

  it("[3] auth throw → unauthorized (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env");
    });
    const result = await disableTotp({ totpCode: VALID_CODE });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
  });

  it("[4] verified factor 없음 → not_enrolled", async () => {
    setAuthUser(USER_ID);
    listFactorsMock.mockResolvedValueOnce({
      data: { totp: [{ id: FACTOR_ID, status: "unverified" }] },
      error: null,
    });
    const result = await disableTotp({ totpCode: VALID_CODE });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("not_enrolled");
    expect(unenrollMock).not.toHaveBeenCalled();
  });

  it("[5] listFactors error → supabase_error", async () => {
    setAuthUser(USER_ID);
    listFactorsMock.mockResolvedValueOnce({
      data: null,
      error: { message: "list down" },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await disableTotp({ totpCode: VALID_CODE });
    warnSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("supabase_error");
  });

  it("[6] challenge error → supabase_error", async () => {
    setAuthUser(USER_ID);
    setListVerified();
    challengeMock.mockResolvedValueOnce({
      data: null,
      error: { message: "rate limited" },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await disableTotp({ totpCode: VALID_CODE });
    warnSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("supabase_error");
    expect(unenrollMock).not.toHaveBeenCalled();
  });

  it("[7] verify invalid → invalid_code (unenroll 호출 X)", async () => {
    setAuthUser(USER_ID);
    setListVerified();
    setChallengeOk();
    verifyMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid TOTP code" },
    });
    const result = await disableTotp({ totpCode: VALID_CODE });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("invalid_code");
      expect(result.analytics?.userId).toBe(USER_ID);
    }
    expect(unenrollMock).not.toHaveBeenCalled();
  });

  it("[8] unenroll error → supabase_error", async () => {
    setAuthUser(USER_ID);
    setListVerified();
    setChallengeOk();
    setVerifyOk();
    unenrollMock.mockResolvedValueOnce({
      data: null,
      error: { message: "fail" },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await disableTotp({ totpCode: VALID_CODE });
    warnSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("supabase_error");
  });

  it("[9] 정상 → success + analytics.userId + unenroll(factorId) 호출", async () => {
    setAuthUser(USER_ID);
    setListVerified();
    setChallengeOk();
    setVerifyOk();
    setUnenrollOk();
    const result = await disableTotp({ totpCode: VALID_CODE });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.analytics.userId).toBe(USER_ID);
    expect(unenrollMock).toHaveBeenCalledWith({ factorId: FACTOR_ID });
    expect(verifyMock).toHaveBeenCalledWith({
      factorId: FACTOR_ID,
      challengeId: CHALLENGE_ID,
      code: VALID_CODE,
    });
  });

  it("[10] CON-04 — 모든 실패 분기 message 에 의료 금칙어 0건", async () => {
    const collected: string[] = [];

    let r = await disableTotp({ totpCode: "12" });
    if (!r.success) collected.push(r.message);

    setAnonymous();
    r = await disableTotp({ totpCode: VALID_CODE });
    if (!r.success) collected.push(r.message);

    setAuthUser(USER_ID);
    listFactorsMock.mockResolvedValueOnce({
      data: { totp: [] },
      error: null,
    });
    r = await disableTotp({ totpCode: VALID_CODE });
    if (!r.success) collected.push(r.message);

    setListVerified();
    setChallengeOk();
    verifyMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid code" },
    });
    r = await disableTotp({ totpCode: VALID_CODE });
    if (!r.success) collected.push(r.message);

    for (const m of collected) {
      for (const w of FORBIDDEN_MEDICAL_WORDS) {
        expect(m).not.toContain(w);
      }
    }
  });
});

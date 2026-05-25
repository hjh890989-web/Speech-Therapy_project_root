// FR-C-SECURITY (MFA 마무리) — verifyMfaChallenge Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser + auth.mfa.challengeAndVerify)
//   - @/lib/security/backup-codes-store mock (useBackupCode + getRemainingBackupCodesCount)
//
// 시나리오 (총 ≥ 5):
//   1. mode=totp 정상 verify → success + analytics.mode='totp'
//   2. mode=totp 잘못된 code → invalid_code + analytics
//   3. mode=totp Supabase challengeAndVerify throw → graceful supabase_error
//   4. mode=totp expired → expired reason
//   5. mode=totp rate limit → rate_limited reason
//   6. mode=backup 정상 사용 → success + remainingBackupCodes
//   7. mode=backup 미일치 → invalid_code + remainingBackupCodes
//   8. 비인증 → unauthorized
//   9. invalid_input — 빈 factorId / 5자리 code → invalid_input
//  10. mode=backup useBackupCode throw → supabase_error + remaining 0 (graceful)
//  11. CON-04 — 모든 실패 message 에 의료 금칙어 0건

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const challengeAndVerifyMock = vi.fn();
const useBackupCodeMock = vi.fn();
const getRemainingMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
      mfa: {
        challengeAndVerify: (...args: unknown[]) => challengeAndVerifyMock(...args),
      },
    },
  }),
}));

vi.mock("@/lib/security/backup-codes-store", () => ({
  useBackupCode: (...args: unknown[]) => useBackupCodeMock(...args),
  getRemainingBackupCodesCount: (...args: unknown[]) => getRemainingMock(...args),
}));

import { verifyMfaChallenge } from "@/app/actions/verify-mfa-challenge";

const USER_ID = "user-uuid-mfa-7777";
const FACTOR_ID = "factor-mfa-1";
const VALID_TOTP = "123456";
const VALID_BACKUP = "ABCD1234";
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function setAuthUser(id: string) {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}
function setAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

beforeEach(() => {
  getUserMock.mockReset();
  challengeAndVerifyMock.mockReset();
  useBackupCodeMock.mockReset();
  getRemainingMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("verifyMfaChallenge — FR-C-SECURITY 로그인 MFA challenge", () => {
  it("[1] mode=totp 정상 verify → success + analytics.mode='totp'", async () => {
    setAuthUser(USER_ID);
    challengeAndVerifyMock.mockResolvedValueOnce({
      data: { user: { id: USER_ID } },
      error: null,
    });
    const result = await verifyMfaChallenge({
      mode: "totp",
      factorId: FACTOR_ID,
      code: VALID_TOTP,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.analytics.userId).toBe(USER_ID);
    expect(result.analytics.mode).toBe("totp");
    expect(challengeAndVerifyMock).toHaveBeenCalledWith({
      factorId: FACTOR_ID,
      code: VALID_TOTP,
    });
  });

  it("[2] mode=totp 잘못된 code → invalid_code + analytics", async () => {
    setAuthUser(USER_ID);
    challengeAndVerifyMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid TOTP code" },
    });
    const result = await verifyMfaChallenge({
      mode: "totp",
      factorId: FACTOR_ID,
      code: VALID_TOTP,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe("invalid_code");
    expect(result.analytics?.userId).toBe(USER_ID);
    expect(result.analytics?.mode).toBe("totp");
  });

  it("[3] challengeAndVerify throw → graceful supabase_error", async () => {
    setAuthUser(USER_ID);
    challengeAndVerifyMock.mockImplementation(() => {
      throw new Error("network");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await verifyMfaChallenge({
      mode: "totp",
      factorId: FACTOR_ID,
      code: VALID_TOTP,
    });
    errSpy.mockRestore();
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe("supabase_error");
  });

  it("[4] mode=totp expired → expired reason", async () => {
    setAuthUser(USER_ID);
    challengeAndVerifyMock.mockResolvedValueOnce({
      data: null,
      error: { message: "challenge expired" },
    });
    const result = await verifyMfaChallenge({
      mode: "totp",
      factorId: FACTOR_ID,
      code: VALID_TOTP,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe("expired");
  });

  it("[5] mode=totp rate limit → rate_limited reason", async () => {
    setAuthUser(USER_ID);
    challengeAndVerifyMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Too many requests, rate limit exceeded" },
    });
    const result = await verifyMfaChallenge({
      mode: "totp",
      factorId: FACTOR_ID,
      code: VALID_TOTP,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe("rate_limited");
  });

  it("[6] mode=backup 정상 사용 → success + remainingBackupCodes", async () => {
    setAuthUser(USER_ID);
    useBackupCodeMock.mockResolvedValueOnce({ ok: true, remaining: 7 });
    const result = await verifyMfaChallenge({
      mode: "backup",
      code: VALID_BACKUP,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.remainingBackupCodes).toBe(7);
    expect(result.analytics.mode).toBe("backup");
    expect(useBackupCodeMock).toHaveBeenCalledWith(USER_ID, VALID_BACKUP);
    expect(challengeAndVerifyMock).not.toHaveBeenCalled();
  });

  it("[7] mode=backup 미일치 → invalid_code + remainingBackupCodes", async () => {
    setAuthUser(USER_ID);
    useBackupCodeMock.mockResolvedValueOnce({ ok: false, remaining: 5 });
    const result = await verifyMfaChallenge({
      mode: "backup",
      code: VALID_BACKUP,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe("invalid_code");
    expect(result.remainingBackupCodes).toBe(5);
  });

  it("[8] 비인증 → unauthorized (Supabase MFA 호출 안 함)", async () => {
    setAnonymous();
    const result = await verifyMfaChallenge({
      mode: "totp",
      factorId: FACTOR_ID,
      code: VALID_TOTP,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe("unauthorized");
    expect(challengeAndVerifyMock).not.toHaveBeenCalled();
  });

  it("[9] invalid_input — 빈 factorId → invalid_input (auth 호출 X)", async () => {
    const result = await verifyMfaChallenge({
      mode: "totp",
      factorId: "",
      code: VALID_TOTP,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe("invalid_input");
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("[9b] invalid_input — 5자리 totp code → invalid_input", async () => {
    const result = await verifyMfaChallenge({
      mode: "totp",
      factorId: FACTOR_ID,
      code: "12345",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe("invalid_input");
  });

  it("[9c] invalid_input — backup code 7자리 → invalid_input", async () => {
    const result = await verifyMfaChallenge({
      mode: "backup",
      code: "ABCD123",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe("invalid_input");
  });

  it("[10] mode=backup useBackupCode throw → supabase_error + remaining 0", async () => {
    setAuthUser(USER_ID);
    useBackupCodeMock.mockImplementation(() => {
      throw new Error("DB");
    });
    getRemainingMock.mockResolvedValueOnce(3);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await verifyMfaChallenge({
      mode: "backup",
      code: VALID_BACKUP,
    });
    errSpy.mockRestore();
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe("supabase_error");
    // graceful: getRemainingBackupCodesCount 으로 카운트 회수.
    expect(result.remainingBackupCodes).toBe(3);
  });

  it("[11] CON-04 — 모든 실패 message 에 의료 금칙어 0건", async () => {
    const collected: string[] = [];

    // invalid_input
    let r = await verifyMfaChallenge({
      mode: "totp",
      factorId: "",
      code: VALID_TOTP,
    });
    if (!r.success) collected.push(r.message);

    // unauthorized
    setAnonymous();
    r = await verifyMfaChallenge({
      mode: "totp",
      factorId: FACTOR_ID,
      code: VALID_TOTP,
    });
    if (!r.success) collected.push(r.message);

    // invalid_code
    setAuthUser(USER_ID);
    challengeAndVerifyMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid code" },
    });
    r = await verifyMfaChallenge({
      mode: "totp",
      factorId: FACTOR_ID,
      code: VALID_TOTP,
    });
    if (!r.success) collected.push(r.message);

    // expired
    challengeAndVerifyMock.mockResolvedValueOnce({
      data: null,
      error: { message: "expired" },
    });
    r = await verifyMfaChallenge({
      mode: "totp",
      factorId: FACTOR_ID,
      code: VALID_TOTP,
    });
    if (!r.success) collected.push(r.message);

    // backup invalid
    useBackupCodeMock.mockResolvedValueOnce({ ok: false, remaining: 2 });
    r = await verifyMfaChallenge({
      mode: "backup",
      code: VALID_BACKUP,
    });
    if (!r.success) collected.push(r.message);

    for (const m of collected) {
      for (const w of FORBIDDEN_MEDICAL_WORDS) {
        expect(m).not.toContain(w);
      }
    }
  });
});

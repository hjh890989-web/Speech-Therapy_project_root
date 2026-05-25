// FR-C-SECURITY — verifyTotpEnroll Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser + auth.mfa.{challenge, verify})
//
// 시나리오 (총 9건):
//   1. 빈 factorId → invalid_input (auth 호출 X)
//   2. 6자리 아닌 code → invalid_input
//   3. 비인증 → unauthorized
//   4. auth throw → unauthorized (graceful)
//   5. challenge error → supabase_error + analytics.userId
//   6. challenge throw → supabase_error
//   7. verify invalid → invalid_code + analytics.userId
//   8. verify expired → expired
//   9. 정상 → success + 8개 backupCodes + analytics.userId
//  10. CON-04 — 모든 실패 분기 message 에 의료 금칙어 0건

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const challengeMock = vi.fn();
const verifyMock = vi.fn();
const storeBackupCodesMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
      mfa: {
        challenge: (...args: unknown[]) => challengeMock(...args),
        verify: (...args: unknown[]) => verifyMock(...args),
      },
    },
  }),
}));

// MFA 마무리 PR — storeBackupCodes mock (DB 호출 격리).
vi.mock("@/lib/security/backup-codes-store", () => ({
  storeBackupCodes: (...args: unknown[]) => storeBackupCodesMock(...args),
}));

import { verifyTotpEnroll } from "@/app/actions/verify-totp";

const USER_ID = "user-uuid-verify-2222";
const FACTOR_ID = "factor-bbb";
const CHALLENGE_ID = "ch-ccc";
const VALID_CODE = "123456";
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function setAuthUser(id: string) {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}
function setAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
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

beforeEach(() => {
  getUserMock.mockReset();
  challengeMock.mockReset();
  verifyMock.mockReset();
  storeBackupCodesMock.mockReset();
  storeBackupCodesMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("verifyTotpEnroll — FR-C-SECURITY 2FA 검증 Server Action", () => {
  it("[1] 빈 factorId → invalid_input (auth 호출 X)", async () => {
    const result = await verifyTotpEnroll({ factorId: "", code: VALID_CODE });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_input");
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("[2] 6자리 아닌 code → invalid_input", async () => {
    const result = await verifyTotpEnroll({
      factorId: FACTOR_ID,
      code: "12345",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_input");
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("[3] 비인증 → unauthorized", async () => {
    setAnonymous();
    const result = await verifyTotpEnroll({
      factorId: FACTOR_ID,
      code: VALID_CODE,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
    expect(challengeMock).not.toHaveBeenCalled();
  });

  it("[4] auth throw → unauthorized (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env");
    });
    const result = await verifyTotpEnroll({
      factorId: FACTOR_ID,
      code: VALID_CODE,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
  });

  it("[5] challenge error → supabase_error + analytics.userId", async () => {
    setAuthUser(USER_ID);
    challengeMock.mockResolvedValueOnce({
      data: null,
      error: { message: "rate limited" },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await verifyTotpEnroll({
      factorId: FACTOR_ID,
      code: VALID_CODE,
    });
    warnSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("supabase_error");
      expect(result.analytics?.userId).toBe(USER_ID);
    }
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("[6] challenge throw → supabase_error", async () => {
    setAuthUser(USER_ID);
    challengeMock.mockImplementation(() => {
      throw new Error("net");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await verifyTotpEnroll({
      factorId: FACTOR_ID,
      code: VALID_CODE,
    });
    errSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("supabase_error");
  });

  it("[7] verify invalid → invalid_code + analytics.userId", async () => {
    setAuthUser(USER_ID);
    setChallengeOk();
    verifyMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid TOTP code" },
    });
    const result = await verifyTotpEnroll({
      factorId: FACTOR_ID,
      code: VALID_CODE,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("invalid_code");
      expect(result.analytics?.userId).toBe(USER_ID);
    }
  });

  it("[8] verify expired → expired", async () => {
    setAuthUser(USER_ID);
    setChallengeOk();
    verifyMock.mockResolvedValueOnce({
      data: null,
      error: { message: "challenge expired" },
    });
    const result = await verifyTotpEnroll({
      factorId: FACTOR_ID,
      code: VALID_CODE,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("expired");
  });

  it("[9] 정상 → success + 8개 backupCodes + analytics.userId + storeBackupCodes 호출", async () => {
    setAuthUser(USER_ID);
    setChallengeOk();
    setVerifyOk();
    const result = await verifyTotpEnroll({
      factorId: FACTOR_ID,
      code: VALID_CODE,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.backupCodes).toHaveLength(8);
    for (const c of result.backupCodes) {
      expect(c).toHaveLength(8);
    }
    expect(result.analytics.userId).toBe(USER_ID);
    expect(challengeMock).toHaveBeenCalledWith({ factorId: FACTOR_ID });
    expect(verifyMock).toHaveBeenCalledWith({
      factorId: FACTOR_ID,
      challengeId: CHALLENGE_ID,
      code: VALID_CODE,
    });
    // MFA 마무리 — backup codes hash 저장 호출 검증.
    expect(storeBackupCodesMock).toHaveBeenCalledTimes(1);
    expect(storeBackupCodesMock).toHaveBeenCalledWith(
      USER_ID,
      result.backupCodes,
    );
  });

  it("[9b] 정상 verify 직후 storeBackupCodes throw → 여전히 success (graceful — TOTP 활성 보존)", async () => {
    setAuthUser(USER_ID);
    setChallengeOk();
    setVerifyOk();
    storeBackupCodesMock.mockImplementationOnce(() => {
      throw new Error("DB down");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await verifyTotpEnroll({
      factorId: FACTOR_ID,
      code: VALID_CODE,
    });
    errSpy.mockRestore();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.backupCodes).toHaveLength(8);
    expect(result.analytics.userId).toBe(USER_ID);
  });

  it("[10] CON-04 — 모든 실패 분기 message 에 의료 금칙어 0건", async () => {
    const collected: string[] = [];

    let r = await verifyTotpEnroll({ factorId: "", code: VALID_CODE });
    if (!r.success) collected.push(r.message);

    r = await verifyTotpEnroll({ factorId: FACTOR_ID, code: "abc" });
    if (!r.success) collected.push(r.message);

    setAnonymous();
    r = await verifyTotpEnroll({ factorId: FACTOR_ID, code: VALID_CODE });
    if (!r.success) collected.push(r.message);

    setAuthUser(USER_ID);
    setChallengeOk();
    verifyMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid code" },
    });
    r = await verifyTotpEnroll({ factorId: FACTOR_ID, code: VALID_CODE });
    if (!r.success) collected.push(r.message);

    verifyMock.mockResolvedValueOnce({
      data: null,
      error: { message: "challenge expired" },
    });
    r = await verifyTotpEnroll({ factorId: FACTOR_ID, code: VALID_CODE });
    if (!r.success) collected.push(r.message);

    for (const m of collected) {
      for (const w of FORBIDDEN_MEDICAL_WORDS) {
        expect(m).not.toContain(w);
      }
    }
  });
});

// FR-C-SECURITY — requestEnrollTotp Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser + auth.mfa.{listFactors, enroll})
//
// 시나리오 (총 7건):
//   1. 비인증 → unauthorized (enroll 호출 X)
//   2. auth throw → unauthorized (graceful)
//   3. 이미 verified TOTP factor 존재 → already_enrolled
//   4. 정상 enroll → success + factorId + qrCode + secret
//   5. enroll 응답에 totp 필드 누락 → supabase_error
//   6. enroll error 반환 → supabase_error
//   7. enroll throw → supabase_error (graceful)
//   8. listFactors throw → enroll 진행 (보수적) + 정상 응답
//   9. CON-04 — 모든 실패 분기 message 에 의료 금칙어 0건

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const listFactorsMock = vi.fn();
const enrollMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
      mfa: {
        listFactors: (...args: unknown[]) => listFactorsMock(...args),
        enroll: (...args: unknown[]) => enrollMock(...args),
      },
    },
  }),
}));

import { requestEnrollTotp } from "@/app/actions/enroll-totp";

const USER_ID = "user-uuid-totp-1111";
const FACTOR_ID = "factor-aaa";
const QR_CODE = "data:image/svg+xml;base64,QR_BLOB";
const SECRET = "JBSWY3DPEHPK3PXP";
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function setAuthUser(id: string) {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}
function setAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}
function setListFactorsEmpty() {
  listFactorsMock.mockResolvedValue({
    data: { totp: [], all: [], phone: [] },
    error: null,
  });
}
function setListFactorsWithVerified() {
  listFactorsMock.mockResolvedValue({
    data: { totp: [{ id: FACTOR_ID, status: "verified" }] },
    error: null,
  });
}
function setEnrollOk() {
  enrollMock.mockResolvedValue({
    data: {
      id: FACTOR_ID,
      type: "totp",
      totp: { qr_code: QR_CODE, secret: SECRET },
    },
    error: null,
  });
}

beforeEach(() => {
  getUserMock.mockReset();
  listFactorsMock.mockReset();
  enrollMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requestEnrollTotp — FR-C-SECURITY 2FA 시작 Server Action", () => {
  it("[1] 비인증 → unauthorized (enroll 호출 X)", async () => {
    setAnonymous();
    const result = await requestEnrollTotp();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
    expect(enrollMock).not.toHaveBeenCalled();
    expect(listFactorsMock).not.toHaveBeenCalled();
  });

  it("[2] auth throw → unauthorized (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    const result = await requestEnrollTotp();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
    expect(enrollMock).not.toHaveBeenCalled();
  });

  it("[3] 이미 verified TOTP factor 존재 → already_enrolled", async () => {
    setAuthUser(USER_ID);
    setListFactorsWithVerified();
    const result = await requestEnrollTotp();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("already_enrolled");
    expect(enrollMock).not.toHaveBeenCalled();
  });

  it("[4] 정상 enroll → success + factorId + qrCode + secret", async () => {
    setAuthUser(USER_ID);
    setListFactorsEmpty();
    setEnrollOk();
    const result = await requestEnrollTotp();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.factorId).toBe(FACTOR_ID);
    expect(result.qrCode).toBe(QR_CODE);
    expect(result.secret).toBe(SECRET);
    expect(enrollMock).toHaveBeenCalledTimes(1);
    const enrollArg = enrollMock.mock.calls[0]![0] as {
      factorType?: string;
      friendlyName?: string;
    };
    expect(enrollArg.factorType).toBe("totp");
    expect(typeof enrollArg.friendlyName).toBe("string");
  });

  it("[5] enroll 응답에 totp 필드 누락 → supabase_error", async () => {
    setAuthUser(USER_ID);
    setListFactorsEmpty();
    enrollMock.mockResolvedValueOnce({
      data: { id: FACTOR_ID, type: "totp" /* totp 누락 */ },
      error: null,
    });
    const result = await requestEnrollTotp();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("supabase_error");
  });

  it("[6] enroll error 반환 → supabase_error", async () => {
    setAuthUser(USER_ID);
    setListFactorsEmpty();
    enrollMock.mockResolvedValueOnce({
      data: null,
      error: { message: "rate limited" },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await requestEnrollTotp();
    warnSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("supabase_error");
  });

  it("[7] enroll throw → supabase_error (graceful)", async () => {
    setAuthUser(USER_ID);
    setListFactorsEmpty();
    enrollMock.mockImplementation(() => {
      throw new Error("network 5xx");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await requestEnrollTotp();
    errSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("supabase_error");
  });

  it("[8] listFactors throw → enroll 진행 (보수적) + 정상 응답", async () => {
    setAuthUser(USER_ID);
    listFactorsMock.mockImplementation(() => {
      throw new Error("list down");
    });
    setEnrollOk();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await requestEnrollTotp();
    warnSpy.mockRestore();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.factorId).toBe(FACTOR_ID);
    }
  });

  it("[9] CON-04 — 모든 실패 분기 message 에 의료 금칙어 0건", async () => {
    const collected: string[] = [];

    // unauthorized.
    setAnonymous();
    let r = await requestEnrollTotp();
    if (!r.success) collected.push(r.message);

    // already_enrolled.
    setAuthUser(USER_ID);
    setListFactorsWithVerified();
    r = await requestEnrollTotp();
    if (!r.success) collected.push(r.message);

    // supabase_error (enroll error).
    setListFactorsEmpty();
    enrollMock.mockResolvedValueOnce({
      data: null,
      error: { message: "x" },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    r = await requestEnrollTotp();
    warnSpy.mockRestore();
    if (!r.success) collected.push(r.message);

    for (const m of collected) {
      for (const w of FORBIDDEN_MEDICAL_WORDS) {
        expect(m).not.toContain(w);
      }
    }
  });
});

// FR-C-SECURITY (MFA 마무리) — regenerateBackupCodes Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser + auth.mfa.listFactors)
//   - @/lib/security/backup-codes-store mock (storeBackupCodes)
//   - @/lib/security/backup-codes mock (generateBackupCodes) — 결정론적 codes 반환
//
// 시나리오 (≥ 3):
//   1. 정상 → success + 8개 새 codes + storeBackupCodes 호출 + analytics
//   2. 비인증 → unauthorized + storeBackupCodes 호출 X
//   3. TOTP 미등록 → not_enrolled
//   4. listFactors error → supabase_error
//   5. storeBackupCodes throw → supabase_error (graceful)
//   6. CON-04 — 모든 실패 message 에 의료 금칙어 0건

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const listFactorsMock = vi.fn();
const storeMock = vi.fn();
const generateMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
      mfa: {
        listFactors: (...args: unknown[]) => listFactorsMock(...args),
      },
    },
  }),
}));

vi.mock("@/lib/security/backup-codes-store", () => ({
  storeBackupCodes: (...args: unknown[]) => storeMock(...args),
}));

vi.mock("@/lib/security/backup-codes", () => ({
  generateBackupCodes: (...args: unknown[]) => generateMock(...args),
}));

import { regenerateBackupCodes } from "@/app/actions/regenerate-backup-codes";

const USER_ID = "user-uuid-regen-5555";
const FACTOR_ID = "factor-regen-1";
const DETERMINISTIC_CODES = [
  "AAAA1111",
  "BBBB2222",
  "CCCC3333",
  "DDDD4444",
  "EEEE5555",
  "FFFF6666",
  "GGGG7777",
  "HHHH8888",
];
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function setAuthUser(id: string) {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}
function setAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}
function setListFactorsVerified() {
  listFactorsMock.mockResolvedValue({
    data: { totp: [{ id: FACTOR_ID, status: "verified" }] },
    error: null,
  });
}
function setListFactorsEmpty() {
  listFactorsMock.mockResolvedValue({
    data: { totp: [], all: [] },
    error: null,
  });
}

beforeEach(() => {
  getUserMock.mockReset();
  listFactorsMock.mockReset();
  storeMock.mockReset();
  generateMock.mockReset();
  generateMock.mockReturnValue(DETERMINISTIC_CODES);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("regenerateBackupCodes — FR-C-SECURITY 백업 코드 재생성 Server Action", () => {
  it("[1] 정상 → success + 8개 새 codes + storeBackupCodes 호출 + analytics", async () => {
    setAuthUser(USER_ID);
    setListFactorsVerified();
    storeMock.mockResolvedValue(undefined);

    const result = await regenerateBackupCodes();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.backupCodes).toEqual(DETERMINISTIC_CODES);
    expect(result.backupCodes).toHaveLength(8);
    expect(result.analytics.userId).toBe(USER_ID);
    expect(storeMock).toHaveBeenCalledWith(USER_ID, DETERMINISTIC_CODES);
  });

  it("[2] 비인증 → unauthorized + storeBackupCodes 호출 X", async () => {
    setAnonymous();
    const result = await regenerateBackupCodes();
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe("unauthorized");
    expect(listFactorsMock).not.toHaveBeenCalled();
    expect(storeMock).not.toHaveBeenCalled();
  });

  it("[3] TOTP 미등록 (verified factor 없음) → not_enrolled", async () => {
    setAuthUser(USER_ID);
    setListFactorsEmpty();
    const result = await regenerateBackupCodes();
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe("not_enrolled");
    expect(storeMock).not.toHaveBeenCalled();
  });

  it("[4] listFactors error → supabase_error", async () => {
    setAuthUser(USER_ID);
    listFactorsMock.mockResolvedValueOnce({
      data: null,
      error: { message: "rate limited" },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await regenerateBackupCodes();
    warnSpy.mockRestore();
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe("supabase_error");
    expect(result.analytics?.userId).toBe(USER_ID);
    expect(storeMock).not.toHaveBeenCalled();
  });

  it("[5] storeBackupCodes throw → supabase_error (graceful)", async () => {
    setAuthUser(USER_ID);
    setListFactorsVerified();
    storeMock.mockImplementation(() => {
      throw new Error("DB down");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await regenerateBackupCodes();
    errSpy.mockRestore();
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe("supabase_error");
  });

  it("[6] CON-04 — 모든 실패 message 에 의료 금칙어 0건", async () => {
    const collected: string[] = [];

    setAnonymous();
    let r = await regenerateBackupCodes();
    if (!r.success) collected.push(r.message);

    setAuthUser(USER_ID);
    setListFactorsEmpty();
    r = await regenerateBackupCodes();
    if (!r.success) collected.push(r.message);

    listFactorsMock.mockResolvedValueOnce({
      data: null,
      error: { message: "x" },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    r = await regenerateBackupCodes();
    warnSpy.mockRestore();
    if (!r.success) collected.push(r.message);

    for (const m of collected) {
      for (const w of FORBIDDEN_MEDICAL_WORDS) {
        expect(m).not.toContain(w);
      }
    }
  });
});

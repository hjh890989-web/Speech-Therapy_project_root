// FR-2FA-RECOVERY — adminResetTotp Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/supabase/admin mock (getSupabaseAdmin → auth.admin.mfa.{listFactors, deleteFactor})
//   - @/lib/db Prisma mock (user.findUnique caller / target / user.update)
//   - @/lib/db/with-actor mock (pass-through tx)
//   - @/lib/audit/critical-alert mock (alertIfCritical fire-and-forget)
//
// 시나리오 (총 14건 — task 요구 ≥10):
//   1. invalid_input — email 형식 부적합 → invalid_input (auth 호출 X)
//   2. invalid_input — confirmation 빈 문자열 → invalid_input
//   3. email_mismatch — target ≠ confirm → email_mismatch (auth 호출 X)
//   4. email_mismatch — 대소문자 무관 매칭 일치 → email_mismatch 통과
//   5. 비인증 → unauthorized
//   6. auth throw → unauthorized (graceful)
//   7. caller role !== 'admin' → forbidden
//   8. caller findUnique throw → db_failed
//   9. target_not_found — 해당 email 의 user 없음
// 10. target findUnique throw → db_failed
// 11. 정상 success — withActor 호출 + user.update + alertIfCritical 호출 + factorsUnenrolled 카운트
// 12. user.update throw → db_failed
// 13. Supabase admin SDK 부재 → success (graceful — auth factor unenroll skip, DB 측만 reset)
// 14. listFactors error → supabase_error
// 15. deleteFactor error → supabase_error
// 16. CON-04 모든 실패 분기 message 의료 금칙어 0건
// 17. Audit — withActor 가 caller.id 로 호출 (target.id 가 아닌)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
  }),
}));

const listFactorsMock = vi.fn();
const deleteFactorMock = vi.fn();
const getSupabaseAdminMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

const userFindUniqueMock = vi.fn();
const userUpdateMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
      update: (...args: unknown[]) => userUpdateMock(...args),
    },
  },
}));

const withActorMock = vi.fn();
vi.mock("@/lib/db/with-actor", () => ({
  withActor: async <T,>(
    actorId: string | null | undefined,
    fn: (tx: unknown) => Promise<T>,
  ) => {
    withActorMock(actorId);
    const tx = {
      user: {
        update: (...args: unknown[]) => userUpdateMock(...args),
      },
    };
    return fn(tx);
  },
}));

// 인자 타입을 rest 파라미터로 명시 — alertIfCritical(action, actorId, diff) spread/구조분해 tsc 정합.
const alertIfCriticalMock = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock("@/lib/audit/critical-alert", () => ({
  alertIfCritical: (...args: unknown[]) => alertIfCriticalMock(...args),
}));

import { adminResetTotp } from "@/app/actions/admin-reset-totp";

const ADMIN_ID = "admin-uuid-1111";
const TARGET_ID = "target-uuid-2222";
const TARGET_EMAIL = "lockout-victim@example.com";
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function setAuthAdmin() {
  getUserMock.mockResolvedValue({ data: { user: { id: ADMIN_ID } }, error: null });
}
function setAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

/**
 * findUnique mock 가 _두 번_ 호출됨 (caller / target).
 * 1st: callerRow (role 만 select)
 * 2nd: targetRow (id/email/totpBackupCodes)
 */
function setCallerThenTarget(
  callerRow: { role: string } | null,
  targetRow:
    | { id: string; email: string | null; totpBackupCodes: string[] }
    | null,
) {
  userFindUniqueMock.mockReset();
  userFindUniqueMock.mockResolvedValueOnce(callerRow);
  userFindUniqueMock.mockResolvedValueOnce(targetRow);
}

beforeEach(() => {
  getUserMock.mockReset();
  listFactorsMock.mockReset();
  deleteFactorMock.mockReset();
  getSupabaseAdminMock.mockReset();
  userFindUniqueMock.mockReset();
  userUpdateMock.mockReset();
  withActorMock.mockReset();
  alertIfCriticalMock.mockReset();
  alertIfCriticalMock.mockResolvedValue(undefined);
  // default — Supabase admin SDK 정상 동작 + MFA factors 1개 회수 + 삭제 성공.
  getSupabaseAdminMock.mockReturnValue({
    auth: {
      admin: {
        mfa: {
          listFactors: (args: { userId: string }) => listFactorsMock(args),
          deleteFactor: (args: { userId: string; id: string }) =>
            deleteFactorMock(args),
        },
      },
    },
  });
  listFactorsMock.mockResolvedValue({
    data: { factors: [{ id: "factor-aaa" }] },
    error: null,
  });
  deleteFactorMock.mockResolvedValue({ data: {}, error: null });
  userUpdateMock.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("adminResetTotp — FR-2FA-RECOVERY admin TOTP reset Server Action", () => {
  it("[1] email 형식 부적합 → invalid_input (auth 호출 X)", async () => {
    const result = await adminResetTotp({
      targetUserEmail: "not-an-email",
      confirmationEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_input");
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("[2] confirmation 빈 문자열 → invalid_input", async () => {
    const result = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_input");
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("[3] target ≠ confirm → email_mismatch (auth 호출 X)", async () => {
    const result = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: "other-user@example.com",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("email_mismatch");
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("[4] 대소문자 무관 매칭 — UPPERCASE 입력도 정확 매치로 통과", async () => {
    setAuthAdmin();
    setCallerThenTarget(
      { role: "admin" },
      { id: TARGET_ID, email: TARGET_EMAIL, totpBackupCodes: [] },
    );
    const result = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL.toUpperCase(),
    });
    expect(result.success).toBe(true);
  });

  it("[5] 비인증 → unauthorized", async () => {
    setAnonymous();
    const result = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("[6] auth throw → unauthorized (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    const result = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
  });

  it("[7] caller role !== 'admin' → forbidden", async () => {
    setAuthAdmin();
    setCallerThenTarget({ role: "principal" }, null);
    const result = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("forbidden");
      expect(result.analytics?.adminUserId).toBe(ADMIN_ID);
    }
    // target user findUnique 호출되지 않음 (forbidden 차단 후).
    expect(userFindUniqueMock).toHaveBeenCalledTimes(1);
    expect(listFactorsMock).not.toHaveBeenCalled();
  });

  it("[8] caller findUnique throw → db_failed", async () => {
    setAuthAdmin();
    userFindUniqueMock.mockRejectedValueOnce(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL,
    });
    errSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("db_failed");
  });

  it("[9] target_not_found — 해당 email user 없음", async () => {
    setAuthAdmin();
    setCallerThenTarget({ role: "admin" }, null);
    const result = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("target_not_found");
      expect(result.analytics?.adminUserId).toBe(ADMIN_ID);
    }
    expect(listFactorsMock).not.toHaveBeenCalled();
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("[10] target findUnique throw → db_failed", async () => {
    setAuthAdmin();
    userFindUniqueMock.mockReset();
    userFindUniqueMock.mockResolvedValueOnce({ role: "admin" });
    userFindUniqueMock.mockRejectedValueOnce(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL,
    });
    errSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("db_failed");
  });

  it("[11] 정상 success — withActor + user.update + alertIfCritical 호출 + factorsUnenrolled 카운트", async () => {
    setAuthAdmin();
    setCallerThenTarget(
      { role: "admin" },
      {
        id: TARGET_ID,
        email: TARGET_EMAIL,
        totpBackupCodes: ["hash1", "hash2", "hash3"],
      },
    );
    // 2개 factor 회수.
    listFactorsMock.mockResolvedValueOnce({
      data: { factors: [{ id: "fa1" }, { id: "fa2" }] },
      error: null,
    });

    const result = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.factorsUnenrolled).toBe(2);
    expect(result.previousBackupCodesCount).toBe(3);
    expect(result.analytics.adminUserId).toBe(ADMIN_ID);
    expect(result.analytics.targetUserId).toBe(TARGET_ID);

    // deleteFactor 가 두 번 호출됨.
    expect(deleteFactorMock).toHaveBeenCalledTimes(2);
    expect(deleteFactorMock).toHaveBeenNthCalledWith(1, {
      userId: TARGET_ID,
      id: "fa1",
    });
    expect(deleteFactorMock).toHaveBeenNthCalledWith(2, {
      userId: TARGET_ID,
      id: "fa2",
    });

    // user.update 가 totpBackupCodes: [] 로 호출.
    expect(userUpdateMock).toHaveBeenCalledTimes(1);
    const updateCall = userUpdateMock.mock.calls[0]![0] as {
      where: { id: string };
      data: { totpBackupCodes: string[] };
    };
    expect(updateCall.where.id).toBe(TARGET_ID);
    expect(updateCall.data.totpBackupCodes).toEqual([]);

    // alertIfCritical 호출 — fire-and-forget 이므로 microtask flush.
    await Promise.resolve();
    await Promise.resolve();
    expect(alertIfCriticalMock).toHaveBeenCalled();
    const [action, actorId, diff] = alertIfCriticalMock.mock.calls[0]!;
    expect(action).toBe("totp_disabled");
    expect(actorId).toBe(ADMIN_ID);
    expect(diff).toMatchObject({
      targetUserId: TARGET_ID,
      factorsUnenrolled: 2,
      previousBackupCodesCount: 3,
      source: "admin_reset_totp",
    });
  });

  it("[12] user.update throw → db_failed", async () => {
    setAuthAdmin();
    setCallerThenTarget(
      { role: "admin" },
      { id: TARGET_ID, email: TARGET_EMAIL, totpBackupCodes: [] },
    );
    userUpdateMock.mockRejectedValueOnce(new Error("FK constraint"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL,
    });
    errSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("db_failed");
  });

  it("[13] Supabase admin SDK 부재 → success (graceful, DB 측만 reset, factorsUnenrolled: 0)", async () => {
    getSupabaseAdminMock.mockReturnValueOnce(null);
    setAuthAdmin();
    setCallerThenTarget(
      { role: "admin" },
      { id: TARGET_ID, email: TARGET_EMAIL, totpBackupCodes: ["h1"] },
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL,
    });
    warnSpy.mockRestore();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.factorsUnenrolled).toBe(0);
    // DB update 는 진행됨.
    expect(userUpdateMock).toHaveBeenCalledTimes(1);
    // listFactors 호출되지 않음.
    expect(listFactorsMock).not.toHaveBeenCalled();
  });

  it("[14] listFactors error → supabase_error", async () => {
    setAuthAdmin();
    setCallerThenTarget(
      { role: "admin" },
      { id: TARGET_ID, email: TARGET_EMAIL, totpBackupCodes: [] },
    );
    listFactorsMock.mockResolvedValueOnce({
      data: null,
      error: { message: "list error" },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL,
    });
    warnSpy.mockRestore();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("supabase_error");
      expect(result.analytics?.adminUserId).toBe(ADMIN_ID);
      expect(result.analytics?.targetUserId).toBe(TARGET_ID);
    }
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("[15] deleteFactor error → supabase_error", async () => {
    setAuthAdmin();
    setCallerThenTarget(
      { role: "admin" },
      { id: TARGET_ID, email: TARGET_EMAIL, totpBackupCodes: [] },
    );
    listFactorsMock.mockResolvedValueOnce({
      data: { factors: [{ id: "fa1" }] },
      error: null,
    });
    deleteFactorMock.mockResolvedValueOnce({
      data: null,
      error: { message: "delete fail" },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL,
    });
    warnSpy.mockRestore();

    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("supabase_error");
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("[16] CON-04 — 모든 실패 분기 message 에 의료 금칙어 0건", async () => {
    const collected: string[] = [];

    // invalid_input
    let r = await adminResetTotp({
      targetUserEmail: "bad",
      confirmationEmail: "bad",
    });
    if (!r.success) collected.push(r.message);

    // email_mismatch
    r = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: "other@example.com",
    });
    if (!r.success) collected.push(r.message);

    // unauthorized
    setAnonymous();
    r = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL,
    });
    if (!r.success) collected.push(r.message);

    // forbidden
    setAuthAdmin();
    setCallerThenTarget({ role: "parent" }, null);
    r = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL,
    });
    if (!r.success) collected.push(r.message);

    // target_not_found
    setAuthAdmin();
    setCallerThenTarget({ role: "admin" }, null);
    r = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL,
    });
    if (!r.success) collected.push(r.message);

    for (const m of collected) {
      for (const w of FORBIDDEN_MEDICAL_WORDS) {
        expect(m).not.toContain(w);
      }
    }
    // 최소 4개 분기 메시지 수집 확인 (테스트 자체 무결성).
    expect(collected.length).toBeGreaterThanOrEqual(4);
  });

  it("[17] Audit — withActor 가 caller.id (admin) 로 호출 (target.id 아님)", async () => {
    setAuthAdmin();
    setCallerThenTarget(
      { role: "admin" },
      { id: TARGET_ID, email: TARGET_EMAIL, totpBackupCodes: [] },
    );
    const result = await adminResetTotp({
      targetUserEmail: TARGET_EMAIL,
      confirmationEmail: TARGET_EMAIL,
    });
    expect(result.success).toBe(true);
    expect(withActorMock).toHaveBeenCalledTimes(1);
    expect(withActorMock).toHaveBeenCalledWith(ADMIN_ID);
    // _절대_ target.id 로 호출되면 안 됨 (감사 누락 risk).
    expect(withActorMock).not.toHaveBeenCalledWith(TARGET_ID);
  });
});

// FR-C-ACCOUNT — deleteAccount Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/supabase/admin mock (getSupabaseAdmin → auth.admin.deleteUser)
//   - @/lib/db Prisma mock (user.findUnique / user.delete)
//   - @/lib/db/with-actor mock (pass-through tx)
//
// 시나리오 (총 10건):
//   1. confirmation 텍스트 미매칭 → invalid_confirmation (auth 호출 X)
//   2. confirmation 빈 문자열 → invalid_confirmation
//   3. confirmation 매칭 + 비로그인 → unauthorized
//   4. confirmation + auth throw → unauthorized (graceful)
//   5. 정상 삭제 (User row 존재) → success + withActor + user.delete + Supabase admin 호출
//   6. user row 없음 (멱등) → success + role: null + DB delete skip + auth admin 호출만
//   7. Prisma user.findUnique throw → db_failed
//   8. Prisma user.delete throw → db_failed
//   9. Supabase admin SDK 부재 → success + authUserDeleted: false + 경고 로그
//  10. Supabase admin.deleteUser throw → success (DB 는 완료) + authUserDeleted: false (partial)
//  11. analytics meta 제공 (role 캡처 정확) — DB delete 직전 사전조회 값
//  12. CON-04 — 모든 결과 message 에 의료 금칙어 0건

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
  }),
}));

const deleteUserMock = vi.fn();
const getSupabaseAdminMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

const userFindUniqueMock = vi.fn();
const userDeleteMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
      delete: (...args: unknown[]) => userDeleteMock(...args),
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
        delete: (...args: unknown[]) => userDeleteMock(...args),
      },
    };
    return fn(tx);
  },
}));

import {
  ACCOUNT_DELETE_CONFIRMATION_TEXT,
  deleteAccount,
} from "@/app/actions/delete-account";

const USER_ID = "user-uuid-delete-9999";
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function setAuthUser(id: string) {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}
function setAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

beforeEach(() => {
  getUserMock.mockReset();
  deleteUserMock.mockReset();
  getSupabaseAdminMock.mockReset();
  userFindUniqueMock.mockReset();
  userDeleteMock.mockReset();
  withActorMock.mockReset();
  // default — Supabase admin SDK 정상 동작.
  getSupabaseAdminMock.mockReturnValue({
    auth: {
      admin: {
        deleteUser: (id: string) => deleteUserMock(id),
      },
    },
  });
  deleteUserMock.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("deleteAccount — FR-C-ACCOUNT 계정 삭제 Server Action", () => {
  it("[1] confirmation 텍스트 미매칭 → invalid_confirmation (auth 호출 X)", async () => {
    const result = await deleteAccount({ confirmation: "삭제" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_confirmation");
    expect(getUserMock).not.toHaveBeenCalled();
    expect(userDeleteMock).not.toHaveBeenCalled();
  });

  it("[2] confirmation 빈 문자열 → invalid_confirmation", async () => {
    const result = await deleteAccount({ confirmation: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_confirmation");
  });

  it("[3] confirmation 매칭 + 비로그인 → unauthorized", async () => {
    setAnonymous();
    const result = await deleteAccount({
      confirmation: ACCOUNT_DELETE_CONFIRMATION_TEXT,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
    expect(userDeleteMock).not.toHaveBeenCalled();
  });

  it("[4] confirmation + auth throw → unauthorized (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    const result = await deleteAccount({
      confirmation: ACCOUNT_DELETE_CONFIRMATION_TEXT,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
  });

  it("[5] 정상 삭제 → withActor + user.delete + Supabase admin 호출", async () => {
    setAuthUser(USER_ID);
    userFindUniqueMock.mockResolvedValueOnce({ role: "parent" });
    userDeleteMock.mockResolvedValueOnce({});

    const result = await deleteAccount({
      confirmation: ACCOUNT_DELETE_CONFIRMATION_TEXT,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.userId).toBe(USER_ID);
    expect(result.role).toBe("parent");
    expect(result.authUserDeleted).toBe(true);
    expect(result.analytics.userId).toBe(USER_ID);
    expect(result.analytics.role).toBe("parent");

    // withActor 가 본인 userId 로 호출.
    expect(withActorMock).toHaveBeenCalledWith(USER_ID);
    // user.delete 가 본인 id 로 호출 (cross-write 0건).
    expect(userDeleteMock).toHaveBeenCalledTimes(1);
    const deleteCall = userDeleteMock.mock.calls[0]![0] as {
      where: { id: string };
    };
    expect(deleteCall.where.id).toBe(USER_ID);
    // Supabase admin 도 본인 id 로 호출.
    expect(deleteUserMock).toHaveBeenCalledWith(USER_ID);
  });

  it("[6] user row 없음 (이미 삭제됨, 멱등) → success + role: null + DB delete skip", async () => {
    setAuthUser(USER_ID);
    userFindUniqueMock.mockResolvedValueOnce(null);

    const result = await deleteAccount({
      confirmation: ACCOUNT_DELETE_CONFIRMATION_TEXT,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.role).toBeNull();
    expect(result.analytics.role).toBe("unknown");
    // user.delete 호출 X (이미 부재).
    expect(userDeleteMock).not.toHaveBeenCalled();
    expect(withActorMock).not.toHaveBeenCalled();
    // 단, auth user 정리는 시도.
    expect(deleteUserMock).toHaveBeenCalledWith(USER_ID);
  });

  it("[7] Prisma user.findUnique throw → db_failed", async () => {
    setAuthUser(USER_ID);
    userFindUniqueMock.mockRejectedValueOnce(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await deleteAccount({
      confirmation: ACCOUNT_DELETE_CONFIRMATION_TEXT,
    });
    errSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("db_failed");
    expect(userDeleteMock).not.toHaveBeenCalled();
  });

  it("[8] Prisma user.delete throw → db_failed (auth 도 호출 X)", async () => {
    setAuthUser(USER_ID);
    userFindUniqueMock.mockResolvedValueOnce({ role: "parent" });
    userDeleteMock.mockRejectedValueOnce(new Error("FK constraint"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await deleteAccount({
      confirmation: ACCOUNT_DELETE_CONFIRMATION_TEXT,
    });
    errSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("db_failed");
    // DB 실패 시 auth user 도 살아 있어야 (사용자 재시도 가능).
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("[9] Supabase admin SDK 부재 → success + authUserDeleted: false (DB 는 완료)", async () => {
    getSupabaseAdminMock.mockReturnValueOnce(null);
    setAuthUser(USER_ID);
    userFindUniqueMock.mockResolvedValueOnce({ role: "parent" });
    userDeleteMock.mockResolvedValueOnce({});

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await deleteAccount({
      confirmation: ACCOUNT_DELETE_CONFIRMATION_TEXT,
    });
    warnSpy.mockRestore();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.authUserDeleted).toBe(false);
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(userDeleteMock).toHaveBeenCalledTimes(1);
  });

  it("[10] Supabase admin.deleteUser throw → success (DB 는 완료) + authUserDeleted: false", async () => {
    setAuthUser(USER_ID);
    userFindUniqueMock.mockResolvedValueOnce({ role: "parent" });
    userDeleteMock.mockResolvedValueOnce({});
    deleteUserMock.mockRejectedValueOnce(new Error("admin api 5xx"));

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await deleteAccount({
      confirmation: ACCOUNT_DELETE_CONFIRMATION_TEXT,
    });
    errSpy.mockRestore();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.authUserDeleted).toBe(false);
    // DB 는 정상 삭제 완료.
    expect(userDeleteMock).toHaveBeenCalledTimes(1);
  });

  it("[11] analytics meta — DB delete 직전 사전조회 role 정확 캡처", async () => {
    setAuthUser(USER_ID);
    userFindUniqueMock.mockResolvedValueOnce({ role: "principal" });
    userDeleteMock.mockResolvedValueOnce({});
    const result = await deleteAccount({
      confirmation: ACCOUNT_DELETE_CONFIRMATION_TEXT,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.analytics.userId).toBe(USER_ID);
    expect(result.analytics.role).toBe("principal");
  });

  it("[12] CON-04 — 모든 실패 분기 message 에 의료 금칙어 0건", async () => {
    const cases = [
      async () =>
        deleteAccount({ confirmation: "잘못된 입력" }),
      async () => {
        setAnonymous();
        return deleteAccount({
          confirmation: ACCOUNT_DELETE_CONFIRMATION_TEXT,
        });
      },
      async () => {
        setAuthUser(USER_ID);
        userFindUniqueMock.mockRejectedValueOnce(new Error("db"));
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
          return await deleteAccount({
            confirmation: ACCOUNT_DELETE_CONFIRMATION_TEXT,
          });
        } finally {
          errSpy.mockRestore();
        }
      },
    ];
    for (const run of cases) {
      const r = await run();
      if (!r.success) {
        for (const w of FORBIDDEN_MEDICAL_WORDS) {
          expect(r.message).not.toContain(w);
        }
      }
    }
  });
});

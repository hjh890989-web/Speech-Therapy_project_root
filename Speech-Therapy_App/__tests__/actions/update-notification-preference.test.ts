// FR-C-NOTIFICATION-PREFERENCE — updateNotificationPreference Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/db Prisma mock (user.findUnique + user.update)
//   - @/lib/db/with-actor mock (pass-through tx + actorId 캡처)
//
// 시나리오 (총 9건):
//   1. 비로그인 (getUser data.user null)         → unauthorized
//   2. getSupabaseServerClient throw             → unauthorized (graceful)
//   3. input 자체가 비 object                     → invalid_input
//   4. boolean 외 값 (예: "true" 문자열)          → invalid_input
//   5. 알려진 키 0건 (empty / 잘못된 키만)        → no_change
//   6. 정상 update → withActor + user.update 본인 id 만 + DB merge
//   7. DB findUnique throw                       → db_failed
//   8. DB update throw                           → db_failed
//   9. 분석 changed — 실제 _바뀐_ 키만 카운트 (멱등 no-op 호출은 빈 배열)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
  }),
}));

const findUniqueMock = vi.fn();
const updateMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
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
        update: (...args: unknown[]) => updateMock(...args),
      },
    };
    return fn(tx);
  },
}));

import { updateNotificationPreference } from "@/app/actions/update-notification-preference";

const USER_ID = "user-uuid-pref-action-1111";
const FORBIDDEN_MEDICAL = ["치료", "진단", "장애"];

beforeEach(() => {
  getUserMock.mockReset();
  findUniqueMock.mockReset();
  updateMock.mockReset();
  withActorMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("updateNotificationPreference — FR-C-NOTIFICATION-PREFERENCE", () => {
  it("[1] 비로그인 (data.user null) → unauthorized", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const result = await updateNotificationPreference({
      cushionNoteEmail: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("[2] getSupabaseServerClient throw → unauthorized (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    const result = await updateNotificationPreference({
      cushionNoteEmail: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
  });

  it("[3] input 자체가 비 object (null) → invalid_input", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    const result = await updateNotificationPreference(
      null as unknown as Parameters<typeof updateNotificationPreference>[0],
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_input");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("[4] boolean 외 값 ('true' 문자열) → invalid_input", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    const result = await updateNotificationPreference({
      // @ts-expect-error 의도적 — 잘못된 타입.
      cushionNoteEmail: "true",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_input");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("[5] 알려진 키 0건 (잘못된 키만) → no_change", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    const result = await updateNotificationPreference(
      // @ts-expect-error 의도적 — 알려지지 않은 키만.
      { unknownKey: true },
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("no_change");
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("[6] 정상 update → withActor + 본인 id + DB merge (기존 false 키 유지)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    // 기존 DB: weeklyReportEmail=false (다른 키는 DEFAULTS 의 true).
    findUniqueMock.mockResolvedValueOnce({
      notificationPreference: { weeklyReportEmail: false },
    });
    updateMock.mockResolvedValue({});

    const result = await updateNotificationPreference({
      cushionNoteEmail: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // merge — 기존 weeklyReportEmail=false 유지 + 새 cushionNoteEmail=false.
      expect(result.preference.weeklyReportEmail).toBe(false);
      expect(result.preference.cushionNoteEmail).toBe(false);
      // 나머지 default true 유지.
      expect(result.preference.consentReminderEmail).toBe(true);
      expect(result.preference.parentInviteEmail).toBe(true);
      // analytics — changed 는 cushionNoteEmail 만 (true → false).
      expect(result.analytics.userId).toBe(USER_ID);
      expect(result.analytics.changed).toEqual(["cushionNoteEmail"]);
    }

    expect(withActorMock).toHaveBeenCalledWith(USER_ID);
    expect(updateMock).toHaveBeenCalledTimes(1);
    const callArg = updateMock.mock.calls[0]![0] as {
      where: { id: string };
      data: { notificationPreference: unknown };
    };
    expect(callArg.where.id).toBe(USER_ID);
    expect(callArg.data.notificationPreference).toMatchObject({
      weeklyReportEmail: false,
      cushionNoteEmail: false,
    });
  });

  it("[7] findUnique throw → db_failed (graceful)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    findUniqueMock.mockRejectedValueOnce(new Error("connection lost"));
    const result = await updateNotificationPreference({
      cushionNoteEmail: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("db_failed");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("[8] update throw → db_failed (graceful)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    findUniqueMock.mockResolvedValueOnce({ notificationPreference: {} });
    updateMock.mockRejectedValueOnce(new Error("connection lost"));
    const result = await updateNotificationPreference({
      cushionNoteEmail: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("db_failed");
  });

  it("[9] 분석 changed — 같은 값 재호출 (멱등 no-op) → 빈 배열", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    // 기존 DB 가 이미 cushionNoteEmail=false.
    findUniqueMock.mockResolvedValueOnce({
      notificationPreference: { cushionNoteEmail: false },
    });
    updateMock.mockResolvedValue({});

    const result = await updateNotificationPreference({
      cushionNoteEmail: false, // 동일 값
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.analytics.changed).toEqual([]);
    }
    // DB update 자체는 발생 (idempotent write, audit trigger 만 남음).
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("[10] CON-04 — 모든 실패 분기 message 에 의료 금칙어 0건", async () => {
    const cases: Array<() => Promise<unknown>> = [
      async () => {
        getUserMock.mockResolvedValueOnce({
          data: { user: null },
          error: null,
        });
        return updateNotificationPreference({ cushionNoteEmail: false });
      },
      async () => {
        getUserMock.mockResolvedValueOnce({
          data: { user: { id: USER_ID } },
          error: null,
        });
        return updateNotificationPreference(
          null as unknown as Parameters<
            typeof updateNotificationPreference
          >[0],
        );
      },
      async () => {
        getUserMock.mockResolvedValueOnce({
          data: { user: { id: USER_ID } },
          error: null,
        });
        // @ts-expect-error 의도적.
        return updateNotificationPreference({ cushionNoteEmail: "yes" });
      },
      async () => {
        getUserMock.mockResolvedValueOnce({
          data: { user: { id: USER_ID } },
          error: null,
        });
        findUniqueMock.mockRejectedValueOnce(new Error("db"));
        return updateNotificationPreference({ cushionNoteEmail: false });
      },
    ];
    for (const run of cases) {
      const r = (await run()) as { success: boolean; message?: string };
      if (!r.success && r.message) {
        for (const w of FORBIDDEN_MEDICAL) {
          expect(r.message).not.toContain(w);
        }
      }
    }
  });
});

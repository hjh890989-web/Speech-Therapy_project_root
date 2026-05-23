// FR-C-PARENT-ONBOARDING (follow-up) — markOnboardingCompletedInDb Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/db Prisma mock (user.update)
//   - @/lib/db/with-actor mock (pass-through tx + actorId 캡처)
//
// 시나리오 (총 6건):
//   1) 비로그인 (getUser error) → success: false / reason: unauthorized
//   2) auth getUser data.user 없음 → unauthorized
//   3) getSupabaseServerClient throw → unauthorized
//   4) 정상 → success: true + withActor 호출 + onboardingCompletedAt 갱신
//   5) DB error → success: false / reason: db_failed
//   6) 멱등 — 이미 set 된 user 재호출 → 새 timestamp 로 갱신 (success: true)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
  }),
}));

const updateMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
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

import { markOnboardingCompletedInDb } from "@/app/actions/mark-onboarding-completed";

const USER_ID = "user-uuid-9999";

beforeEach(() => {
  getUserMock.mockReset();
  updateMock.mockReset();
  withActorMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("markOnboardingCompletedInDb — FR-C-PARENT-ONBOARDING follow-up", () => {
  it("비로그인 (getUser error) → unauthorized", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: "no session" } });
    const out = await markOnboardingCompletedInDb();
    expect(out.success).toBe(false);
    expect(out.reason).toBe("unauthorized");
    expect(updateMock).not.toHaveBeenCalled();
    expect(withActorMock).not.toHaveBeenCalled();
  });

  it("auth getUser data.user 없음 → unauthorized", async () => {
    getUserMock.mockResolvedValue({ data: {}, error: null });
    const out = await markOnboardingCompletedInDb();
    expect(out.success).toBe(false);
    expect(out.reason).toBe("unauthorized");
  });

  it("getSupabaseServerClient throw → unauthorized (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    const out = await markOnboardingCompletedInDb();
    expect(out.success).toBe(false);
    expect(out.reason).toBe("unauthorized");
  });

  it("정상 → success + withActor 호출 + onboardingCompletedAt 갱신", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    updateMock.mockResolvedValue({ id: USER_ID, onboardingCompletedAt: new Date() });
    const out = await markOnboardingCompletedInDb();
    expect(out.success).toBe(true);
    expect(out.reason).toBeUndefined();
    expect(withActorMock).toHaveBeenCalledWith(USER_ID);
    expect(updateMock).toHaveBeenCalledTimes(1);
    const arg = updateMock.mock.calls[0]![0] as {
      where: { id: string };
      data: { onboardingCompletedAt: Date };
    };
    expect(arg.where).toEqual({ id: USER_ID });
    expect(arg.data.onboardingCompletedAt).toBeInstanceOf(Date);
  });

  it("DB error → db_failed", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    updateMock.mockRejectedValueOnce(new Error("connection lost"));
    const out = await markOnboardingCompletedInDb();
    expect(out.success).toBe(false);
    expect(out.reason).toBe("db_failed");
  });

  it("멱등 — 이미 set 된 user 재호출 → 새 timestamp 로 갱신 (success: true)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    updateMock.mockResolvedValue({ id: USER_ID, onboardingCompletedAt: new Date() });
    const first = await markOnboardingCompletedInDb();
    expect(first.success).toBe(true);

    const beforeSecond = Date.now();
    const second = await markOnboardingCompletedInDb();
    expect(second.success).toBe(true);
    expect(updateMock).toHaveBeenCalledTimes(2);
    // 2nd 호출의 timestamp 가 1st 보다 같거나 더 큼.
    const arg2 = updateMock.mock.calls[1]![0] as {
      data: { onboardingCompletedAt: Date };
    };
    expect(arg2.data.onboardingCompletedAt.getTime()).toBeGreaterThanOrEqual(beforeSecond);
  });
});

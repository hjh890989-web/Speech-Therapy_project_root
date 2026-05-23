// FR-C-PARENT-ONBOARDING (follow-up) — hasCompletedOnboardingServerSide 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/db Prisma mock (user.findUnique)
//
// 시나리오 (총 6건):
//   1) 비인증 (getUser error) → null
//   2) 비인증 (data.user 없음)  → null
//   3) auth throw (env 미설정) → null
//   4) 인증 + DB row 없음 → false
//   5) 인증 + onboardingCompletedAt null → false
//   6) 인증 + onboardingCompletedAt 값 있음 → true
//   7) 인증 + DB error → null

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
  }),
}));

const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

import { hasCompletedOnboardingServerSide } from "@/lib/onboarding/server-state";

const USER_ID = "user-uuid-1234";

beforeEach(() => {
  getUserMock.mockReset();
  findUniqueMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("hasCompletedOnboardingServerSide — FR-C-PARENT-ONBOARDING follow-up", () => {
  it("getUser error → null", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: "no session" } });
    const out = await hasCompletedOnboardingServerSide();
    expect(out).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("getUser data.user 없음 → null", async () => {
    getUserMock.mockResolvedValue({ data: {}, error: null });
    const out = await hasCompletedOnboardingServerSide();
    expect(out).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("getSupabaseServerClient throw (env 미설정) → null", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    const out = await hasCompletedOnboardingServerSide();
    expect(out).toBeNull();
  });

  it("인증 + DB row 없음 → false (신규 user 취급)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    findUniqueMock.mockResolvedValue(null);
    const out = await hasCompletedOnboardingServerSide();
    expect(out).toBe(false);
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    const arg = findUniqueMock.mock.calls[0]![0] as {
      where: { id: string };
      select: { onboardingCompletedAt: boolean };
    };
    expect(arg.where).toEqual({ id: USER_ID });
    expect(arg.select).toEqual({ onboardingCompletedAt: true });
  });

  it("인증 + onboardingCompletedAt null → false", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    findUniqueMock.mockResolvedValue({ onboardingCompletedAt: null });
    const out = await hasCompletedOnboardingServerSide();
    expect(out).toBe(false);
  });

  it("인증 + onboardingCompletedAt 값 있음 → true", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    findUniqueMock.mockResolvedValue({ onboardingCompletedAt: new Date() });
    const out = await hasCompletedOnboardingServerSide();
    expect(out).toBe(true);
  });

  it("인증 + DB throw → null (graceful)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    findUniqueMock.mockRejectedValueOnce(new Error("db down"));
    const out = await hasCompletedOnboardingServerSide();
    expect(out).toBeNull();
  });
});

// FR-C-PARENT-ONBOARDING — saveChildInfo Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/db Prisma mock (user.update)
//   - @/lib/db/with-actor mock (pass-through tx)
//
// 시나리오 (총 7건):
//   1) 비로그인 (auth getUser error) → unauthorized
//   2) auth getUser data.user 없음 → unauthorized
//   3) 정상 입력 → success + prisma.user.update 호출 + actorId 전파
//   4) age 범위 외 (23) → invalid_age
//   5) age 범위 외 (85) → invalid_age
//   6) phonemes 빈 배열 → invalid_phonemes
//   7) phonemes 화이트리스트 외 음소 → invalid_phonemes

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

import { saveChildInfo } from "@/app/actions/onboarding-save-child";

const USER_ID = "user-uuid-1111";

beforeEach(() => {
  getUserMock.mockReset();
  updateMock.mockReset();
  withActorMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("saveChildInfo — FR-C-PARENT-ONBOARDING", () => {
  it("비로그인 (getUser error) → unauthorized", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: "no session" } });
    const result = await saveChildInfo({ childAgeMonths: 48, targetPhonemes: ["ㅅ"] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("auth getUser data.user 없음 → unauthorized", async () => {
    getUserMock.mockResolvedValue({ data: {}, error: null });
    const result = await saveChildInfo({ childAgeMonths: 48, targetPhonemes: ["ㅅ"] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
  });

  it("정상 입력 → success + prisma update + actorId 전파", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    updateMock.mockResolvedValue({ id: USER_ID, childAgeMonths: 48 });
    const result = await saveChildInfo({
      childAgeMonths: 48,
      targetPhonemes: ["ㅅ", "ㄴ"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.userId).toBe(USER_ID);
      expect(result.childAgeMonths).toBe(48);
      expect(result.targetPhonemes).toEqual(["ㅅ", "ㄴ"]);
    }
    expect(withActorMock).toHaveBeenCalledWith(USER_ID);
    expect(updateMock).toHaveBeenCalledTimes(1);
    const callArg = updateMock.mock.calls[0][0];
    expect(callArg.where).toEqual({ id: USER_ID });
    // FR-C-ONBOARDING-PHONEME — childAgeMonths + preferredPhonemes(검증분) 영속화.
    expect(callArg.data).toEqual({
      childAgeMonths: 48,
      preferredPhonemes: ["ㅅ", "ㄴ"],
    });
  });

  it("age 범위 미만 (23) → invalid_age", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    const result = await saveChildInfo({ childAgeMonths: 23, targetPhonemes: ["ㅅ"] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_age");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("age 범위 초과 (85) → invalid_age", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    const result = await saveChildInfo({ childAgeMonths: 85, targetPhonemes: ["ㅅ"] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_age");
  });

  it("phonemes 빈 배열 → invalid_phonemes", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    const result = await saveChildInfo({ childAgeMonths: 48, targetPhonemes: [] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_phonemes");
  });

  it("phonemes 화이트리스트 외 → invalid_phonemes", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    const result = await saveChildInfo({
      childAgeMonths: 48,
      // @ts-expect-error 의도적으로 잘못된 음소 — runtime 검증 분기.
      targetPhonemes: ["ㅁ"],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_phonemes");
  });

  it("prisma update throw → db_failed", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    updateMock.mockRejectedValueOnce(new Error("db connection failed"));
    const result = await saveChildInfo({ childAgeMonths: 48, targetPhonemes: ["ㅅ"] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("db_failed");
  });
});

// FR-C-PARENT-SETTINGS — updateChildProfile Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/db Prisma mock (user.update)
//   - @/lib/db/with-actor mock (pass-through tx + actorId 캡처)
//
// 시나리오 (총 11건):
//   1. 비로그인 (getUser error)               → unauthorized
//   2. auth getUser data.user 없음            → unauthorized
//   3. getSupabaseServerClient throw          → unauthorized (graceful)
//   4. 정상 update                            → withActor + user.update 본인 id 만
//   5. R4 — 외부 user id 무시 (auth uid 만)   → 다른 id 가 인자에 있어도 auth uid 로 update
//   6. childAgeMonths 23                      → invalid_age
//   7. childAgeMonths 85                      → invalid_age
//   8. preferredPhonemes 화이트리스트 외      → invalid_phonemes
//   9. preferredPhonemes 6개 초과             → invalid_phonemes
//  10. preferredPhonemes 빈 배열              → success (빈 배열 저장)
//  11. DB throw                               → db_failed
//  12. 멱등 (재호출 동일 값)                  → 정상 success

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

import { updateChildProfile } from "@/app/actions/update-child-profile";

const USER_ID = "user-uuid-7777";
const OTHER_USER_ID = "user-uuid-aaaa";

beforeEach(() => {
  getUserMock.mockReset();
  updateMock.mockReset();
  withActorMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("updateChildProfile — FR-C-PARENT-SETTINGS", () => {
  it("[1] 비로그인 (getUser error) → unauthorized", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "no session" },
    });
    const result = await updateChildProfile({
      childAgeMonths: 48,
      preferredPhonemes: ["ㅅ"],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
    expect(updateMock).not.toHaveBeenCalled();
    expect(withActorMock).not.toHaveBeenCalled();
  });

  it("[2] auth data.user 없음 → unauthorized", async () => {
    getUserMock.mockResolvedValue({ data: {}, error: null });
    const result = await updateChildProfile({
      childAgeMonths: 48,
      preferredPhonemes: ["ㅅ"],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
  });

  it("[3] getSupabaseServerClient throw → unauthorized (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    const result = await updateChildProfile({
      childAgeMonths: 48,
      preferredPhonemes: ["ㅅ"],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
  });

  it("[4] 정상 update → withActor + user.update 본인 id 만", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    updateMock.mockResolvedValue({
      id: USER_ID,
      childAgeMonths: 48,
      preferredPhonemes: ["ㅅ", "ㄴ"],
    });
    const result = await updateChildProfile({
      childAgeMonths: 48,
      preferredPhonemes: ["ㅅ", "ㄴ"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.userId).toBe(USER_ID);
      expect(result.childAgeMonths).toBe(48);
      expect(result.preferredPhonemes).toEqual(["ㅅ", "ㄴ"]);
    }
    expect(withActorMock).toHaveBeenCalledWith(USER_ID);
    expect(updateMock).toHaveBeenCalledTimes(1);
    const callArg = updateMock.mock.calls[0]![0] as {
      where: { id: string };
      data: { childAgeMonths: number; preferredPhonemes: string[] };
    };
    expect(callArg.where).toEqual({ id: USER_ID });
    expect(callArg.data.childAgeMonths).toBe(48);
    expect(callArg.data.preferredPhonemes).toEqual(["ㅅ", "ㄴ"]);
  });

  it("[5] R4 — 인자에 다른 user id 전달해도 auth uid 만 사용", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    updateMock.mockResolvedValue({});
    // input 자체는 user id 입력을 받지 않지만, 호출자가 어떤 식으로든 다른 id 를 끼워도
    // Action 내부는 auth uid 로만 update — 본 테스트는 동일성 검증.
    await updateChildProfile({
      childAgeMonths: 48,
      preferredPhonemes: ["ㅅ"],
      // @ts-expect-error 의도적 — 외부 input 에 user id 끼어들 수 없도록 타입이 강제.
      userId: OTHER_USER_ID,
    });
    const callArg = updateMock.mock.calls[0]![0] as {
      where: { id: string };
    };
    expect(callArg.where.id).toBe(USER_ID);
    expect(callArg.where.id).not.toBe(OTHER_USER_ID);
    expect(withActorMock).toHaveBeenCalledWith(USER_ID);
  });

  it("[6] childAgeMonths 23 → invalid_age", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    const result = await updateChildProfile({
      childAgeMonths: 23,
      preferredPhonemes: ["ㅅ"],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_age");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("[7] childAgeMonths 85 → invalid_age", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    const result = await updateChildProfile({
      childAgeMonths: 85,
      preferredPhonemes: ["ㅅ"],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_age");
  });

  it("[8] preferredPhonemes 화이트리스트 외 → invalid_phonemes", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    const result = await updateChildProfile({
      childAgeMonths: 48,
      // @ts-expect-error 의도적으로 잘못된 음소.
      preferredPhonemes: ["ㅁ"],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_phonemes");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("[9] preferredPhonemes 6개 초과 → invalid_phonemes", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    const result = await updateChildProfile({
      childAgeMonths: 48,
      // 화이트리스트 5개 + 1개 중복 → 길이 6. 화이트리스트 검증 전에 길이 검증 우선.
      preferredPhonemes: ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ", "ㅅ"],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_phonemes");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("[10] preferredPhonemes 빈 배열 → success (시스템 자동 추천 의미)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    updateMock.mockResolvedValue({});
    const result = await updateChildProfile({
      childAgeMonths: 48,
      preferredPhonemes: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.preferredPhonemes).toEqual([]);
    }
    const callArg = updateMock.mock.calls[0]![0] as {
      data: { preferredPhonemes: string[] };
    };
    expect(callArg.data.preferredPhonemes).toEqual([]);
  });

  it("[11] DB throw → db_failed (graceful)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    updateMock.mockRejectedValueOnce(new Error("connection lost"));
    const result = await updateChildProfile({
      childAgeMonths: 48,
      preferredPhonemes: ["ㅅ"],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("db_failed");
  });

  it("[12] 멱등 — 같은 값 재호출도 성공 (timestamp 부수 효과 X)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    updateMock.mockResolvedValue({});
    const first = await updateChildProfile({
      childAgeMonths: 60,
      preferredPhonemes: ["ㅅ", "ㅈ"],
    });
    const second = await updateChildProfile({
      childAgeMonths: 60,
      preferredPhonemes: ["ㅅ", "ㅈ"],
    });
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(updateMock).toHaveBeenCalledTimes(2);
  });

  it("[13] 중복 음소 입력 → 중복 제거 후 저장 (단, 6개 초과 분기는 우선)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    updateMock.mockResolvedValue({});
    // 5개 이하 + 중복 — 중복 제거 후 저장.
    const result = await updateChildProfile({
      childAgeMonths: 48,
      preferredPhonemes: ["ㅅ", "ㅅ", "ㄴ"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.preferredPhonemes).toEqual(["ㅅ", "ㄴ"]);
    }
  });

  it("[14] CON-04 — 모든 결과 message 에 의료 금칙어 0건", async () => {
    const forbidden = ["치료", "진단", "장애"];
    // 다양한 실패 분기 message 점검.
    const cases = [
      async () => {
        getUserMock.mockResolvedValueOnce({ data: { user: null }, error: { message: "x" } });
        return updateChildProfile({ childAgeMonths: 48, preferredPhonemes: ["ㅅ"] });
      },
      async () => {
        getUserMock.mockResolvedValueOnce({
          data: { user: { id: USER_ID } },
          error: null,
        });
        return updateChildProfile({ childAgeMonths: 23, preferredPhonemes: ["ㅅ"] });
      },
      async () => {
        getUserMock.mockResolvedValueOnce({
          data: { user: { id: USER_ID } },
          error: null,
        });
        return updateChildProfile({
          childAgeMonths: 48,
          // @ts-expect-error 의도적 음소 오류.
          preferredPhonemes: ["ㅁ"],
        });
      },
      async () => {
        getUserMock.mockResolvedValueOnce({
          data: { user: { id: USER_ID } },
          error: null,
        });
        updateMock.mockRejectedValueOnce(new Error("db"));
        return updateChildProfile({ childAgeMonths: 48, preferredPhonemes: ["ㅅ"] });
      },
    ];
    for (const run of cases) {
      const r = await run();
      if (!r.success) {
        for (const w of forbidden) {
          expect(r.message).not.toContain(w);
        }
      }
    }
  });
});

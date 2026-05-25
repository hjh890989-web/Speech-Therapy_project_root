// FR-C-SECURITY (MFA 마무리) — lib/security/backup-codes-store.ts 단위 테스트.
//
// 격리:
//   - @/lib/db prisma.user.{findUnique, update} mock
//   - @/lib/db/with-actor withActor mock (단순 fn(tx) 위임)
//
// 시나리오 (≥ 6):
//   1. hashBackupCode — 동일 입력 → 동일 hash, 대소문자 무관 (uppercase normalize)
//   2. hashBackupCode — 다른 입력 → 다른 hash + sha256 hex 64 chars
//   3. storeBackupCodes — codes hash 후 User.totpBackupCodes update 호출
//   4. useBackupCode — 정상 일치 → ok: true + array 제거 + remaining = N-1
//   5. useBackupCode — 미일치 → ok: false + remaining 불변
//   6. useBackupCode — 멱등 (재호출 = 미일치) → ok: false
//   7. useBackupCode — User row 없음 → ok: false + remaining 0
//   8. getRemainingBackupCodesCount — User row → length 반환
//   9. getRemainingBackupCodesCount — DB throw → 0 (graceful)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mock @/lib/db — prisma 표면 정의.
// ============================================================================
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

// withActor: fn(tx) 위임 — tx 는 동일 user 표면 사용.
vi.mock("@/lib/db/with-actor", () => ({
  withActor: async <T>(
    _actorId: string | null | undefined,
    fn: (tx: unknown) => Promise<T>,
  ): Promise<T> =>
    fn({
      user: {
        findUnique: (...args: unknown[]) => findUniqueMock(...args),
        update: (...args: unknown[]) => updateMock(...args),
      },
    }),
}));

// vi.mock hoist 후 import.
import {
  hashBackupCode,
  storeBackupCodes,
  useBackupCode,
  getRemainingBackupCodesCount,
} from "@/lib/security/backup-codes-store";

const USER_ID = "user-uuid-bc-9999";

beforeEach(() => {
  findUniqueMock.mockReset();
  updateMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("hashBackupCode", () => {
  it("[1] 동일 입력 → 동일 hash, 대소문자 무관 (uppercase normalize)", () => {
    const a = hashBackupCode("ABCD1234");
    const b = hashBackupCode("abcd1234");
    const c = hashBackupCode("AbCd1234");
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it("[2] 다른 입력 → 다른 hash, sha256 hex 64 chars", () => {
    const a = hashBackupCode("ABCD1234");
    const b = hashBackupCode("ABCD1235");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(b).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("storeBackupCodes", () => {
  it("[3] 입력 codes hash 후 User.totpBackupCodes update 호출", async () => {
    updateMock.mockResolvedValue({});
    const codes = ["AAAA1111", "BBBB2222", "CCCC3333"];
    await storeBackupCodes(USER_ID, codes);
    expect(updateMock).toHaveBeenCalledTimes(1);
    const arg = updateMock.mock.calls[0]![0] as {
      where: { id: string };
      data: { totpBackupCodes: string[] };
    };
    expect(arg.where.id).toBe(USER_ID);
    expect(arg.data.totpBackupCodes).toHaveLength(3);
    // 각 element 는 sha256 hex (64 chars) 이어야 함.
    for (const h of arg.data.totpBackupCodes) {
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    }
    // hash 값 정합 검증 — 첫 번째 code 의 hash 와 일치.
    expect(arg.data.totpBackupCodes[0]).toBe(hashBackupCode("AAAA1111"));
  });
});

describe("useBackupCode", () => {
  it("[4] 정상 일치 → ok: true + array 제거 + remaining = N-1", async () => {
    const hashes = [
      hashBackupCode("AAAA1111"),
      hashBackupCode("BBBB2222"),
      hashBackupCode("CCCC3333"),
    ];
    findUniqueMock.mockResolvedValueOnce({ totpBackupCodes: hashes });
    updateMock.mockResolvedValue({});

    const result = await useBackupCode(USER_ID, "BBBB2222");
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(2);

    // update 가 BBBB2222 제외한 2개로 호출됐는지.
    expect(updateMock).toHaveBeenCalledTimes(1);
    const arg = updateMock.mock.calls[0]![0] as {
      where: { id: string };
      data: { totpBackupCodes: string[] };
    };
    expect(arg.data.totpBackupCodes).toHaveLength(2);
    expect(arg.data.totpBackupCodes).not.toContain(hashBackupCode("BBBB2222"));
    expect(arg.data.totpBackupCodes).toContain(hashBackupCode("AAAA1111"));
    expect(arg.data.totpBackupCodes).toContain(hashBackupCode("CCCC3333"));
  });

  it("[5] 미일치 → ok: false + remaining 불변 + update 호출 0", async () => {
    const hashes = [hashBackupCode("AAAA1111"), hashBackupCode("BBBB2222")];
    findUniqueMock.mockResolvedValueOnce({ totpBackupCodes: hashes });

    const result = await useBackupCode(USER_ID, "ZZZZ9999");
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(2);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("[6] 멱등 — 이미 사용된 code 재호출 → ok: false", async () => {
    // 첫 호출 시 BBBB2222 가 array 에 _없음_ (이미 사용된 상태).
    const hashes = [hashBackupCode("AAAA1111")];
    findUniqueMock.mockResolvedValueOnce({ totpBackupCodes: hashes });

    const result = await useBackupCode(USER_ID, "BBBB2222");
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(1);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("[7] User row 없음 → ok: false + remaining 0", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const result = await useBackupCode(USER_ID, "AAAA1111");
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("[7b] 대소문자 무관 매칭 — 사용자가 소문자로 입력해도 일치", async () => {
    const hashes = [hashBackupCode("AAAA1111")];
    findUniqueMock.mockResolvedValueOnce({ totpBackupCodes: hashes });
    updateMock.mockResolvedValue({});

    const result = await useBackupCode(USER_ID, "aaaa1111");
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(0);
  });
});

describe("getRemainingBackupCodesCount", () => {
  it("[8] User row → totpBackupCodes.length 반환", async () => {
    findUniqueMock.mockResolvedValueOnce({
      totpBackupCodes: ["h1", "h2", "h3", "h4", "h5"],
    });
    const count = await getRemainingBackupCodesCount(USER_ID);
    expect(count).toBe(5);
  });

  it("[9] DB throw → 0 (graceful)", async () => {
    findUniqueMock.mockImplementation(() => {
      throw new Error("DB down");
    });
    const count = await getRemainingBackupCodesCount(USER_ID);
    expect(count).toBe(0);
  });

  it("[10] User row 없음 → 0", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const count = await getRemainingBackupCodesCount(USER_ID);
    expect(count).toBe(0);
  });
});

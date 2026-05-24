// FR-Q-013 후속 — lib/offline-entry/repo.ts 단위 테스트 (≥6).
//
// 격리:
//   - @/lib/db prisma mock (offlineEntry.findMany)
//   - @/lib/db/with-actor mock (pass-through tx with offlineEntry.create / .delete)
//
// 시나리오:
//   1) createOfflineEntry — withActor(authorId) 호출 + tx.offlineEntry.create 호출
//   2) createOfflineEntry — observedAt default (now) 채워서 전달
//   3) createOfflineEntry — institutionId 명시 시 그대로 전달, null 폴백
//   4) listOfflineEntriesForUser — userId 로 where + observedAt desc + limit
//   5) listOfflineEntriesForUser — 빈 userId → Prisma 호출 0 + 빈 배열
//   6) listOfflineEntriesForUser — limit 파라미터 default 20 전달
//   7) deleteOfflineEntry — withActor(byUserId) + tx.offlineEntry.delete
//   8) deleteOfflineEntry — id 빈 문자열 → success false + Prisma 호출 0

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mocks
// ============================================================================
const offlineCreateMock = vi.fn();
const offlineFindManyMock = vi.fn();
const offlineDeleteMock = vi.fn();
const withActorMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    offlineEntry: {
      findMany: (...args: unknown[]) => offlineFindManyMock(...args),
    },
  },
}));

vi.mock("@/lib/db/with-actor", () => ({
  withActor: async <T,>(
    actorId: string | null | undefined,
    fn: (tx: unknown) => Promise<T>,
  ) => {
    withActorMock(actorId);
    const tx = {
      offlineEntry: {
        create: (...args: unknown[]) => offlineCreateMock(...args),
        delete: (...args: unknown[]) => offlineDeleteMock(...args),
      },
    };
    return fn(tx);
  },
}));

import {
  createOfflineEntry,
  deleteOfflineEntry,
  listOfflineEntriesForUser,
  OFFLINE_ENTRY_DEFAULT_LIMIT,
} from "@/lib/offline-entry/repo";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AUTHOR_X = "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx";

beforeEach(() => {
  offlineCreateMock.mockReset();
  offlineFindManyMock.mockReset();
  offlineDeleteMock.mockReset();
  withActorMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createOfflineEntry — withActor + tx INSERT", () => {
  it("[1] 정상 입력 → withActor(authorId) + tx.offlineEntry.create 호출 + row 반환", async () => {
    const observedAt = new Date("2026-05-20T10:00:00Z");
    const fakeRow = {
      id: "entry-1",
      userId: USER_A,
      authorId: AUTHOR_X,
      kind: "practice",
      note: "ㅅ 발음 5회 연습",
      observedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      institutionId: "inst-A",
    };
    offlineCreateMock.mockResolvedValueOnce(fakeRow);

    const result = await createOfflineEntry({
      userId: USER_A,
      authorId: AUTHOR_X,
      kind: "practice",
      note: "ㅅ 발음 5회 연습",
      observedAt,
      institutionId: "inst-A",
    });

    expect(result).toEqual(fakeRow);
    expect(withActorMock).toHaveBeenCalledTimes(1);
    expect(withActorMock).toHaveBeenCalledWith(AUTHOR_X);
    expect(offlineCreateMock).toHaveBeenCalledTimes(1);
    const arg = offlineCreateMock.mock.calls[0][0];
    expect(arg.data).toMatchObject({
      userId: USER_A,
      authorId: AUTHOR_X,
      kind: "practice",
      note: "ㅅ 발음 5회 연습",
      observedAt,
      institutionId: "inst-A",
    });
  });

  it("[2] observedAt 미지정 → tx.offlineEntry.create 의 data.observedAt 가 Date 인스턴스", async () => {
    offlineCreateMock.mockResolvedValueOnce({
      id: "entry-2",
      userId: USER_A,
      authorId: AUTHOR_X,
      kind: "note",
      note: "오늘 컨디션 좋음",
      observedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      institutionId: null,
    });

    await createOfflineEntry({
      userId: USER_A,
      authorId: AUTHOR_X,
      kind: "note",
      note: "오늘 컨디션 좋음",
    });

    const arg = offlineCreateMock.mock.calls[0][0];
    expect(arg.data.observedAt).toBeInstanceOf(Date);
    // institutionId 명시 안 했으면 null.
    expect(arg.data.institutionId).toBeNull();
  });

  it("[3] institutionId null 명시 → null 그대로 전달", async () => {
    offlineCreateMock.mockResolvedValueOnce({
      id: "entry-3",
      userId: USER_A,
      authorId: AUTHOR_X,
      kind: "observation",
      note: "조용한 환경에서 잘함",
      observedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      institutionId: null,
    });

    await createOfflineEntry({
      userId: USER_A,
      authorId: AUTHOR_X,
      kind: "observation",
      note: "조용한 환경에서 잘함",
      institutionId: null,
    });

    const arg = offlineCreateMock.mock.calls[0][0];
    expect(arg.data.institutionId).toBeNull();
  });
});

describe("listOfflineEntriesForUser — SELECT only", () => {
  it("[4] userId 로 where + observedAt desc + take=limit", async () => {
    const fakeRows = [
      {
        id: "entry-a",
        userId: USER_A,
        authorId: AUTHOR_X,
        kind: "practice",
        note: "n1",
        observedAt: new Date("2026-05-22T10:00:00Z"),
        createdAt: new Date(),
        updatedAt: new Date(),
        institutionId: "inst-A",
      },
    ];
    offlineFindManyMock.mockResolvedValueOnce(fakeRows);

    const result = await listOfflineEntriesForUser(USER_A, 5);

    expect(result).toEqual(fakeRows);
    expect(offlineFindManyMock).toHaveBeenCalledTimes(1);
    const arg = offlineFindManyMock.mock.calls[0][0];
    expect(arg.where).toEqual({ userId: USER_A });
    expect(arg.orderBy).toEqual({ observedAt: "desc" });
    expect(arg.take).toBe(5);
  });

  it("[5] 빈 userId → Prisma 호출 0 + 빈 배열", async () => {
    const result = await listOfflineEntriesForUser("");
    expect(result).toEqual([]);
    expect(offlineFindManyMock).not.toHaveBeenCalled();
  });

  it("[6] limit 미지정 → take 가 default (20)", async () => {
    offlineFindManyMock.mockResolvedValueOnce([]);
    await listOfflineEntriesForUser(USER_A);
    expect(offlineFindManyMock.mock.calls[0][0].take).toBe(
      OFFLINE_ENTRY_DEFAULT_LIMIT,
    );
  });
});

describe("deleteOfflineEntry — withActor + admin only (RLS)", () => {
  it("[7] 정상 id → withActor(byUserId) + tx.offlineEntry.delete 호출", async () => {
    offlineDeleteMock.mockResolvedValueOnce({ id: "entry-1" });

    const result = await deleteOfflineEntry("entry-1", AUTHOR_X);

    expect(result).toEqual({ success: true });
    expect(withActorMock).toHaveBeenCalledWith(AUTHOR_X);
    expect(offlineDeleteMock).toHaveBeenCalledTimes(1);
    const arg = offlineDeleteMock.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "entry-1" });
  });

  it("[8] 빈 id → success false + Prisma 호출 0", async () => {
    const result = await deleteOfflineEntry("", AUTHOR_X);
    expect(result).toEqual({ success: false });
    expect(withActorMock).not.toHaveBeenCalled();
    expect(offlineDeleteMock).not.toHaveBeenCalled();
  });
});

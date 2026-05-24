// FR-Q-013 후속 — loadUserTimeline 의 offline kind merge 검증 (≥3).
//
// 격리:
//   - @/lib/db (evaluationResult / sessionLog findMany) mock
//   - @/lib/offline-entry/repo (listOfflineEntriesForUser) mock
//
// 시나리오 (≥3):
//   1) offline + diagnose + mission 모두 있음 → 3종 모두 merge + desc 정렬 + hasOfflineData true
//   2) offline 만 있음 → 다른 source 빈 배열, hasOfflineData true / 그 외 false
//   3) offline entry 의 observedAt 이 createdAt 자리에 들어감 (실 활동 시각 기준 정렬)
//   4) cross-user — listOfflineEntriesForUser 가 정확한 userId 로만 호출됨

import { describe, it, expect, vi, beforeEach } from "vitest";

const evalFindManyMock = vi.fn();
const sessionFindManyMock = vi.fn();
const offlineListMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    evaluationResult: {
      findMany: (...args: unknown[]) => evalFindManyMock(...args),
    },
    sessionLog: {
      findMany: (...args: unknown[]) => sessionFindManyMock(...args),
    },
  },
}));

vi.mock("@/lib/offline-entry/repo", () => ({
  listOfflineEntriesForUser: (...args: unknown[]) => offlineListMock(...args),
  OFFLINE_ENTRY_DEFAULT_LIMIT: 20,
  OFFLINE_ENTRY_KINDS: ["practice", "observation", "note"] as const,
  OFFLINE_ENTRY_NOTE_MAX_LENGTH: 500,
}));

import { loadUserTimeline } from "@/lib/timeline/aggregator";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

beforeEach(() => {
  evalFindManyMock.mockReset();
  sessionFindManyMock.mockReset();
  offlineListMock.mockReset();
});

describe("loadUserTimeline — offline merge (FR-Q-013 후속)", () => {
  it("[1] offline + diagnose + mission 모두 있음 → 3종 merge + desc 정렬 + hasOfflineData true", async () => {
    const t0 = Date.now();
    const d1 = new Date(t0 - 1000); // 가장 최근 — diagnose
    const t2 = new Date(t0 - 5000); // mission
    const o3 = new Date(t0 - 10_000); // offline (observedAt)
    const d4 = new Date(t0 - 20_000); // diagnose 오래된

    evalFindManyMock.mockResolvedValueOnce([
      {
        id: "e1",
        createdAt: d1,
        articulationScore: 80,
        linguisticScore: 70,
        acousticScore: 65,
        targetPhoneme: "ㅅ",
      },
      {
        id: "e2",
        createdAt: d4,
        articulationScore: 60,
        linguisticScore: 60,
        acousticScore: 60,
        targetPhoneme: "ㄱ",
      },
    ]);
    sessionFindManyMock.mockResolvedValueOnce([
      { id: "s1", createdAt: t2, missionId: "m1", durationSec: 90 },
    ]);
    offlineListMock.mockResolvedValueOnce([
      {
        id: "o1",
        userId: USER_A,
        authorId: "teacher-1",
        kind: "practice",
        note: "ㅅ 발음 5회 연습",
        observedAt: o3,
        createdAt: new Date(),
        updatedAt: new Date(),
        institutionId: "inst-A",
      },
    ]);

    const data = await loadUserTimeline(USER_A);

    expect(data.totalCount).toBe(4);
    expect(data.hasDiagnoseData).toBe(true);
    expect(data.hasMissionData).toBe(true);
    expect(data.hasOfflineData).toBe(true);
    // desc by timestamp: e1 (d1) > s1 (t2) > o1 (o3) > e2 (d4).
    expect(data.entries.map((e) => e.id)).toEqual(["e1", "s1", "o1", "e2"]);
    // offline kind 검증.
    const offline = data.entries.find((e) => e.id === "o1");
    expect(offline?.kind).toBe("offline");
    if (offline?.kind === "offline") {
      expect(offline.offlineKind).toBe("practice");
      expect(offline.authorId).toBe("teacher-1");
      expect(offline.note).toBe("ㅅ 발음 5회 연습");
    }
  });

  it("[2] offline 만 있음 → hasOfflineData true / 그 외 false", async () => {
    evalFindManyMock.mockResolvedValueOnce([]);
    sessionFindManyMock.mockResolvedValueOnce([]);
    offlineListMock.mockResolvedValueOnce([
      {
        id: "o-only",
        userId: USER_A,
        authorId: "teacher-2",
        kind: "note",
        note: "오늘 활동 메모",
        observedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        institutionId: null,
      },
    ]);

    const data = await loadUserTimeline(USER_A);

    expect(data.totalCount).toBe(1);
    expect(data.hasOfflineData).toBe(true);
    expect(data.hasDiagnoseData).toBe(false);
    expect(data.hasMissionData).toBe(false);
    expect(data.entries[0].kind).toBe("offline");
  });

  it("[3] offline entry 의 observedAt 이 createdAt 자리에 들어감 (실 활동 시각 기준 정렬)", async () => {
    const veryOld = new Date("2026-01-01T10:00:00Z");
    evalFindManyMock.mockResolvedValueOnce([]);
    sessionFindManyMock.mockResolvedValueOnce([]);
    offlineListMock.mockResolvedValueOnce([
      {
        id: "o-old",
        userId: USER_A,
        authorId: "teacher-3",
        kind: "observation",
        note: "오래된 관찰 메모",
        observedAt: veryOld,
        // createdAt 은 실 입력 시각 — 정렬에 사용 안 됨.
        createdAt: new Date(),
        updatedAt: new Date(),
        institutionId: "inst-A",
      },
    ]);

    const data = await loadUserTimeline(USER_A);
    expect(data.entries[0].createdAt.getTime()).toBe(veryOld.getTime());
  });

  it("[4] cross-user — listOfflineEntriesForUser 가 정확한 userId 로만 호출", async () => {
    evalFindManyMock.mockResolvedValueOnce([]);
    sessionFindManyMock.mockResolvedValueOnce([]);
    offlineListMock.mockResolvedValueOnce([]);

    await loadUserTimeline(USER_A);

    expect(offlineListMock).toHaveBeenCalledTimes(1);
    const [userId] = offlineListMock.mock.calls[0];
    expect(userId).toBe(USER_A);
    // 호출 인자 어디에도 USER_B 등장 X.
    expect(JSON.stringify(offlineListMock.mock.calls)).not.toContain(USER_B);
  });

  it("[5] 빈 userId → offline repo 호출 0 + hasOfflineData false", async () => {
    const data = await loadUserTimeline("");
    expect(offlineListMock).not.toHaveBeenCalled();
    expect(data.hasOfflineData).toBe(false);
  });
});

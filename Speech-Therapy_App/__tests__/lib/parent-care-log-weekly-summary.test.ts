// FR-Q-NEW-F17-UI-B 단위 테스트 — 부모 케어로그 주간 요약 helper.
//
// 시나리오:
//   1) 직전 7일 entries 집계 — kind 별 카운트 + 마지막 시각
//   2) 빈 결과 → totalCount 0 / lastObservedAt null
//   3) authorId != userId 인 row 는 제외 (teacher 입력은 별도)
//   4) 7일 초과 row 는 제외 (where 검증)
//   5) DB error 시 graceful — totalCount 0 fallback

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    offlineEntry: {
      findMany: (args: unknown) => findManyMock(args),
    },
  },
}));

import { loadParentCareLogWeeklySummary } from "@/lib/parent-care-log/weekly-summary";

beforeEach(() => {
  findManyMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const NOW = new Date("2026-05-27T10:00:00Z");

describe("FR-Q-NEW-F17-UI-B — loadParentCareLogWeeklySummary", () => {
  it("[1] 정상 — kind 별 카운트 + 마지막 시각", async () => {
    findManyMock.mockResolvedValue([
      { kind: "parent_play", observedAt: new Date("2026-05-26T18:00:00Z") },
      { kind: "parent_play", observedAt: new Date("2026-05-24T18:00:00Z") },
      { kind: "parent_external_session", observedAt: new Date("2026-05-23T18:00:00Z") },
    ]);

    const result = await loadParentCareLogWeeklySummary("user-1", NOW);
    expect(result.totalCount).toBe(3);
    expect(result.byKind.parent_play).toBe(2);
    expect(result.byKind.parent_external_session).toBe(1);
    expect(result.lastObservedAt).toEqual(new Date("2026-05-26T18:00:00Z"));
  });

  it("[2] 빈 결과 → totalCount 0 + lastObservedAt null", async () => {
    findManyMock.mockResolvedValue([]);
    const result = await loadParentCareLogWeeklySummary("user-1", NOW);
    expect(result.totalCount).toBe(0);
    expect(result.byKind.parent_play).toBe(0);
    expect(result.byKind.parent_external_session).toBe(0);
    expect(result.lastObservedAt).toBeNull();
  });

  it("[3] where 조건 — authorId == userId (본인 입력만)", async () => {
    findManyMock.mockResolvedValue([]);
    await loadParentCareLogWeeklySummary("user-1", NOW);

    const callArg = findManyMock.mock.calls[0][0];
    expect(callArg.where.userId).toBe("user-1");
    expect(callArg.where.authorId).toBe("user-1");
    expect(callArg.where.kind.in).toEqual([
      "parent_play",
      "parent_external_session",
    ]);
  });

  it("[4] where 조건 — observedAt 7일 윈도우", async () => {
    findManyMock.mockResolvedValue([]);
    await loadParentCareLogWeeklySummary("user-1", NOW);

    const callArg = findManyMock.mock.calls[0][0];
    const expectedSince = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(callArg.where.observedAt.gte).toEqual(expectedSince);
  });

  it("[5] DB error 시 graceful — totalCount 0", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    findManyMock.mockRejectedValue(new Error("DB lost"));
    const result = await loadParentCareLogWeeklySummary("user-1", NOW);
    expect(result.totalCount).toBe(0);
    expect(result.lastObservedAt).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("[6] R4 정합 — 반환 shape 에 자녀 식별 정보 없음", async () => {
    findManyMock.mockResolvedValue([
      { kind: "parent_play", observedAt: new Date("2026-05-26T18:00:00Z") },
    ]);
    const result = await loadParentCareLogWeeklySummary("user-1", NOW);
    expect(JSON.stringify(result)).not.toMatch(/email|note|userId|childName/i);
  });
});

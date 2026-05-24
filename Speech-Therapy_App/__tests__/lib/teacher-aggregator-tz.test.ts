// FR-Q-TEACHER 후속 — loadTeacherDashboard 의 since 윈도우 KST 자정 정렬 검증.
//
// 시나리오 (≥ 4):
//   [TTZ1] UTC 자정 직전 vs 직후 호출 (같은 KST 일자) → since 결과 동일
//   [TTZ2] 7일 전 KST 자정 boundary 정확성
//   [TTZ3] since 가 항상 KST 00:00 시각 → UTC hours = 15 (전날 15:00)
//   [TTZ4] kstDaysAgoStart(7) instant 와 정확히 일치
//   [TTZ5] DST 무관 (7월)
//
// principal-aggregator-tz 와 동일 패턴 — 두 dashboard 의 since 정책 정합 보장.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const classFindManyMock = vi.fn();
const evalCountMock = vi.fn();
const evalAggregateMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    class: {
      findMany: (...args: unknown[]) => classFindManyMock(...args),
    },
    evaluationResult: {
      count: (...args: unknown[]) => evalCountMock(...args),
      aggregate: (...args: unknown[]) => evalAggregateMock(...args),
    },
  },
}));

import {
  loadTeacherDashboard,
  TEACHER_RECENT_DAYS,
} from "@/lib/admin/teacher-aggregator";
import { kstDaysAgoStart } from "@/lib/timeline/tz";

const TEACHER_ID = "tt-1111-1111-1111-tttttttttttt";

function setupBaseMocks() {
  classFindManyMock.mockResolvedValue([
    { id: "class-1", name: "햇님반", users: [{ id: "u-1" }] },
  ]);
  // 전체 집계 + 반별 집계 = 총 2회씩 (evalCount, evalAggregate).
  evalCountMock.mockResolvedValue(0);
  evalAggregateMock.mockResolvedValue({ _avg: { articulationScore: null } });
}

function resetAll() {
  classFindManyMock.mockReset();
  evalCountMock.mockReset();
  evalAggregateMock.mockReset();
}

describe("loadTeacherDashboard — since 윈도우 KST 자정 정렬 (TZ 통일 PR)", () => {
  beforeEach(() => {
    resetAll();
    setupBaseMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("[TTZ1] 같은 KST 일자 두 instant 호출 — since 동일", async () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2026-05-24T15:00:01.000Z")); // KST 5-25 00:00:01
    await loadTeacherDashboard(TEACHER_ID);
    const since1 = (evalCountMock.mock.calls[0][0] as { where: { createdAt: { gte: Date } } }).where.createdAt.gte;

    resetAll();
    setupBaseMocks();

    vi.setSystemTime(new Date("2026-05-25T14:59:59.000Z")); // KST 5-25 23:59:59
    await loadTeacherDashboard(TEACHER_ID);
    const since2 = (evalCountMock.mock.calls[0][0] as { where: { createdAt: { gte: Date } } }).where.createdAt.gte;

    expect(since1.toISOString()).toBe(since2.toISOString());
  });

  it("[TTZ2] 7일 전 KST 자정 — KST 5-25 호출 → since = UTC 5-17 15:00", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T01:00:00.000Z")); // KST 5-25 10:00
    await loadTeacherDashboard(TEACHER_ID);
    const since = (evalCountMock.mock.calls[0][0] as { where: { createdAt: { gte: Date } } }).where.createdAt.gte;
    expect(since.toISOString()).toBe("2026-05-17T15:00:00.000Z");
  });

  it("[TTZ3] since UTC time-of-day = 15:00 (KST 자정)", async () => {
    vi.useFakeTimers();
    const testInstants = [
      "2026-05-25T01:00:00.000Z",
      "2026-05-25T08:30:00.000Z",
      "2026-05-25T14:59:00.000Z",
    ];
    for (const iso of testInstants) {
      resetAll();
      setupBaseMocks();
      vi.setSystemTime(new Date(iso));
      await loadTeacherDashboard(TEACHER_ID);
      const since = (evalCountMock.mock.calls[0][0] as { where: { createdAt: { gte: Date } } }).where.createdAt.gte;
      expect(since.getUTCHours()).toBe(15);
      expect(since.getUTCMinutes()).toBe(0);
    }
  });

  it("[TTZ4] kstDaysAgoStart(7) 결과와 동일 instant", async () => {
    vi.useFakeTimers();
    const fixedNow = new Date("2026-05-25T01:00:00.000Z");
    vi.setSystemTime(fixedNow);
    await loadTeacherDashboard(TEACHER_ID);
    const since = (evalCountMock.mock.calls[0][0] as { where: { createdAt: { gte: Date } } }).where.createdAt.gte;
    const expected = kstDaysAgoStart(TEACHER_RECENT_DAYS, fixedNow);
    expect(since.toISOString()).toBe(expected.toISOString());
  });

  it("[TTZ5] DST 무관 — 7월 호출 시 since UTC 15:00 유지", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T03:00:00.000Z")); // KST 2026-07-01 12:00
    await loadTeacherDashboard(TEACHER_ID);
    const since = (evalCountMock.mock.calls[0][0] as { where: { createdAt: { gte: Date } } }).where.createdAt.gte;
    expect(since.toISOString()).toBe("2026-06-23T15:00:00.000Z");
  });
});

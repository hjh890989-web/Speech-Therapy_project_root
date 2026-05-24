// FR-Q-009 후속 — loadPrincipalDashboard 의 since 윈도우 KST 자정 정렬 검증.
//
// 시나리오 (≥ 4):
//   [PTZ1] UTC 자정 직전 vs 직후 호출 → since 결과 동일 KST 일자 boundary
//   [PTZ2] 7일 전 KST 자정 boundary 정확성 (UTC 일자 비례 -9h)
//   [PTZ3] since 가 항상 KST 00:00 시각 → getUTCHours = 15 (= UTC 전날 15:00)
//   [PTZ4] kstDaysAgoStart(7) instant 와 정확히 일치
//
// 기존 since 와의 차이:
//   - 기존: `Date.now() - 7 * 24h` (호출 instant 기준 -7일).
//   - 신규: `kstDaysAgoStart(7)` (KST 일자 00:00 기준 -7일).
//   - 동일 KST 일자 안에서 호출 시각이 달라도 동일 since instant 보장.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const classCountMock = vi.fn();
const userCountMock = vi.fn();
const evalCountMock = vi.fn();
const evalAggregateMock = vi.fn();
const classFindManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    class: {
      count: (...args: unknown[]) => classCountMock(...args),
      findMany: (...args: unknown[]) => classFindManyMock(...args),
    },
    user: {
      count: (...args: unknown[]) => userCountMock(...args),
    },
    evaluationResult: {
      count: (...args: unknown[]) => evalCountMock(...args),
      aggregate: (...args: unknown[]) => evalAggregateMock(...args),
    },
  },
}));

import {
  loadPrincipalDashboard,
  PRINCIPAL_RECENT_DAYS,
} from "@/lib/admin/principal-aggregator";
import { kstDaysAgoStart } from "@/lib/timeline/tz";

const INSTITUTION = "11111111-1111-4111-8111-111111111111";

function setupBaseMocks() {
  classCountMock.mockResolvedValue(0);
  userCountMock.mockResolvedValue(0);
  evalCountMock.mockResolvedValue(0);
  evalAggregateMock.mockResolvedValue({ _avg: { articulationScore: null } });
  classFindManyMock.mockResolvedValue([]);
}

function resetAll() {
  classCountMock.mockReset();
  userCountMock.mockReset();
  evalCountMock.mockReset();
  evalAggregateMock.mockReset();
  classFindManyMock.mockReset();
}

describe("loadPrincipalDashboard — since 윈도우 KST 자정 정렬 (TZ 통일 PR)", () => {
  beforeEach(() => {
    resetAll();
    setupBaseMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("[PTZ1] UTC 자정 직전 (14:59:59) vs 직후 (15:00:01) — 같은 KST 일자라면 since 동일", async () => {
    // UTC 2026-05-24 14:59:59 = KST 2026-05-24 23:59:59 (KST 5-24 일자).
    // UTC 2026-05-24 15:00:01 = KST 2026-05-25 00:00:01 (KST 5-25 일자 — 다른 일자).
    // 본 케이스는 "같은 KST 일자" 검증이므로 KST 5-25 안에서 두 instant 비교.
    // UTC 2026-05-24 15:00:01 (KST 5-25 00:00:01) vs UTC 2026-05-25 14:59:59 (KST 5-25 23:59:59).
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2026-05-24T15:00:01.000Z"));
    await loadPrincipalDashboard(INSTITUTION);
    const since1 = (evalCountMock.mock.calls[0][0] as { where: { createdAt: { gte: Date } } }).where.createdAt.gte;

    resetAll();
    setupBaseMocks();

    vi.setSystemTime(new Date("2026-05-25T14:59:59.000Z"));
    await loadPrincipalDashboard(INSTITUTION);
    const since2 = (evalCountMock.mock.calls[0][0] as { where: { createdAt: { gte: Date } } }).where.createdAt.gte;

    // 두 호출 모두 KST 5-25 일자 내 → 7일 전 KST 자정 instant 동일.
    expect(since1.toISOString()).toBe(since2.toISOString());
  });

  it("[PTZ2] 7일 전 KST 자정 boundary — KST 5-25 호출 시 since = KST 5-18 00:00 = UTC 5-17 15:00", async () => {
    vi.useFakeTimers();
    // KST 2026-05-25 10:00 = UTC 2026-05-25 01:00.
    vi.setSystemTime(new Date("2026-05-25T01:00:00.000Z"));
    await loadPrincipalDashboard(INSTITUTION);

    const since = (evalCountMock.mock.calls[0][0] as { where: { createdAt: { gte: Date } } }).where.createdAt.gte;
    // KST 5-18 00:00 = UTC 5-17 15:00.
    expect(since.toISOString()).toBe("2026-05-17T15:00:00.000Z");
  });

  it("[PTZ3] since 는 KST 자정 instant — UTC 시각이 항상 15:00 (전날)", async () => {
    vi.useFakeTimers();
    // 임의의 호출 시각 — KST 일자 boundary 안 어디서든 since 의 UTC time-of-day 는 15:00.
    const testInstants = [
      "2026-05-25T01:00:00.000Z",
      "2026-05-25T10:00:00.000Z",
      "2026-05-25T14:59:00.000Z",
    ];
    for (const iso of testInstants) {
      resetAll();
      setupBaseMocks();
      vi.setSystemTime(new Date(iso));
      await loadPrincipalDashboard(INSTITUTION);
      const since = (evalCountMock.mock.calls[0][0] as { where: { createdAt: { gte: Date } } }).where.createdAt.gte;
      // UTC 15:00 = KST 다음날 00:00.
      expect(since.getUTCHours()).toBe(15);
      expect(since.getUTCMinutes()).toBe(0);
      expect(since.getUTCSeconds()).toBe(0);
      expect(since.getUTCMilliseconds()).toBe(0);
    }
  });

  it("[PTZ4] since 가 kstDaysAgoStart(7) 결과와 정확히 일치 (instant 비교)", async () => {
    vi.useFakeTimers();
    const fixedNow = new Date("2026-05-25T01:00:00.000Z");
    vi.setSystemTime(fixedNow);
    await loadPrincipalDashboard(INSTITUTION);

    const since = (evalCountMock.mock.calls[0][0] as { where: { createdAt: { gte: Date } } }).where.createdAt.gte;
    const expected = kstDaysAgoStart(PRINCIPAL_RECENT_DAYS, fixedNow);
    expect(since.toISOString()).toBe(expected.toISOString());
  });

  it("[PTZ5] DST 무관 — 7월 1일 KST 호출 시에도 since UTC 시각 = 15:00", async () => {
    vi.useFakeTimers();
    // KST 2026-07-01 12:00 = UTC 2026-07-01 03:00.
    vi.setSystemTime(new Date("2026-07-01T03:00:00.000Z"));
    await loadPrincipalDashboard(INSTITUTION);
    const since = (evalCountMock.mock.calls[0][0] as { where: { createdAt: { gte: Date } } }).where.createdAt.gte;
    // KST 6-24 00:00 = UTC 6-23 15:00.
    expect(since.toISOString()).toBe("2026-06-23T15:00:00.000Z");
  });
});

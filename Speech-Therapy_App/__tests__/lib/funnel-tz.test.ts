// MON-001 후속 — funnel 일간 그루핑 KST 기준 검증.
//
// 시나리오 (≥ 4):
//   [FTZ1] formatKstDate — UTC 14:59 (KST 23:59) → 같은 KST 일자
//   [FTZ2] formatKstDate — UTC 15:00 (KST 다음날 00:00) → 다른 KST 일자
//   [FTZ3] toDayStartKst — 임의 instant → KST 자정 (UTC 전날 15:00)
//   [FTZ4] addKstDays — KST 자정 + N일
//   [FTZ5] aggregateFunnel — 반환 date 가 KST 일자
//   [FTZ6] aggregateFunnelByDay — KST 일자별 iteration boundary
//   [FTZ7] backwards-compat — formatUtcDate / toDayStartUtc / addUtcDays 유지
//
// 핵심 정책:
//   - 일간 funnel 의 date label = KST 일자 (사용자 인지 일자).
//   - 일별 iteration boundary = KST 자정 (UTC 로는 전날 15:00).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// AnalyticsEvent 재연결 후 — 6단계 모두 findMany(distinct userId).
const analyticsFindManyMock = vi.fn();
const evalFindManyMock = vi.fn();
const sessionFindManyMock = vi.fn();
const rewardFindManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    analyticsEvent: {
      findMany: (...args: unknown[]) => analyticsFindManyMock(...args),
    },
    evaluationResult: {
      findMany: (...args: unknown[]) => evalFindManyMock(...args),
    },
    sessionLog: {
      findMany: (...args: unknown[]) => sessionFindManyMock(...args),
    },
    rewardLog: {
      findMany: (...args: unknown[]) => rewardFindManyMock(...args),
    },
  },
}));

import {
  addKstDays,
  addUtcDays,
  aggregateFunnel,
  aggregateFunnelByDay,
  formatKstDate,
  formatUtcDate,
  toDayStartKst,
  toDayStartUtc,
} from "@/lib/analytics/funnel";

beforeEach(() => {
  analyticsFindManyMock.mockReset();
  evalFindManyMock.mockReset();
  sessionFindManyMock.mockReset();
  rewardFindManyMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("formatKstDate — KST 일자 라벨", () => {
  it("[FTZ1] UTC 14:59 (KST 23:59) — 같은 KST 일자", () => {
    // UTC 2026-05-23 14:59 = KST 2026-05-23 23:59.
    expect(formatKstDate(new Date("2026-05-23T14:59:00.000Z"))).toBe("2026-05-23");
  });

  it("[FTZ2] UTC 15:00 (KST 다음날 00:00) — 다른 KST 일자", () => {
    // UTC 2026-05-23 15:00 = KST 2026-05-24 00:00.
    expect(formatKstDate(new Date("2026-05-23T15:00:00.000Z"))).toBe("2026-05-24");
  });

  it("[FTZ2b] UTC 00:00 (KST 09:00) — 동일 일자", () => {
    expect(formatKstDate(new Date("2026-05-24T00:00:00.000Z"))).toBe("2026-05-24");
  });
});

describe("toDayStartKst — KST 자정 정렬", () => {
  it("[FTZ3] 임의 instant → KST 자정 (UTC 전날 15:00)", () => {
    // KST 2026-05-24 13:45 = UTC 2026-05-24 04:45.
    const ds = toDayStartKst(new Date("2026-05-24T04:45:00.000Z"));
    // KST 2026-05-24 00:00 = UTC 2026-05-23 15:00.
    expect(ds.toISOString()).toBe("2026-05-23T15:00:00.000Z");
  });

  it("[FTZ3b] KST 자정 이미 정렬된 instant → 그대로 반환", () => {
    const aligned = new Date("2026-05-23T15:00:00.000Z");
    expect(toDayStartKst(aligned).toISOString()).toBe(aligned.toISOString());
  });
});

describe("addKstDays — KST 일 단위 가산", () => {
  it("[FTZ4] KST 자정 + 1일 = 다음날 KST 자정 (24h instant)", () => {
    const day0 = toDayStartKst(new Date("2026-05-24T04:45:00.000Z"));
    const day1 = addKstDays(day0, 1);
    expect(day1.toISOString()).toBe("2026-05-24T15:00:00.000Z");
  });

  it("[FTZ4b] KST 자정 - 1일 = 전날 KST 자정", () => {
    const day0 = toDayStartKst(new Date("2026-05-24T04:45:00.000Z"));
    const dayMinus1 = addKstDays(day0, -1);
    expect(dayMinus1.toISOString()).toBe("2026-05-22T15:00:00.000Z");
  });
});

describe("aggregateFunnel — date label KST", () => {
  it("[FTZ5] from = UTC 15:00 (KST 다음날 00:00) → date label = KST 일자", async () => {
    analyticsFindManyMock.mockResolvedValue([]);
    evalFindManyMock.mockResolvedValue([]);
    sessionFindManyMock.mockResolvedValue([]);
    rewardFindManyMock.mockResolvedValue([]);

    // from = UTC 2026-05-23 15:00 (= KST 2026-05-24 00:00).
    const from = new Date("2026-05-23T15:00:00.000Z");
    const to = new Date("2026-05-24T15:00:00.000Z");
    const summary = await aggregateFunnel({ from, to });
    expect(summary.date).toBe("2026-05-24");
  });
});

describe("aggregateFunnelByDay — KST 일자별 iteration", () => {
  it("[FTZ6] 입력이 UTC 자정이어도 KST 자정으로 정렬 후 iteration", async () => {
    analyticsFindManyMock.mockResolvedValue([]);
    evalFindManyMock.mockResolvedValue([]);
    sessionFindManyMock.mockResolvedValue([]);
    rewardFindManyMock.mockResolvedValue([]);

    // from = UTC 2026-05-19 00:00 (= KST 2026-05-19 09:00 → toDayStartKst → KST 5-19 00:00 = UTC 5-18 15:00).
    // to   = UTC 2026-05-22 00:00 (= KST 2026-05-22 09:00 → toDayStartKst → KST 5-22 00:00 = UTC 5-21 15:00).
    // iteration: KST 5-19, 5-20, 5-21 → 3 summaries.
    const from = new Date("2026-05-19T00:00:00.000Z");
    const to = new Date("2026-05-22T00:00:00.000Z");
    const summaries = await aggregateFunnelByDay({ from, to });

    expect(summaries).toHaveLength(3);
    expect(summaries.map((s) => s.date)).toEqual([
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
    ]);

    // 첫 일자의 prisma findMany gte = KST 5-19 00:00 = UTC 5-18 15:00.
    const firstFindArg = evalFindManyMock.mock.calls[0][0] as {
      where: { createdAt: { gte: Date; lt: Date } };
    };
    expect(firstFindArg.where.createdAt.gte.toISOString()).toBe("2026-05-18T15:00:00.000Z");
    expect(firstFindArg.where.createdAt.lt.toISOString()).toBe("2026-05-19T15:00:00.000Z");
  });

  it("[FTZ6b] KST 자정에 정확히 정렬된 from/to 입력 — boundary 그대로", async () => {
    analyticsFindManyMock.mockResolvedValue([]);
    evalFindManyMock.mockResolvedValue([]);
    sessionFindManyMock.mockResolvedValue([]);
    rewardFindManyMock.mockResolvedValue([]);

    // from = KST 5-19 00:00 = UTC 5-18 15:00.
    // to   = KST 5-22 00:00 = UTC 5-21 15:00.
    const from = new Date("2026-05-18T15:00:00.000Z");
    const to = new Date("2026-05-21T15:00:00.000Z");
    const summaries = await aggregateFunnelByDay({ from, to });

    expect(summaries.map((s) => s.date)).toEqual([
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
    ]);
  });
});

describe("backwards-compat — UTC helpers 유지", () => {
  it("[FTZ7] formatUtcDate / toDayStartUtc / addUtcDays 기존 의미 유지", () => {
    const d = new Date("2026-05-22T15:30:00Z");
    expect(formatUtcDate(d)).toBe("2026-05-22");
    expect(toDayStartUtc(d).toISOString()).toBe("2026-05-22T00:00:00.000Z");
    const plus3 = addUtcDays(toDayStartUtc(d), 3);
    expect(plus3.toISOString()).toBe("2026-05-25T00:00:00.000Z");
  });
});

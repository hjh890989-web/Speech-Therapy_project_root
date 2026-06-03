// W-AUR 라이브 집계 — computeWaurForWeek(분자/분모/rate·graceful) + getRecentWaurTrend(현재주 제외·순서).

import { describe, it, expect, vi, beforeEach } from "vitest";

const groupByMock = vi.fn();
const sessionFindManyMock = vi.fn();
const evalFindManyMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    sessionLog: {
      groupBy: (...a: unknown[]) => groupByMock(...a),
      findMany: (...a: unknown[]) => sessionFindManyMock(...a),
    },
    evaluationResult: {
      findMany: (...a: unknown[]) => evalFindManyMock(...a),
    },
  },
}));

import {
  computeWaurForWeek,
  getRecentWaurTrend,
  W_AUR_TARGET_RATE,
} from "@/lib/reports/waur-trend";
import { W_AUR_MIN_MISSIONS } from "@/lib/reports/weekly-aggregator";
import { getCurrentWeekNumber, previousWeek } from "@/lib/weekly-report";

beforeEach(() => {
  groupByMock.mockReset();
  sessionFindManyMock.mockReset();
  evalFindManyMock.mockReset();
});

describe("computeWaurForWeek", () => {
  it("분자(달성)/분모(활성 진단∪미션 union)/rate 계산", async () => {
    groupByMock.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]); // 2 달성
    evalFindManyMock.mockResolvedValue([{ userId: "u1" }, { userId: "u3" }]); // 진단 u1,u3
    sessionFindManyMock.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]); // 미션 u1,u2
    const r = await computeWaurForWeek(2026, 22);
    expect(r.achievedUsers).toBe(2);
    expect(r.activeUsers).toBe(3); // union {u1,u2,u3}
    expect(r.rate).toBeCloseTo(2 / 3, 5);

    // groupBy having = W_AUR_MIN_MISSIONS, 미션 완료 필터(durationSec>0).
    const arg = groupByMock.mock.calls[0][0] as {
      having: { userId: { _count: { gte: number } } };
      where: { durationSec: { gt: number }; missionId: { not: null } };
    };
    expect(arg.having.userId._count.gte).toBe(W_AUR_MIN_MISSIONS);
    expect(arg.where.durationSec).toEqual({ gt: 0 });
    expect(arg.where.missionId).toEqual({ not: null });
  });

  it("활성 0 → rate 0", async () => {
    groupByMock.mockResolvedValue([]);
    evalFindManyMock.mockResolvedValue([]);
    sessionFindManyMock.mockResolvedValue([]);
    const r = await computeWaurForWeek(2026, 22);
    expect(r).toEqual({ year: 2026, week: 22, activeUsers: 0, achievedUsers: 0, rate: 0 });
  });

  it("achievedUsers ⊆ activeUsers (rate ≤ 1)", async () => {
    // 달성 3명 모두 미션 사용자 → 활성에 포함.
    groupByMock.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }]);
    evalFindManyMock.mockResolvedValue([]);
    sessionFindManyMock.mockResolvedValue([
      { userId: "u1" },
      { userId: "u2" },
      { userId: "u3" },
    ]);
    const r = await computeWaurForWeek(2026, 22);
    expect(r.rate).toBeLessThanOrEqual(1);
    expect(r.rate).toBeCloseTo(1, 5);
  });

  it("groupBy 실패 → graceful 0", async () => {
    groupByMock.mockRejectedValue(new Error("db down"));
    const r = await computeWaurForWeek(2026, 22);
    expect(r).toEqual({ year: 2026, week: 22, activeUsers: 0, achievedUsers: 0, rate: 0 });
  });
});

describe("getRecentWaurTrend", () => {
  it("최근 N주, 현재(진행중) 주 제외, 최신→과거 순", async () => {
    groupByMock.mockResolvedValue([]);
    evalFindManyMock.mockResolvedValue([]);
    sessionFindManyMock.mockResolvedValue([]);
    const now = new Date("2026-06-03T05:00:00.000Z");
    const trend = await getRecentWaurTrend(now, 3);
    expect(trend).toHaveLength(3);

    // 첫 항목 = 현재 주의 직전 주(현재 주 제외).
    const current = getCurrentWeekNumber(now);
    const w1 = previousWeek(current.year, current.week);
    expect({ year: trend[0].year, week: trend[0].week }).toEqual(w1);
    // 두 번째 = w1 의 직전 주(과거로 진행).
    const w2 = previousWeek(w1.year, w1.week);
    expect({ year: trend[1].year, week: trend[1].week }).toEqual(w2);
  });

  it("기본 12주", async () => {
    groupByMock.mockResolvedValue([]);
    evalFindManyMock.mockResolvedValue([]);
    sessionFindManyMock.mockResolvedValue([]);
    const trend = await getRecentWaurTrend(new Date("2026-06-03T05:00:00.000Z"));
    expect(trend).toHaveLength(12);
  });
});

describe("W_AUR_TARGET_RATE", () => {
  it("북극성 목표 = 0.6 (60%)", () => {
    expect(W_AUR_TARGET_RATE).toBe(0.6);
  });
});

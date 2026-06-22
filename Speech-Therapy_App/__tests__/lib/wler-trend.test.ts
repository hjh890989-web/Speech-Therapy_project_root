// W-LER 라이브 집계 — computeWlerForWeek(분모=활성 문해 사용자/분자=활동일≥임계/rate·graceful)
//   + getRecentWlerTrend(현재주 제외·순서) + 연습-only 불변(engagement·target 없음).

import { describe, it, expect, vi, beforeEach } from "vitest";

const litFindManyMock = vi.fn();
const enabledGamesMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    literacyResult: {
      findMany: (...a: unknown[]) => litFindManyMock(...a),
    },
  },
}));

vi.mock("@/lib/literacy/registry", () => ({
  enabledLiteracyGames: (...a: unknown[]) => enabledGamesMock(...a),
}));

import {
  computeWlerForWeek,
  getRecentWlerTrend,
  W_LER_MIN_DAYS,
} from "@/lib/reports/wler-trend";
import { getCurrentWeekNumber, previousWeek } from "@/lib/weekly-report";

beforeEach(() => {
  litFindManyMock.mockReset();
  enabledGamesMock.mockReset();
  // 기본: 활성 게임 2종, 활동 0건.
  enabledGamesMock.mockReturnValue([{ slug: "spelling" }, { slug: "vocabulary" }]);
  litFindManyMock.mockResolvedValue([]);
});

describe("computeWlerForWeek", () => {
  it("분모(활성 distinct)/분자(활동일 ≥ W_LER_MIN_DAYS)/rate (engagement)", async () => {
    // u1 = 서로 다른 2일(engaged), u2 = 1일(미달).
    litFindManyMock.mockResolvedValue([
      { userId: "u1", createdAt: new Date("2026-05-25T02:00:00.000Z") },
      { userId: "u1", createdAt: new Date("2026-05-26T02:00:00.000Z") },
      { userId: "u2", createdAt: new Date("2026-05-25T02:00:00.000Z") },
      { userId: "u2", createdAt: new Date("2026-05-25T05:00:00.000Z") },
    ]);
    const r = await computeWlerForWeek(2026, 22);
    expect(r.activeUsers).toBe(2); // u1, u2
    expect(r.engagedUsers).toBe(1); // u1 만 활동일 2 이상
    expect(r.rate).toBeCloseTo(0.5, 5);

    // 쿼리 가드 — 활성 게임 slug 필터 + 문해 연령 도메인(24~144).
    const arg = litFindManyMock.mock.calls[0][0] as {
      where: {
        gameSlug: { in: string[] };
        childAgeMonths: { gte: number; lte: number };
      };
    };
    expect(arg.where.gameSlug.in).toEqual(["spelling", "vocabulary"]);
    expect(arg.where.childAgeMonths).toEqual({ gte: 24, lte: 144 });
  });

  it("활성 게임 0개(플래그 전부 off) → findMany 미호출 + rate 0", async () => {
    enabledGamesMock.mockReturnValue([]);
    const r = await computeWlerForWeek(2026, 22);
    expect(r).toEqual({ year: 2026, week: 22, activeUsers: 0, engagedUsers: 0, rate: 0 });
    expect(litFindManyMock).not.toHaveBeenCalled();
  });

  it("활동 0건 → rate 0", async () => {
    litFindManyMock.mockResolvedValue([]);
    const r = await computeWlerForWeek(2026, 22);
    expect(r).toEqual({ year: 2026, week: 22, activeUsers: 0, engagedUsers: 0, rate: 0 });
  });

  it("engagedUsers ⊆ activeUsers (rate ≤ 1, 전원 활동일 충족 시 1)", async () => {
    litFindManyMock.mockResolvedValue([
      { userId: "u1", createdAt: new Date("2026-05-25T02:00:00.000Z") },
      { userId: "u1", createdAt: new Date("2026-05-27T02:00:00.000Z") },
      { userId: "u2", createdAt: new Date("2026-05-25T02:00:00.000Z") },
      { userId: "u2", createdAt: new Date("2026-05-26T02:00:00.000Z") },
    ]);
    const r = await computeWlerForWeek(2026, 22);
    expect(r.rate).toBeLessThanOrEqual(1);
    expect(r.rate).toBeCloseTo(1, 5);
  });

  it("findMany 실패 → graceful 0", async () => {
    litFindManyMock.mockRejectedValue(new Error("db down"));
    const r = await computeWlerForWeek(2026, 22);
    expect(r).toEqual({ year: 2026, week: 22, activeUsers: 0, engagedUsers: 0, rate: 0 });
  });
});

describe("getRecentWlerTrend", () => {
  it("최근 N주, 현재(진행중) 주 제외, 최신→과거 순", async () => {
    const now = new Date("2026-06-03T05:00:00.000Z");
    const trend = await getRecentWlerTrend(now, 3);
    expect(trend).toHaveLength(3);

    const current = getCurrentWeekNumber(now);
    const w1 = previousWeek(current.year, current.week);
    expect({ year: trend[0].year, week: trend[0].week }).toEqual(w1);
    const w2 = previousWeek(w1.year, w1.week);
    expect({ year: trend[1].year, week: trend[1].week }).toEqual(w2);
  });

  it("기본 12주", async () => {
    const trend = await getRecentWlerTrend(new Date("2026-06-03T05:00:00.000Z"));
    expect(trend).toHaveLength(12);
  });
});

describe("W_LER_MIN_DAYS (연습-only 임계 상수)", () => {
  it("활동일 기준 = 2 (engagement, 완수율 아님)", () => {
    expect(W_LER_MIN_DAYS).toBe(2);
  });
});

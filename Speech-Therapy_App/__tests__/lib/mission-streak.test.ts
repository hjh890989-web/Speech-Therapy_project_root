// TEST — getMissionStreak (FR-C-DAILY-STREAK) 연속 활동일 계산.

import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: { sessionLog: { findMany: (...a: unknown[]) => findManyMock(...a) } },
}));

import { getMissionStreak } from "@/lib/missions/streak";

// 고정 now = 2026-05-31 14:00 KST (= 05:00Z).
const NOW = new Date("2026-05-31T05:00:00Z");
/// KST 일자 d 에 매핑되는 instant (03:00Z + 9h = 12:00 KST 같은 날).
function day(d: string): Date {
  return new Date(`${d}T03:00:00Z`);
}
function rows(...days: string[]) {
  return days.map((d) => ({ startTime: day(d) }));
}

beforeEach(() => {
  findManyMock.mockReset();
});

describe("getMissionStreak — FR-C-DAILY-STREAK", () => {
  it("활동 0건 → current=0, activeToday=false", async () => {
    findManyMock.mockResolvedValue([]);
    expect(await getMissionStreak("u1", NOW)).toEqual({ current: 0, activeToday: false });
  });

  it("오늘+어제+그제 연속 → current=3, activeToday=true", async () => {
    findManyMock.mockResolvedValue(rows("2026-05-31", "2026-05-30", "2026-05-29"));
    expect(await getMissionStreak("u1", NOW)).toEqual({ current: 3, activeToday: true });
  });

  it("오늘만 → current=1, activeToday=true", async () => {
    findManyMock.mockResolvedValue(rows("2026-05-31"));
    expect(await getMissionStreak("u1", NOW)).toEqual({ current: 1, activeToday: true });
  });

  it("오늘 없고 어제+그제 → current=2, activeToday=false (grace — 오늘 이어가기)", async () => {
    findManyMock.mockResolvedValue(rows("2026-05-30", "2026-05-29"));
    expect(await getMissionStreak("u1", NOW)).toEqual({ current: 2, activeToday: false });
  });

  it("최근 활동이 그제(2일 공백) → current=0 (끊김)", async () => {
    findManyMock.mockResolvedValue(rows("2026-05-29", "2026-05-28"));
    expect(await getMissionStreak("u1", NOW)).toEqual({ current: 0, activeToday: false });
  });

  it("중간 공백(오늘+그제, 어제 없음) → current=1 (오늘만 연속)", async () => {
    findManyMock.mockResolvedValue(rows("2026-05-31", "2026-05-29"));
    expect(await getMissionStreak("u1", NOW)).toEqual({ current: 1, activeToday: true });
  });

  it("같은 날 중복 row → 1일로 dedupe", async () => {
    findManyMock.mockResolvedValue(rows("2026-05-31", "2026-05-31", "2026-05-30"));
    expect(await getMissionStreak("u1", NOW)).toEqual({ current: 2, activeToday: true });
  });

  it("쿼리 필터 — 의미있는 활동만(durationSec>0 OR missionId null) + 본인 + 윈도우", async () => {
    findManyMock.mockResolvedValue([]);
    await getMissionStreak("u1", NOW);
    const where = findManyMock.mock.calls[0]?.[0]?.where;
    expect(where.userId).toBe("u1");
    expect(where.OR).toEqual([{ durationSec: { gt: 0 } }, { missionId: null }]);
    expect(where.startTime.gte).toBeInstanceOf(Date);
  });

  it("DB 장애 → graceful {0,false}", async () => {
    findManyMock.mockRejectedValue(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getMissionStreak("u1", NOW)).toEqual({ current: 0, activeToday: false });
    errSpy.mockRestore();
  });
});

// TEST — getWeeklyMissionGoal (FR-C-WEEKLY-MISSION-GOAL) 이번 주 미션 진행도.

import { describe, it, expect, vi, beforeEach } from "vitest";

const countMock = vi.fn();
vi.mock("@/lib/reports/weekly-aggregator", () => ({
  countWeeklyMissionCompletions: (...a: unknown[]) => countMock(...a),
  W_AUR_MIN_MISSIONS: 4,
}));

const getWeekMock = vi.fn();
vi.mock("@/lib/weekly-report", () => ({
  getCurrentWeekNumber: (...a: unknown[]) => getWeekMock(...a),
}));

import { getWeeklyMissionGoal } from "@/lib/missions/weekly-goal";

const NOW = new Date("2026-05-31T05:00:00Z");

beforeEach(() => {
  countMock.mockReset();
  getWeekMock.mockReset();
  getWeekMock.mockReturnValue({ year: 2026, week: 22 });
});

describe("getWeeklyMissionGoal — FR-C-WEEKLY-MISSION-GOAL", () => {
  it("미완 — 2/4 → remaining 2, achieved false", async () => {
    countMock.mockResolvedValue(2);
    expect(await getWeeklyMissionGoal("u1", NOW)).toEqual({
      completed: 2,
      goal: 4,
      remaining: 2,
      achieved: false,
    });
  });

  it("달성 — 4/4 → remaining 0, achieved true", async () => {
    countMock.mockResolvedValue(4);
    expect(await getWeeklyMissionGoal("u1", NOW)).toEqual({
      completed: 4,
      goal: 4,
      remaining: 0,
      achieved: true,
    });
  });

  it("초과 — 6/4 → remaining 0(clamp), achieved true", async () => {
    countMock.mockResolvedValue(6);
    const r = await getWeeklyMissionGoal("u1", NOW);
    expect(r.remaining).toBe(0);
    expect(r.achieved).toBe(true);
  });

  it("0 — remaining=goal, achieved false (첫주 폴백)", async () => {
    countMock.mockResolvedValue(0);
    expect(await getWeeklyMissionGoal("u1", NOW)).toEqual({
      completed: 0,
      goal: 4,
      remaining: 4,
      achieved: false,
    });
  });

  it("현재 주차로 카운트 — getCurrentWeekNumber(now) → (year, week) 전달", async () => {
    countMock.mockResolvedValue(1);
    await getWeeklyMissionGoal("u1", NOW);
    expect(getWeekMock).toHaveBeenCalledWith(NOW);
    expect(countMock).toHaveBeenCalledWith("u1", 2026, 22);
  });

  it("DB 장애 → graceful {0, goal, goal, false}", async () => {
    countMock.mockRejectedValue(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getWeeklyMissionGoal("u1", NOW)).toEqual({
      completed: 0,
      goal: 4,
      remaining: 4,
      achieved: false,
    });
    errSpy.mockRestore();
  });
});

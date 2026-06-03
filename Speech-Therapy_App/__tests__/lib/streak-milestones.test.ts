// FR-C-STREAK-MILESTONE — nextStreakMilestone + 보너스 상수(amount.max(10) 준수) 검증.

import { describe, it, expect } from "vitest";
import {
  nextStreakMilestone,
  STREAK_MILESTONE_BONUS,
  STREAK_MILESTONES,
} from "@/lib/missions/streak-milestones";

describe("nextStreakMilestone", () => {
  it("0일 → 다음 3일 (3일 남음)", () => {
    expect(nextStreakMilestone(0)).toEqual({ milestone: 3, daysLeft: 3 });
  });
  it("2일 → 3일 (1일 남음)", () => {
    expect(nextStreakMilestone(2)).toEqual({ milestone: 3, daysLeft: 1 });
  });
  it("3일(방금 달성) → 다음 7일 (4일 남음)", () => {
    expect(nextStreakMilestone(3)).toEqual({ milestone: 7, daysLeft: 4 });
  });
  it("7일 → 14일 (7일 남음)", () => {
    expect(nextStreakMilestone(7)).toEqual({ milestone: 14, daysLeft: 7 });
  });
  it("29일 → 30일 (1일 남음)", () => {
    expect(nextStreakMilestone(29)).toEqual({ milestone: 30, daysLeft: 1 });
  });
  it("30일(최고 도달) → null", () => {
    expect(nextStreakMilestone(30)).toBeNull();
  });
  it("35일(초과) → null", () => {
    expect(nextStreakMilestone(35)).toBeNull();
  });
});

describe("STREAK_MILESTONE_BONUS", () => {
  it("각 마일스톤 보너스는 1~10 (RewardInputSchema amount.max(10) 준수)", () => {
    for (const m of STREAK_MILESTONES) {
      expect(STREAK_MILESTONE_BONUS[m]).toBeGreaterThan(0);
      expect(STREAK_MILESTONE_BONUS[m]).toBeLessThanOrEqual(10);
    }
  });
  it("escalating — 마일스톤이 클수록 보너스 큼", () => {
    const bonuses = STREAK_MILESTONES.map((m) => STREAK_MILESTONE_BONUS[m]);
    for (let i = 1; i < bonuses.length; i++) {
      expect(bonuses[i]).toBeGreaterThan(bonuses[i - 1]);
    }
  });
});

// MOCK-002 — reward mock 3종 단위 테스트.
// AC: Scenario 2 (멱등성 variant 분기) + Scenario 3 (Schema 일치).

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RewardOutputSchema } from "@/lib/schemas/reward";
import {
  mockFirstReward,
  mockAccumulated,
  mockSkipped,
  getRewardMock,
} from "@/lib/mocks/reward";

describe("Reward mock fixtures — Schema 일치 (AC Scenario 3)", () => {
  it("mockFirstReward → schema 통과 + cumulativeStars=1 + wasSkipped=false", () => {
    expect(() => RewardOutputSchema.parse(mockFirstReward)).not.toThrow();
    expect(mockFirstReward.cumulativeStars).toBe(1);
    expect(mockFirstReward.wasSkipped).toBe(false);
  });

  it("mockAccumulated → schema 통과 + cumulativeStars>=15 + 나무 성장 단계 ≥ 1", () => {
    expect(() => RewardOutputSchema.parse(mockAccumulated)).not.toThrow();
    expect(mockAccumulated.cumulativeStars).toBeGreaterThanOrEqual(15);
    expect(mockAccumulated.treeGrowthLevel).toBeGreaterThanOrEqual(1);
    expect(mockAccumulated.wasSkipped).toBe(false);
  });

  it("mockSkipped → schema 통과 + wasSkipped=true (멱등성 충돌 시뮬)", () => {
    expect(() => RewardOutputSchema.parse(mockSkipped)).not.toThrow();
    expect(mockSkipped.wasSkipped).toBe(true);
    // 멱등 충돌 시에도 누적값은 보존 (실 grantReward 와 동일 계약).
    expect(mockSkipped.cumulativeStars).toBe(mockAccumulated.cumulativeStars);
  });
});

describe("getRewardMock — searchParam 분기 (AC Scenario 2)", () => {
  const ORIGINAL_ENV = process.env.USE_MOCK_REWARD;

  beforeEach(() => {
    process.env.USE_MOCK_REWARD = "true";
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", "");
  });

  afterEach(() => {
    process.env.USE_MOCK_REWARD = ORIGINAL_ENV;
    vi.unstubAllEnvs();
  });

  function sp(value: string | null) {
    return { get: (key: string) => (key === "mock-reward" ? value : null) };
  }

  it("?mock-reward=first → mockFirstReward", () => {
    expect(getRewardMock(sp("first"))).toEqual(mockFirstReward);
  });

  it("?mock-reward=accumulated → mockAccumulated", () => {
    expect(getRewardMock(sp("accumulated"))).toEqual(mockAccumulated);
  });

  it("?mock-reward=skipped → mockSkipped (wasSkipped=true, 멱등 충돌 시뮬)", () => {
    const out = getRewardMock(sp("skipped"));
    expect(out).toEqual(mockSkipped);
    expect(out?.wasSkipped).toBe(true);
  });

  it("searchParam 없음 → fallback mockFirstReward", () => {
    expect(getRewardMock(sp(null))).toEqual(mockFirstReward);
  });

  it("USE_MOCK_REWARD=false → null", () => {
    process.env.USE_MOCK_REWARD = "false";
    expect(getRewardMock(sp("first"))).toBeNull();
  });

  it("USE_MOCK_REWARD 미설정 → null", () => {
    delete process.env.USE_MOCK_REWARD;
    expect(getRewardMock(sp("first"))).toBeNull();
  });
});

// MOCK-002 — curriculum mock 4종 단위 테스트.
// AC: Scenario 1 (searchParam 분기) + Scenario 3 (Schema 일치) + Scenario 4 (Production 보호 — utils.test 에서).

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CurriculumOutputSchema } from "@/lib/schemas/curriculum";
import {
  mockContinue,
  mockLevelDown,
  mockLevelUp,
  mockPhonemeSwitch,
  getCurriculumMock,
} from "@/lib/mocks/curriculum";

describe("Curriculum mock fixtures — Schema 일치 (AC Scenario 3)", () => {
  it("mockContinue → CurriculumOutputSchema 통과", () => {
    expect(() => CurriculumOutputSchema.parse(mockContinue)).not.toThrow();
    expect(mockContinue.reason).toBe("continue");
  });

  it("mockLevelDown → schema 통과 + reason=level_down + 실패 streak", () => {
    expect(() => CurriculumOutputSchema.parse(mockLevelDown)).not.toThrow();
    expect(mockLevelDown.reason).toBe("level_down");
    expect(mockLevelDown.streakInfo.failureCount).toBeGreaterThanOrEqual(3);
  });

  it("mockLevelUp → schema 통과 + reason=level_up + 성공 streak", () => {
    expect(() => CurriculumOutputSchema.parse(mockLevelUp)).not.toThrow();
    expect(mockLevelUp.reason).toBe("level_up");
    expect(mockLevelUp.streakInfo.successCount).toBeGreaterThanOrEqual(5);
  });

  it("mockPhonemeSwitch → schema 통과 + suggestedNextPhoneme 존재", () => {
    expect(() => CurriculumOutputSchema.parse(mockPhonemeSwitch)).not.toThrow();
    expect(mockPhonemeSwitch.reason).toBe("phoneme_switch");
    expect(mockPhonemeSwitch.suggestedNextPhoneme).toBeTruthy();
  });
});

describe("getCurriculumMock — searchParam 분기 (AC Scenario 1)", () => {
  const ORIGINAL_ENV = process.env.USE_MOCK_CURRICULUM;

  beforeEach(() => {
    process.env.USE_MOCK_CURRICULUM = "true";
    // Production 가드는 utils 가 NODE_ENV/VERCEL_ENV 만 보므로 명시적으로 false.
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", "");
  });

  afterEach(() => {
    process.env.USE_MOCK_CURRICULUM = ORIGINAL_ENV;
    vi.unstubAllEnvs();
  });

  function sp(value: string | null) {
    return { get: (key: string) => (key === "mock-curriculum" ? value : null) };
  }

  it("?mock-curriculum=continue → mockContinue", () => {
    expect(getCurriculumMock(sp("continue"))).toEqual(mockContinue);
  });

  it("?mock-curriculum=level-down → mockLevelDown", () => {
    expect(getCurriculumMock(sp("level-down"))).toEqual(mockLevelDown);
  });

  it("?mock-curriculum=level-up → mockLevelUp", () => {
    expect(getCurriculumMock(sp("level-up"))).toEqual(mockLevelUp);
  });

  it("?mock-curriculum=phoneme-switch → mockPhonemeSwitch", () => {
    expect(getCurriculumMock(sp("phoneme-switch"))).toEqual(mockPhonemeSwitch);
  });

  it("searchParam 없음 → fallback mockContinue", () => {
    expect(getCurriculumMock(sp(null))).toEqual(mockContinue);
  });

  it("알 수 없는 variant → fallback mockContinue", () => {
    expect(getCurriculumMock(sp("nonsense-key"))).toEqual(mockContinue);
  });

  it("USE_MOCK_CURRICULUM=false → null (mock 비활성)", () => {
    process.env.USE_MOCK_CURRICULUM = "false";
    expect(getCurriculumMock(sp("continue"))).toBeNull();
  });

  it("USE_MOCK_CURRICULUM 미설정 → null", () => {
    delete process.env.USE_MOCK_CURRICULUM;
    expect(getCurriculumMock(sp("continue"))).toBeNull();
  });
});

// 문해력 5단계 사다리 정본 모델 — 단조·비중첩·연속 분할 + 라우팅 결정성 검증 (CR-2026-009).
import { describe, it, expect } from "vitest";
import {
  LITERACY_STAGES,
  LITERACY_AGE_MIN_MONTHS,
  LITERACY_AGE_MAX_MONTHS,
  isLiteracyAgeEligible,
  stageForAgeMonths,
  getStageById,
  type LiteracyStageId,
} from "@/lib/literacy/stages";

describe("literacy stages — 도메인", () => {
  it("연령 도메인은 만 2~12세(24~144개월)", () => {
    expect(LITERACY_AGE_MIN_MONTHS).toBe(24);
    expect(LITERACY_AGE_MAX_MONTHS).toBe(144);
  });

  it("isLiteracyAgeEligible 은 경계 포함, 도메인 밖 거부", () => {
    expect(isLiteracyAgeEligible(24)).toBe(true);
    expect(isLiteracyAgeEligible(144)).toBe(true);
    expect(isLiteracyAgeEligible(23)).toBe(false);
    expect(isLiteracyAgeEligible(145)).toBe(false);
    expect(isLiteracyAgeEligible(Number.NaN)).toBe(false);
    expect(isLiteracyAgeEligible(Infinity)).toBe(false);
  });
});

describe("literacy stages — 밴드 구조 불변식", () => {
  it("정확히 5단계 S0~S4", () => {
    expect(LITERACY_STAGES.map((s) => s.id)).toEqual(["S0", "S1", "S2", "S3", "S4"]);
  });

  it("각 밴드는 min<=max", () => {
    for (const s of LITERACY_STAGES) {
      expect(s.ageMinMonths).toBeLessThanOrEqual(s.ageMaxMonths);
    }
  });

  it("밴드는 단조·비중첩·연속(24~144 전구간 덮음)", () => {
    expect(LITERACY_STAGES[0].ageMinMonths).toBe(LITERACY_AGE_MIN_MONTHS);
    expect(LITERACY_STAGES[LITERACY_STAGES.length - 1].ageMaxMonths).toBe(
      LITERACY_AGE_MAX_MONTHS,
    );
    for (let i = 1; i < LITERACY_STAGES.length; i++) {
      // 이전 밴드 상한 + 1 == 다음 밴드 하한 (틈/중첩 0).
      expect(LITERACY_STAGES[i].ageMinMonths).toBe(
        LITERACY_STAGES[i - 1].ageMaxMonths + 1,
      );
    }
  });

  it("임상 게이트: 모든 단계는 검증 전 연습-only(bandShippable=false)", () => {
    for (const s of LITERACY_STAGES) {
      expect(s.bandShippable).toBe(false);
    }
  });

  it("CON-04: 단계명/설명에 금칙어 0", () => {
    const banned = ["치료", "진단", "장애"];
    for (const s of LITERACY_STAGES) {
      for (const term of banned) {
        expect(s.title).not.toContain(term);
        expect(s.blurb).not.toContain(term);
      }
    }
  });
});

describe("literacy stages — 연령 라우팅", () => {
  it("대표 월령이 기대 단계로 매핑", () => {
    const cases: Array<[number, LiteracyStageId]> = [
      [24, "S0"],
      [48, "S0"],
      [60, "S1"],
      [83, "S1"],
      [84, "S2"],
      [107, "S2"],
      [108, "S3"],
      [131, "S3"],
      [132, "S4"],
      [144, "S4"],
    ];
    for (const [age, expected] of cases) {
      expect(stageForAgeMonths(age)?.id).toBe(expected);
    }
  });

  it("도메인 밖 월령은 null", () => {
    expect(stageForAgeMonths(23)).toBeNull();
    expect(stageForAgeMonths(145)).toBeNull();
    expect(stageForAgeMonths(Number.NaN)).toBeNull();
  });

  it("도메인 내 모든 월령은 정확히 한 단계로 매핑(전수)", () => {
    for (let m = LITERACY_AGE_MIN_MONTHS; m <= LITERACY_AGE_MAX_MONTHS; m++) {
      const matches = LITERACY_STAGES.filter(
        (s) => m >= s.ageMinMonths && m <= s.ageMaxMonths,
      );
      expect(matches).toHaveLength(1);
      expect(stageForAgeMonths(m)?.id).toBe(matches[0].id);
    }
  });

  it("getStageById 왕복", () => {
    for (const s of LITERACY_STAGES) {
      expect(getStageById(s.id)?.id).toBe(s.id);
    }
  });
});

// CL-01~04 임상 정밀도 단위 테스트 — 인코딩된 임상 규칙/데이터 무결성 검증.
// wiring: CL-03 활성(결과 페이지 밴드), CL-02 활성(display-only 밴드 완화 — applyDevelopmentalAdjustment),
//         CL-01/04 C단계 대기. 본 테스트는 wiring 과 무관하게 규칙이 정확히 인코딩됐는지 확인.

import { describe, it, expect } from "vitest";
import {
  CLINICAL_CUTOFFS,
  mapArticulationBand,
  mapStandardScoreBand,
  mapRevtBand,
  PHONEME_DEVELOPMENT,
  DEVELOPMENTAL_ERROR_PATTERNS,
  isDevelopmentalForAge,
  classifyError,
  applyDevelopmentalAdjustment,
  NORMAL_VARIATION_RULES,
  VARIATION_TYPES,
  singleVariationOrder,
  getVariationType,
} from "@/lib/diagnose/clinical";

describe("CL-03 절단점 매핑", () => {
  it("articulation PCC: ≥80 normal / 65–80 watch / <65 delayed", () => {
    expect(mapArticulationBand(82)).toBe("normal");
    expect(mapArticulationBand(80)).toBe("normal");
    expect(mapArticulationBand(72)).toBe("watch");
    expect(mapArticulationBand(65)).toBe("watch");
    expect(mapArticulationBand(60)).toBe("delayed");
  });

  it("PRES 표준점수: -1.25↑ normal / -2↑ watch / 그 미만 delayed", () => {
    const { normalSd, severeSd } = CLINICAL_CUTOFFS.pres;
    expect(mapStandardScoreBand(-1.0, normalSd, severeSd)).toBe("normal");
    expect(mapStandardScoreBand(-1.5, normalSd, severeSd)).toBe("watch");
    expect(mapStandardScoreBand(-2.5, normalSd, severeSd)).toBe("delayed");
  });

  it("REVT 등가연령 6개월+ 지체 → delayed", () => {
    expect(mapRevtBand(24, 30)).toBe("delayed"); // 6개월 지체
    expect(mapRevtBand(24, 29)).toBe("normal"); // 5개월
  });
});

describe("CL-02 발달 위계 연령 보정", () => {
  it("음소별 완성 연령 (ㄱ 5세 / ㅅ·ㄹ 6세 / ㄴ 자세)", () => {
    expect(PHONEME_DEVELOPMENT["ㄱ"].completionMonths).toBe(60);
    expect(PHONEME_DEVELOPMENT["ㅅ"].completionMonths).toBe(72);
    expect(PHONEME_DEVELOPMENT["ㄹ"].completionMonths).toBe(72);
    expect(PHONEME_DEVELOPMENT["ㄴ"].completionMonths).toBe(36);
  });

  it("isDevelopmentalForAge: 완성 연령 이하면 발달적", () => {
    expect(isDevelopmentalForAge("ㅅ", 60)).toBe(true); // ≤72
    expect(isDevelopmentalForAge("ㄱ", 48)).toBe(true); // ≤60
    expect(isDevelopmentalForAge("ㄴ", 48)).toBe(false); // >36
    expect(isDevelopmentalForAge("ㅎ", 36)).toBe(false); // 미지원 음소
  });

  it("classifyError: 소실 시기 기준 + 유음 최장 + 비발달적 atypical", () => {
    expect(classifyError("fricative_stopping", 48)).toBe("developmental"); // ≤72
    expect(classifyError("fricative_stopping", 84)).toBe("developmental_delayed"); // >72
    expect(classifyError("liquid_gliding", 84)).toBe("developmental"); // 최장(null)
    expect(classifyError("labialization", 36)).toBe("atypical"); // 비발달적
  });

  it("classifyError: liquid_deletion 런타임 throw 버그 회귀 가드 (전 키 no-throw)", () => {
    // liquid_deletion 이 DEVELOPMENTAL_ERROR_PATTERNS 누락 → classifyError throw 였던 라이브 버그.
    expect(() => classifyError("liquid_deletion", 48)).not.toThrow();
    expect(classifyError("liquid_deletion", 84)).toBe("developmental"); // 유음 최장(null) 잠정
    // taxonomy 단일화 — 전 ErrorPattern 키가 throw 없이 유효 분류 반환.
    for (const key of Object.keys(DEVELOPMENTAL_ERROR_PATTERNS) as Array<
      keyof typeof DEVELOPMENTAL_ERROR_PATTERNS
    >) {
      expect(["developmental", "developmental_delayed", "atypical"]).toContain(
        classifyError(key, 48),
      );
    }
  });

  it("applyDevelopmentalAdjustment: 발달 기대 연령 내 오류 감점 약화 (credit 0.5)", () => {
    // ㅅ(완성 72) 48개월 → raw 40 → 40 + (100-40)*0.5 = 70.
    expect(applyDevelopmentalAdjustment(40, "ㅅ", 48)).toBe(70);
    // ㄴ(완성 36) 48개월 → 보정 없음(완성 기대 연령 이후).
    expect(applyDevelopmentalAdjustment(40, "ㄴ", 48)).toBe(40);
    // 완벽 점수는 불변.
    expect(applyDevelopmentalAdjustment(100, "ㅅ", 48)).toBe(100);
    // 미지원 음소 → 보정 없음.
    expect(applyDevelopmentalAdjustment(40, "ㅎ", 48)).toBe(40);
  });
});

describe("CL-01/CL-04 음운 변동", () => {
  it("CL-01 정상 변동 규칙에 비음화(국+물→궁물) 포함", () => {
    const names = NORMAL_VARIATION_RULES.map((r) => r.name);
    expect(names).toContain("비음화");
    const nasal = NORMAL_VARIATION_RULES.find((r) => r.name === "비음화");
    expect(nasal?.example).toContain("궁물");
  });

  it("CL-04 단일 변동 우선순위 — 유음 활음화 최우선(§O)", () => {
    expect(singleVariationOrder()[0].key).toBe("liquid_gliding");
    expect(getVariationType("liquid_gliding")?.priority).toBe(1);
  });

  it("CL-04 변동 우선순위는 유일 (중복 없음)", () => {
    const priorities = VARIATION_TYPES.map((v) => v.priority);
    expect(new Set(priorities).size).toBe(priorities.length);
  });

  it("taxonomy 9키 단일화 — VARIATION_TYPES 키 ⊆ DEVELOPMENTAL_ERROR_PATTERNS 정책표", () => {
    const policyKeys = new Set(Object.keys(DEVELOPMENTAL_ERROR_PATTERNS));
    for (const v of VARIATION_TYPES) {
      expect(policyKeys.has(v.key), `${v.key} 정책표 누락`).toBe(true);
    }
    expect(VARIATION_TYPES).toHaveLength(9);
    // atypical(비발달적) 2종은 isNormal=false.
    const atypical = VARIATION_TYPES.filter((v) => !v.isNormal)
      .map((v) => v.key)
      .sort();
    expect(atypical).toEqual(["labialization", "regressive_assimilation"]);
  });
});

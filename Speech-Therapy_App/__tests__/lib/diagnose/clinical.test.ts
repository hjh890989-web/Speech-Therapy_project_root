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
  detectVariation,
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

describe("CL-04 detectVariation — 슬롯 정렬 단일 변동 탐지", () => {
  it("liquid_gliding — 호랑이→호양이 (ㄹ소실+활음화를 단일 1건 흡수)", () => {
    expect(detectVariation("호랑이", "호양이")).toEqual({
      pattern: "liquid_gliding",
      syllableIndex: 1,
      slot: "cho",
      intendedJamo: "ㄹ",
    });
  });

  it("liquid_deletion — 호랑이→호앙이 (활음 첨가 없음 → gliding 과 구분)", () => {
    expect(detectVariation("호랑이", "호앙이")?.pattern).toBe("liquid_deletion");
    expect(detectVariation("다리", "다이")?.pattern).toBe("liquid_deletion");
  });

  it("liquid_nasalization — 라면→나면 (ㄹ→ㄴ)", () => {
    expect(detectVariation("라면", "나면")?.pattern).toBe("liquid_nasalization");
  });

  it("velar_fronting — 토끼→토띠 (ㄲ→ㄸ, 양방향)", () => {
    const r = detectVariation("토끼", "토띠");
    expect(r?.pattern).toBe("velar_fronting");
    expect(r?.intendedJamo).toBe("ㄲ");
  });

  it("fricative_stopping — 사자→타자 (ㅅ→ㅌ), affricate_stopping — 자동차→다동차 (ㅈ→ㄷ)", () => {
    expect(detectVariation("사자", "타자")?.pattern).toBe("fricative_stopping");
    expect(detectVariation("자동차", "다동차")?.pattern).toBe("affricate_stopping");
  });

  it("final_consonant_deletion — 가방→가바 (종성 ㅇ 탈락, slot=jong)", () => {
    const r = detectVariation("가방", "가바");
    expect(r?.pattern).toBe("final_consonant_deletion");
    expect(r?.slot).toBe("jong");
  });

  it("양방향 검증 — ㄱ→ㅎ(가→하)는 velar_fronting 아님 → null (적대적 비평 high #1)", () => {
    // 의도만 보면 ㄱ(velar)이지만 실현 ㅎ 은 치조 파열음 아님 → 무관 오류, 완화 부여 금지.
    expect(detectVariation("가", "하")).toBeNull();
  });

  it("보수적 null — 다중 음절 변동 / 완전 일치 / 음절수 불일치 / 비한글", () => {
    expect(detectVariation("사과", "타파")).toBeNull(); // ㅅ→ㅌ + ㄱ→ㅍ (2음절 변동)
    expect(detectVariation("사과", "사과")).toBeNull(); // 일치
    expect(detectVariation("사과", "사")).toBeNull(); // 음절수 불일치
    expect(detectVariation("apple", "사과")).toBeNull(); // 비한글
  });

  it("순수 결정성 — 동일 입력 동일 결과", () => {
    expect(detectVariation("호랑이", "호양이")).toEqual(detectVariation("호랑이", "호양이"));
  });
});

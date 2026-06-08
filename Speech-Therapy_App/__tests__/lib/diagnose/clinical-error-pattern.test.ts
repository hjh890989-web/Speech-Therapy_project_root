// FR-C-LIT-02 (CR-2026-007) — F4 음운변동 제품화 단위 테스트.
// analyzeErrorPattern: 탐지된 단일 변동(detectVariation) → 부모용 음소 핀셋 분석 합성.
// display-only — 점수/HITL/저장 무관. 본 테스트는 합성 정확성 + ADR-04 금칙어 0 + 결정성 검증.

import { describe, it, expect } from "vitest";
import { analyzeErrorPattern } from "@/lib/diagnose/clinical";

describe("FR-C-LIT-02 analyzeErrorPattern — 음소 핀셋 분석 합성", () => {
  it("탐지 변동을 부모용 분석으로 합성 (사자→타자 = 마찰음 파열음화)", () => {
    const a = analyzeErrorPattern("사자", "타자", "ㅅ", 48);
    expect(a).not.toBeNull();
    expect(a?.pattern).toBe("fricative_stopping");
    expect(a?.label).toBe("마찰음 파열음화");
    expect(a?.classification).toBe("developmental"); // 48 ≤ 72(ㅅ 소실)
    expect(a?.onTargetSlot).toBe(true); // 초성 ㅅ 슬롯 변동 = 타깃
    expect(a?.parentNote.length).toBeGreaterThan(0);
  });

  it("연령 분기 — 마찰음 84개월(>72) → developmental_delayed", () => {
    expect(analyzeErrorPattern("사자", "타자", "ㅅ", 84)?.classification).toBe(
      "developmental_delayed",
    );
  });

  it("유음 활음화 — 최장(null) 소실 → 84개월도 developmental (호랑이→호양이)", () => {
    const a = analyzeErrorPattern("호랑이", "호양이", "ㄹ", 84);
    expect(a?.pattern).toBe("liquid_gliding");
    expect(a?.classification).toBe("developmental");
    expect(a?.onTargetSlot).toBe(true); // 초성 ㄹ
  });

  it("비-타깃 음소 변동 → onTargetSlot=false (자동차→다동차 = 파찰음, 타깃 ㅅ)", () => {
    expect(analyzeErrorPattern("자동차", "다동차", "ㅅ", 48)?.onTargetSlot).toBe(false);
    expect(analyzeErrorPattern("자동차", "다동차", "ㅈ", 48)?.onTargetSlot).toBe(true);
  });

  it("종성 변동 → onTargetSlot undefined (가방→가바)", () => {
    const a = analyzeErrorPattern("가방", "가바", "ㄱ", 48);
    expect(a?.pattern).toBe("final_consonant_deletion");
    expect(a?.onTargetSlot).toBeUndefined();
  });

  it("변동 미탐지 → null (완전 일치 / 복합 변동 / 비한글)", () => {
    expect(analyzeErrorPattern("사과", "사과", "ㅅ", 48)).toBeNull(); // 일치
    expect(analyzeErrorPattern("사과", "타파", "ㅅ", 48)).toBeNull(); // 2음절 변동
    expect(analyzeErrorPattern("apple", "사과", "ㅅ", 48)).toBeNull(); // 비한글
  });

  it("ADR-04 금칙어 0건 — label/example/parentNote 전 분기", () => {
    const banned = ["치료", "진단", "장애", "지연", "지체"];
    const cases: Array<[string, string, string, number]> = [
      ["사자", "타자", "ㅅ", 48], // developmental
      ["사자", "타자", "ㅅ", 84], // developmental_delayed
      ["호랑이", "호양이", "ㄹ", 84], // 유음 최장
      ["토끼", "토띠", "ㄱ", 30], // velar_fronting
      ["가방", "가바", "ㄱ", 30], // 종성 탈락
    ];
    for (const [i, h, p, age] of cases) {
      const a = analyzeErrorPattern(i, h, p, age);
      if (!a) continue;
      const text = `${a.label} ${a.example} ${a.parentNote}`;
      for (const w of banned) {
        expect(text, `금칙어 "${w}" 노출 (${i}→${h})`).not.toContain(w);
      }
    }
  });

  it("결정성 — 동일 입력 동일 결과", () => {
    expect(analyzeErrorPattern("사자", "타자", "ㅅ", 48)).toEqual(
      analyzeErrorPattern("사자", "타자", "ㅅ", 48),
    );
  });
});

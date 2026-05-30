// CL-03 활성화 — articulationInterpretation (임상 밴드 → ADR-04 치환 카피) 단위 테스트.

import { describe, it, expect } from "vitest";
import { articulationInterpretation } from "@/app/(public)/diagnose/result/[sessionId]/clinical-interpretation";

const FORBIDDEN = ["치료", "진단", "장애", "환자", "처방", "지연", "지체"];

describe("articulationInterpretation — CL-03 임상 밴드 해석", () => {
  it("PCC ≥80 → normal 밴드 + '또래와 비슷' 카피", () => {
    const r = articulationInterpretation(85);
    expect(r.band).toBe("normal");
    expect(r.label).toMatch(/또래와 비슷/);
  });

  it("PCC 65~79 → watch 밴드", () => {
    expect(articulationInterpretation(72).band).toBe("watch");
    expect(articulationInterpretation(65).band).toBe("watch");
  });

  it("PCC <65 → delayed 밴드", () => {
    expect(articulationInterpretation(60).band).toBe("delayed");
  });

  it("ADR-04/CON-04 — 모든 밴드 카피 금칙어 0건", () => {
    for (const score of [95, 85, 72, 65, 60, 30]) {
      const { label } = articulationInterpretation(score);
      for (const w of FORBIDDEN) {
        expect(label, `score ${score} 카피에 금칙어 "${w}"`).not.toContain(w);
      }
    }
  });
});

describe("articulationInterpretation — CL-02 발달 위계 밴드 완화 (display-only)", () => {
  it("ctx 없으면 raw 점수 기준 밴드 (완화 미적용)", () => {
    // 채점/escalation 은 raw — ctx 미제공 시 발달 완화 없음.
    expect(articulationInterpretation(40).band).toBe("delayed");
  });

  it("발달 기대 연령 음소의 낮은 점수 → 밴드 완화 (delayed → watch)", () => {
    // ㅅ(완성 72mo), 48mo, raw 40 → 보정 70(=40+(100-40)*0.5) → watch. 숫자(raw 40)는 ScoreCard 가 유지.
    expect(articulationInterpretation(40, { phoneme: "ㅅ", ageMonths: 48 }).band).toBe("watch");
  });

  it("완성 연령 이후 음소는 완화 없음 (raw 밴드 유지)", () => {
    // ㄴ(완성 36mo), 48mo → 발달적 아님 → 보정 없음 → raw 40 = delayed.
    expect(articulationInterpretation(40, { phoneme: "ㄴ", ageMonths: 48 }).band).toBe("delayed");
  });

  it("미지원 음소는 완화 없음", () => {
    expect(articulationInterpretation(40, { phoneme: "ㅎ", ageMonths: 48 }).band).toBe("delayed");
  });

  it("완벽 점수는 ctx 유무와 무관하게 normal", () => {
    expect(articulationInterpretation(100, { phoneme: "ㅅ", ageMonths: 48 }).band).toBe("normal");
  });
});

describe("articulationInterpretation — CL-04 게이팅 (atypical skip + 음소 scoping)", () => {
  const BASE = { phoneme: "ㅅ", ageMonths: 48 }; // ㅅ 완성 72 → 발달적, raw 40 → 완화 시 watch

  it("errorClassification 미제공(기존 호출) → 완화 보존 (회귀 가드)", () => {
    // 잔여 게이트는 *제공된 경우에만* 작동 — 기존 2-인자 호출 동작 불변.
    expect(articulationInterpretation(40, BASE).band).toBe("watch");
  });

  it("errorClassification='developmental' + onTargetSlot=true → 완화 적용 (watch)", () => {
    expect(
      articulationInterpretation(40, { ...BASE, errorClassification: "developmental", onTargetSlot: true })
        .band,
    ).toBe("watch");
  });

  it("errorClassification='atypical' → 완화 skip (raw delayed)", () => {
    // 비발달적 오류는 발달 완화 미부여 — 과escalation 아닌 과완화 차단.
    expect(
      articulationInterpretation(40, { ...BASE, errorClassification: "atypical", onTargetSlot: true })
        .band,
    ).toBe("delayed");
  });

  it("onTargetSlot=false → 완화 skip (raw delayed)", () => {
    // 변동이 targetPhoneme 과 무관한 슬롯 → 발달 완화 미부여.
    expect(
      articulationInterpretation(40, { ...BASE, errorClassification: "developmental", onTargetSlot: false })
        .band,
    ).toBe("delayed");
  });

  it("developmental_delayed(소실 시기 초과)도 완화 적용 (atypical 만 skip)", () => {
    expect(
      articulationInterpretation(40, {
        ...BASE,
        errorClassification: "developmental_delayed",
        onTargetSlot: true,
      }).band,
    ).toBe("watch");
  });
});

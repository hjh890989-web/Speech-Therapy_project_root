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

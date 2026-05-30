// CL-03 활성화 — articulationInterpretation (임상 밴드 → ADR-04 치환 카피) 단위 테스트.

import { describe, it, expect } from "vitest";
import {
  articulationInterpretation,
  buildDevelopmentalContext,
} from "@/app/(public)/diagnose/result/[sessionId]/clinical-interpretation";

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

describe("buildDevelopmentalContext — CL-04 통합 (변동 탐지→게이팅, 적대적 검증 회귀 가드)", () => {
  // 게이트가 '탐지 시 더 가혹'해지지 않음을 풀패스로 고정 (탐지 밴드 == 음소-only 폴백 밴드).
  it("high#1 — 경음 onset(토끼→토띠, target ㄱ)도 onTargetSlot=true → watch (탐지가 역전 안 함)", () => {
    const ctx = buildDevelopmentalContext({ phoneme: "ㄱ", ageMonths: 48 }, "토끼", "토띠");
    expect(ctx.onTargetSlot).toBe(true); // 평음 대표 ㄱ === target ㄱ
    expect(ctx.errorClassification).toBe("developmental");
    expect(articulationInterpretation(40, ctx).band).toBe("watch");
    // 음소-only 폴백과 동일 밴드(역전 없음).
    expect(articulationInterpretation(40, { phoneme: "ㄱ", ageMonths: 48 }).band).toBe("watch");
  });

  it("medium#2 — 종성탈락(로봇→로보, target ㄹ, 30mo)은 onTargetSlot 미설정 → 발달 완화 유지 (watch)", () => {
    const ctx = buildDevelopmentalContext({ phoneme: "ㄹ", ageMonths: 30 }, "로봇", "로보");
    expect(ctx.onTargetSlot).toBeUndefined(); // 종성 변동 → 초성 target 비교 생략
    expect(ctx.errorClassification).toBe("developmental"); // 종성탈락 ≤36mo 발달적
    expect(articulationInterpretation(40, ctx).band).toBe("watch");
  });

  it("비-타깃 초성 변동(사자→타자, target ㄱ)은 onTargetSlot=false → 완화 skip (delayed)", () => {
    const ctx = buildDevelopmentalContext({ phoneme: "ㄱ", ageMonths: 48 }, "사자", "타자");
    expect(ctx.onTargetSlot).toBe(false); // 변동은 ㅅ(fricative), target ㄱ 무관
    expect(articulationInterpretation(40, ctx).band).toBe("delayed");
  });

  it("변동 미탐지(사과→사과)는 base ctx 그대로 → 기존 phoneme×age 완화 폴백", () => {
    const base = { phoneme: "ㅅ", ageMonths: 48 };
    expect(buildDevelopmentalContext(base, "사과", "사과")).toEqual(base);
    expect(articulationInterpretation(40, buildDevelopmentalContext(base, "사과", "사과")).band).toBe(
      "watch",
    );
  });
});

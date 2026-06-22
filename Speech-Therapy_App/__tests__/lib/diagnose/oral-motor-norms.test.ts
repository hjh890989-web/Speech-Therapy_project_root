// 구강 운동 연령 규준(SMST-C/S063 원문 대조) 참고 밴드 단위 테스트.
// **display 참고 밴드 전용** — z<-1 'below', z<-2 'low', 그 외 'typical'. 카피 금칙어 0.

import { describe, it, expect } from "vitest";
import { interpretMpt, interpretDdk } from "@/lib/diagnose/oral-motor-norms";

const BANNED = ["치료", "진단", "장애", "지연", "지체", "정상", "위험"];

describe("interpretDdk — AMR /퍼/ (만 7세=84개월, S063 평균 4.51·SD 0.60)", () => {
  it("평균 근처 → typical", () => {
    expect(interpretDdk(4.51, 84, "ddk-pa")?.band).toBe("typical");
    expect(interpretDdk(6.0, 84, "ddk-pa")?.band).toBe("typical"); // 빠를수록 typical
  });
  it("z≈-1.5 → below", () => {
    // (3.6-4.51)/0.60 ≈ -1.52
    expect(interpretDdk(3.6, 84, "ddk-pa")?.band).toBe("below");
  });
  it("z≈-2.5 → low", () => {
    // (3.0-4.51)/0.60 ≈ -2.52
    expect(interpretDdk(3.0, 84, "ddk-pa")?.band).toBe("low");
  });
  it("또래 평균 mean 노출 (참고 표시용)", () => {
    expect(interpretDdk(4.51, 84, "ddk-pa")?.mean).toBe(4.51);
  });
});

describe("interpretDdk — 과제 매핑", () => {
  it("ddk-ta → /터/ 규준, ddk-pataka → /퍼터커/ 규준 사용", () => {
    // 만 7세 /터/ 평균 4.76, /퍼터커/ 평균 1.51 — mean 으로 매핑 확인.
    expect(interpretDdk(4.76, 84, "ddk-ta")?.mean).toBe(4.76);
    expect(interpretDdk(1.51, 84, "ddk-pataka")?.mean).toBe(1.51);
  });
  it("미지원 taskId → null", () => {
    expect(interpretDdk(4.5, 84, "ddk-unknown")).toBeNull();
  });
});

describe("interpretMpt — MPT (만 5세=60개월, S063 평균 10.78)", () => {
  it("평균 근처 → typical + mean 노출", () => {
    const r = interpretMpt(10.78, 60);
    expect(r?.band).toBe("typical");
    expect(r?.mean).toBe(10.78);
  });
  it("만 3세(36개월) 평균 7.30 매핑", () => {
    expect(interpretMpt(7.3, 36)?.mean).toBe(7.3);
  });
});

describe("연령 clamp + 입력 가드", () => {
  it("36개월 미만/84개월 초과는 3세/7세 규준으로 clamp", () => {
    expect(interpretDdk(4, 12, "ddk-pa")?.mean).toBe(3.58); // <36 → 3세
    expect(interpretDdk(5, 120, "ddk-pa")?.mean).toBe(4.51); // >84 → 7세
  });
  it("비정상 입력 → null", () => {
    expect(interpretMpt(Number.NaN, 60)).toBeNull();
    expect(interpretMpt(10, Number.NaN)).toBeNull();
    expect(interpretDdk(Number.NaN, 60, "ddk-pa")).toBeNull();
  });
});

describe("ADR-04 — 밴드 카피 금칙어 0", () => {
  it("typical/below/low 카피에 의료·판정 금칙어 없음", () => {
    const labels = [
      interpretDdk(4.51, 84, "ddk-pa")!.label, // typical
      interpretDdk(3.6, 84, "ddk-pa")!.label, // below
      interpretDdk(3.0, 84, "ddk-pa")!.label, // low
    ];
    for (const label of labels) {
      for (const w of BANNED) expect(label, `금칙어 "${w}"`).not.toContain(w);
    }
  });
});

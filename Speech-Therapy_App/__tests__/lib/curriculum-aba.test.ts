// REQ-FUNC-CL-06 — ABA 6변수 프로파일 + 정확도 분류 테스트.

import { describe, it, expect } from "vitest";
import {
  getAbaProfile,
  classifyAccuracy,
  ABA_THRESHOLDS,
} from "@/lib/curriculum-aba";

describe("curriculum-aba: ABA 6변수 프로파일 (REQ-FUNC-CL-06)", () => {
  it("1~6 레벨 모두 6변수 채운 프로파일 반환", () => {
    for (let level = 1; level <= 6; level += 1) {
      const p = getAbaProfile(level);
      expect(p, `level ${level} 프로파일 누락`).toBeDefined();
      if (!p) throw new Error("guard");
      expect(p.level).toBe(level);
      expect(p.stimulusForm.length).toBeGreaterThan(0);
      expect(p.stimulusUnit.length).toBeGreaterThan(0);
      expect(p.similarity.length).toBeGreaterThan(0);
      expect(p.context.length).toBeGreaterThan(0);
      expect(p.task.length).toBeGreaterThan(0);
      expect(p.snr.length).toBeGreaterThan(0);
    }
  });

  it("자극 단위가 6단계 위계와 정합", () => {
    expect(getAbaProfile(1)?.stimulusUnit).toBe("단독 음소");
    expect(getAbaProfile(3)?.stimulusUnit).toBe("단어");
    expect(getAbaProfile(6)?.stimulusUnit).toBe("대화");
  });

  it("범위 밖 레벨 → undefined", () => {
    expect(getAbaProfile(0)).toBeUndefined();
    expect(getAbaProfile(7)).toBeUndefined();
  });
});

describe("curriculum-aba: classifyAccuracy 임계 (80 / 50)", () => {
  it("≥ 80 → advance", () => {
    expect(classifyAccuracy(80)).toBe("advance");
    expect(classifyAccuracy(95)).toBe("advance");
    expect(classifyAccuracy(100)).toBe("advance");
  });

  it("50 ~ 79 → maintain", () => {
    expect(classifyAccuracy(79)).toBe("maintain");
    expect(classifyAccuracy(50)).toBe("maintain");
    expect(classifyAccuracy(65)).toBe("maintain");
  });

  it("< 50 → reduce", () => {
    expect(classifyAccuracy(49)).toBe("reduce");
    expect(classifyAccuracy(0)).toBe("reduce");
  });

  it("임계 상수 노출", () => {
    expect(ABA_THRESHOLDS.ADVANCE_PCT).toBe(80);
    expect(ABA_THRESHOLDS.REDUCE_PCT).toBe(50);
  });
});

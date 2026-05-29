// REQ-FUNC-CL-07 — 부모 코칭 4대 기법 데이터 무결성 테스트.

import { describe, it, expect } from "vitest";
import {
  COACHING_TECHNIQUES,
  getCoachingTips,
  type CoachingTip,
} from "@/lib/mocks/coaching-tips";

const FORBIDDEN_WORDS = ["치료", "진단", "장애", "환자", "병원", "증상"];
const TECHNIQUE_NAMES = ["평행 발화", "확장", "기다리기", "반응적 상호작용"];

function collect(tip: CoachingTip): string {
  return `${tip.technique} ${tip.guide} ${tip.example}`;
}

describe("coaching-tips: 4대 핵심기법 (REQ-FUNC-CL-07)", () => {
  it("4대 기법 모두 정의 + 가이드/예시 비어있지 않음", () => {
    expect(COACHING_TECHNIQUES).toHaveLength(4);
    const names = COACHING_TECHNIQUES.map((t) => t.technique);
    for (const n of TECHNIQUE_NAMES) expect(names).toContain(n);
    for (const t of COACHING_TECHNIQUES) {
      expect(t.guide.length).toBeGreaterThan(0);
      expect(t.example.length).toBeGreaterThan(0);
    }
  });

  it("getCoachingTips: 레벨별 2~3 기법 + 기다리기 전 레벨 공통", () => {
    for (let level = 1; level <= 6; level += 1) {
      const tips = getCoachingTips(level);
      expect(tips.length).toBeGreaterThanOrEqual(2);
      expect(tips.length).toBeLessThanOrEqual(3);
      expect(tips.map((t) => t.technique)).toContain("기다리기");
    }
  });

  it("getCoachingTips: 레벨대별 매핑 (1~2 / 3~4 / 5~6)", () => {
    expect(getCoachingTips(1).map((t) => t.technique)).toEqual([
      "기다리기",
      "반응적 상호작용",
    ]);
    expect(getCoachingTips(3).map((t) => t.technique)).toEqual([
      "기다리기",
      "평행 발화",
      "확장",
    ]);
    expect(getCoachingTips(6).map((t) => t.technique)).toEqual([
      "기다리기",
      "확장",
      "반응적 상호작용",
    ]);
  });

  it("CON-04 금칙어 0건 (4대 기법 전수)", () => {
    for (const t of COACHING_TECHNIQUES) {
      const text = collect(t);
      for (const w of FORBIDDEN_WORDS) {
        expect(text, `forbidden "${w}" in ${t.technique}`).not.toContain(w);
      }
    }
  });
});

// FR-C-LIT-01 / MOCK-LIT-04 / API-LIT-01 (CR-2026-007 / CL-11) — 추론 4수준 단위 테스트.
// 시나리오 무결성(4수준 위계) + F15 프롬프트 빌더 + 원본성/금칙어 + 연령/플래그.

import { describe, it, expect, afterEach } from "vitest";
import {
  INFERENCE_SCENARIOS,
  INFERENCE_LEVELS,
  INFERENCE_LEVEL_LABEL,
  pickInferenceScenario,
} from "@/lib/literacy/inference-content";
import {
  buildInferencePrompt,
  isInferenceAgeEligible,
  isInferenceEnabled,
} from "@/lib/literacy/inference";

const BANNED = [
  "NISE", "기초학습", "학습장애", "난독", "B·ACT", "BACT",
  "치료", "진단", "장애", "지연", "지체",
];

describe("MOCK-LIT-04 — 추론 시나리오 무결성", () => {
  it("위계 순서 = 사실→추론→비판→평가", () => {
    expect(INFERENCE_LEVELS).toEqual(["fact", "inference", "critique", "evaluation"]);
  });

  it("시나리오 ≥3, id 유일, 각 4수준 질문(순서대로)", () => {
    expect(INFERENCE_SCENARIOS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(INFERENCE_SCENARIOS.map((s) => s.id)).size).toBe(INFERENCE_SCENARIOS.length);
    for (const s of INFERENCE_SCENARIOS) {
      expect(s.situation.length).toBeGreaterThan(0);
      expect(s.questions.map((q) => q.level)).toEqual([
        "fact",
        "inference",
        "critique",
        "evaluation",
      ]);
      for (const q of s.questions) expect(q.prompt.length).toBeGreaterThan(0);
    }
  });

  it("pickInferenceScenario 결정적 + 범위 clamp", () => {
    expect(pickInferenceScenario(0)).toEqual(pickInferenceScenario(0));
    expect(pickInferenceScenario(0)).toBe(INFERENCE_SCENARIOS[0]);
    expect(pickInferenceScenario(999)).toBe(INFERENCE_SCENARIOS[INFERENCE_SCENARIOS.length - 1]);
    expect(pickInferenceScenario(-5)).toBe(INFERENCE_SCENARIOS[0]);
  });
});

describe("API-LIT-01 — buildInferencePrompt (F15 LLM 프롬프트)", () => {
  it("상황 + 4 질문 모두 포함 + 유도(채점 금지) 명시", () => {
    const s = INFERENCE_SCENARIOS[0];
    const prompt = buildInferencePrompt(s);
    expect(prompt).toContain(s.situation);
    for (const q of s.questions) expect(prompt).toContain(q.prompt);
    expect(prompt).toContain("유도");
    expect(prompt).toMatch(/순서/);
  });

  it("금칙어 0건 (모든 시나리오 프롬프트)", () => {
    for (const s of INFERENCE_SCENARIOS) {
      const prompt = buildInferencePrompt(s);
      for (const w of BANNED) expect(prompt, `금칙어 "${w}"`).not.toContain(w);
    }
  });
});

describe("원본성·금칙어 lint (콘텐츠)", () => {
  it("시나리오·질문·라벨에 표준화 검사/난독 + 의료 금칙어 0건", () => {
    const corpus = [
      ...INFERENCE_SCENARIOS.flatMap((s) => [s.situation, ...s.questions.map((q) => q.prompt)]),
      ...Object.values(INFERENCE_LEVEL_LABEL),
    ].join(" ");
    for (const w of BANNED) expect(corpus).not.toContain(w);
  });
});

describe("연령 게이트 / 플래그", () => {
  it("연령 — 만 5-7세(60~84) 적격", () => {
    expect(isInferenceAgeEligible(60)).toBe(true);
    expect(isInferenceAgeEligible(84)).toBe(true);
    expect(isInferenceAgeEligible(48)).toBe(false);
    expect(isInferenceAgeEligible(Number.NaN)).toBe(false);
  });

  const original = process.env.LITERACY_INFERENCE_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.LITERACY_INFERENCE_ENABLED;
    else process.env.LITERACY_INFERENCE_ENABLED = original;
  });

  it("플래그 — 미설정 off, 'true' on", () => {
    delete process.env.LITERACY_INFERENCE_ENABLED;
    expect(isInferenceEnabled()).toBe(false);
    process.env.LITERACY_INFERENCE_ENABLED = "true";
    expect(isInferenceEnabled()).toBe(true);
  });
});

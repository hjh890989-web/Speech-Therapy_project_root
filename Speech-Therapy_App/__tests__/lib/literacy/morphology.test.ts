// 형태소 인식 미니게임 — 콘텐츠 무결성 + 채점 + 연령게이트 + 세션 (CR-2026-009 Phase 3b S4).
import { describe, it, expect, afterEach } from "vitest";
import {
  MORPH_ITEMS,
  MORPH_TYPES,
  MORPH_TYPE_LABEL,
} from "@/lib/literacy/morphology-content";
import {
  isMorphologyEnabled,
  isMorphologyAgeEligible,
  MORPHOLOGY_AGE_MIN_MONTHS,
  MORPHOLOGY_AGE_MAX_MONTHS,
  scoreMorphAttempt,
  summarizeMorphologySession,
  buildMorphologySession,
  SELF_CORRECTION_WINDOW_MS,
} from "@/lib/literacy/morphology";

const BANNED = ["치료", "진단", "장애", "지연", "지체", "난독"];

describe("morphology content — 무결성", () => {
  it("15개(3유형×5), id 유일, level 1~3", () => {
    expect(MORPH_ITEMS.length).toBe(15);
    expect(new Set(MORPH_ITEMS.map((i) => i.id)).size).toBe(15);
    for (const i of MORPH_ITEMS) {
      expect(i.level).toBeGreaterThanOrEqual(1);
      expect(i.level).toBeLessThanOrEqual(3);
    }
  });

  it("유형별 5개씩, 유형 순서 = level 1..3", () => {
    expect(MORPH_TYPES).toEqual(["compound", "derivation", "analysis"]);
    MORPH_TYPES.forEach((type, idx) => {
      const items = MORPH_ITEMS.filter((x) => x.type === type);
      expect(items.length).toBe(5);
      for (const i of items) expect(i.level).toBe(idx + 1);
    });
  });

  it("선택지 3개·정답 포함·중복 없음", () => {
    for (const i of MORPH_ITEMS) {
      expect(i.choices).toHaveLength(3);
      expect(i.choices).toContain(i.answer);
      expect(new Set(i.choices).size).toBe(3);
    }
  });

  it("CON-04: 문항·선택지·라벨 금칙어 0", () => {
    const corpus = [
      ...MORPH_ITEMS.flatMap((i) => [i.prompt, i.answer, ...i.choices]),
      ...Object.values(MORPH_TYPE_LABEL),
    ].join(" ");
    for (const w of BANNED) expect(corpus, `금칙어 "${w}"`).not.toContain(w);
  });
});

describe("morphology — 플래그/연령 게이트", () => {
  const saved = process.env.LITERACY_MORPHOLOGY_ENABLED;
  afterEach(() => {
    if (saved === undefined) delete process.env.LITERACY_MORPHOLOGY_ENABLED;
    else process.env.LITERACY_MORPHOLOGY_ENABLED = saved;
  });

  it("플래그 default off, === 'true' 일 때만 on", () => {
    delete process.env.LITERACY_MORPHOLOGY_ENABLED;
    expect(isMorphologyEnabled()).toBe(false);
    process.env.LITERACY_MORPHOLOGY_ENABLED = "true";
    expect(isMorphologyEnabled()).toBe(true);
  });

  it("연령 게이트 만 10~12세(120~144) 경계 포함, 밖 거부", () => {
    expect(MORPHOLOGY_AGE_MIN_MONTHS).toBe(120);
    expect(MORPHOLOGY_AGE_MAX_MONTHS).toBe(144);
    expect(isMorphologyAgeEligible(120)).toBe(true);
    expect(isMorphologyAgeEligible(144)).toBe(true);
    expect(isMorphologyAgeEligible(119)).toBe(false); // 초3(S2 게이트 상한)
    expect(isMorphologyAgeEligible(145)).toBe(false);
    expect(isMorphologyAgeEligible(Number.NaN)).toBe(false);
  });
});

describe("morphology — 채점(0/1 + SC)", () => {
  const item = MORPH_ITEMS[0]; // 손수건
  const distractor = item.choices.find((c) => c !== item.answer)!;
  it("첫 응답 정답 → 1", () => {
    expect(scoreMorphAttempt({ item, firstAnswer: item.answer })).toEqual({
      correct: 1,
      selfCorrected: false,
    });
  });
  it("첫 오답 + SC 창 내 교정 → 1(selfCorrected)", () => {
    expect(
      scoreMorphAttempt({
        item,
        firstAnswer: distractor,
        correctedAnswer: item.answer,
        selfCorrectionElapsedMs: SELF_CORRECTION_WINDOW_MS,
      }),
    ).toEqual({ correct: 1, selfCorrected: true });
  });
  it("첫 오답 + SC 창 밖 → 0", () => {
    expect(
      scoreMorphAttempt({
        item,
        firstAnswer: distractor,
        correctedAnswer: item.answer,
        selfCorrectionElapsedMs: SELF_CORRECTION_WINDOW_MS + 1,
      }),
    ).toEqual({ correct: 0, selfCorrected: false });
  });
});

describe("morphology — 요약/세션", () => {
  it("summarizeMorphologySession 집계", () => {
    expect(
      summarizeMorphologySession([
        { correct: 1, selfCorrected: false },
        { correct: 1, selfCorrected: true },
        { correct: 0, selfCorrected: false },
      ]),
    ).toEqual({ total: 3, correct: 2, selfCorrected: 1 });
  });

  it("buildMorphologySession 결정적 — 유형당 N개, 위계 순(합성→분석)", () => {
    const session = buildMorphologySession(2);
    expect(session.length).toBe(6); // 3유형 × 2
    expect(session.slice(0, 2).every((i) => i.level === 1)).toBe(true);
    expect(session.slice(-2).every((i) => i.level === 3)).toBe(true);
    expect(buildMorphologySession(2).map((i) => i.id)).toEqual(session.map((i) => i.id));
  });
});

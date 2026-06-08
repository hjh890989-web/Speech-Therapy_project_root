// FR-C-LIT-01 / MOCK-LIT-01 (CR-2026-007) — 음운 인식 미니게임 단위 테스트.
// 콘텐츠 무결성 + 채점(0/1+SC) + 연령게이트 + 원본성/금칙어 lint + 플래그.

import { describe, it, expect, afterEach } from "vitest";
import { PA_ITEMS, PA_TASK_LABEL, type PaItem } from "@/lib/literacy/pa-content";
import {
  scorePaAttempt,
  summarizePaSession,
  buildPaSession,
  isPaAgeEligible,
  isWithinSelfCorrectionWindow,
  isPhonologicalAwarenessEnabled,
  PA_AGE_MIN_MONTHS,
  PA_AGE_MAX_MONTHS,
  SELF_CORRECTION_WINDOW_MS,
  type PaScore,
} from "@/lib/literacy/phonological-awareness";

describe("MOCK-LIT-01 — 아이템 풀 무결성", () => {
  it("15개 (합성 5 + 탈락 5 + 대치 5)", () => {
    expect(PA_ITEMS).toHaveLength(15);
    expect(PA_ITEMS.filter((i) => i.type === "blending")).toHaveLength(5);
    expect(PA_ITEMS.filter((i) => i.type === "deletion")).toHaveLength(5);
    expect(PA_ITEMS.filter((i) => i.type === "substitution")).toHaveLength(5);
  });

  it("id 유일 + 선택지 3개 + answer 포함", () => {
    const ids = new Set(PA_ITEMS.map((i) => i.id));
    expect(ids.size).toBe(PA_ITEMS.length);
    for (const i of PA_ITEMS) {
      expect(i.choices).toHaveLength(3);
      expect(i.choices).toContain(i.answer);
      expect(new Set(i.choices).size, `${i.id} 선택지 중복`).toBe(3);
    }
  });

  it("type → level 잠정 위계 (합성1/탈락2/대치3)", () => {
    const lvl: Record<string, number> = { blending: 1, deletion: 2, substitution: 3 };
    for (const i of PA_ITEMS) expect(i.level).toBe(lvl[i.type]);
  });
});

describe("원본성·금칙어 lint (CL-12 / ADR-04)", () => {
  it("표준화 검사 명칭/학습장애 용어 0건 (자체 제작 보증)", () => {
    const banned = ["NISE", "기초학습", "학습장애", "난독", "B·ACT", "BACT"];
    const corpus = [
      ...PA_ITEMS.flatMap((i: PaItem) => [i.prompt, i.answer, ...i.choices]),
      ...Object.values(PA_TASK_LABEL),
    ].join(" ");
    for (const w of banned) expect(corpus).not.toContain(w);
  });

  it("의료 금칙어 0건 (치료/진단/장애/지연/지체)", () => {
    const banned = ["치료", "진단", "장애", "지연", "지체"];
    const corpus = [
      ...PA_ITEMS.flatMap((i: PaItem) => [i.prompt, i.answer, ...i.choices]),
      ...Object.values(PA_TASK_LABEL),
    ].join(" ");
    for (const w of banned) expect(corpus).not.toContain(w);
  });
});

describe("FR-C-LIT-01 — scorePaAttempt (0/1 + 자기교정)", () => {
  const item = PA_ITEMS[0]; // 합성: 사과
  const wrong = item.choices.find((c) => c !== item.answer) as string;

  it("첫 응답 정답 → 1 (SC 아님)", () => {
    expect(scorePaAttempt({ item, firstAnswer: item.answer })).toEqual({
      correct: 1,
      selfCorrected: false,
    });
  });

  it("첫 오답 + 3초 내 정답 교정 → 1 (SC)", () => {
    expect(
      scorePaAttempt({
        item,
        firstAnswer: wrong,
        correctedAnswer: item.answer,
        selfCorrectionElapsedMs: 2000,
      }),
    ).toEqual({ correct: 1, selfCorrected: true });
  });

  it("첫 오답 + 3초 초과 정답 교정 → 0 (창 밖)", () => {
    expect(
      scorePaAttempt({
        item,
        firstAnswer: wrong,
        correctedAnswer: item.answer,
        selfCorrectionElapsedMs: 4000,
      }),
    ).toEqual({ correct: 0, selfCorrected: false });
  });

  it("첫 오답 + 교정도 오답 → 0", () => {
    expect(
      scorePaAttempt({ item, firstAnswer: wrong, correctedAnswer: wrong, selfCorrectionElapsedMs: 1000 }),
    ).toEqual({ correct: 0, selfCorrected: false });
  });

  it("첫 오답 + 교정 없음 → 0", () => {
    expect(scorePaAttempt({ item, firstAnswer: wrong })).toEqual({
      correct: 0,
      selfCorrected: false,
    });
  });
});

describe("SC 창 / 연령 게이트 경계", () => {
  it("SC 창 — 0·3000 포함, 3001·음수 제외", () => {
    expect(isWithinSelfCorrectionWindow(0)).toBe(true);
    expect(isWithinSelfCorrectionWindow(SELF_CORRECTION_WINDOW_MS)).toBe(true);
    expect(isWithinSelfCorrectionWindow(SELF_CORRECTION_WINDOW_MS + 1)).toBe(false);
    expect(isWithinSelfCorrectionWindow(-1)).toBe(false);
  });

  it("연령 게이트 — 60~84 적격, 그 외/비유한 부적격", () => {
    expect(isPaAgeEligible(PA_AGE_MIN_MONTHS)).toBe(true);
    expect(isPaAgeEligible(PA_AGE_MAX_MONTHS)).toBe(true);
    expect(isPaAgeEligible(PA_AGE_MIN_MONTHS - 1)).toBe(false);
    expect(isPaAgeEligible(PA_AGE_MAX_MONTHS + 1)).toBe(false);
    expect(isPaAgeEligible(Number.NaN)).toBe(false);
    expect(isPaAgeEligible(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("summarizePaSession + buildPaSession", () => {
  it("요약 — total/correct/selfCorrected 집계", () => {
    const scores: PaScore[] = [
      { correct: 1, selfCorrected: false },
      { correct: 1, selfCorrected: true },
      { correct: 0, selfCorrected: false },
    ];
    expect(summarizePaSession(scores)).toEqual({ total: 3, correct: 2, selfCorrected: 1 });
  });

  it("세션 — 결정적, perType 순서(합성→탈락→대치)", () => {
    const s = buildPaSession(2);
    expect(s).toHaveLength(6);
    expect(s.map((i) => i.type)).toEqual([
      "blending",
      "blending",
      "deletion",
      "deletion",
      "substitution",
      "substitution",
    ]);
    expect(buildPaSession(2)).toEqual(s); // 결정적
    expect(buildPaSession(5)).toHaveLength(15);
    expect(buildPaSession(0)).toHaveLength(0);
  });
});

describe("활성 플래그 (LITERACY_PA_ENABLED, default off)", () => {
  const original = process.env.LITERACY_PA_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.LITERACY_PA_ENABLED;
    else process.env.LITERACY_PA_ENABLED = original;
  });

  it("미설정/false → off", () => {
    delete process.env.LITERACY_PA_ENABLED;
    expect(isPhonologicalAwarenessEnabled()).toBe(false);
    process.env.LITERACY_PA_ENABLED = "false";
    expect(isPhonologicalAwarenessEnabled()).toBe(false);
  });

  it("'true' → on", () => {
    process.env.LITERACY_PA_ENABLED = "true";
    expect(isPhonologicalAwarenessEnabled()).toBe(true);
  });
});

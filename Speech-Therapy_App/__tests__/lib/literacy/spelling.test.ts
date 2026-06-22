// 받아쓰기·철자 미니게임 — 콘텐츠 무결성 + 채점 + 연령게이트 + 세션 (CR-2026-009 Phase 3b S2).
import { describe, it, expect, afterEach } from "vitest";
import {
  SPELLING_ITEMS,
  SPELLING_RULES,
  SPELLING_RULE_LABEL,
} from "@/lib/literacy/spelling-content";
import {
  isSpellingEnabled,
  isSpellingAgeEligible,
  SPELLING_AGE_MIN_MONTHS,
  SPELLING_AGE_MAX_MONTHS,
  scoreSpellingAttempt,
  summarizeSpellingSession,
  buildSpellingSession,
  SELF_CORRECTION_WINDOW_MS,
} from "@/lib/literacy/spelling";

const BANNED = ["치료", "진단", "장애", "지연", "지체", "난독"];

describe("spelling content — 무결성", () => {
  it("25개(5규칙×5), id 유일, level 1~5", () => {
    expect(SPELLING_ITEMS.length).toBe(25);
    expect(new Set(SPELLING_ITEMS.map((i) => i.id)).size).toBe(25);
    for (const i of SPELLING_ITEMS) {
      expect(i.level).toBeGreaterThanOrEqual(1);
      expect(i.level).toBeLessThanOrEqual(5);
    }
  });

  it("규칙별 5개씩, 난이도 위계 순서(경음화→…→구개음화)", () => {
    expect(SPELLING_RULES).toEqual([
      "tensification",
      "liaison",
      "aspiration",
      "coda",
      "palatalization",
    ]);
    for (const rule of SPELLING_RULES) {
      expect(SPELLING_ITEMS.filter((i) => i.rule === rule).length).toBe(5);
    }
    // level 은 규칙 순서와 일치(1..5).
    SPELLING_RULES.forEach((rule, idx) => {
      for (const i of SPELLING_ITEMS.filter((x) => x.rule === rule)) {
        expect(i.level).toBe(idx + 1);
      }
    });
  });

  it("선택지=2개·정답 포함·오답은 소리기반(정답≠소리, 오답=소리)", () => {
    for (const i of SPELLING_ITEMS) {
      expect(i.choices).toHaveLength(2);
      expect(i.choices).toContain(i.answer);
      // 철자(정답)는 소리와 다르다(음운규칙 불일치) + 오답 선택지 = 소리기반 표기.
      expect(i.answer).not.toBe(i.sound);
      expect(i.choices).toContain(i.sound);
      const distractor = i.choices.find((c) => c !== i.answer);
      expect(distractor).toBe(i.sound);
    }
  });

  it("CON-04: 콘텐츠·라벨 금칙어 0", () => {
    const corpus = [
      ...SPELLING_ITEMS.flatMap((i) => [i.sound, i.answer, ...i.choices]),
      ...Object.values(SPELLING_RULE_LABEL),
    ].join(" ");
    for (const w of BANNED) expect(corpus, `금칙어 "${w}"`).not.toContain(w);
  });
});

describe("spelling — 플래그/연령 게이트", () => {
  const saved = process.env.LITERACY_SPELLING_ENABLED;
  afterEach(() => {
    if (saved === undefined) delete process.env.LITERACY_SPELLING_ENABLED;
    else process.env.LITERACY_SPELLING_ENABLED = saved;
  });

  it("플래그 default off, === 'true' 일 때만 on", () => {
    delete process.env.LITERACY_SPELLING_ENABLED;
    expect(isSpellingEnabled()).toBe(false);
    process.env.LITERACY_SPELLING_ENABLED = "1";
    expect(isSpellingEnabled()).toBe(false);
    process.env.LITERACY_SPELLING_ENABLED = "true";
    expect(isSpellingEnabled()).toBe(true);
  });

  it("연령 게이트 만 7~9세(84~119) 경계 포함, 밖 거부", () => {
    expect(SPELLING_AGE_MIN_MONTHS).toBe(84);
    expect(SPELLING_AGE_MAX_MONTHS).toBe(119);
    expect(isSpellingAgeEligible(84)).toBe(true);
    expect(isSpellingAgeEligible(119)).toBe(true);
    expect(isSpellingAgeEligible(83)).toBe(false); // 만 6세(S1)
    expect(isSpellingAgeEligible(120)).toBe(false); // 만 10세(S3)
    expect(isSpellingAgeEligible(Number.NaN)).toBe(false);
  });
});

describe("spelling — 채점(0/1 + SC)", () => {
  const item = SPELLING_ITEMS[0]; // 국수 / 소리 국쑤
  it("첫 응답 정답 → 1", () => {
    expect(scoreSpellingAttempt({ item, firstAnswer: item.answer })).toEqual({
      correct: 1,
      selfCorrected: false,
    });
  });
  it("첫 오답 + SC 창 내 교정 → 1(selfCorrected)", () => {
    expect(
      scoreSpellingAttempt({
        item,
        firstAnswer: item.sound,
        correctedAnswer: item.answer,
        selfCorrectionElapsedMs: SELF_CORRECTION_WINDOW_MS,
      }),
    ).toEqual({ correct: 1, selfCorrected: true });
  });
  it("첫 오답 + SC 창 밖 교정 → 0", () => {
    expect(
      scoreSpellingAttempt({
        item,
        firstAnswer: item.sound,
        correctedAnswer: item.answer,
        selfCorrectionElapsedMs: SELF_CORRECTION_WINDOW_MS + 1,
      }),
    ).toEqual({ correct: 0, selfCorrected: false });
  });
  it("끝까지 오답 → 0", () => {
    expect(
      scoreSpellingAttempt({ item, firstAnswer: item.sound, correctedAnswer: item.sound }),
    ).toEqual({ correct: 0, selfCorrected: false });
  });
});

describe("spelling — 요약/세션", () => {
  it("summarizeSpellingSession 집계", () => {
    const s = summarizeSpellingSession([
      { correct: 1, selfCorrected: false },
      { correct: 1, selfCorrected: true },
      { correct: 0, selfCorrected: false },
    ]);
    expect(s).toEqual({ total: 3, correct: 2, selfCorrected: 1 });
  });

  it("buildSpellingSession 결정적 — 규칙당 N개, 난이도 위계 순", () => {
    const session = buildSpellingSession(2);
    expect(session.length).toBe(10); // 5규칙 × 2
    // 첫 2개는 level 1(경음화), 마지막 2개는 level 5(구개음화).
    expect(session.slice(0, 2).every((i) => i.level === 1)).toBe(true);
    expect(session.slice(-2).every((i) => i.level === 5)).toBe(true);
    // 결정적(동일 입력 동일 출력).
    expect(buildSpellingSession(2).map((i) => i.id)).toEqual(session.map((i) => i.id));
  });
});

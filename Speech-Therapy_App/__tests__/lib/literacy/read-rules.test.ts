// 소리 규칙 읽기(해독) 미니게임 — 콘텐츠 무결성 + 채점 + 연령게이트 + 세션 (CR-2026-009 Phase 3b S2).
import { describe, it, expect, afterEach } from "vitest";
import {
  READ_RULE_ITEMS,
  READ_RULES,
  READ_RULE_LABEL,
} from "@/lib/literacy/read-rules-content";
import {
  isReadRulesEnabled,
  isReadRulesAgeEligible,
  READ_RULES_AGE_MIN_MONTHS,
  READ_RULES_AGE_MAX_MONTHS,
  scoreReadRuleAttempt,
  summarizeReadRulesSession,
  buildReadRulesSession,
  SELF_CORRECTION_WINDOW_MS,
} from "@/lib/literacy/read-rules";

const BANNED = ["치료", "진단", "장애", "지연", "지체", "난독"];

describe("read-rules content — 무결성", () => {
  it("25개(5규칙×5), id 유일, level 1~5", () => {
    expect(READ_RULE_ITEMS.length).toBe(25);
    expect(new Set(READ_RULE_ITEMS.map((i) => i.id)).size).toBe(25);
    for (const i of READ_RULE_ITEMS) {
      expect(i.level).toBeGreaterThanOrEqual(1);
      expect(i.level).toBeLessThanOrEqual(5);
    }
  });

  it("규칙별 5개씩, 규칙 순서 = level 1..5", () => {
    expect(READ_RULES).toEqual([
      "tensification",
      "liaison",
      "nasalization",
      "aspiration",
      "palatalization",
    ]);
    READ_RULES.forEach((rule, idx) => {
      const items = READ_RULE_ITEMS.filter((x) => x.rule === rule);
      expect(items.length).toBe(5);
      for (const i of items) expect(i.level).toBe(idx + 1);
    });
  });

  it("선택지=2개·정답 포함·정답≠오답·정답≠글자(불일치형)", () => {
    for (const i of READ_RULE_ITEMS) {
      expect(i.choices).toHaveLength(2);
      expect(i.choices).toContain(i.answer);
      const distractor = i.choices.find((c) => c !== i.answer);
      expect(distractor).toBeDefined();
      expect(distractor).not.toBe(i.answer);
      // 불일치형: 바른 소리는 글자 표기와 다르다.
      expect(i.answer).not.toBe(i.word);
    }
  });

  it("CON-04: 콘텐츠·라벨 금칙어 0", () => {
    const corpus = [
      ...READ_RULE_ITEMS.flatMap((i) => [i.word, i.answer, ...i.choices]),
      ...Object.values(READ_RULE_LABEL),
    ].join(" ");
    for (const w of BANNED) expect(corpus, `금칙어 "${w}"`).not.toContain(w);
  });
});

describe("read-rules — 플래그/연령 게이트", () => {
  const saved = process.env.LITERACY_READ_RULES_ENABLED;
  afterEach(() => {
    if (saved === undefined) delete process.env.LITERACY_READ_RULES_ENABLED;
    else process.env.LITERACY_READ_RULES_ENABLED = saved;
  });

  it("플래그 default off, === 'true' 일 때만 on", () => {
    delete process.env.LITERACY_READ_RULES_ENABLED;
    expect(isReadRulesEnabled()).toBe(false);
    process.env.LITERACY_READ_RULES_ENABLED = "1";
    expect(isReadRulesEnabled()).toBe(false);
    process.env.LITERACY_READ_RULES_ENABLED = "true";
    expect(isReadRulesEnabled()).toBe(true);
  });

  it("연령 게이트 만 7~9세(84~119) 경계 포함, 밖 거부", () => {
    expect(READ_RULES_AGE_MIN_MONTHS).toBe(84);
    expect(READ_RULES_AGE_MAX_MONTHS).toBe(119);
    expect(isReadRulesAgeEligible(84)).toBe(true);
    expect(isReadRulesAgeEligible(119)).toBe(true);
    expect(isReadRulesAgeEligible(83)).toBe(false);
    expect(isReadRulesAgeEligible(120)).toBe(false);
    expect(isReadRulesAgeEligible(Number.NaN)).toBe(false);
  });
});

describe("read-rules — 채점(0/1 + SC)", () => {
  const item = READ_RULE_ITEMS[0]; // 봄비 / 바른 소리 봄삐
  it("첫 응답 정답 → 1", () => {
    expect(scoreReadRuleAttempt({ item, firstAnswer: item.answer })).toEqual({
      correct: 1,
      selfCorrected: false,
    });
  });
  it("첫 오답 + SC 창 내 교정 → 1(selfCorrected)", () => {
    const distractor = item.choices.find((c) => c !== item.answer)!;
    expect(
      scoreReadRuleAttempt({
        item,
        firstAnswer: distractor,
        correctedAnswer: item.answer,
        selfCorrectionElapsedMs: SELF_CORRECTION_WINDOW_MS,
      }),
    ).toEqual({ correct: 1, selfCorrected: true });
  });
  it("첫 오답 + SC 창 밖 → 0", () => {
    const distractor = item.choices.find((c) => c !== item.answer)!;
    expect(
      scoreReadRuleAttempt({
        item,
        firstAnswer: distractor,
        correctedAnswer: item.answer,
        selfCorrectionElapsedMs: SELF_CORRECTION_WINDOW_MS + 1,
      }),
    ).toEqual({ correct: 0, selfCorrected: false });
  });
});

describe("read-rules — 요약/세션", () => {
  it("summarizeReadRulesSession 집계", () => {
    expect(
      summarizeReadRulesSession([
        { correct: 1, selfCorrected: false },
        { correct: 1, selfCorrected: true },
        { correct: 0, selfCorrected: false },
      ]),
    ).toEqual({ total: 3, correct: 2, selfCorrected: 1 });
  });

  it("buildReadRulesSession 결정적 — 규칙당 N개, 난이도 위계 순", () => {
    const session = buildReadRulesSession(2);
    expect(session.length).toBe(10);
    expect(session.slice(0, 2).every((i) => i.level === 1)).toBe(true);
    expect(session.slice(-2).every((i) => i.level === 5)).toBe(true);
    expect(buildReadRulesSession(2).map((i) => i.id)).toEqual(session.map((i) => i.id));
  });
});

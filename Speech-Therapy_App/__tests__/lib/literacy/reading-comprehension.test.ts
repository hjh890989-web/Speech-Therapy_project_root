// 사실적 읽기이해 미니게임 — 콘텐츠 무결성 + 채점 + 연령게이트 + 세션 (CR-2026-009 Phase 3b S3).
import { describe, it, expect, afterEach } from "vitest";
import {
  COMPREHENSION_CARDS,
  COMPREHENSION_PASSAGE_COUNT,
} from "@/lib/literacy/reading-comprehension-content";
import {
  isComprehensionEnabled,
  isComprehensionAgeEligible,
  COMPREHENSION_AGE_MIN_MONTHS,
  COMPREHENSION_AGE_MAX_MONTHS,
  scoreComprehensionAttempt,
  summarizeComprehensionSession,
  buildComprehensionSession,
} from "@/lib/literacy/reading-comprehension";

const BANNED = ["치료", "진단", "장애", "지연", "지체", "난독"];

describe("reading-comprehension content — 무결성", () => {
  it("지문 3편 × 문항 3 = 9 카드, id 유일", () => {
    expect(COMPREHENSION_PASSAGE_COUNT).toBe(3);
    expect(COMPREHENSION_CARDS.length).toBe(9);
    expect(new Set(COMPREHENSION_CARDS.map((c) => c.id)).size).toBe(9);
  });

  it("선택지 3개·정답 포함·정답은 지문에 직접 제시(사실적)", () => {
    for (const c of COMPREHENSION_CARDS) {
      expect(c.choices).toHaveLength(3);
      expect(c.choices).toContain(c.answer);
      expect(new Set(c.choices).size).toBe(3); // 중복 없음
      // 사실적 이해: 정답이 지문에 글자 그대로 직접 제시됨.
      expect(c.passageText.includes(c.answer), `정답 "${c.answer}"가 지문에 직접`).toBe(true);
    }
  });

  it("CON-04: 지문·문항·선택지 금칙어 0", () => {
    const corpus = COMPREHENSION_CARDS.flatMap((c) => [
      c.passageTitle,
      c.passageText,
      c.question,
      ...c.choices,
    ]).join(" ");
    for (const w of BANNED) expect(corpus, `금칙어 "${w}"`).not.toContain(w);
  });
});

describe("reading-comprehension — 플래그/연령 게이트", () => {
  const saved = process.env.LITERACY_COMPREHENSION_ENABLED;
  afterEach(() => {
    if (saved === undefined) delete process.env.LITERACY_COMPREHENSION_ENABLED;
    else process.env.LITERACY_COMPREHENSION_ENABLED = saved;
  });

  it("플래그 default off, === 'true' 일 때만 on", () => {
    delete process.env.LITERACY_COMPREHENSION_ENABLED;
    expect(isComprehensionEnabled()).toBe(false);
    process.env.LITERACY_COMPREHENSION_ENABLED = "true";
    expect(isComprehensionEnabled()).toBe(true);
  });

  it("연령 게이트 만 9~11세(108~131) 경계 포함, 밖 거부", () => {
    expect(COMPREHENSION_AGE_MIN_MONTHS).toBe(108);
    expect(COMPREHENSION_AGE_MAX_MONTHS).toBe(131);
    expect(isComprehensionAgeEligible(108)).toBe(true);
    expect(isComprehensionAgeEligible(131)).toBe(true);
    expect(isComprehensionAgeEligible(107)).toBe(false); // 초2(S2)
    expect(isComprehensionAgeEligible(132)).toBe(false); // 초5(S4)
    expect(isComprehensionAgeEligible(Number.NaN)).toBe(false);
  });
});

describe("reading-comprehension — 채점(자유 재시도)", () => {
  const card = COMPREHENSION_CARDS[0];
  const distractor = card.choices.find((c) => c !== card.answer)!;
  it("첫 정답 → 1", () => {
    expect(scoreComprehensionAttempt({ card, firstAnswer: card.answer })).toEqual({
      correct: 1,
      selfCorrected: false,
    });
  });
  it("첫 오답 + 재선택 정답 → 1(selfCorrected, 시간 무관)", () => {
    expect(
      scoreComprehensionAttempt({ card, firstAnswer: distractor, correctedAnswer: card.answer }),
    ).toEqual({ correct: 1, selfCorrected: true });
  });
  it("끝까지 오답 → 0", () => {
    expect(
      scoreComprehensionAttempt({ card, firstAnswer: distractor, correctedAnswer: distractor }),
    ).toEqual({ correct: 0, selfCorrected: false });
  });
});

describe("reading-comprehension — 요약/세션", () => {
  it("summarizeComprehensionSession 집계", () => {
    expect(
      summarizeComprehensionSession([
        { correct: 1, selfCorrected: false },
        { correct: 0, selfCorrected: false },
      ]),
    ).toEqual({ total: 2, correct: 1, selfCorrected: 0 });
  });

  it("buildComprehensionSession 결정적 — 9 카드, 지문→문항 순서", () => {
    const session = buildComprehensionSession();
    expect(session.length).toBe(9);
    expect(session.map((c) => c.id)).toEqual(COMPREHENSION_CARDS.map((c) => c.id));
  });
});

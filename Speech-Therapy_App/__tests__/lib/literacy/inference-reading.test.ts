// 추론 독해 미니게임 — 콘텐츠 무결성 + 채점 + 연령게이트 + 세션 (CR-2026-009 Phase 3b S4).
import { describe, it, expect, afterEach } from "vitest";
import {
  INFERENCE_CARDS,
  INFERENCE_PASSAGE_COUNT,
} from "@/lib/literacy/inference-reading-content";
import {
  isInferenceReadingEnabled,
  isInferenceReadingAgeEligible,
  INFERENCE_READING_AGE_MIN_MONTHS,
  INFERENCE_READING_AGE_MAX_MONTHS,
  scoreInferenceAttempt,
  summarizeInferenceReadingSession,
  buildInferenceReadingSession,
} from "@/lib/literacy/inference-reading";

const BANNED = ["치료", "진단", "장애", "지연", "지체", "난독"];

describe("inference-reading content — 무결성", () => {
  it("지문 3편 × 문항 3 = 9 카드, id 유일", () => {
    expect(INFERENCE_PASSAGE_COUNT).toBe(3);
    expect(INFERENCE_CARDS.length).toBe(9);
    expect(new Set(INFERENCE_CARDS.map((c) => c.id)).size).toBe(9);
  });

  it("선택지 3개·정답 포함·중복 없음", () => {
    for (const c of INFERENCE_CARDS) {
      expect(c.choices).toHaveLength(3);
      expect(c.choices).toContain(c.answer);
      expect(new Set(c.choices).size).toBe(3);
    }
  });

  it("추론: 정답이 지문에 글자 그대로 제시되지 않음(사실적 이해와 구분)", () => {
    // 정답 전체 문자열이 지문에 직접 등장하지 않아야 추론 문항(최소 1단계 유추 필요).
    for (const c of INFERENCE_CARDS) {
      expect(c.passageText.includes(c.answer), `추론 정답 "${c.answer}"가 지문에 직접 노출됨`).toBe(false);
    }
  });

  it("CON-04: 지문·문항·선택지 금칙어 0", () => {
    const corpus = INFERENCE_CARDS.flatMap((c) => [
      c.passageTitle,
      c.passageText,
      c.question,
      ...c.choices,
    ]).join(" ");
    for (const w of BANNED) expect(corpus, `금칙어 "${w}"`).not.toContain(w);
  });
});

describe("inference-reading — 플래그/연령 게이트", () => {
  const saved = process.env.LITERACY_INFERENCE_READING_ENABLED;
  afterEach(() => {
    if (saved === undefined) delete process.env.LITERACY_INFERENCE_READING_ENABLED;
    else process.env.LITERACY_INFERENCE_READING_ENABLED = saved;
  });

  it("플래그 default off, === 'true' 일 때만 on (기존 inference 플래그와 별개)", () => {
    delete process.env.LITERACY_INFERENCE_READING_ENABLED;
    expect(isInferenceReadingEnabled()).toBe(false);
    process.env.LITERACY_INFERENCE_READING_ENABLED = "true";
    expect(isInferenceReadingEnabled()).toBe(true);
  });

  it("연령 게이트 만 11~12세(132~144) 경계 포함, 밖 거부", () => {
    expect(INFERENCE_READING_AGE_MIN_MONTHS).toBe(132);
    expect(INFERENCE_READING_AGE_MAX_MONTHS).toBe(144);
    expect(isInferenceReadingAgeEligible(132)).toBe(true);
    expect(isInferenceReadingAgeEligible(144)).toBe(true);
    expect(isInferenceReadingAgeEligible(131)).toBe(false); // 초4(S3)
    expect(isInferenceReadingAgeEligible(145)).toBe(false); // 도메인 밖
    expect(isInferenceReadingAgeEligible(Number.NaN)).toBe(false);
  });
});

describe("inference-reading — 채점(자유 재시도)", () => {
  const card = INFERENCE_CARDS[0];
  const distractor = card.choices.find((c) => c !== card.answer)!;
  it("첫 정답 → 1", () => {
    expect(scoreInferenceAttempt({ card, firstAnswer: card.answer })).toEqual({
      correct: 1,
      selfCorrected: false,
    });
  });
  it("첫 오답 + 재선택 정답 → 1(selfCorrected)", () => {
    expect(
      scoreInferenceAttempt({ card, firstAnswer: distractor, correctedAnswer: card.answer }),
    ).toEqual({ correct: 1, selfCorrected: true });
  });
  it("끝까지 오답 → 0", () => {
    expect(
      scoreInferenceAttempt({ card, firstAnswer: distractor, correctedAnswer: distractor }),
    ).toEqual({ correct: 0, selfCorrected: false });
  });
});

describe("inference-reading — 요약/세션", () => {
  it("summarizeInferenceReadingSession 집계", () => {
    expect(
      summarizeInferenceReadingSession([
        { correct: 1, selfCorrected: true },
        { correct: 0, selfCorrected: false },
      ]),
    ).toEqual({ total: 2, correct: 1, selfCorrected: 1 });
  });

  it("buildInferenceReadingSession 결정적 — 9 카드", () => {
    const session = buildInferenceReadingSession();
    expect(session.length).toBe(9);
    expect(session.map((c) => c.id)).toEqual(INFERENCE_CARDS.map((c) => c.id));
  });
});

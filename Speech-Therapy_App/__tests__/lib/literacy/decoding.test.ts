// FR-C-LIT-01 / MOCK-LIT-02 (CR-2026-007 / CL-09) — 해독 미니게임 단위 테스트.
// 한글 합성 생성기 + 풀 무결성 + 채점(phonetic-similarity 재사용) + 원본성/금칙어 + 연령/플래그.

import { describe, it, expect, afterEach } from "vitest";
import {
  composeSyllable,
  generateNonword,
  DECODING_ITEMS,
  DECODING_POSITION_LABEL,
} from "@/lib/literacy/decoding-content";
import {
  scoreDecodingResponse,
  summarizeDecodingSession,
  buildDecodingSession,
  isDecodingAgeEligible,
  isDecodingEnabled,
  DECODING_CORRECT_THRESHOLD,
  type DecodingScore,
} from "@/lib/literacy/decoding";

describe("MOCK-LIT-02 — 한글 합성 생성기", () => {
  it("composeSyllable — 자모 → 완성형 음절", () => {
    expect(composeSyllable("ㅂ", "ㅓ")).toBe("버");
    expect(composeSyllable("ㄷ", "ㅜ")).toBe("두");
    expect(composeSyllable("ㅃ", "ㅗ")).toBe("뽀");
    expect(composeSyllable("ㄷ", "ㅡ", "ㄱ")).toBe("득");
    expect(composeSyllable("ㅇ", "ㅏ")).toBe("아");
  });

  it("composeSyllable — 미지원 자모 throw", () => {
    expect(() => composeSyllable("X", "ㅏ")).toThrow();
    expect(() => composeSyllable("ㄱ", "Z")).toThrow();
  });

  it("generateNonword — spec 배열 합성", () => {
    expect(generateNonword([["ㅂ", "ㅓ"], ["ㄷ", "ㅜ"]])).toBe("버두");
    expect(generateNonword([["ㄷ", "ㅣ"], ["ㅁ", "ㅏ", "ㄹ"]])).toBe("디말");
  });
});

describe("MOCK-LIT-02 — 풀 무결성", () => {
  it("12개 (CV 8 + CVC 4), id 유일, 단어 비어있지 않음", () => {
    expect(DECODING_ITEMS).toHaveLength(12);
    expect(DECODING_ITEMS.filter((i) => i.structure === "CV")).toHaveLength(8);
    expect(DECODING_ITEMS.filter((i) => i.structure === "CVC")).toHaveLength(4);
    const ids = new Set(DECODING_ITEMS.map((i) => i.id));
    expect(ids.size).toBe(DECODING_ITEMS.length);
    for (const i of DECODING_ITEMS) {
      expect(i.word.length).toBe(2); // 2음절 무의미 단어
      expect(i.word).not.toMatch(/\s/);
    }
  });

  it("생성기와 정합 (dec-1 = 버두)", () => {
    expect(DECODING_ITEMS.find((i) => i.id === "dec-1")?.word).toBe("버두");
  });
});

describe("원본성·금칙어 lint (CL-12 / ADR-04)", () => {
  it("표준화 검사 명칭/학습장애 용어 + 의료 금칙어 0건", () => {
    const banned = [
      "NISE", "기초학습", "학습장애", "난독", "B·ACT", "BACT",
      "치료", "진단", "장애", "지연", "지체",
    ];
    const corpus = [
      ...DECODING_ITEMS.map((i) => i.word),
      ...Object.values(DECODING_POSITION_LABEL),
    ].join(" ");
    for (const w of banned) expect(corpus).not.toContain(w);
  });
});

describe("FR-C-LIT-01 — scoreDecodingResponse (0/1 + 오반응 기록)", () => {
  const item = DECODING_ITEMS[0]; // 버두

  it("정확히 읽음(전사=목표) → 유사도 100 → 1", () => {
    const s = scoreDecodingResponse(item, item.word);
    expect(s.similarity).toBe(100);
    expect(s.correct).toBe(1);
    expect(s.response).toBe(item.word);
  });

  it("빈 전사 → 0 + 빈 기록", () => {
    expect(scoreDecodingResponse(item, "   ")).toEqual({ correct: 0, similarity: 0, response: "" });
  });

  it("크게 다른 전사 → 0, 응답은 기록(trim)", () => {
    const s = scoreDecodingResponse(item, "  사과  ");
    expect(s.correct).toBe(0);
    expect(s.similarity).toBeLessThan(DECODING_CORRECT_THRESHOLD);
    expect(s.response).toBe("사과");
  });
});

describe("연령 게이트 / 세션 / 요약", () => {
  it("연령 — 만 5~7세(60~84) 적격 (음운인식과 동일)", () => {
    expect(isDecodingAgeEligible(60)).toBe(true);
    expect(isDecodingAgeEligible(84)).toBe(true);
    expect(isDecodingAgeEligible(48)).toBe(false);
    expect(isDecodingAgeEligible(Number.NaN)).toBe(false);
  });

  it("세션 — 결정적, CV 먼저 → CVC", () => {
    const s = buildDecodingSession(6);
    expect(s).toHaveLength(6);
    expect(s.every((i) => i.structure === "CV")).toBe(true); // 앞 6개 = CV
    expect(buildDecodingSession(6)).toEqual(s); // 결정적
    expect(buildDecodingSession(100)).toHaveLength(12);
    expect(buildDecodingSession(0)).toHaveLength(0);
  });

  it("요약 — total/correct 집계", () => {
    const scores: DecodingScore[] = [
      { correct: 1, similarity: 95, response: "버두" },
      { correct: 0, similarity: 20, response: "사과" },
    ];
    expect(summarizeDecodingSession(scores)).toEqual({ total: 2, correct: 1 });
  });
});

describe("활성 플래그 (LITERACY_DECODING_ENABLED, default off)", () => {
  const original = process.env.LITERACY_DECODING_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.LITERACY_DECODING_ENABLED;
    else process.env.LITERACY_DECODING_ENABLED = original;
  });

  it("미설정 → off, 'true' → on", () => {
    delete process.env.LITERACY_DECODING_ENABLED;
    expect(isDecodingEnabled()).toBe(false);
    process.env.LITERACY_DECODING_ENABLED = "true";
    expect(isDecodingEnabled()).toBe(true);
  });
});

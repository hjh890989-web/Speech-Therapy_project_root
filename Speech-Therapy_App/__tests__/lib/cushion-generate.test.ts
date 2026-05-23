// FR-C-017 (#40 Replace D8) — lib/cushion/generate 단위 테스트.
//
// 분기 매트릭스 (10+ 시나리오):
//   1. NODE_ENV='test' (vitest 기본) → template fallback (disabled)
//   2. GEMINI_DISABLED='1' → template fallback (disabled)
//   3. GOOGLE_GENERATIVE_AI_API_KEY 미설정 → template fallback (api_key_missing)
//   4. 정상 Gemini generateText → source='gemini'
//   5. Gemini timeout → template fallback (timeout)
//   6. Gemini API 에러 → template fallback (api_error)
//   7. Gemini rate limited → template fallback (rate_limited)
//   8. Gemini 응답 비어있음 → template fallback (empty_response)
//   9. Gemini 응답에 CON-04 금칙어 ('치료') 포함 → template fallback (banned_term)
//  10. streamCushionNote — forced template → 단일 chunk stream + 정상 종료
//  11. streamCushionNote — 정상 streaming → chunk 누적이 generateText 결과와 동일
//  12. streamCushionNote — 금칙어 chunk 발견 → CUSHION_SWAP_MARKER 발송
//  13. generateCushionTemplate — 음소 5종 × 3 점수 구간 = 모두 금칙어 0건
//  14. R4 — studentName 포함 시 카피 첫머리에 호명, 미포함 시 '보호자님' 폴백

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// `ai` 모듈 mock — generateText / streamText 둘 다 mockable 하게.
const generateTextMock = vi.fn();
const streamTextMock = vi.fn();
vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
  streamText: (...args: unknown[]) => streamTextMock(...args),
}));

// `@ai-sdk/google` mock — google(modelId) 호출 시 dummy model 반환.
vi.mock("@ai-sdk/google", () => ({
  google: (modelId: string) => ({ __modelId: modelId }),
}));

import {
  generateCushionNote,
  generateCushionTemplate,
  streamCushionNote,
  CUSHION_SWAP_MARKER,
  type CushionInput,
} from "@/lib/cushion/generate";
import { hasBannedTerm } from "@/lib/forbidden-words";
import { LLMTimeoutError, RateLimitedError } from "@/lib/ai/gemini";

const BASE_INPUT: CushionInput = {
  evaluationResultId: "eval-1",
  studentName: "지우",
  targetPhoneme: "ㅅ",
  articulationScore: 70,
  linguisticScore: 65,
  acousticScore: 75,
};

function enableGeminiPath(): void {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
  vi.stubEnv("NODE_ENV", "development");
}

beforeEach(() => {
  generateTextMock.mockReset();
  streamTextMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  delete process.env.GEMINI_DISABLED;
});

// ============================================================================
// 1. 강제 template 분기 (test / disabled / api_key_missing)
// ============================================================================

describe("generateCushionNote — forced template (test/disabled/api_key_missing)", () => {
  it("scenario 1: NODE_ENV='test' (vitest 기본) → source='template' + reason='disabled'", async () => {
    const out = await generateCushionNote(BASE_INPUT);
    expect(out.source).toBe("template");
    expect(out.fallbackReason).toBe("disabled");
    expect(out.text.length).toBeGreaterThan(20);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("scenario 2: GEMINI_DISABLED='1' → reason='disabled'", async () => {
    process.env.GEMINI_DISABLED = "1";
    const out = await generateCushionNote(BASE_INPUT);
    expect(out.source).toBe("template");
    expect(out.fallbackReason).toBe("disabled");
  });

  it("scenario 3: API key 미설정 (NODE_ENV uncovered) → reason='api_key_missing'", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const out = await generateCushionNote(BASE_INPUT);
    expect(out.source).toBe("template");
    expect(out.fallbackReason).toBe("api_key_missing");
  });
});

// ============================================================================
// 2. 실 Gemini 호출 (generateText) 분기
// ============================================================================

describe("generateCushionNote — Gemini path", () => {
  beforeEach(() => {
    enableGeminiPath();
  });

  it("scenario 4: 정상 응답 → source='gemini' + 응답 텍스트 그대로", async () => {
    generateTextMock.mockResolvedValueOnce({
      text: "오늘 지우는 ㅅ 발음을 정말 잘 따라 해 주었어요. 가정에서도 칭찬해 주시면 좋아요.",
    });
    const out = await generateCushionNote(BASE_INPUT);
    expect(out.source).toBe("gemini");
    expect(out.fallbackReason).toBe(null);
    expect(out.text).toContain("ㅅ");
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it("scenario 5: Gemini timeout (LLMTimeoutError) → reason='timeout'", async () => {
    generateTextMock.mockRejectedValueOnce(new LLMTimeoutError("test timeout"));
    const out = await generateCushionNote(BASE_INPUT);
    expect(out.source).toBe("template");
    expect(out.fallbackReason).toBe("timeout");
  });

  it("scenario 6: 일반 API 에러 → reason='api_error'", async () => {
    generateTextMock.mockRejectedValueOnce(new Error("network unreachable"));
    const out = await generateCushionNote(BASE_INPUT);
    expect(out.source).toBe("template");
    expect(out.fallbackReason).toBe("api_error");
  });

  it("scenario 7: RateLimitedError → reason='rate_limited'", async () => {
    generateTextMock.mockRejectedValueOnce(new RateLimitedError("GLOBAL_RPM", 30));
    const out = await generateCushionNote(BASE_INPUT);
    expect(out.source).toBe("template");
    expect(out.fallbackReason).toBe("rate_limited");
  });

  it("scenario 8: 응답 비어있음 → reason='empty_response'", async () => {
    generateTextMock.mockResolvedValueOnce({ text: "   " });
    const out = await generateCushionNote(BASE_INPUT);
    expect(out.source).toBe("template");
    expect(out.fallbackReason).toBe("empty_response");
  });

  it("scenario 9: 응답에 CON-04 금칙어 ('치료') 포함 → reason='banned_term' 자동 swap", async () => {
    generateTextMock.mockResolvedValueOnce({
      text: "지우의 발음 치료가 필요합니다. 병원 방문을 권장드려요.",
    });
    const out = await generateCushionNote(BASE_INPUT);
    expect(out.source).toBe("template");
    expect(out.fallbackReason).toBe("banned_term");
    // template 결과는 금칙어 0건.
    expect(hasBannedTerm(out.text)).toBe(false);
  });

  it("scenario 9b: 응답에 '진단' 금칙어 포함 → swap", async () => {
    generateTextMock.mockResolvedValueOnce({
      text: "오늘 진단 결과 발음이 좋아요.",
    });
    const out = await generateCushionNote(BASE_INPUT);
    expect(out.source).toBe("template");
    expect(out.fallbackReason).toBe("banned_term");
  });

  it("scenario 9c: 응답에 '장애' 금칙어 포함 → swap", async () => {
    generateTextMock.mockResolvedValueOnce({
      text: "발음 장애 가능성이 있어요.",
    });
    const out = await generateCushionNote(BASE_INPUT);
    expect(out.source).toBe("template");
    expect(out.fallbackReason).toBe("banned_term");
  });
});

// ============================================================================
// 3. streamCushionNote
// ============================================================================

describe("streamCushionNote", () => {
  async function consumeStream(stream: ReadableStream<string>): Promise<string> {
    const reader = stream.getReader();
    let accumulated = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += value;
    }
    return accumulated;
  }

  it("scenario 10: forced template (NODE_ENV='test') → 단일 chunk 로 template 전체 전송", async () => {
    const stream = await streamCushionNote(BASE_INPUT);
    const text = await consumeStream(stream);
    expect(text.length).toBeGreaterThan(20);
    expect(text).toContain("지우");
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("scenario 11: 정상 streaming → chunk 가 순서대로 누적", async () => {
    enableGeminiPath();
    async function* asyncGen(): AsyncGenerator<string> {
      yield "오늘 지우는 ";
      yield "ㅅ 발음을 ";
      yield "잘 해 주었어요.";
    }
    streamTextMock.mockReturnValueOnce({ textStream: asyncGen() });
    const stream = await streamCushionNote(BASE_INPUT);
    const text = await consumeStream(stream);
    expect(text).toBe("오늘 지우는 ㅅ 발음을 잘 해 주었어요.");
    expect(text).not.toContain(CUSHION_SWAP_MARKER);
  });

  it("scenario 12: streaming 응답에 금칙어 포함 → CUSHION_SWAP_MARKER 발송 + template 후속 chunk", async () => {
    enableGeminiPath();
    async function* asyncGen(): AsyncGenerator<string> {
      yield "오늘 ";
      yield "치료 권장합니다."; // CON-04 금칙어
    }
    streamTextMock.mockReturnValueOnce({ textStream: asyncGen() });
    const stream = await streamCushionNote(BASE_INPUT);
    const text = await consumeStream(stream);
    expect(text).toContain(CUSHION_SWAP_MARKER);
    // 마커 이후 텍스트는 template (금칙어 0건).
    const afterMarker = text.split(CUSHION_SWAP_MARKER)[1] ?? "";
    expect(hasBannedTerm(afterMarker)).toBe(false);
    expect(afterMarker.length).toBeGreaterThan(20);
  });

  it("scenario 12b: streaming 응답이 빈 chunk 만 → template 단일 chunk 보강", async () => {
    enableGeminiPath();
    async function* asyncGen(): AsyncGenerator<string> {
      yield "";
    }
    streamTextMock.mockReturnValueOnce({ textStream: asyncGen() });
    const stream = await streamCushionNote(BASE_INPUT);
    const text = await consumeStream(stream);
    expect(text.length).toBeGreaterThan(20);
    expect(hasBannedTerm(text)).toBe(false);
  });

  it("scenario 12c: streaming 중간 에러 → 부분 누적 + template 보강", async () => {
    enableGeminiPath();
    async function* asyncGen(): AsyncGenerator<string> {
      yield "오늘 ";
      throw new Error("stream error");
    }
    streamTextMock.mockReturnValueOnce({ textStream: asyncGen() });
    const stream = await streamCushionNote(BASE_INPUT);
    const text = await consumeStream(stream);
    // 부분 누적 ("오늘 ") + 금칙어 없으므로 swap 마커 없음.
    expect(text).toContain("오늘 ");
  });
});

// ============================================================================
// 4. generateCushionTemplate — 음소 × 점수 구간 = 모두 금칙어 0건
// ============================================================================

describe("generateCushionTemplate — CON-04 금칙어 0건 보장", () => {
  const phonemes: CushionInput["targetPhoneme"][] = ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"];
  const bandScores = [40, 70, 90]; // low / mid / high

  it("scenario 13: 음소 5종 × 점수 구간 3종 = 15 변형 모두 금칙어 0건", () => {
    for (const phoneme of phonemes) {
      for (const score of bandScores) {
        const input: CushionInput = {
          evaluationResultId: `eval-${phoneme}-${score}`,
          studentName: "지우",
          targetPhoneme: phoneme,
          articulationScore: score,
          linguisticScore: score,
          acousticScore: score,
        };
        const text = generateCushionTemplate(input);
        expect(hasBannedTerm(text), `phoneme=${phoneme} score=${score}: "${text}"`).toBe(false);
        expect(text.length).toBeGreaterThan(40);
        expect(text).toContain(phoneme);
      }
    }
  });

  it("scenario 14a: studentName 포함 → 카피 첫머리에 호명", () => {
    const text = generateCushionTemplate({ ...BASE_INPUT, studentName: "지우" });
    expect(text.startsWith("지우 보호자님,")).toBe(true);
  });

  it("scenario 14b: studentName 미포함 → '보호자님' 폴백", () => {
    const noName: CushionInput = { ...BASE_INPUT };
    delete noName.studentName;
    const text = generateCushionTemplate(noName);
    expect(text.startsWith("보호자님,")).toBe(true);
  });

  it("scenario 14c: 점수 구간 분기 — high(>80) 카피는 '또렷' 또는 '안정' 포함", () => {
    const text = generateCushionTemplate({
      ...BASE_INPUT,
      articulationScore: 90,
      linguisticScore: 90,
      acousticScore: 90,
    });
    // 칭찬 카피 검증 (high band)
    expect(text).toMatch(/(또렷|안정)/);
  });
});

// FR-C-001 §A — generateCushion Server Action 단위 테스트.

import { describe, it, expect, vi, beforeEach } from "vitest";

const findUniqueMock = vi.fn();
const updateMock = vi.fn();
const generatePlainTextMock = vi.fn();
const hasBannedTermMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    evaluationResult: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
    },
  },
}));

vi.mock("@/lib/ai/gemini", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/gemini")>("@/lib/ai/gemini");
  return {
    ...actual,
    generatePlainText: (...args: unknown[]) => generatePlainTextMock(...args),
  };
});

vi.mock("@/lib/forbidden-words", () => ({
  hasBannedTerm: (...args: unknown[]) => hasBannedTermMock(...args),
}));

import { generateCushion } from "@/app/actions/cushion";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  findUniqueMock.mockReset();
  updateMock.mockReset();
  generatePlainTextMock.mockReset();
  hasBannedTermMock.mockReset();
  hasBannedTermMock.mockReturnValue(false);
});

describe("generateCushion", () => {
  it("DB 에 텍스트가 이미 있으면 Gemini 미호출 + fromCache=true 반환", async () => {
    findUniqueMock.mockResolvedValue({
      aiCushionText: "이미 채워진 따뜻한 한마디.",
      peerPercentile: 80,
      targetPhoneme: "ㅅ",
      childAgeMonths: 36,
    });

    const out = await generateCushion({ sessionId: SESSION_ID });

    expect(out.aiCushionText).toBe("이미 채워진 따뜻한 한마디.");
    expect(out.fromCache).toBe(true);
    expect(generatePlainTextMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("DB 에 텍스트가 null 이면 Gemini 호출 + UPDATE + fromCache=false", async () => {
    findUniqueMock.mockResolvedValue({
      aiCushionText: null,
      peerPercentile: 65,
      targetPhoneme: "ㄱ",
      childAgeMonths: 48,
    });
    generatePlainTextMock.mockResolvedValue("정성스레 연습하면 또래에 가까워져요.");
    updateMock.mockResolvedValue({});

    const out = await generateCushion({ sessionId: SESSION_ID });

    expect(out.fromCache).toBe(false);
    expect(out.aiCushionText).toContain("연습");
    expect(generatePlainTextMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);
    const updateArg = updateMock.mock.calls[0][0] as {
      where: { sessionId: string };
      data: { aiCushionText: string };
    };
    expect(updateArg.where.sessionId).toBe(SESSION_ID);
    expect(updateArg.data.aiCushionText).toContain("연습");
  });

  it("Gemini 응답에 금칙어 발견 시 재생성 1회 → 통과", async () => {
    findUniqueMock.mockResolvedValue({
      aiCushionText: null,
      peerPercentile: 50,
      targetPhoneme: "ㅈ",
      childAgeMonths: 30,
    });
    generatePlainTextMock
      .mockResolvedValueOnce("진단 결과 안내드립니다.") // 1회차 금칙어 포함
      .mockResolvedValueOnce("천천히 발음해 봐도 좋아요."); // 2회차 통과
    hasBannedTermMock
      .mockReturnValueOnce(true) // 1회차 banned
      .mockReturnValueOnce(false); // 2회차 OK
    updateMock.mockResolvedValue({});

    const out = await generateCushion({ sessionId: SESSION_ID });

    expect(generatePlainTextMock).toHaveBeenCalledTimes(2);
    expect(out.aiCushionText).toContain("천천히");
  });

  it("재생성도 금칙어 → SAFE_CUSHION_FALLBACK 사용", async () => {
    findUniqueMock.mockResolvedValue({
      aiCushionText: null,
      peerPercentile: 50,
      targetPhoneme: "ㄴ",
      childAgeMonths: 30,
    });
    generatePlainTextMock
      .mockResolvedValueOnce("치료 권장합니다.") // banned
      .mockResolvedValueOnce("증상 안내드립니다."); // banned 재생성
    hasBannedTermMock.mockReturnValue(true); // 2회 모두 banned
    updateMock.mockResolvedValue({});

    const out = await generateCushion({ sessionId: SESSION_ID });

    expect(out.aiCushionText).toContain("즐겁게");
  });

  it("evaluation_results row 없음 → fallback 반환 + UPDATE 미호출", async () => {
    findUniqueMock.mockResolvedValue(null);

    const out = await generateCushion({ sessionId: SESSION_ID });

    expect(out.fromCache).toBe(false);
    expect(out.aiCushionText).toContain("즐겁게");
    expect(generatePlainTextMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("Gemini 호출 실패 → fallback + UPDATE 는 fallback 으로 진행", async () => {
    findUniqueMock.mockResolvedValue({
      aiCushionText: null,
      peerPercentile: 70,
      targetPhoneme: "ㄹ",
      childAgeMonths: 60,
    });
    generatePlainTextMock.mockRejectedValue(new Error("network down"));
    updateMock.mockResolvedValue({});

    const out = await generateCushion({ sessionId: SESSION_ID });

    expect(out.aiCushionText).toContain("즐겁게");
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("sessionId 가 uuid 가 아니면 Zod throw", async () => {
    await expect(generateCushion({ sessionId: "not-a-uuid" })).rejects.toThrow();
  });
});

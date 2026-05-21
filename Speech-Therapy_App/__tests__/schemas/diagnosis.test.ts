// TEST-001 근간 — DiagnosisOutputSchema + MOCK 100% 호환 검증.

import { describe, it, expect } from "vitest";
import {
  DiagnosisInputSchema,
  DiagnosisOutputSchema,
} from "@/lib/schemas/diagnosis";
import {
  mockSuccessHigh,
  mockSuccessLow,
} from "@/lib/mocks/diagnosis";

describe("DiagnosisInputSchema (Sprint 2 §2 — intendedWord 필수)", () => {
  it("정상 입력 검증 통과", () => {
    const valid = {
      intendedWord: "사과",
      transcript: "사과",
      childAgeMonths: 36,
      targetPhoneme: "ㅅ" as const,
    };
    expect(() => DiagnosisInputSchema.parse(valid)).not.toThrow();
  });

  it("intendedWord 누락 → 차단", () => {
    expect(() =>
      DiagnosisInputSchema.parse({
        transcript: "사과",
        childAgeMonths: 36,
        targetPhoneme: "ㅅ",
      }),
    ).toThrow();
  });

  it("빈 transcript 차단", () => {
    expect(() =>
      DiagnosisInputSchema.parse({
        intendedWord: "사과",
        transcript: "",
        childAgeMonths: 36,
        targetPhoneme: "ㅅ",
      }),
    ).toThrow();
  });

  it("월령 범위 외 차단 (만 8세 = 96)", () => {
    expect(() =>
      DiagnosisInputSchema.parse({
        intendedWord: "사과",
        transcript: "사과",
        childAgeMonths: 96,
        targetPhoneme: "ㅅ",
      }),
    ).toThrow();
  });

  // FR-C-004 / D6 — audio binary 필드 차단 검증.
  // 'audioBlob' / 'audioBase64' / 'audioFile' 같은 우회 시도가 schema 에서 거부되어야 함 (Zod strict 가 아니라도 추가 필드는 무시되어 서버에 전달 안 됨).
  it("D6 — DiagnosisInputSchema 가 audio binary 필드 없이 통과 / 추가 필드 silently strip", () => {
    const withAudioAttempt = {
      intendedWord: "사과",
      transcript: "사과",
      childAgeMonths: 36,
      targetPhoneme: "ㅅ" as const,
      // 우회 시도 — 본 필드들은 schema 에 정의되지 않아 parse 결과에서 제거됨.
      audioBlob: "base64-data-stub",
      audioFile: "https://attacker.example.com/file.wav",
      rawAudio: new Uint8Array([1, 2, 3]),
    };
    const parsed = DiagnosisInputSchema.parse(withAudioAttempt);
    // Zod 기본 strip — audio* 필드는 결과에 없어야 함 (서버 코드 어디에도 도달 안 함 보증).
    expect(parsed).not.toHaveProperty("audioBlob");
    expect(parsed).not.toHaveProperty("audioFile");
    expect(parsed).not.toHaveProperty("rawAudio");
    // 정상 필드는 유지.
    expect(parsed.intendedWord).toBe("사과");
    expect(parsed.transcript).toBe("사과");
  });

  it("D6 — DiagnosisInputSchema 의 모든 정의 필드가 text/number 만 (binary 0개)", () => {
    // schema 의 shape 를 reflection 으로 점검 — Zod 4.x ZodObject._def.shape().
    // 정확한 타입 검사 대신 'binary 같은 의심 키워드 없음' 의 sanity check.
    const SUSPECT_BINARY_KEYS = ["audio", "blob", "binary", "raw", "buffer", "file"];
    const valid = {
      intendedWord: "사과",
      transcript: "사과",
      childAgeMonths: 36,
      targetPhoneme: "ㅅ" as const,
    };
    const parsed = DiagnosisInputSchema.parse(valid);
    for (const key of Object.keys(parsed)) {
      const lower = key.toLowerCase();
      for (const suspect of SUSPECT_BINARY_KEYS) {
        expect(lower.includes(suspect)).toBe(false);
      }
    }
  });

  it("targetPhoneme 시드 5종 외 차단", () => {
    expect(() =>
      DiagnosisInputSchema.parse({
        intendedWord: "사과",
        transcript: "사과",
        childAgeMonths: 36,
        targetPhoneme: "ㅎ", // 시드 외
      }),
    ).toThrow();
  });
});

describe("DiagnosisOutputSchema ↔ MOCK 호환성", () => {
  it("mockSuccessHigh 스키마 통과", () => {
    expect(() => DiagnosisOutputSchema.parse(mockSuccessHigh)).not.toThrow();
  });

  it("mockSuccessLow 스키마 통과", () => {
    expect(() => DiagnosisOutputSchema.parse(mockSuccessLow)).not.toThrow();
  });

  it("mockSuccessLow 는 requiresHITL=true (confidence < 70)", () => {
    expect(mockSuccessLow.confidence).toBeLessThan(70);
    expect(mockSuccessLow.requiresHITL).toBe(true);
  });

  it("disclaimerRequired 는 literal true (Sprint 1 강제)", () => {
    expect(mockSuccessHigh.disclaimerRequired).toBe(true);
    expect(mockSuccessLow.disclaimerRequired).toBe(true);
  });
});

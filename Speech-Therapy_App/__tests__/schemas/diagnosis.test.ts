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

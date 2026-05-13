// FR-Q-002 의 인라인 sanitize 동작 검증. forbidden-words 와 단일 소스 정합.

import { describe, it, expect } from "vitest";
import {
  containsBannedTerms,
  sanitizeUserFacingText,
} from "@/lib/text-safety";

const SAFE_FALLBACK = "잘 발음하고 있어요. 즐겁게 한 번 더 시도해 볼까요?";

describe("text-safety: containsBannedTerms", () => {
  it("금칙어 포함 → true", () => {
    expect(containsBannedTerms("진단 결과 안내")).toBe(true);
  });
  it("일반 문구 → false", () => {
    expect(containsBannedTerms("또래의 상위 10% 입니다")).toBe(false);
  });
  it("화이트리스트 (치료사) → false", () => {
    expect(containsBannedTerms("치료사 선생님")).toBe(false);
  });
});

describe("text-safety: sanitizeUserFacingText", () => {
  it("null/undefined → 안전 문구 fallback", () => {
    expect(sanitizeUserFacingText(null)).toBe(SAFE_FALLBACK);
    expect(sanitizeUserFacingText(undefined)).toBe(SAFE_FALLBACK);
    expect(sanitizeUserFacingText("")).toBe(SAFE_FALLBACK);
  });

  it("금칙어 포함 → 안전 문구로 대체", () => {
    expect(sanitizeUserFacingText("진단을 받으세요")).toBe(SAFE_FALLBACK);
  });

  it("정상 문구 → 원문 그대로", () => {
    const text = "또래의 상위 10% 안에 들어요";
    expect(sanitizeUserFacingText(text)).toBe(text);
  });
});

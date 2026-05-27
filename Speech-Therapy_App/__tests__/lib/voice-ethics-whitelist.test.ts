// TEST-019 (a) — F11 윤리 화이트리스트 단위 테스트 (V07 §4.1 F11, ADR-09).
//
// 시나리오:
//   1) 허용 — storybook / lullaby 통과
//   2) 차단 — exercise / correction / diagnose / therapy 차단
//   3) 미정의 contentType — 차단
//   4) assertVoiceContentAllowed — throw EthicsViolationError
//   5) sanitizeAppliedContentTypes — 화이트리스트 only 통과 + 중복 제거
//   6) 회귀 sentinel — 화이트리스트 / 금지 리스트 정확성

import { describe, expect, it } from "vitest";
import {
  isVoiceContentAllowed,
  assertVoiceContentAllowed,
  sanitizeAppliedContentTypes,
  ALLOWED_VOICE_CONTENT_TYPES,
  FORBIDDEN_VOICE_CONTENT_TYPES,
  EthicsViolationError,
} from "@/lib/voice-clone/ethics-whitelist";

describe("TEST-019 — F11 윤리 화이트리스트 (ADR-09)", () => {
  describe("Scenario 1: 허용 contentType", () => {
    it.each(["storybook", "lullaby"])("[1] '%s' 허용", (ct) => {
      expect(isVoiceContentAllowed(ct)).toBe(true);
      expect(() => assertVoiceContentAllowed(ct)).not.toThrow();
    });
  });

  describe("Scenario 2: 차단 contentType (ADR-09)", () => {
    it.each(["exercise", "correction", "diagnose", "therapy"])(
      "[2] '%s' 차단 — assertVoiceContentAllowed throw",
      (ct) => {
        expect(isVoiceContentAllowed(ct)).toBe(false);
        expect(() => assertVoiceContentAllowed(ct)).toThrow(EthicsViolationError);
        expect(() => assertVoiceContentAllowed(ct)).toThrow(/VOICE_ETHICS_VIOLATION/);
      },
    );
  });

  describe("Scenario 3: 미정의 contentType 차단", () => {
    it("[3] 'unknown_kind' 차단", () => {
      expect(isVoiceContentAllowed("unknown_kind")).toBe(false);
      expect(() => assertVoiceContentAllowed("unknown_kind")).toThrow(
        EthicsViolationError,
      );
    });

    it("[3b] 빈 문자열 차단", () => {
      expect(isVoiceContentAllowed("")).toBe(false);
      expect(() => assertVoiceContentAllowed("")).toThrow(EthicsViolationError);
    });

    it("[3c] 대소문자 다른 'Storybook' 차단 (strict)", () => {
      expect(isVoiceContentAllowed("Storybook")).toBe(false);
      expect(() => assertVoiceContentAllowed("Storybook")).toThrow(EthicsViolationError);
    });
  });

  describe("Scenario 4: EthicsViolationError shape", () => {
    it("[4] code / contentType / message 포함", () => {
      try {
        assertVoiceContentAllowed("exercise");
      } catch (err) {
        if (err instanceof EthicsViolationError) {
          expect(err.code).toBe("VOICE_ETHICS_VIOLATION");
          expect(err.contentType).toBe("exercise");
          expect(err.message).toContain("VOICE_ETHICS_VIOLATION");
          expect(err.message).toContain("exercise");
          expect(err.message).toContain("ADR-09");
        } else {
          throw new Error("EthicsViolationError 가 throw 되지 않음");
        }
      }
    });
  });

  describe("Scenario 5: sanitizeAppliedContentTypes", () => {
    it("[5-a] 화이트리스트만 통과 (혼합 입력)", () => {
      const sanitized = sanitizeAppliedContentTypes([
        "storybook",
        "exercise",
        "lullaby",
        "unknown",
        "therapy",
      ]);
      expect(sanitized.sort()).toEqual(["lullaby", "storybook"]);
    });

    it("[5-b] 중복 제거", () => {
      const sanitized = sanitizeAppliedContentTypes([
        "storybook",
        "storybook",
        "lullaby",
        "storybook",
      ]);
      expect(sanitized.sort()).toEqual(["lullaby", "storybook"]);
    });

    it("[5-c] 빈 배열 → 빈 배열", () => {
      expect(sanitizeAppliedContentTypes([])).toEqual([]);
    });

    it("[5-d] 모두 금지 contentType → 빈 배열", () => {
      const sanitized = sanitizeAppliedContentTypes([
        "exercise",
        "correction",
        "therapy",
      ]);
      expect(sanitized).toEqual([]);
    });
  });

  describe("Scenario 6: 회귀 sentinel — 화이트리스트 정확성", () => {
    it("[6-a] ALLOWED_VOICE_CONTENT_TYPES = [storybook, lullaby] (정확)", () => {
      expect([...ALLOWED_VOICE_CONTENT_TYPES].sort()).toEqual(["lullaby", "storybook"]);
    });

    it("[6-b] FORBIDDEN_VOICE_CONTENT_TYPES 4종 명시", () => {
      expect([...FORBIDDEN_VOICE_CONTENT_TYPES].sort()).toEqual([
        "correction",
        "diagnose",
        "exercise",
        "therapy",
      ]);
    });

    it("[6-c] 허용 / 금지 리스트 겹침 없음", () => {
      const allowed = new Set<string>(ALLOWED_VOICE_CONTENT_TYPES);
      for (const f of FORBIDDEN_VOICE_CONTENT_TYPES) {
        expect(allowed.has(f)).toBe(false);
      }
    });
  });
});

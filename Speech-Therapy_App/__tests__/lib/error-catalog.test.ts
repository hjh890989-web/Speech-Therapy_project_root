// MON-002 — error-catalog 단위 테스트.

import { describe, it, expect } from "vitest";
import {
  SttErrorCode,
  GeminiErrorCode,
  ErrorCode,
  getErrorSource,
  ERROR_WINDOW_MS,
  ERROR_THRESHOLD_RATIO,
} from "@/lib/error-catalog";

describe("error-catalog — Zod enum + 소스 분류", () => {
  it("SttErrorCode 6종", () => {
    expect(SttErrorCode.options).toEqual([
      "stt_no_speech",
      "stt_network",
      "stt_aborted",
      "stt_permission_denied",
      "stt_audio_capture",
      "stt_unknown",
    ]);
  });

  it("GeminiErrorCode 6종", () => {
    expect(GeminiErrorCode.options).toEqual([
      "gemini_rate_limited",
      "gemini_429",
      "gemini_timeout",
      "gemini_schema_invalid",
      "gemini_5xx",
      "gemini_unknown",
    ]);
  });

  it("ErrorCode union 은 STT 6 + Gemini 6 = 12", () => {
    expect(ErrorCode.options).toHaveLength(12);
  });

  it("getErrorSource — STT 분류", () => {
    expect(getErrorSource("stt_no_speech")).toBe("stt");
    expect(getErrorSource("stt_unknown")).toBe("stt");
  });

  it("getErrorSource — Gemini 분류", () => {
    expect(getErrorSource("gemini_429")).toBe("gemini");
    expect(getErrorSource("gemini_timeout")).toBe("gemini");
  });

  it("ERROR_WINDOW_MS — REQ-NF-021/024 정합", () => {
    expect(ERROR_WINDOW_MS.stt).toBe(5 * 60_000); // 5분
    expect(ERROR_WINDOW_MS.gemini).toBe(60 * 60_000); // 1시간
  });

  it("ERROR_THRESHOLD_RATIO — REQ-NF-021/024 정합", () => {
    expect(ERROR_THRESHOLD_RATIO.stt).toBe(0.03); // 3%
    expect(ERROR_THRESHOLD_RATIO.gemini).toBe(0.05); // 5%
  });

  it("Zod parse — 알 수 없는 코드 차단", () => {
    expect(() => ErrorCode.parse("unknown_code")).toThrow();
  });
});

// MON-002 / REQ-NF-021, 024 — 에러 코드 표준 카탈로그.
//
// 목적:
// - Vercel Logs 검색 친화 (검색 키워드 표준)
// - error-tracking.ts 의 메트릭 키로 사용 (윈도우/임계 정의)
// - 새 에러 코드 추가 시 본 파일에 등록 → 추적 자동
//
// 분류 기준:
// - source: 어디서 발생 (stt / gemini / external_api / supabase / internal)
// - 임계 정책: STT 5분 윈도우 3% / Gemini 1시간 윈도우 5% (REQ-NF-021/024)

import { z } from "zod";

/// STT (Web Speech API) 에러 — FR-Q-001 useSpeechRecognition.
export const SttErrorCode = z.enum([
  "stt_no_speech", // 발화 없음
  "stt_network", // 네트워크 실패
  "stt_aborted", // 사용자 중단 (보통 정상)
  "stt_permission_denied", // 마이크 권한 거부
  "stt_audio_capture", // 마이크 캡처 실패 (장치 문제)
  "stt_unknown",
]);
export type SttErrorCode = z.infer<typeof SttErrorCode>;

/// Gemini API 에러 — API-011 generateJson / generatePlainText.
export const GeminiErrorCode = z.enum([
  "gemini_rate_limited", // 자체 RateLimiter (SEC-004) 차단
  "gemini_429", // Google API 429 (외부 quota)
  "gemini_timeout", // LLMTimeoutError (15s)
  "gemini_schema_invalid", // Zod refine 실패
  "gemini_5xx", // 외부 server error
  "gemini_unknown",
]);
export type GeminiErrorCode = z.infer<typeof GeminiErrorCode>;

/// 통합 에러 카탈로그 (트래킹용 union).
export const ErrorCode = z.enum([
  ...SttErrorCode.options,
  ...GeminiErrorCode.options,
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

/// 에러 소스 분류 — 윈도우/임계 정책 분기.
export type ErrorSource = "stt" | "gemini";

export function getErrorSource(code: ErrorCode): ErrorSource {
  if ((SttErrorCode.options as ReadonlyArray<string>).includes(code)) return "stt";
  return "gemini";
}

/// 윈도우 정책 (REQ-NF-021, 024).
export const ERROR_WINDOW_MS: Record<ErrorSource, number> = {
  stt: 5 * 60_000, // 5분
  gemini: 60 * 60_000, // 1시간
};

/// 임계 비율 (5% / 3%).
export const ERROR_THRESHOLD_RATIO: Record<ErrorSource, number> = {
  stt: 0.03, // 3% (REQ-NF-021)
  gemini: 0.05, // 5% (REQ-NF-024)
};

/// 메트릭 카운터 표준 키.
export interface ErrorEvent {
  code: ErrorCode;
  /// ISO 8601 ms — Date.now() 결과.
  timestamp: number;
}

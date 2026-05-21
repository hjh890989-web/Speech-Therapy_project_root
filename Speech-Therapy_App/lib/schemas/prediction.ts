// API — predictNextScore() Server Action 계약.
// 구현 책임: app/actions/prediction.ts (FR-C-011).
// REQ-FUNC-044 (회귀 모델 기반 예상 점수 + 신뢰구간).

import { z } from "zod";

export const PredictionErrorCode = z.enum([
  "INSUFFICIENT_HISTORY", // 4주 미만
  "RATE_LIMITED",          // SEC-004 rate limit
  "INTERNAL_ERROR",
]);
export type PredictionErrorCode = z.infer<typeof PredictionErrorCode>;

/// missionFrequency 시뮬레이션 옵션 — 변경 시 별도 캐시 키.
export const MissionFrequencySchema = z.enum(["low", "normal", "high"]);
export type MissionFrequency = z.infer<typeof MissionFrequencySchema>;

export const PredictionInputSchema = z.object({
  userId: z.string().uuid(),
  /// 시뮬 옵션 — 미전달 시 'normal' 기본.
  missionFrequency: MissionFrequencySchema.optional(),
});
export type PredictionInput = z.infer<typeof PredictionInputSchema>;

/// Gemini JSON 응답 shape (회귀 추정).
export const PredictionGeminiOutputSchema = z
  .object({
    predicted: z.number().min(0).max(100),
    confidence: z.number().min(0).max(1),
    lower_bound: z.number().min(0).max(100),
    upper_bound: z.number().min(0).max(100),
  })
  .refine((v) => v.lower_bound <= v.predicted && v.predicted <= v.upper_bound, {
    message: "lower_bound ≤ predicted ≤ upper_bound 관계 위배",
  });
export type PredictionGeminiOutput = z.infer<typeof PredictionGeminiOutputSchema>;

/// Server Action 최종 응답 — null = INSUFFICIENT_HISTORY (4주 미만).
export const PredictionResultSchema = z.object({
  predictedNextScore: z.number().min(0).max(100),
  predictionConfidence: z.number().min(0).max(1),
  lowerBound: z.number().min(0).max(100),
  upperBound: z.number().min(0).max(100),
  basedOnWeeks: z.literal(4),
  /// 캐시 hit 여부 (UI 디버깅 / e2e 검증).
  cached: z.boolean(),
  /// rate limit graceful fallback 으로 직전 캐시 응답인 경우 true.
  staleFromRateLimit: z.boolean().optional(),
});
export type PredictionResult = z.infer<typeof PredictionResultSchema>;

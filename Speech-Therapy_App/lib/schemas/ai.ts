// API-011 — Vercel AI SDK + Gemini 어댑터 계약.
// SRS C-TEC-005~006, REQ-NF-018 (월 ≤ ₩5,250/유저).
// 실제 어댑터 코드 (`lib/ai/gemini.ts`, `lib/ai/prompts.ts`) 는 구현 단계에서.

import { z } from "zod";

export const AiProviderSchema = z.enum(["gemini", "openai", "anthropic"]);
export type AiProvider = z.infer<typeof AiProviderSchema>;

export const AiErrorCode = z.enum([
  "INVALID_INPUT",
  "RATE_LIMITED",
  "MODEL_TIMEOUT",
  "QUOTA_EXCEEDED",
  "INTERNAL_ERROR",
]);
export type AiErrorCode = z.infer<typeof AiErrorCode>;

export const TokenUsageSchema = z.object({
  model: z.string(),
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  /// USD 비용 추정 (모델별 단가 × 토큰).
  costUsd: z.number().min(0),
});
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const AiCallOptionsSchema = z.object({
  /// 환경 변수 AI_PROVIDER 와 override 가능 (D4 검증용).
  provider: AiProviderSchema.optional(),
  /// 사용자 단위 Rate Limit 키 (SEC-004 통합).
  userId: z.string().optional(),
  /// 시스템 프롬프트 override (테스트 용도). 미지정 시 lib/ai/prompts.ts 의 기본값 사용.
  systemPrompt: z.string().optional(),
});
export type AiCallOptions = z.infer<typeof AiCallOptionsSchema>;

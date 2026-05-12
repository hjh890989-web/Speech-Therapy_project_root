// API-005 / API-006 — HITL Route Handler 계약 (D4 적용).
// SRS §3.5, REQ-FUNC-003 / 032 / HITL-001~004.

import { z } from "zod";

export const HitlErrorCode = z.enum([
  "INVALID_INPUT",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "GONE",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);
export type HitlErrorCode = z.infer<typeof HitlErrorCode>;

// ============ API-005: POST /api/hitl/queue ============

export const HitlEnqueueInputSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  confidenceScore: z.number().min(0).max(100),
});
export type HitlEnqueueInput = z.infer<typeof HitlEnqueueInputSchema>;

export const HitlEnqueueOutputSchema = z.object({
  success: z.boolean(),
  queueId: z.string().uuid(),
  slaDueAt: z.string().datetime(),
  /// D4 Slack 웹훅 발송 결과. 실패해도 DB 성공 시 200 (graceful degradation).
  slackNotified: z.boolean(),
});
export type HitlEnqueueOutput = z.infer<typeof HitlEnqueueOutputSchema>;

// ============ API-006: PATCH /api/hitl/comment ============

export const GroundTruthScoreSchema = z.object({
  articulation: z.number().min(0).max(100),
  linguistic: z.number().min(0).max(100),
  acoustic: z.number().min(0).max(100),
  peerPercentile: z.number().min(0).max(100).optional(),
});
export type GroundTruthScore = z.infer<typeof GroundTruthScoreSchema>;

export const HitlCommentInputSchema = z.object({
  queueId: z.string().uuid(),
  expertId: z.string().uuid(),
  /// CON-04 금칙어 0건 보장 (서버 정규식 검증 추가).
  expertComment: z.string().min(1).max(2_000),
  groundTruthScore: GroundTruthScoreSchema,
});
export type HitlCommentInput = z.infer<typeof HitlCommentInputSchema>;

export const HitlCommentOutputSchema = z.object({
  success: z.boolean(),
  completedAt: z.string().datetime(),
  /// Resend 이메일 또는 Slack DM 사용자 알림 결과 (API-012 통합).
  userNotified: z.boolean(),
});
export type HitlCommentOutput = z.infer<typeof HitlCommentOutputSchema>;

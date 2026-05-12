// API-012 — Resend 이메일 + 클립보드 + Web Share + Slack 통합 알림 인터페이스.
// 67-D1 + D8: 카카오/키즈노트 미연동. 의존성 0 강제.

import { z } from "zod";

export const NotificationChannelSchema = z.enum([
  "email",
  "clipboard",
  "web-share",
  "slack",
]);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const NotificationTypeSchema = z.enum([
  "consent-signature",
  "consent-signed-confirmation",
  "hitl-review-completed",
  "weekly-report-ready",
  "b2b-notification",
  "ops-alert",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationErrorCode = z.enum([
  "INVALID_INPUT",
  "PROVIDER_FAILED",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);
export type NotificationErrorCode = z.infer<typeof NotificationErrorCode>;

export const NotifyInputSchema = z.object({
  channel: NotificationChannelSchema,
  type: NotificationTypeSchema,
  /// 이메일 / Slack 채널 = 수신자 식별자. 클립보드 / Web Share = 빈 문자열.
  recipient: z.string(),
  /// 템플릿별 페이로드. 타입 안전성은 호출 측에서 보장.
  payload: z.record(z.string(), z.unknown()),
});
export type NotifyInput = z.infer<typeof NotifyInputSchema>;

export const NotifyOutputSchema = z.object({
  success: z.boolean(),
  channel: NotificationChannelSchema,
  /// 채널별 외부 ID (Resend 메시지 ID 등).
  externalId: z.string().nullable(),
});
export type NotifyOutput = z.infer<typeof NotifyOutputSchema>;

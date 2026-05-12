// API-008 — /api/consent/sign 계약. SRS §3.5, REQ-FUNC-059~061.
// 검토 보고서 §2.2 [추가 E2]: 카카오 전자서명 미연동 → 일반 웹 폼 (IP/UA 로깅).
// 법적 효력: IP / UserAgent / consentText 스냅샷 / 타임스탬프 보존.

import { z } from "zod";

export const ConsentErrorCode = z.enum([
  "INVALID_INPUT",
  "UNAUTHORIZED",
  "NOT_FOUND",
  "GONE",
  "ALREADY_SIGNED",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);
export type ConsentErrorCode = z.infer<typeof ConsentErrorCode>;

// ============ POST /api/consent/sign — 동의서 생성 ============

export const ConsentCreateInputSchema = z.object({
  institutionId: z.string().uuid(),
  parentEmail: z.string().email(),
  parentPhone: z.string().regex(/^[0-9\-+()\s]{8,20}$/),
  /// R4 — 자녀 본명 X, nickname 만.
  childNickname: z.string().min(1).max(20),
  childAgeMonths: z.number().int().min(24).max(84),
});
export type ConsentCreateInput = z.infer<typeof ConsentCreateInputSchema>;

export const ConsentCreateOutputSchema = z.object({
  signatureToken: z.string().uuid(),
  signUrl: z.string().url(),
  expiresAt: z.string().datetime(),
});
export type ConsentCreateOutput = z.infer<typeof ConsentCreateOutputSchema>;

// ============ PATCH /api/consent/sign/confirm — 서명 완료 ============

export const ConsentConfirmInputSchema = z.object({
  token: z.string().uuid(),
  agreed: z.literal(true),
  signedName: z.string().min(1).max(50),
});
export type ConsentConfirmInput = z.infer<typeof ConsentConfirmInputSchema>;

export const ConsentConfirmOutputSchema = z.object({
  success: z.boolean(),
  signedAt: z.string().datetime(),
  /// Resend 이메일 확인 발송 결과.
  confirmationEmailSent: z.boolean(),
});
export type ConsentConfirmOutput = z.infer<typeof ConsentConfirmOutputSchema>;

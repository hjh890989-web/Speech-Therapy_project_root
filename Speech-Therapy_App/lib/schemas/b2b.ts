// API-007 — /api/b2b/approval (PATCH) 계약. SRS §3.5, REQ-FUNC-057~058.
// D8 적용: 키즈노트 미연동 → 클립보드 텍스트 반환.

import { z } from "zod";

export const B2bErrorCode = z.enum([
  "INVALID_INPUT",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INTERNAL_ERROR",
]);
export type B2bErrorCode = z.infer<typeof B2bErrorCode>;

export const B2bApprovalInputSchema = z.object({
  notificationDraftId: z.string().uuid(),
  approved: z.boolean(),
  /// 교사가 수정한 경우 본 필드로 전송. wasEdited 측정에 사용.
  editedText: z.string().max(5_000).optional(),
  teacherId: z.string().uuid(),
});
export type B2bApprovalInput = z.infer<typeof B2bApprovalInputSchema>;

export const B2bApprovalOutputSchema = z.object({
  success: z.boolean(),
  /// D8 핵심 — 키즈노트 붙여넣기용 텍스트. 자녀 본명 0건 보장.
  clipboardText: z.string(),
  /// REQ-FUNC-057 무수정 승인율 측정.
  wasEdited: z.boolean(),
  approvedAt: z.string().datetime(),
});
export type B2bApprovalOutput = z.infer<typeof B2bApprovalOutputSchema>;

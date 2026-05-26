// FR-PERF-3-USE-SERVER-REFACTOR — consent-sign Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

import { z } from "zod";

export const ConsentSignInputSchema = z.object({
  token: z.string().uuid("INVALID_TOKEN"),
  /// (선택) 추후 자녀 이름 재확인 / signature image base64 등 필드 확장 슬롯.
  signatureName: z.string().min(1).max(50).optional(),
});

export type ConsentSignActionInput = z.infer<typeof ConsentSignInputSchema>;

export interface ConsentSignActionResult {
  ok: boolean;
  /// 'signed' (성공) / 'already_signed' (멱등) / 'expired' / 'not_found' / 'invalid_input' / 'internal_error'.
  reason: string;
  /// 멱등 / 성공 시 마지막 4자리 token suffix — UI 친화 메시지에 사용 가능.
  tokenSuffix?: string;
}

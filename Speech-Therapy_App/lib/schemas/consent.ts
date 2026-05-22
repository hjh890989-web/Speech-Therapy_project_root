// API-008 — /api/consent/sign 계약. SRS §3.5, REQ-FUNC-059~061.
// 검토 보고서 §2.2 [추가 E2]: 카카오 전자서명 미연동 → 일반 웹 폼 (IP/UA 로깅).
// 법적 효력: IP / UserAgent / consentText 스냅샷 / 타임스탬프 보존.
//
// SEC-003 (sentinel commit ca71c88) 결함 패치:
//   1) childNickname XSS — 인라인 sanitize regex 로 `<`, `>`, `&`, `"`, `'`,
//      `script:` / `javascript:` 등 위험 문자 escape (별도 task: DOMPurify 정식 통합).
//   2) parentEmail — RFC 5321 254자 (.max(254)) 강제.

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

// ---- SEC-003 — 인라인 XSS sanitize (DOMPurify 정식 통합 전 1차 차단) ----
//
// 전략: HTML 위험 문자 (`<`, `>`, `&`, `"`, `'`) 를 HTML entity 로 escape.
// 추가로 `javascript:` / `script:` / `data:` / `vbscript:` 등 위험 scheme prefix
// 의 `:` 도 escape 하여 prefix 무력화. transform 후 .min(1) 재검증 (refine) 으로
// 모두 제거되어 빈 문자열이 되는 케이스 차단.
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function sanitizeNickname(raw: string): string {
  // 1) HTML entity escape — `&` 먼저 (이중 escape 방지).
  let s = raw.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]);
  // 2) `javascript:` / `script:` / `vbscript:` / `data:` 스킴 prefix 무력화 —
  //    스킴 토큰의 `:` 을 entity 로 치환하여 brower 가 스킴으로 해석 못 하게 함.
  s = s.replace(/(javascript|vbscript|data|script)(:)/gi, "$1&#58;");
  return s;
}

// ============ POST /api/consent/sign — 동의서 생성 ============

export const ConsentCreateInputSchema = z.object({
  institutionId: z.string().uuid(),
  // RFC 5321 — total length ≤ 254 octets.
  parentEmail: z.string().email().max(254),
  parentPhone: z.string().regex(/^[0-9\-+()\s]{8,20}$/),
  /// R4 — 자녀 본명 X, nickname 만. SEC-003 — 인라인 sanitize 적용.
  childNickname: z.string().min(1).max(20).transform(sanitizeNickname).refine(
    (s) => s.length > 0,
    { message: "childNickname 가 sanitize 후 빈 문자열 — 위험 문자만 입력됨." },
  ),
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

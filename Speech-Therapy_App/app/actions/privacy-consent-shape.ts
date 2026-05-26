// SEC-COMP-PIPA (Grill #3A A1+A2) — privacy-consent Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

/** Server Action 입력 — 두 동의 모두 사용자가 체크박스로 확인했음을 나타내는 boolean. */
export interface SavePrivacyConsentInput {
  /** PIPA §22-6 만 14세 미만 부모 대리 동의 — 자녀 개인정보 처리에 대한 법정대리인 동의. */
  pipaUnderage: boolean;
  /** PIPA §17 개인정보 국외 이전 동의 — STT (Google Cloud Speech US) + Gemini (US/global). */
  overseasTransfer: boolean;
}

/** Server Action 결과 — 호출 측이 graceful 분기. */
export interface SavePrivacyConsentResult {
  /** true: 두 동의 모두 저장 성공. false: 비인증 / 미체크 / DB 오류 등 graceful 실패. */
  success: boolean;
  /** 실패 사유 (UI 분기용). 성공 시 undefined. */
  reason?: "unauthorized" | "both_required" | "db_failed";
}

// 사업자 법적 정보 — /privacy·/terms 정식 시행에 필요한 조직 고유 값.
//
// 변호사 자문 "문제 없음"(2026-05-30) 완료 → 처리방침/약관 본문은 정식 반영됨.
// 단 **상호(사업자명)·개인정보 보호책임자가 미확정** → 본 상수만 채우면 정식 시행으로 전환된다.
// (COMPANY_INFO_FINALIZED=true 로 바꾸면 페이지의 '확정 후 시행' 안내가 사라짐.)

export const COMPANY_INFO = {
  /// 상호(법인/사업자명). 미확정 — 확정 후 교체.
  name: "[상호 확정 예정]",
  /// 개인정보 보호책임자 성명/직책. 미확정.
  privacyOfficer: "[책임자 확정 예정]",
  /// 보호책임자 연락처(이메일 등). 미확정.
  privacyOfficerContact: "[연락처 확정 예정]",
  /// 정식 시행일. 상호/책임자 확정 후 기재.
  effectiveDate: "[시행일 확정 예정]",
} as const;

/// 사업자 정보(상호·책임자) 확정 여부. false → 페이지에 "확정 후 정식 시행" 안내 노출.
/// 상호/책임자 확정 + COMPANY_INFO 채운 뒤 true 로 변경.
export const COMPANY_INFO_FINALIZED = false;

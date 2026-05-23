// API-012 (#13) — Resend 발송 주체 (from address) 결정 helper.
// Replace 67-D1 + D8 — 카카오 / 키즈노트 직접 발송 미연동, Resend 이메일로 통일.
//
// 환경 변수:
//   - RESEND_FROM_EMAIL: 실 발송 주소 (Resend Dashboard 에서 verified domain).
//     미설정 시 기본값 (placeholder) — 실 발송 시 Resend 가 SPF/DKIM 검증 실패 응답.
//   - RESEND_FROM_NAME: friendly name (선택). 미설정 시 "Speech-Therapy".
//
// 형식: "Friendly Name <noreply@domain.com>" 또는 "noreply@domain.com"
//   - Resend API 가 둘 다 허용 (CreateEmailBaseOptions.from doc).
//
// CON-04: friendly name 에 금칙어 ("치료/진단/장애") 사용 금지 — 컴파일 타임 정적 값이므로
//   본 helper 안에서 lib/forbidden-words 검증 (방어적). 호출 측 책임 아님.

import { hasBannedTerm } from "@/lib/forbidden-words";

/// 기본 발송 주소 — Resend 가 SPF/DKIM 검증 실패 시 graceful 응답.
/// 실 운영은 RESEND_FROM_EMAIL 환경변수로 verified domain 지정 필수.
const DEFAULT_FROM_EMAIL = "noreply@speech-therapy.example.com";
const DEFAULT_FROM_NAME = "Speech-Therapy";

/// 이메일 주소 형식 정합성 (loose RFC5322 subset — Resend 가 strict 검증).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/// 발송 주체 결정 — RESEND_FROM_EMAIL + (선택) RESEND_FROM_NAME 조합.
/// 반환 형식:
///   - friendly name 존재 → `Name <addr@domain>`
///   - 없음 → `addr@domain`
/// CON-04: friendly name 에 금칙어 포함 시 DEFAULT_FROM_NAME 으로 폴백 + warn log.
export function getFromAddress(): string {
  const rawEmail = (process.env.RESEND_FROM_EMAIL ?? "").trim();
  const email = rawEmail.length > 0 && EMAIL_REGEX.test(rawEmail)
    ? rawEmail
    : DEFAULT_FROM_EMAIL;

  const rawName = (process.env.RESEND_FROM_NAME ?? "").trim();
  let name: string = rawName.length > 0 ? rawName : DEFAULT_FROM_NAME;

  // CON-04 방어: friendly name 에 금칙어 포함 시 기본값으로 폴백.
  if (hasBannedTerm(name)) {
    console.warn(
      "[email/from] RESEND_FROM_NAME contains banned term — fallback to default",
    );
    name = DEFAULT_FROM_NAME;
  }

  return name.length > 0 ? `${name} <${email}>` : email;
}

/// 주로 테스트에서 사용 — 환경변수 노출 없이 raw email 부분만 추출.
export function getFromEmailOnly(): string {
  const rawEmail = (process.env.RESEND_FROM_EMAIL ?? "").trim();
  return rawEmail.length > 0 && EMAIL_REGEX.test(rawEmail)
    ? rawEmail
    : DEFAULT_FROM_EMAIL;
}

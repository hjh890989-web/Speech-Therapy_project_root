// API-012 (#13) — Resend 이메일 템플릿 helper (Replace 67-D1 + D8).
//
// 본 모듈은 재사용 가능한 이메일 본문 생성 함수만 export — 실 발송은 lib/email/resend.ts.
//
// 본 PR 범위:
//   - parent_invite (부모 초대) — 실 사용 (FR-Q-009 / FR-C-005 인증 onboarding)
//   - consent_signature (FR-C-018 #41 동의서) — placeholder signature 만, 실 본문은 FR-C-018 PR 에서 세부화
//
// CON-04 정책:
//   - 템플릿 본문 / 변수 interpolation 결과에 금칙어 ("치료/진단/장애") 절대 미포함.
//   - 화이트리스트 ("치료실/치료사/언어치료") 는 예외 — forbidden-words.ts 가 자동 처리.
//   - 실 발송 시 sendEmail() 가 한 번 더 detectBannedTerms() 로 차단 (defense in depth).
//
// R4 정책 — 자녀 보호자/부모 수신자 이메일이므로 자녀 식별 정보 (이름) 허용.
//   외부 노출 (스팸 회피) 은 호출 측 책임.
//
// HTML escape: 모든 변수는 escapeHtml() 통과 후 interpolate.

/// HTML 위험 문자 escape — XSS / 본문 변조 방지.
/// 본 helper 는 안전한 5문자 escape (& < > " ') — 충분.
export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/// 템플릿 결과 — subject + html + text 동시 반환.
/// sendEmail 호출 측이 EmailMessage 의 subject/html/text 로 spread.
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/// 부모 초대 이메일 입력.
export interface ParentInviteInput {
  /// 기관명 (어린이집/유치원). 예: "행복어린이집"
  institutionName: string;
  /// 가입/초대 링크 (signed URL). 예: "https://speech-therapy.app/invite?token=..."
  signupLink: string;
  /// (선택) 자녀 이름 (수신자 = 부모이므로 R4 허용).
  childName?: string;
  /// (선택) 발신 기관 담당자 이름 (원장/선생님).
  senderName?: string;
}

/// FR-Q-009 / FR-C-005 — 원장 / 기관 담당자가 부모를 초대하는 이메일.
///
/// 본문 정책 (CON-04 안전):
///   - "발음 발달 확인" / "발음 가이드" 표현만 사용
///   - "치료/진단/장애" 단어 절대 미포함
///   - 부모가 가입 후 자녀 등록 동의 단계로 이동.
export function buildParentInviteEmail(input: ParentInviteInput): EmailTemplate {
  const institution = escapeHtml(input.institutionName);
  const link = escapeHtml(input.signupLink);
  const child = input.childName ? escapeHtml(input.childName) : null;
  const sender = input.senderName ? escapeHtml(input.senderName) : null;

  const greeting = child
    ? `${child} 부모님께`
    : "부모님께";
  const senderLine = sender
    ? `${institution} ${sender} 드림`
    : `${institution} 드림`;

  const subject = `[${input.institutionName}] Speech-Therapy 발음 발달 확인 안내`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px; margin-bottom: 16px;">${greeting}</h1>
  <p style="font-size: 15px; line-height: 1.6;">
    안녕하세요. <strong>${institution}</strong> 에서 자녀 발음 발달 확인을 위해 Speech-Therapy 가입을 안내드립니다.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    Speech-Therapy 는 만 2~7세 자녀의 발음 발달 상태를 부모님이 가정에서 확인할 수 있는 보조 도구입니다.
    의료적 판단을 제공하지 않으며, 발음 가이드와 주간 미션을 통해 자녀의 발달을 함께 살펴봅니다.
  </p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
      가입하고 시작하기
    </a>
  </p>
  <p style="font-size: 13px; color: #666; line-height: 1.5;">
    링크가 동작하지 않으면 아래 주소를 브라우저에 복사하세요:<br>
    <span style="word-break: break-all;">${link}</span>
  </p>
  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="font-size: 13px; color: #666;">${senderLine}</p>
  <p style="font-size: 11px; color: #999;">
    본 메일은 발신 전용입니다. 문의는 기관 담당자에게 직접 연락주세요.<br>
    Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.
  </p>
</body>
</html>`;

  const text = [
    greeting,
    "",
    `안녕하세요. ${input.institutionName} 에서 자녀 발음 발달 확인을 위해 Speech-Therapy 가입을 안내드립니다.`,
    "",
    "Speech-Therapy 는 만 2~7세 자녀의 발음 발달 상태를 부모님이 가정에서 확인할 수 있는 보조 도구입니다.",
    "의료적 판단을 제공하지 않으며, 발음 가이드와 주간 미션을 통해 자녀의 발달을 함께 살펴봅니다.",
    "",
    `가입 링크: ${input.signupLink}`,
    "",
    "---",
    sender ? `${input.institutionName} ${input.senderName} 드림` : `${input.institutionName} 드림`,
    "본 메일은 발신 전용입니다. 문의는 기관 담당자에게 직접 연락주세요.",
    "Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.",
  ].join("\n");

  return { subject, html, text };
}

/// FR-C-018 (#41) — 동의서 서명 요청 placeholder.
/// 본 PR 범위: signature 만 + 단순 본문. 실 본문/링크/만료 정책은 FR-C-018 PR 에서 확장.
export interface ConsentSignatureInput {
  /// 부모 이름.
  parentName: string;
  /// 자녀 이름 (R4 허용 — 수신자가 부모).
  childName: string;
  /// 서명 페이지 signed URL.
  signLink: string;
  /// (선택) 동의서 종류 — 'media' / 'data_processing' 등.
  consentType?: string;
}

export function buildConsentSignatureEmail(
  input: ConsentSignatureInput,
): EmailTemplate {
  const parent = escapeHtml(input.parentName);
  const child = escapeHtml(input.childName);
  const link = escapeHtml(input.signLink);
  const type = input.consentType
    ? escapeHtml(input.consentType)
    : "데이터 활용";

  const subject = `[Speech-Therapy] ${input.childName} 학습 동의서 서명 안내`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px;">${parent} 부모님께</h1>
  <p style="font-size: 15px; line-height: 1.6;">
    ${child} 의 ${type} 동의서 서명을 요청드립니다.
    아래 링크에서 내용을 확인하시고 서명해주세요.
  </p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
      동의서 확인 및 서명
    </a>
  </p>
  <p style="font-size: 13px; color: #666;">
    링크가 동작하지 않으면: <span style="word-break: break-all;">${link}</span>
  </p>
  <p style="font-size: 11px; color: #999;">
    Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.
  </p>
</body>
</html>`;

  const text = [
    `${input.parentName} 부모님께`,
    "",
    `${input.childName} 의 ${input.consentType ?? "데이터 활용"} 동의서 서명을 요청드립니다.`,
    "아래 링크에서 내용을 확인하시고 서명해주세요.",
    "",
    `서명 링크: ${input.signLink}`,
    "",
    "Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.",
  ].join("\n");

  return { subject, html, text };
}

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

/// FR-C-018 (#41) — 동의서 서명 요청 본문.
///
/// 본 템플릿은 동의서 _최초 발송_ 시 사용. D+3 리마인더 / 7일 만료 안내는 별도 빌더 사용
/// (buildConsentReminderEmail / buildConsentExpiredEmail).
///
/// 본문 정책 (CON-04 안전):
///   - "데이터 활용 동의" / "부모용 보조 도구" 표현만 사용
///   - "치료/진단/장애" 단어 절대 미포함 (테스트 hasBannedTerm 검증)
///   - 의료 서비스 아님 disclaimer 포함
///
/// 만료일 표시: 동의서 발송일 + 7일 후 자동 만료 — 부모가 마감 인지 가능하도록 명시.
export interface ConsentSignatureInput {
  /// 부모 이름.
  parentName: string;
  /// 자녀 이름 (R4 허용 — 수신자가 부모).
  childName: string;
  /// 서명 페이지 signed URL.
  signLink: string;
  /// (선택) 동의서 종류 라벨 — 기본 "데이터 활용".
  consentType?: string;
  /// (선택) 만료 일시 ISO 문자열. 미설정 시 본문에 만료 안내 미표시.
  expiresAt?: string;
}

/// 만료 일시를 한국어 친화 포맷으로 변환 (YYYY-MM-DD HH:mm).
/// Date 파싱 실패 시 원본 그대로 반환 (graceful).
function formatExpiresAt(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  } catch {
    return iso;
  }
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
  const expiresLine = input.expiresAt
    ? `(서명 마감: ${escapeHtml(formatExpiresAt(input.expiresAt))} — 7일 경과 시 자동 만료)`
    : "(서명 마감: 발송 후 7일 — 마감 후 자동 만료)";
  const expiresLineText = input.expiresAt
    ? `(서명 마감: ${formatExpiresAt(input.expiresAt)} — 7일 경과 시 자동 만료)`
    : "(서명 마감: 발송 후 7일 — 마감 후 자동 만료)";

  const subject = `[Speech-Therapy] ${input.childName} 발음 발달 확인 동의서 안내`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px; margin-bottom: 16px;">${parent} 부모님께</h1>
  <p style="font-size: 15px; line-height: 1.6;">
    안녕하세요. Speech-Therapy 에서 <strong>${child}</strong> 의 ${type} 동의서 서명을 요청드립니다.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    Speech-Therapy 는 만 2~7세 자녀의 발음 발달 상태를 부모님이 가정에서 확인할 수 있도록 돕는 보조 도구입니다.
    의료적 판단을 제공하지 않으며, 발음 가이드와 주간 미션을 통해 자녀의 발달을 함께 살펴봅니다.
  </p>
  <p style="font-size: 14px; line-height: 1.6; color: #444;">
    아래 링크에서 동의 내용을 확인하시고 직접 서명해주세요.<br>
    <span style="font-size: 13px; color: #666;">${expiresLine}</span>
  </p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
      동의서 확인 및 서명
    </a>
  </p>
  <p style="font-size: 13px; color: #666;">
    링크가 동작하지 않으면 아래 주소를 브라우저에 복사하세요:<br>
    <span style="word-break: break-all;">${link}</span>
  </p>
  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="font-size: 11px; color: #999;">
    본 메일은 발신 전용입니다. 문의는 운영 담당자에게 직접 연락주세요.<br>
    Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.
  </p>
</body>
</html>`;

  const text = [
    `${input.parentName} 부모님께`,
    "",
    `안녕하세요. Speech-Therapy 에서 ${input.childName} 의 ${input.consentType ?? "데이터 활용"} 동의서 서명을 요청드립니다.`,
    "",
    "Speech-Therapy 는 만 2~7세 자녀의 발음 발달 상태를 부모님이 가정에서 확인할 수 있도록 돕는 보조 도구입니다.",
    "의료적 판단을 제공하지 않으며, 발음 가이드와 주간 미션을 통해 자녀의 발달을 함께 살펴봅니다.",
    "",
    "아래 링크에서 동의 내용을 확인하시고 직접 서명해주세요.",
    expiresLineText,
    "",
    `서명 링크: ${input.signLink}`,
    "",
    "---",
    "본 메일은 발신 전용입니다. 문의는 운영 담당자에게 직접 연락주세요.",
    "Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.",
  ].join("\n");

  return { subject, html, text };
}

/// FR-C-018 (#41) — D+3 리마인더 본문.
/// 발송 후 3일 경과 + 미서명 + remindedAt IS NULL row 에만 발송 (cron 멱등 보장).
export interface ConsentReminderInput {
  /// 부모 이름.
  parentName: string;
  /// 자녀 이름.
  childName: string;
  /// 서명 페이지 signed URL.
  signLink: string;
  /// 최초 발송 후 경과 일수 (보통 3, cron 호출 측이 계산).
  daysElapsed: number;
  /// (선택) 동의서 종류 라벨 — 기본 "데이터 활용".
  consentType?: string;
  /// (선택) 만료 일시 ISO. 미설정 시 잔여일만 표시.
  expiresAt?: string;
}

export function buildConsentReminderEmail(
  input: ConsentReminderInput,
): EmailTemplate {
  const parent = escapeHtml(input.parentName);
  const child = escapeHtml(input.childName);
  const link = escapeHtml(input.signLink);
  const type = input.consentType
    ? escapeHtml(input.consentType)
    : "데이터 활용";
  // 7일 만료 - 경과일 = 남은 일수 (최소 0).
  const remainingDays = Math.max(0, 7 - input.daysElapsed);
  const expiresLine = input.expiresAt
    ? `${escapeHtml(formatExpiresAt(input.expiresAt))} 까지 (잔여 ${remainingDays}일)`
    : `발송 후 7일 — 잔여 약 ${remainingDays}일`;
  const expiresLineText = input.expiresAt
    ? `${formatExpiresAt(input.expiresAt)} 까지 (잔여 ${remainingDays}일)`
    : `발송 후 7일 — 잔여 약 ${remainingDays}일`;

  const subject = `[Speech-Therapy] ${input.childName} 동의서 미서명 안내 (잔여 ${remainingDays}일)`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px; margin-bottom: 16px;">${parent} 부모님께</h1>
  <p style="font-size: 15px; line-height: 1.6;">
    안녕하세요. <strong>${child}</strong> 의 ${type} 동의서가 아직 서명되지 않아 안내드립니다.
  </p>
  <p style="font-size: 14px; line-height: 1.6; color: #b45309;">
    동의서 마감: <strong>${expiresLine}</strong>
  </p>
  <p style="font-size: 14px; line-height: 1.6;">
    마감 후엔 동의서가 자동 만료되며, 재요청은 운영 담당자에게 별도 문의가 필요합니다.
  </p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #b45309; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
      지금 서명하기
    </a>
  </p>
  <p style="font-size: 13px; color: #666;">
    링크가 동작하지 않으면 아래 주소를 브라우저에 복사하세요:<br>
    <span style="word-break: break-all;">${link}</span>
  </p>
  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="font-size: 11px; color: #999;">
    본 메일은 발신 전용입니다. Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.
  </p>
</body>
</html>`;

  const text = [
    `${input.parentName} 부모님께`,
    "",
    `안녕하세요. ${input.childName} 의 ${input.consentType ?? "데이터 활용"} 동의서가 아직 서명되지 않아 안내드립니다.`,
    "",
    `동의서 마감: ${expiresLineText}`,
    "",
    "마감 후엔 동의서가 자동 만료되며, 재요청은 운영 담당자에게 별도 문의가 필요합니다.",
    "",
    `서명 링크: ${input.signLink}`,
    "",
    "---",
    "본 메일은 발신 전용입니다. Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.",
  ].join("\n");

  return { subject, html, text };
}

/// FR-C-018 (#41) — 7일 만료 안내 본문.
/// expire cron 이 status='pending' && sentAt < now-7d row 들을 status='expired' 로 전환한 직후 발송.
export interface ConsentExpiredInput {
  /// 부모 이름.
  parentName: string;
  /// 자녀 이름.
  childName: string;
  /// 최초 발송 시각 ISO (만료 안내 본문에 명시).
  originalSentAt: string;
  /// (선택) 동의서 종류 라벨 — 기본 "데이터 활용".
  consentType?: string;
}

export function buildConsentExpiredEmail(
  input: ConsentExpiredInput,
): EmailTemplate {
  const parent = escapeHtml(input.parentName);
  const child = escapeHtml(input.childName);
  const type = input.consentType
    ? escapeHtml(input.consentType)
    : "데이터 활용";
  const sentLine = escapeHtml(formatExpiresAt(input.originalSentAt));

  const subject = `[Speech-Therapy] ${input.childName} 동의서 만료 안내`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px; margin-bottom: 16px;">${parent} 부모님께</h1>
  <p style="font-size: 15px; line-height: 1.6;">
    안녕하세요. <strong>${child}</strong> 의 ${type} 동의서가 미서명 상태로 7일이 경과하여 자동 만료되었습니다.
  </p>
  <p style="font-size: 14px; line-height: 1.6; color: #555;">
    최초 발송: ${sentLine}<br>
    상태: <strong>만료 처리됨</strong>
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    동의서 재발급이 필요하시면 운영 담당자에게 별도 요청을 보내주세요.
    동의서 만료 자체는 자녀에게 어떤 영향도 주지 않으며, Speech-Therapy 의 일반 발음 확인 기능은 동의서 없이도 계속 이용하실 수 있습니다.
  </p>
  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="font-size: 11px; color: #999;">
    본 메일은 발신 전용입니다. Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.
  </p>
</body>
</html>`;

  const text = [
    `${input.parentName} 부모님께`,
    "",
    `안녕하세요. ${input.childName} 의 ${input.consentType ?? "데이터 활용"} 동의서가 미서명 상태로 7일이 경과하여 자동 만료되었습니다.`,
    "",
    `최초 발송: ${formatExpiresAt(input.originalSentAt)}`,
    "상태: 만료 처리됨",
    "",
    "동의서 재발급이 필요하시면 운영 담당자에게 별도 요청을 보내주세요.",
    "동의서 만료 자체는 자녀에게 어떤 영향도 주지 않으며, Speech-Therapy 의 일반 발음 확인 기능은 동의서 없이도 계속 이용하실 수 있습니다.",
    "",
    "---",
    "본 메일은 발신 전용입니다. Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.",
  ].join("\n");

  return { subject, html, text };
}

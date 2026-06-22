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
//
// FR-EMAIL-REACT-TEMPLATE (2026-05-26) — parent_invite 만 React Email 컴포넌트
//   (lib/email/templates/ParentInviteEmail.tsx) 로 migration. buildParentInviteEmail 은
//   `render()` 가 Promise 를 반환하므로 _async_ 로 변경. 호출 측 (app/actions/parent-invite.ts)
//   는 `await` 추가. 나머지 3 path (consent/cushion/weekly) 는 디자인 안정화 후 별도 PR.

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
///   - "발음 발달 가이드" / "발음 발달 확인" 표현만 사용
///   - "치료/진단/장애" 단어 절대 미포함
///   - 부모가 가입 후 자녀 등록 동의 단계로 이동.
///
/// FR-EMAIL-REACT-TEMPLATE (pilot):
///   - 본 함수는 React Email 기반 빌더 (lib/email/parent-invite-email.ts) 에 _얇은
///     re-export_ 만 한다. JSX 가 templates.ts (=.ts) 안에 있을 수 없으므로 분리.
///   - render() 는 Promise 를 반환하므로 본 함수는 async — 호출 측 (Server Action /
///     테스트) 에서 `await buildParentInviteEmail(...)` 필요.
///   - subject + text 는 기존과 동일 — html 본문만 React Email 로 교체.
export async function buildParentInviteEmail(
  input: ParentInviteInput,
): Promise<EmailTemplate> {
  // _Lazy_ dynamic import — 다른 빌더 (consent / weekly_report / cushion_note) 가
  // React Email 의존성을 비활성 상태로 import 비용을 지불하지 않도록 함.
  const { renderParentInviteEmail } = await import("./parent-invite-email");
  return renderParentInviteEmail(input);
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

/// FR-C-017+ — AI 쿠션어 알림장을 부모에게 직접 이메일로 발송할 때 사용.
///
/// 본문은 lib/cushion/generate.ts 의 noteText (CON-04 통과 보장된 본문) 를 그대로 감싸고,
/// 부모용 인사 + 발신자 서명 + 의료 disclaimer 를 자동 부착한다.
///
/// CON-04 정책:
///   - noteText 는 호출 측 책임으로 이미 검증된 본문 (template fallback / Gemini swap 통과).
///   - 본 helper 가 만드는 추가 카피 (인사 / 서명 / disclaimer) 는 금칙어 0건.
///   - sendEmail() 가 다시 한 번 detectBannedTerms() 로 차단 (defense in depth).
///
/// R4 정책:
///   - 수신자 = 부모 → childName / parentName 본문 포함 OK.
///   - 외부 로깅 / analytics 노출은 호출 측 책임.
export interface CushionNoteEmailInput {
  /// 자녀 이름 (R4 허용 — 수신자 = 부모).
  childName: string;
  /// 알림장 본문 (lib/cushion/generate.ts 의 CushionGenerateResult.text).
  /// CON-04 통과 보장된 본문이어야 함 — 검증 책임 호출 측.
  noteText: string;
  /// (선택) 부모 호칭. 미설정 시 "부모님" 으로 표기.
  parentName?: string;
  /// (선택) 발신자 이름 (원장 / 선생님). 미설정 시 기관명 또는 "담당자" 만 표기.
  senderName?: string;
  /// (선택) 후속 가입 / 자녀 결과 페이지 링크. 미설정 시 link 섹션 생략.
  signupLink?: string;
  /// (선택) 발신 기관명. 미설정 시 "Speech-Therapy" 로 표기.
  institutionName?: string;
}

export function buildCushionNoteEmail(input: CushionNoteEmailInput): EmailTemplate {
  const child = escapeHtml(input.childName);
  const note = escapeHtml(input.noteText);
  const parent = input.parentName ? escapeHtml(input.parentName) : null;
  const sender = input.senderName ? escapeHtml(input.senderName) : null;
  const institution = input.institutionName ? escapeHtml(input.institutionName) : null;
  const link = input.signupLink ? escapeHtml(input.signupLink) : null;

  const greeting = parent
    ? `${parent} 부모님께`
    : `${child} 부모님께`;
  const senderLine = sender && institution
    ? `${institution} ${sender} 드림`
    : sender
      ? `${sender} 드림`
      : institution
        ? `${institution} 드림`
        : "Speech-Therapy 드림";

  const subject = `[Speech-Therapy] ${input.childName} 발음 발달 알림장`;

  // noteText 안의 줄바꿈을 HTML <br> 로 보존.
  const noteHtml = note.replace(/\n/g, "<br>");

  const linkBlockHtml = link
    ? `<p style="text-align: center; margin: 28px 0;">
    <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
      자녀 발음 발달 확인하기
    </a>
  </p>
  <p style="font-size: 13px; color: #666; line-height: 1.5;">
    링크가 동작하지 않으면 아래 주소를 브라우저에 복사하세요:<br>
    <span style="word-break: break-all;">${link}</span>
  </p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px; margin-bottom: 16px;">${greeting}</h1>
  <p style="font-size: 15px; line-height: 1.6;">
    오늘 ${child} 의 발음 발달 확인 결과를 부드러운 알림장으로 전해 드려요.
  </p>
  <blockquote style="margin: 16px 0; padding: 16px; background: #f5f7fa; border-left: 4px solid #2563eb; font-size: 15px; line-height: 1.7; color: #1a1a1a;">
    ${noteHtml}
  </blockquote>
  ${linkBlockHtml}
  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="font-size: 13px; color: #666;">${senderLine}</p>
  <p style="font-size: 11px; color: #999;">
    본 메일은 발신 전용입니다. 문의는 기관 담당자에게 직접 연락주세요.<br>
    Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.
  </p>
</body>
</html>`;

  const textLines = [
    greeting,
    "",
    `오늘 ${input.childName} 의 발음 발달 확인 결과를 부드러운 알림장으로 전해 드려요.`,
    "",
    input.noteText,
    "",
  ];
  if (input.signupLink) {
    textLines.push(`자녀 발음 발달 확인하기: ${input.signupLink}`, "");
  }
  textLines.push(
    "---",
    sender && institution
      ? `${input.institutionName} ${input.senderName} 드림`
      : sender
        ? `${input.senderName} 드림`
        : institution
          ? `${input.institutionName} 드림`
          : "Speech-Therapy 드림",
    "본 메일은 발신 전용입니다. 문의는 기관 담당자에게 직접 연락주세요.",
    "Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.",
  );

  return { subject, html, text: textLines.join("\n") };
}

/// FR-C-010 + FR-C-NOTIFICATION-PREFERENCE — 주간 리포트 이메일 본문.
///
/// 본 템플릿은 매주 일요일 cron (app/api/cron/weekly-reports) 이 WeeklyReport upsert
/// 직후 호출. 수신자 = 부모. 3축 평균 / sessionCount / 예측 점수를 자녀 친화 톤으로 요약.
///
/// CON-04 정책:
///   - "발음 발달" / "주간 활동" / "다음 주 예상" 표현만 사용
///   - "치료/진단/장애" 단어 절대 미포함
///   - 의료 disclaimer 본문 하단 명시
///
/// R4 정책:
///   - 수신자 = 부모이므로 childName 본문 포함 OK.
///   - userId / weeklyReport id 등 식별자는 본문 미포함 (tags 만 호출 측에서 사용).
export interface WeeklyReportEmailInput {
  /// (선택) 부모 호칭. 인사말 "{parentName} 부모님께".
  parentName?: string;
  /// (선택) 자녀 이름. 본문 인사말 / subject 에 사용.
  childName?: string;
  /// ISO 8601 주차 (1~53).
  weekNumber: number;
  /// 연도 (예: 2026).
  year: number;
  /// 조음 평균 (0~100).
  articulationAvg: number;
  /// 어휘 평균 (0~100).
  linguisticAvg: number;
  /// 음향 평균 (0~100).
  acousticAvg: number;
  /// 주간 진단 세션 수(점수 표본). 본문 표시는 미션 완료수를 사용.
  sessionCount: number;
  /// FR-C-WAUR-SWITCH — 주간 미션 완료수(W-AUR 신호). 본문 "주간 미션 완료" 라벨 기준.
  missionCompletedCount: number;
  /// W-AUR 충족 여부 (missionCompletedCount ≥ W_AUR_MIN_MISSIONS).
  wAurAchieved: boolean;
  /// 다음 주 예상 점수 (0~100). null 이면 "준비 중" 표시.
  predictedNextScore: number | null;
  /// /weekly-review 페이지 link (RBAC 자동 검증).
  dashboardLink: string;
  /// (선택) CR-2026-009 — 이번 주 읽기·말 놀이 활동량(문해력 게임 활성 시). null/0이면 섹션 미렌더.
  ///   slug 가 아닌 **표시 제목**으로 전달(호출 측이 registry 로 매핑) — 본 템플릿은 registry 비의존.
  ///   연습-only: 활동 빈도만(점수/등급/판정 없음).
  literacy?: {
    totalSessions: number;
    activeDays: number;
    games: Array<{ title: string; count: number }>;
  } | null;
}

/// 숫자 → 친화 포맷 (소수 1자리, 0~100 클램프).
function fmtScore(value: number): string {
  const n = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (Math.round(n * 10) / 10).toFixed(1);
}

export function buildWeeklyReportEmail(
  input: WeeklyReportEmailInput,
): EmailTemplate {
  const parent = input.parentName ? escapeHtml(input.parentName) : null;
  const child = input.childName ? escapeHtml(input.childName) : null;
  const link = escapeHtml(input.dashboardLink);
  const greeting = parent
    ? `${parent} 부모님께`
    : child
      ? `${child} 부모님께`
      : "부모님께";
  const childNoun = child ?? "자녀";

  const articulation = fmtScore(input.articulationAvg);
  const linguistic = fmtScore(input.linguisticAvg);
  const acoustic = fmtScore(input.acousticAvg);
  // FR-C-WAUR-SWITCH — '주간 활동' 라벨은 미션 완료수 기준(W-AUR 정합).
  const missionLabel = `${Math.max(0, Math.floor(input.missionCompletedCount))}회`;
  const wAurLine = input.wAurAchieved
    ? "이번 주 주간 활동 목표를 달성했어요. 잘 했어요!"
    : "이번 주 주간 활동이 조금 부족했어요. 다음 주에 다시 함께해요.";
  const predictedLine =
    input.predictedNextScore === null
      ? "다음 주 예상 점수는 데이터가 더 모이면 알려드릴게요."
      : `다음 주 예상 평균은 약 ${fmtScore(input.predictedNextScore)} 점이에요.`;
  const childSafeForSubject = input.childName
    ? `${input.childName} `
    : "";

  const subject = `[Speech-Therapy] ${childSafeForSubject}${input.year}년 ${input.weekNumber}주차 발음 발달 요약`;

  // CR-2026-009 — 읽기·말 놀이 활동 섹션 (literacy 게임 활성 + 활동 있을 때만). 연습-only: 빈도만.
  const lit = input.literacy && input.literacy.totalSessions > 0 ? input.literacy : null;
  const literacyHtml = lit
    ? `
  <h2 style="font-size: 16px; margin: 24px 0 8px;">📚 이번 주 읽기·말 놀이</h2>
  <p style="font-size: 14px; line-height: 1.6;">이번 주에 <strong>${lit.totalSessions}번</strong>, <strong>${lit.activeDays}일</strong> 함께 놀았어요. 꾸준히 잘하고 있어요!</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 8px 0 16px; font-size: 14px;">
    ${lit.games
      .map(
        (g) =>
          `<tr><td style="padding: 8px 12px; background: #faf5ff; border: 1px solid #e9d5ff;">${escapeHtml(g.title)}</td><td style="padding: 8px 12px; border: 1px solid #e9d5ff; text-align: right;">${Math.max(0, Math.floor(g.count))}번</td></tr>`,
      )
      .join("\n    ")}
  </table>`
    : "";
  const literacyText = lit
    ? [
        "",
        "📚 이번 주 읽기·말 놀이",
        `이번 주에 ${lit.totalSessions}번, ${lit.activeDays}일 함께 놀았어요.`,
        ...lit.games.map((g) => `- ${g.title}: ${Math.max(0, Math.floor(g.count))}번`),
      ]
    : [];

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px; margin-bottom: 16px;">${greeting}</h1>
  <p style="font-size: 15px; line-height: 1.6;">
    이번 주 ${escapeHtml(childNoun)} 의 발음 발달 활동을 한 눈에 요약해 드려요.
  </p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px;">
    <tr>
      <td style="padding: 8px 12px; background: #f5f7fa; border: 1px solid #e5e7eb;">조음 평균</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">${articulation} 점</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; background: #f5f7fa; border: 1px solid #e5e7eb;">어휘 평균</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">${linguistic} 점</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; background: #f5f7fa; border: 1px solid #e5e7eb;">음향 평균</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">${acoustic} 점</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; background: #f5f7fa; border: 1px solid #e5e7eb;">주간 미션 완료</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">${missionLabel}</td>
    </tr>
  </table>

  <p style="font-size: 14px; line-height: 1.6; color: #2563eb;">${wAurLine}</p>
  <p style="font-size: 14px; line-height: 1.6; color: #555;">${predictedLine}</p>
${literacyHtml}
  <p style="text-align: center; margin: 32px 0;">
    <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
      이번 주 상세 결과 보기
    </a>
  </p>
  <p style="font-size: 13px; color: #666; line-height: 1.5;">
    링크가 동작하지 않으면 아래 주소를 브라우저에 복사하세요:<br>
    <span style="word-break: break-all;">${link}</span>
  </p>

  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="font-size: 11px; color: #999;">
    본 메일은 발신 전용입니다. /settings/notifications 에서 주간 요약 알림을 끌 수 있어요.<br>
    Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.
  </p>
</body>
</html>`;

  const textLines = [
    greeting,
    "",
    `이번 주 ${input.childName ?? "자녀"} 의 발음 발달 활동을 한 눈에 요약해 드려요.`,
    "",
    `- 조음 평균: ${articulation} 점`,
    `- 어휘 평균: ${linguistic} 점`,
    `- 음향 평균: ${acoustic} 점`,
    `- 주간 미션 완료: ${missionLabel}`,
    "",
    wAurLine,
    predictedLine,
    ...literacyText,
    "",
    `상세 결과 보기: ${input.dashboardLink}`,
    "",
    "---",
    "본 메일은 발신 전용입니다. /settings/notifications 에서 주간 요약 알림을 끌 수 있어요.",
    "Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.",
  ];

  return { subject, html, text: textLines.join("\n") };
}

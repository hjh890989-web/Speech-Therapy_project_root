// FR-C-NOTIFICATION-PREFERENCE — 부모 초대 이메일 발송 전 preference 체크 wrapper.
//
// 책임:
//   - parentEmail 로 기존 User 를 조회 → 이미 가입한 부모 한정으로 parentInviteEmail
//     preference 를 평가하여 opt-out 시 skipped 응답.
//   - 미가입 (User 미존재) 부모는 항상 초대 발송 — 가입 자체 흐름이 본 PR 의 핵심 목적
//     (opt-out 옵션은 가입 후 /settings/notifications 에서만 사용 가능).
//   - sendEmail 자체는 별도 wrapper 가 호출 — graceful 정책 (throw 금지) 유지.
//
// 호출 측 — app/actions/parent-invite.ts::sendParentInvite (RBAC + JWT 발급 후).
//
// R4:
//   - parentEmail 만 사용 — User.id select 만 (PII 추가 fetch 0).
//   - 가입한 부모 ID 가 발견되어도 callerInstitution 검증은 호출 측 책임.
//
// 본 함수는 lib/cushion/email.ts 의 recipientUserId 패턴과 유사하지만, 부모 초대는
//   _가입 전_ 부모 (User row 없음) 가 흔하므로 parentEmail 만으로 lookup 한다는 차이.

import { sendEmail, type SendResult, type EmailMessage } from "@/lib/email/resend";
import {
  getNotificationPreference,
  shouldSendEmail,
} from "@/lib/notifications/preference";
import { prisma } from "@/lib/db";

/// 본 wrapper 입력 — EmailMessage 의 subset (sendEmail 그대로 위임).
export interface ParentInviteEmailArgs {
  /// 부모 수신자 이메일 (정규화된 lowercase). 호출 측이 보장.
  parentEmail: string;
  /// 메일 제목.
  subject: string;
  /// HTML 본문.
  html: string;
  /// Plain text 본문.
  text: string;
  /// (선택) Resend tags — 호출 측이 'template' / 'campaign' 등 분류.
  tags?: Array<{ name: string; value: string }>;
}

/**
 * 부모 초대 이메일 발송 (preference 체크 + sendEmail 위임).
 *
 * 분기:
 *   1. parentEmail 빈값 → { ok: false, skipped: true, error: 'no_parent_email' }
 *   2. parentEmail 로 User 조회 — 미존재 → preference 체크 우회 (가입 전 부모)
 *      → sendEmail 직접 호출 (정상 / Resend 응답 그대로 반환).
 *   3. User 존재 + parentInviteEmail === false → { ok: false, skipped: true, error: 'user_opt_out' }
 *   4. User 존재 + parentInviteEmail !== false → sendEmail 호출 (정상 / Resend 응답 그대로).
 *
 * graceful: prisma 실패 시 console.error + preference 미체크로 정상 발송 진행
 *   (notifications/preference 의 graceful 정책과 동일 — _미발송_ 보다 _발송_ 이 안전 default).
 */
export async function sendParentInviteEmailWithPreference(
  args: ParentInviteEmailArgs,
): Promise<SendResult> {
  const parentEmail = (args.parentEmail ?? "").trim().toLowerCase();
  if (parentEmail.length === 0) {
    return { ok: false, skipped: true, error: "no_parent_email" };
  }

  // User lookup — 이미 가입한 부모만 preference 적용. 미가입 → skip lookup, 발송 진행.
  // findFirst (unique 키 X — email 은 unique 이지만 nullable 이라 prisma 의 unique constraint
  // 동작이 환경에 따라 다를 수 있어 findFirst 로 안전 조회).
  let user: { id: string } | null = null;
  try {
    user = await prisma.user.findFirst({
      where: { email: parentEmail },
      select: { id: true },
    });
  } catch (err) {
    // graceful — DB 일시 오류 시 preference 체크 우회, sendEmail 정상 진행.
    console.error(
      "[parent-invite/email-with-preference] user lookup 실패 — preference 체크 우회",
      err,
    );
  }

  if (user) {
    const pref = await getNotificationPreference(user.id);
    if (!shouldSendEmail(pref, "parentInviteEmail")) {
      return { ok: false, skipped: true, error: "user_opt_out" };
    }
  }

  // 미가입 user 또는 opt-in 한 user — sendEmail 위임.
  const message: EmailMessage = {
    to: parentEmail,
    subject: args.subject,
    html: args.html,
    text: args.text,
    tags: args.tags,
  };
  return sendEmail(message);
}

// FR-C-NOTIFICATION-PREFERENCE — consent (동의서) 발송 path 전용 thin wrapper.
//
// 책임:
//   - lib/email/resend.ts::sendEmail 호출 _직전_ 에 수신자의 consentReminderEmail
//     preference 를 확인하여 opt-out user 의 메일 발송을 차단.
//   - parentEmail 로 prisma User row 를 lookup → User.notificationPreference 조회.
//   - User row 부재 (가입 전 부모) → preference 미적용, 발송 진행 (DEFAULTS true 정책).
//   - DB 조회 실패 → graceful (안전한 기본값 = 발송 진행, lib/notifications/preference 정책과 정합).
//
// 호출 패턴:
//   - 초기 발송 (`/api/consent/sign`) 및 D+3 리마인더 (`/api/cron/consent-reminder`),
//     7일 만료 안내 (`/api/cron/consent-expire`) 가 본 함수를 통해 sendEmail 호출.
//   - 트랜잭션/멱등 보장은 호출 측 책임 — 본 함수는 발송 분기 + preference 체크만 담당.
//
// 정책 (한국 정보통신망법 §50 / GDPR 정합):
//   - consent 종류 안내 메일은 _서비스 운영성_ 알림 — 가입 시 opt-out 기반 default true.
//   - 사용자가 `/settings/notifications` 에서 명시적으로 false 로 변경한 경우만 차단.
//   - skipPreferenceCheck=true 옵션은 _법적/계약상 필수_ 안내에 대비한 escape hatch
//     (본 PR 범위 안에선 호출 측이 false 로 명시 — 모든 발송 종류에서 preference 존중).
//
// R4 (자녀 보호):
//   - parentEmail 는 발송 대상 — sendEmail 의 책임. 본 함수는 lookup 만 수행 후 위임.
//   - 추가 PII 노출 0건.

import { prisma } from "@/lib/db";
import { sendEmail, type EmailMessage, type SendResult } from "@/lib/email/resend";
import {
  getNotificationPreference,
  shouldSendEmail,
} from "@/lib/notifications/preference";

/// sendConsentEmailWithPreference 입력.
export interface ConsentEmailArgs extends EmailMessage {
  /// 수신자 부모 이메일 — User lookup 키. EmailMessage.to 와 동일하게 사용 가능.
  parentEmail: string;
  /// (선택) preference 체크 우회 — 법적/계약상 필수 안내에 한정. 기본 false.
  skipPreferenceCheck?: boolean;
}

/**
 * preference 체크 분기 판별을 위한 별도 결과 마커.
 *
 * sendEmail 의 SendResult 와 호환되며, preference 차단 시 skipped=true + error='user_opt_out'.
 * 호출 측은 결과의 ok / skipped / error 만 보고 응답을 결정 — 동일한 interface.
 */
export type ConsentEmailResult = SendResult;

/**
 * preference 체크 + sendEmail 위임 (graceful — throw 금지).
 *
 * 분기 매트릭스:
 *   1. parentEmail 부재 / 빈값 → preference 체크 우회, sendEmail 그대로 위임
 *      (sendEmail 의 'no_to' 류 응답은 그대로 전파 — 본 helper 는 PII 검증 미관여).
 *   2. skipPreferenceCheck=true → preference lookup 생략, sendEmail 그대로 호출.
 *   3. User row 부재 (가입 전 부모) → DEFAULTS (true) 정책 — sendEmail 그대로 호출.
 *   4. User row 존재 + consentReminderEmail=false → skipped: true, error: 'user_opt_out',
 *      sendEmail 미호출 (Resend 비용 절약).
 *   5. User row 존재 + consentReminderEmail=true → sendEmail 호출.
 *   6. prisma lookup throw → graceful — DEFAULTS 정책 따라 sendEmail 그대로 호출
 *      (발송 누락 위험 < 미발송 누락 위험).
 *
 * @param args sendEmail 의 모든 필드 + parentEmail (lookup 키) + skipPreferenceCheck.
 * @returns sendEmail 의 SendResult — preference 차단 시 skipped=true + error='user_opt_out'.
 */
export async function sendConsentEmailWithPreference(
  args: ConsentEmailArgs,
): Promise<ConsentEmailResult> {
  const { parentEmail, skipPreferenceCheck, ...emailMessage } = args;

  // (2) 명시적 우회 — 호출 측이 법적 필수 안내로 판단한 경우.
  if (skipPreferenceCheck === true) {
    return sendEmail(emailMessage);
  }

  // (1) parentEmail 부재 — preference lookup 의미 없음, sendEmail 위임 (호출 측이 결과 해석).
  const email = (parentEmail ?? "").trim();
  if (email.length === 0) {
    return sendEmail(emailMessage);
  }

  // (3~6) parentEmail 로 user lookup → preference 조회.
  let userId: string | null = null;
  try {
    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    userId = user?.id ?? null;
  } catch (err) {
    // graceful — DB 일시 오류 시 발송 진행 (안전한 기본값 정책).
    console.error(
      "[consent/email] user lookup 실패 — preference 체크 우회 후 발송 진행",
      err,
    );
    return sendEmail(emailMessage);
  }

  // (3) 가입 전 부모 — User row 부재 → DEFAULTS (true) → 발송.
  if (!userId) {
    return sendEmail(emailMessage);
  }

  // (4~5) 가입한 user — preference 조회 후 분기.
  const pref = await getNotificationPreference(userId);
  if (!shouldSendEmail(pref, "consentReminderEmail")) {
    return { ok: false, skipped: true, error: "user_opt_out" };
  }

  return sendEmail(emailMessage);
}

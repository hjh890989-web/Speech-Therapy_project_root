// FR-C-017+ — AI 쿠션어 알림장 이메일 발송 orchestrator.
//
// 책임:
//   - lib/email/templates.ts::buildCushionNoteEmail + lib/email/resend.ts::sendEmail 통합
//   - parentEmail 부재 / Resend 실패 graceful (throw 금지)
//   - CON-04 검증은 sendEmail 단에서 한 번 더 — 본 함수는 통과 본문 가정
//
// FR-C-NOTIFICATION-PREFERENCE 통합:
//   - 호출 측이 recipientUserId 를 전달하면, getNotificationPreference(userId) 의
//     cushionNoteEmail 옵션이 false 인 경우 발송을 skip (skipped: true, error: 'user_opt_out').
//   - recipientUserId 미전달 (legacy 호출자) → 옵션 체크 우회, 기존 동작 그대로.
//
// R4 보호:
//   - parentEmail 본인 only — 호출 측 Server Action 이 cross-institution / RBAC 검증 완료 후 호출
//   - 본 함수는 thin orchestrator — 인증 / 권한 미관여
//
// 호출 측:
//   - app/actions/cushion-note.ts::sendCushionNoteToParent (Server Action)
//   - lib/classroom/cushion-batch.ts::processStudentForBatch (반 단위 fan-out)

import { sendEmail } from "@/lib/email/resend";
import { buildCushionNoteEmail } from "@/lib/email/templates";
import {
  getNotificationPreference,
  shouldSendEmail,
} from "@/lib/notifications/preference";

/// sendCushionNoteEmail 입력 — Server Action 가 전달.
export interface CushionEmailArgs {
  /// 평가 결과 ID — Resend tags 에 사용 (R4: PII 0).
  evaluationResultId: string;
  /// 부모 이메일 (수신자). 빈 문자열 / undefined → skipped: true.
  parentEmail: string;
  /// (선택) 부모 호칭. 인사말 ("{parentName} 부모님께") 에 사용.
  parentName?: string;
  /// 자녀 이름 — subject + 본문 인사말. 수신자 = 부모이므로 R4 허용.
  childName: string;
  /// 알림장 본문 — lib/cushion/generate.ts 의 CushionGenerateResult.text.
  /// CON-04 통과 보장 본문이어야 함 (호출 측 책임).
  noteText: string;
  /// (선택) 발신자 이름 (원장 / 담당자). 서명 line 에 사용.
  senderName?: string;
  /// (선택) 발신 기관명. 서명 line 에 사용.
  institutionName?: string;
  /// (선택) FR-C-NOTIFICATION-PREFERENCE — 수신자 User.id.
  /// 전달 시 getNotificationPreference 의 cushionNoteEmail 이 false 면 skipped: true.
  /// 미전달 (legacy 호출자) → 옵션 체크 우회, 기존 동작 그대로.
  recipientUserId?: string;
}

/// sendCushionNoteEmail 결과 — Server Action 응답.
export interface CushionEmailResult {
  /// 실 발송 성공 시 true.
  sent: boolean;
  /// graceful skip (test env / API key 미설정 / parentEmail 부재) 시 true.
  skipped: boolean;
  /// 실패 사유 또는 skip 사유 (분석 + UI 노출용).
  error?: string;
}

/**
 * 쿠션어 알림장 이메일 발송 (graceful — 절대 throw 금지).
 *
 * 분기 매트릭스:
 *   1. parentEmail 부재 / 빈값 → skipped: true, error: 'no_parent_email'
 *   2. noteText 부재 → skipped: true, error: 'no_note_text'
 *   3. (FR-C-NOTIFICATION-PREFERENCE) recipientUserId 전달 + cushionNoteEmail=false
 *      → skipped: true, error: 'user_opt_out'
 *   4. sendEmail() 가 skipped (test env / API key 미설정) → skipped: true (sendEmail.error 전파)
 *   5. sendEmail() 가 ok=false (CON-04 차단 / SDK 실패 / timeout) → sent: false, error 전파
 *   6. 정상 발송 → sent: true
 */
export async function sendCushionNoteEmail(
  args: CushionEmailArgs,
): Promise<CushionEmailResult> {
  // 1) parentEmail graceful skip.
  const email = (args.parentEmail ?? "").trim();
  if (email.length === 0) {
    return { sent: false, skipped: true, error: "no_parent_email" };
  }

  // 2) noteText 부재 방어 (Resend 의 no_body 차단과 정합 — 사전 차단으로 SDK 호출 절약).
  const note = (args.noteText ?? "").trim();
  if (note.length === 0) {
    return { sent: false, skipped: true, error: "no_note_text" };
  }

  // 2.5) FR-C-NOTIFICATION-PREFERENCE — 수신자 옵션 확인 (recipientUserId 전달 시).
  // 미전달 (legacy 호출자) → 옵션 체크 우회 (기존 동작 유지).
  if (args.recipientUserId && args.recipientUserId.trim().length > 0) {
    const pref = await getNotificationPreference(args.recipientUserId);
    if (!shouldSendEmail(pref, "cushionNoteEmail")) {
      return { sent: false, skipped: true, error: "user_opt_out" };
    }
  }

  // 3) 템플릿 생성.
  const template = buildCushionNoteEmail({
    childName: args.childName,
    noteText: args.noteText,
    parentName: args.parentName,
    senderName: args.senderName,
    institutionName: args.institutionName,
  });

  // 4) sendEmail 위임 — graceful (throw 금지).
  const result = await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    tags: [
      { name: "template", value: "cushion_note" },
      { name: "evaluation_result_id", value: args.evaluationResultId },
    ],
  });

  if (result.skipped) {
    return { sent: false, skipped: true, error: result.error };
  }
  if (!result.ok) {
    return { sent: false, skipped: false, error: result.error };
  }
  return { sent: true, skipped: false };
}

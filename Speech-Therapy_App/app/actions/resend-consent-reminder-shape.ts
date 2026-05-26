// FR-CONSENT-REMINDER-UI — resend-consent-reminder Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.
//
// 책임: input zod schema + 결과 discriminated union 만 export.
//   runtime helper (zod) 는 본 파일에 둠 — Server Action 본체는 import 만 수행.

import { z } from "zod";

/** 입력 — consentSignatureId (UUID) 만. parentEmail / token 은 server-side 에서 R4 검증. */
export const ResendConsentReminderInputSchema = z.object({
  consentSignatureId: z.string().uuid("INVALID_CONSENT_ID"),
});

export type ResendConsentReminderInput = z.infer<
  typeof ResendConsentReminderInputSchema
>;

/**
 * Server Action 결과 — graceful (throw 없음).
 *
 * success=true:
 *   - 이메일 발송 시도 완료 (skipped 케이스 — RESEND_API_KEY 미설정 등 — 포함).
 *   - 호출 측은 emailSkipped 로 "실 발송됨" vs "운영상 skip" 분기.
 *   - DB 의 remindedAt 가 새로 업데이트됨.
 *
 * success=false:
 *   - unauthorized: 비로그인 / Supabase 환경 미설정.
 *   - invalid_input: zod 검증 실패.
 *   - not_found: consentSignatureId 미존재 / 다른 parentEmail (R4 차단 — 두 경우 모두
 *     동일 응답으로 통합해 정보 노출 최소화).
 *   - not_pending: status !== 'pending' (이미 signed / expired — 재발송 불가).
 *   - send_failed: 이메일 발송 실패 (Resend SDK 5xx / banned_term 등).
 *   - db_failed: prisma 조회 / update 실패.
 */
export type ResendConsentReminderResult =
  | {
      success: true;
      /** UI 친화 — consentSignatureId 마지막 4자리. */
      consentSuffix: string;
      /** RESEND_API_KEY 미설정 / NODE_ENV='test' / opt-out 등 graceful skip. */
      emailSkipped: boolean;
      /** 분석 이벤트 발송용 메타. */
      analytics: {
        userId: string;
        consentSignatureId: string;
      };
    }
  | {
      success: false;
      reason:
        | "unauthorized"
        | "invalid_input"
        | "not_found"
        | "not_pending"
        | "send_failed"
        | "db_failed";
      message: string;
    };

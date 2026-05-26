// FR-2FA-RECOVERY — admin TOTP reset Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.
//
// 용도:
//   부모(또는 임의 user) 가 authenticator 분실 + backup codes 8개 모두 소진 시
//   영구 lockout 회피용. admin 이 target user 의 모든 MFA factor 를 unenroll 하고
//   totpBackupCodes 를 초기화하는 "support ticket reset" 패턴.
//
// 보안 정책:
//   - 호출자 caller 는 반드시 role === 'admin' (Prisma 교차 검증).
//   - confirmationEmail 은 targetUserEmail 과 _정확 일치_ 필요 (대소문자/공백 trim 후).
//     → 실수로 다른 사용자 reset 하는 사고 방어.
//   - 본 action 은 audit log 에 actor 캡처 + critical Slack alert (totp_disabled) 발송.

/** admin reset 입력 — target user email + 정확 일치 confirmation. */
export interface AdminResetTotpInput {
  /** reset 대상 사용자의 email (User.email 으로 조회). */
  targetUserEmail: string;
  /** 실수 방어 — targetUserEmail 과 정확 일치 필요. */
  confirmationEmail: string;
}

/** Server Action 결과 — graceful (throw 없음). */
export type AdminResetTotpResult =
  | {
      success: true;
      analytics: {
        /** caller admin 의 user id (감사 추적). */
        adminUserId: string;
        /** reset 된 target user id. */
        targetUserId: string;
      };
      /** Supabase Admin SDK 로 unenroll 한 factor 개수 (0 가능 — 이미 모두 unenroll 됨). */
      factorsUnenrolled: number;
      /** 초기화 직전 totpBackupCodes 의 hash 개수 (감사 메타). */
      previousBackupCodesCount: number;
    }
  | {
      success: false;
      reason:
        | "unauthorized" // 비로그인
        | "forbidden" // 인증은 됐으나 admin 이 아님
        | "invalid_input" // 입력 형식 부적합 (email 형식 등)
        | "email_mismatch" // confirmation ≠ target
        | "target_not_found" // target email 의 User row 부재
        | "supabase_error" // Admin SDK 호출 실패
        | "db_failed"; // Prisma 호출 실패
      message: string;
      analytics?: {
        adminUserId?: string;
        targetUserId?: string;
      };
    };

// FR-PERF-3-USE-SERVER-REFACTOR — verify-totp Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

/** verify 입력 — factorId (enroll 응답) + 6자리 코드. */
export interface VerifyTotpEnrollInput {
  factorId: string;
  code: string;
}

/** Server Action 결과 — graceful (throw 없음). */
export type VerifyTotpEnrollResult =
  | {
      success: true;
      /** 사용자에게 1회 표시할 backup codes (8자 8개) — 본 PR 단순 표시, DB 저장 X. */
      backupCodes: string[];
      analytics: {
        userId: string;
      };
    }
  | {
      success: false;
      reason:
        | "unauthorized"
        | "invalid_input"
        | "invalid_code"
        | "expired"
        | "supabase_error";
      message: string;
      analytics?: {
        userId: string;
      };
    };

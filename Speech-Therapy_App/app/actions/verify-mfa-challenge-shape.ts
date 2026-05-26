// FR-PERF-3-USE-SERVER-REFACTOR — verify-mfa-challenge Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

/** verifyMfaChallenge 입력 — mode 별 다른 code 형식. */
export type VerifyMfaChallengeInput =
  | { mode: "totp"; factorId: string; code: string }
  | { mode: "backup"; code: string };

/** Server Action 결과 — graceful (throw 없음). */
export type VerifyMfaChallengeResult =
  | {
      success: true;
      /** mode === "backup" 시 남은 backup code 개수. mode === "totp" 시 undefined. */
      remainingBackupCodes?: number;
      analytics: {
        userId: string;
        mode: "totp" | "backup";
      };
    }
  | {
      success: false;
      reason:
        | "unauthorized"
        | "invalid_input"
        | "invalid_code"
        | "expired"
        | "rate_limited"
        | "supabase_error";
      message: string;
      /** mode === "backup" 시 잔여 카운트 (실패 시에도 노출). */
      remainingBackupCodes?: number;
      analytics?: {
        userId: string;
        mode: "totp" | "backup";
      };
    };

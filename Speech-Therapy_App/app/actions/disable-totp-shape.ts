// FR-PERF-3-USE-SERVER-REFACTOR — disable-totp Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

/** disable 입력 — 현재 TOTP 코드만 (재인증). factorId 는 내부 회수. */
export interface DisableTotpInput {
  totpCode: string;
}

/** Server Action 결과 — graceful (throw 없음). */
export type DisableTotpResult =
  | {
      success: true;
      analytics: {
        userId: string;
      };
    }
  | {
      success: false;
      reason:
        | "unauthorized"
        | "invalid_input"
        | "not_enrolled"
        | "invalid_code"
        | "supabase_error";
      message: string;
      analytics?: {
        userId: string;
      };
    };

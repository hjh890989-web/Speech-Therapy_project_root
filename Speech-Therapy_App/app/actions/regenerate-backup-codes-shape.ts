// FR-PERF-3-USE-SERVER-REFACTOR — regenerate-backup-codes Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

/** Server Action 결과 — graceful (throw 없음). */
export type RegenerateBackupCodesResult =
  | {
      success: true;
      /** 사용자에게 1회 표시할 새 backup codes (8자 8개) — 화면 닫으면 다시 못 봄. */
      backupCodes: string[];
      analytics: {
        userId: string;
      };
    }
  | {
      success: false;
      reason:
        | "unauthorized"
        | "not_enrolled"
        | "supabase_error";
      message: string;
      analytics?: {
        userId: string;
      };
    };

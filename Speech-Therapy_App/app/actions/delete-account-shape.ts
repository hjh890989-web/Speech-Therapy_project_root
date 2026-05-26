// FR-PERF-3-USE-SERVER-REFACTOR — delete-account Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

/** 계정 삭제 확인 텍스트 — 정확 매칭 (공백 / 대소문자 / 자모 분리 모두 reject). */
export const ACCOUNT_DELETE_CONFIRMATION_TEXT = "계정을 삭제합니다";

/** Server Action 입력 — confirmation 텍스트만. user id 는 auth 에서. */
export interface DeleteAccountInput {
  /** 사용자가 입력한 확인 텍스트 — ACCOUNT_DELETE_CONFIRMATION_TEXT 와 정확 매칭 필요. */
  confirmation: string;
}

/** Server Action 결과 — graceful (throw 없음). */
export type DeleteAccountResult =
  | {
      success: true;
      userId: string;
      role: string | null;
      /** Supabase auth user 삭제까지 성공했는지. false 면 DB 만 삭제 (호출 측 안내). */
      authUserDeleted: boolean;
      /** 분석 이벤트 발송용 메타 — Client Component 가 trackEvent 호출 시 사용. */
      analytics: {
        userId: string;
        role: string;
      };
    }
  | {
      success: false;
      reason:
        | "unauthorized"
        | "invalid_confirmation"
        | "db_failed"
        | "user_not_found";
      message: string;
    };

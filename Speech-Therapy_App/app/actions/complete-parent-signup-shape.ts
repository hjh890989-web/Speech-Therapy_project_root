// FR-PERF-3-USE-SERVER-REFACTOR — complete-parent-signup Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

/// Server Action 입력.
export interface CompleteParentSignupInput {
  /// 초대 메일 link 의 token query param.
  token: string;
  /// 부모가 입력한 password (8자 이상).
  password: string;
}

/// Server Action 결과.
export type CompleteParentSignupResult =
  | {
      success: true;
      userId: string;
      message: string;
    }
  | {
      success: false;
      reason:
        | "invalid_token"
        | "invalid_password"
        | "auth_failed"
        | "child_mismatch"
        | "db_failed";
      message: string;
    };

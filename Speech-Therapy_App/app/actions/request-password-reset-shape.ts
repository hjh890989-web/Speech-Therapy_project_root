// FR-PERF-3-USE-SERVER-REFACTOR — request-password-reset Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

/** Server Action 결과 — graceful (throw 없음). */
export type RequestPasswordResetResult =
  | {
      success: true;
      /** Supabase 가 reset 링크를 발송한 _현재_ 이메일 주소 (UI 표시용). */
      sentToEmail: string;
      /** 분석 이벤트 발송용 메타. */
      analytics: {
        userId: string;
      };
    }
  | {
      success: false;
      reason: "unauthorized" | "no_email" | "supabase_error";
      message: string;
    };

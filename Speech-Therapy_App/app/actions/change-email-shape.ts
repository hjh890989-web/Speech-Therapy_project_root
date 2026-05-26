// FR-PERF-3-USE-SERVER-REFACTOR — change-email Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// (`export const|interface|type|class|enum` 위반 시 모듈 전체 reject + chunking
// failure 캐스케이드) 정합 위해 분리. 본 파일은 "use server" directive 미포함 →
// 타입만 보유, 호출 측이 안전하게 import.

/** Server Action 입력 — 새 이메일 주소만. user id 는 auth 에서. */
export interface ChangeEmailInput {
  /** 사용자가 입력한 새 이메일 주소 — Zod email + max 254 (RFC 5321) 검증. */
  newEmail: string;
}

/** Server Action 결과 — graceful (throw 없음). */
export type ChangeEmailResult =
  | {
      success: true;
      /** Supabase 가 confirmation 링크를 발송한 _새_ 이메일 주소 (UI 표시용). */
      pendingEmail: string;
      /** 분석 이벤트 발송용 메타 — Client Component 가 trackEvent 호출 시 사용. */
      analytics: {
        userId: string;
      };
    }
  | {
      success: false;
      reason:
        | "unauthorized"
        | "invalid_email"
        | "same_as_current"
        | "supabase_error";
      message: string;
    };

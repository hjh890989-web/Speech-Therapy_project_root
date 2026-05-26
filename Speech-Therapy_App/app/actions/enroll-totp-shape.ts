// FR-PERF-3-USE-SERVER-REFACTOR — enroll-totp Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

/** Server Action 결과 — graceful (throw 없음). */
export type EnrollTotpResult =
  | {
      success: true;
      /** factorId — verify 단계에서 challenge / verify 호출 시 필요. */
      factorId: string;
      /** Supabase 가 생성한 QR code (data URL — SVG/PNG, <img src=...> 직접 표시). */
      qrCode: string;
      /** TOTP secret (수동 입력용 — base32). */
      secret: string;
    }
  | {
      success: false;
      reason:
        | "unauthorized"
        | "already_enrolled"
        | "supabase_error";
      message: string;
    };

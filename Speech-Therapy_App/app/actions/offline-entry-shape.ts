// FR-PERF-3-USE-SERVER-REFACTOR — offline-entry Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

import type { OfflineEntryKind } from "@/lib/offline-entry/types";

/** Server Action 입력 — Zod 검증 표면. */
export interface SubmitOfflineEntryInput {
  /** 자녀(보호자) User.id — RBAC + cross-tenant 검증 대상. */
  userId: string;
  /** 활동 유형 — 'practice' | 'observation' | 'note'. */
  kind: OfflineEntryKind;
  /** 짧은 메모 (max 500자, CON-04 통과 필수). */
  note: string;
  /** (선택) 실 활동 발생 시각 — ISO string. default = 서버 now. */
  observedAt?: string;
}

/** Server Action 결과 — graceful 분기 포함. */
export type SubmitOfflineEntryResult =
  | {
      success: true;
      entryId: string;
      observedAt: string;
    }
  | {
      success: false;
      reason:
        | "unauthorized"
        | "forbidden"
        | "invalid_input"
        | "invalid_target"
        | "cross_institution"
        | "banned_term"
        | "db_failed";
      message: string;
    };

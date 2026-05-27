// FR-C-030 — 부모 케어로그 Server Action shape (CLIENT-SAFE).
//
// 본 모듈은 _순수 타입_ 만 보유 — prisma / supabase 의존 0건.
// Client Component (parent-care-log Form) 에서 직접 import 안전.
//
// 분리 사유 (FR-PERF-3-USE-SERVER-REFACTOR):
//   - parent-care-log.ts 는 "use server" — 모든 export 가 async Server Action.
//   - 타입 / 결과 객체 는 본 파일로 분리하여 client bundle 의 prisma transitive 미포함.

import type { ParentCareLogKind } from "@/lib/offline-entry/types";

/** Server Action 입력. */
export interface SubmitParentCareLogInput {
  /// 활동 유형 — 부모용 subset (parent_play / parent_external_session).
  kind: ParentCareLogKind;
  /// 메모 (최대 500자, CON-04 통과 가정).
  note: string;
  /// 활동 시각 (ISO string, default now).
  observedAt?: string;
}

/** Server Action 결과 — graceful (throw 금지). */
export type SubmitParentCareLogResult =
  | {
      success: true;
      entryId: string;
      /// 활동 기록 시각 (ISO string).
      observedAt: string;
    }
  | {
      success: false;
      reason:
        | "unauthorized"        // 인증 user 부재
        | "consent_required"    // PIPA 두 동의 미완료
        | "invalid_input"       // Zod 검증 실패
        | "forbidden_term"      // CON-04 금칙어 발견
        | "internal_error";     // Prisma INSERT 실패
      /// invalid_input 시 issue 메시지 배열.
      issues?: string[];
    };

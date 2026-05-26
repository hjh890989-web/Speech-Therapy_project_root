// FR-PERF-3-USE-SERVER-REFACTOR — student-bulk-import Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

import type { BulkImportResult } from "@/lib/admin/student-bulk-import";

/**
 * FR-Q-009 / FR-C-005 통합 — 등록 성공 행마다 부모 초대 메일 발송 결과.
 *
 * - attempted: parentEmail 이 있어서 sendParentInvite 호출이 시도된 행 수.
 * - sent: 실 발송 (Resend ok) 성공한 행 수.
 * - skipped: 권한 / env 미설정 / Resend 실패 등으로 skip 된 행 수.
 *
 * R4: 본 결과는 집계 카운트만 — parentEmail / studentId 노출 없음.
 */
export interface ParentInviteSummary {
  attempted: number;
  sent: number;
  skipped: number;
}

export type SubmitBulkImportResult =
  | {
      status: "ok";
      result: BulkImportResult;
      parentInvites: ParentInviteSummary;
    }
  | { status: "unauthorized"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "invalid_input"; message: string };

/**
 * FR-Q-009 / FR-C-005 통합 — Server Action 호출 시 부모 초대 발송 옵션.
 *
 * - sendParentInvites: true 일 때만 행마다 parentEmail 기반 초대 메일 발송.
 *   본 PR 은 helper 만 — UI 측 체크박스 통합은 후속 PR.
 * - institutionName: 초대 메일 본문에 표시. 미설정 시 "어린이집/유치원" 폴백.
 */
export interface SubmitBulkImportOptions {
  sendParentInvites?: boolean;
  institutionName?: string;
}

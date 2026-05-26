// FR-PERF-3-USE-SERVER-REFACTOR — classroom-cushion Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

export interface SendClassroomCushionInput {
  classId: string;
}

export type SendClassroomCushionStatus =
  | "ok"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "invalid_input";

export interface SendClassroomCushionResult {
  /// 상태 분기 (UI 가 toast/안내 매핑).
  status: SendClassroomCushionStatus;
  /// 발송 시도 학생 수 (process 진입 학생 수).
  attempted: number;
  /// 실 발송 성공 학생 수.
  sent: number;
  /// skipped (parentEmail 부재 / EvaluationResult 부재 / Resend skip).
  skipped: number;
  /// errors (Resend 실패 / banned_term / SDK 오류).
  errors: number;
  /// 본 발송 시도의 고유 ID — 향후 audit 용 (현재는 응답 라벨).
  batchId: string;
  /// rate_limited 시 다음 시도 가능까지 남은 초.
  retryAfterSec?: number;
}

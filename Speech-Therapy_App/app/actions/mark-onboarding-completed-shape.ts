// FR-PERF-3-USE-SERVER-REFACTOR — mark-onboarding-completed Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

/** Server Action 결과 — 호출 측이 graceful 분기. */
export interface MarkOnboardingCompletedResult {
  /** true: DB 동기화 성공. false: 비인증 / DB 오류 등 graceful 실패. */
  success: boolean;
  /** 실패 사유 (디버깅/분석용). 성공 시 undefined. */
  reason?: "unauthorized" | "db_failed";
}

// FR-PERF-3-USE-SERVER-REFACTOR — export-user-data Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

/** 모델당 최대 fetch row 수 — DoS 방어 + 합리적 사용자 한도. */
export const EXPORT_ROW_LIMIT_DEFAULT = 1000;
export const EXPORT_ROW_LIMIT_CONSENT = 100;

/** export JSON 의 최상위 shape. PII 보호를 위해 필요한 필드만 포함. */
export interface ExportedUserData {
  /** spec 식별자 — 추후 schema migration 시 사용. */
  schemaVersion: "1.0.0";
  /** 추출 시각 (UTC ISO). */
  exportedAt: string;
  /** 본인 User row (이메일 / role / createdAt / childAgeMonths / preferredPhonemes 등). */
  user: Record<string, unknown> | null;
  /** EvaluationResult — 본인 userId 매칭 (max 1000). */
  evaluationResults: Record<string, unknown>[];
  /** SessionLog — 본인 userId 매칭 (max 1000). */
  sessionLogs: Record<string, unknown>[];
  /** RewardLog — 본인 userId 매칭 (max 1000). */
  rewardLogs: Record<string, unknown>[];
  /** WeeklyReport — 본인 userId 매칭 (max 1000). */
  weeklyReports: Record<string, unknown>[];
  /** HITLQueue — 본인이 검토 대상 (subject) 인 row (max 1000). */
  hitlQueues: Record<string, unknown>[];
  /** ConsentSignature — User.email 과 parentEmail 매칭 (max 100). */
  consentSignatures: Record<string, unknown>[];
  /** OfflineEntry — 본인이 subject 인 row (max 1000). */
  offlineEntries: Record<string, unknown>[];
}

/** export 결과 — Server Action 호출 측 (client) 에서 사용. */
export type ExportUserDataResult =
  | {
      success: true;
      json: string;
      filename: string;
      recordCounts: {
        evaluationResults: number;
        sessionLogs: number;
        rewardLogs: number;
        weeklyReports: number;
        hitlQueues: number;
        consentSignatures: number;
        offlineEntries: number;
      };
    }
  | {
      success: false;
      reason: "unauthorized" | "db_failed";
      message: string;
    };

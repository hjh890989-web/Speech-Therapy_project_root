"use server";

// FR-C-ACCOUNT — 본인 데이터 전체 JSON export Server Action (GDPR + 한국 개인정보보호법 대응).
//
// 책임:
//   - Supabase auth.getUser → userId 본인만 데이터 추출.
//   - User 본인 row + 관련 모델 row 들 fetch (각 모델당 limit 1000 — DoS 방어).
//   - JSON 직렬화 → { json, filename, recordCounts } 반환.
//   - Server Action 으로 직접 호출 가능 + Route Handler (api/account/export) 가 binary download 처리.
//
// RBAC (R4):
//   - 외부 인자로 user id 입력 받지 않음 — auth.getUser 의 uid 만 사용.
//   - cross-read 0건 — Prisma where 절에 본인 userId 외 값 절대 사용 X.
//
// graceful:
//   - 비로그인 → unauthorized 반환 (throw X)
//   - DB throw → db_failed 반환 (throw X)
//   - 일부 모델 fetch 실패 → 해당 source 만 빈 배열 / 다른 source 는 정상 응답 (best-effort).
//
// 한도 (limit):
//   - EvaluationResult / SessionLog / RewardLog / WeeklyReport / HITLQueue / OfflineEntry: 각 1000 row.
//   - ConsentSignature: 본인 parentEmail 매치 → 100 row (대개 한자릿수).
//   - User row: 1 (본인).
//
// CON-04: 본 파일의 모든 메시지 / 주석에 "치료/진단/장애" 금칙어 0건.
//
// 분석 이벤트: user_data_exported (Client Component 가 호출 직후 trackEvent — 본 Server Action 은
//   data + recordCounts 만 반환, 실제 trackEvent 는 client beacon 책임).

import { prisma } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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

/** filename 안전 형식: speech-therapy-export-{userId}-{YYYYMMDD}.json. */
function buildFilename(userId: string, now: Date): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  // userId 의 영숫자/하이픈만 통과 — Content-Disposition 인젝션 방어.
  const safeId = userId.replace(/[^a-zA-Z0-9-]/g, "");
  return `speech-therapy-export-${safeId}-${yyyy}${mm}${dd}.json`;
}

/** Prisma row → plain JSON-safe object (Date → ISO 문자열, BigInt → string). */
function toPlain(row: unknown): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(row, (_k, v) => {
      if (typeof v === "bigint") return v.toString();
      if (v instanceof Date) return v.toISOString();
      return v;
    }),
  ) as Record<string, unknown>;
}

/** best-effort fetch — 실패 시 빈 배열 반환 + console.error. */
async function safeFetchMany<T>(
  label: string,
  fn: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[export-user-data] ${label} fetch 실패`, err);
    return [];
  }
}

/**
 * 본인 데이터 전체 JSON export — /settings/account 에서 사용자가 다운로드 버튼 클릭 시 호출.
 *
 * RBAC: Supabase auth uid 만 본인 row 조회 — 외부 인자로 user id 입력 받지 않음.
 *
 * graceful:
 *   - 비로그인 → unauthorized
 *   - DB 전반적 throw (예: User row 조회 실패) → db_failed
 *   - 일부 source 모델만 throw → 해당 source 빈 배열, 다른 source 는 정상.
 */
export async function exportUserData(): Promise<ExportUserDataResult> {
  // 1) auth — 비로그인 차단.
  let userId: string;
  let userEmail: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) {
      return {
        success: false,
        reason: "unauthorized",
        message: "로그인 후 다시 시도해 주세요.",
      };
    }
    userId = data.user.id;
    userEmail = data.user.email ?? null;
  } catch {
    return {
      success: false,
      reason: "unauthorized",
      message: "로그인 상태를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 2) User row — 본인 only. 실패 시 즉시 db_failed (export 의 핵심).
  let userRow: Record<string, unknown> | null = null;
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        childAgeMonths: true,
        preferredPhonemes: true,
        onboardingCompletedAt: true,
        subscriptionTier: true,
        createdAt: true,
        institutionId: true,
        classId: true,
      },
    });
    if (row) {
      userRow = toPlain(row);
    } else {
      // User row 부재 — 가입 직후 / 외부 auth-only 분기. 빈 user 로 진행.
      userRow = null;
    }
  } catch (err) {
    console.error("[export-user-data] user findUnique 실패", err);
    return {
      success: false,
      reason: "db_failed",
      message: "데이터 추출에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 3) 관련 모델 — 본인 userId 매칭. 각 source 는 독립적 best-effort.
  const [
    evaluationResults,
    sessionLogs,
    rewardLogs,
    weeklyReports,
    hitlQueues,
    consentSignatures,
    offlineEntries,
  ] = await Promise.all([
    safeFetchMany("evaluationResults", () =>
      prisma.evaluationResult.findMany({
        where: { userId },
        take: EXPORT_ROW_LIMIT_DEFAULT,
        orderBy: { createdAt: "desc" },
      }),
    ),
    safeFetchMany("sessionLogs", () =>
      prisma.sessionLog.findMany({
        where: { userId },
        take: EXPORT_ROW_LIMIT_DEFAULT,
        orderBy: { startTime: "desc" },
      }),
    ),
    safeFetchMany("rewardLogs", () =>
      prisma.rewardLog.findMany({
        where: { userId },
        take: EXPORT_ROW_LIMIT_DEFAULT,
        orderBy: { createdAt: "desc" },
      }),
    ),
    safeFetchMany("weeklyReports", () =>
      prisma.weeklyReport.findMany({
        where: { userId },
        take: EXPORT_ROW_LIMIT_DEFAULT,
        orderBy: { generatedAt: "desc" },
      }),
    ),
    safeFetchMany("hitlQueues", () =>
      prisma.hITLQueue.findMany({
        where: { userId },
        take: EXPORT_ROW_LIMIT_DEFAULT,
        orderBy: { createdAt: "desc" },
      }),
    ),
    userEmail
      ? safeFetchMany("consentSignatures", () =>
          prisma.consentSignature.findMany({
            where: { parentEmail: userEmail as string },
            take: EXPORT_ROW_LIMIT_CONSENT,
            orderBy: { createdAt: "desc" },
          }),
        )
      : Promise.resolve([]),
    safeFetchMany("offlineEntries", () =>
      prisma.offlineEntry.findMany({
        where: { userId },
        take: EXPORT_ROW_LIMIT_DEFAULT,
        orderBy: { observedAt: "desc" },
      }),
    ),
  ]);

  // 4) 직렬화.
  const now = new Date();
  const payload: ExportedUserData = {
    schemaVersion: "1.0.0",
    exportedAt: now.toISOString(),
    user: userRow,
    evaluationResults: evaluationResults.map(toPlain),
    sessionLogs: sessionLogs.map(toPlain),
    rewardLogs: rewardLogs.map(toPlain),
    weeklyReports: weeklyReports.map(toPlain),
    hitlQueues: hitlQueues.map(toPlain),
    consentSignatures: consentSignatures.map(toPlain),
    offlineEntries: offlineEntries.map(toPlain),
  };

  const json = JSON.stringify(payload, null, 2);
  const filename = buildFilename(userId, now);

  return {
    success: true,
    json,
    filename,
    recordCounts: {
      evaluationResults: evaluationResults.length,
      sessionLogs: sessionLogs.length,
      rewardLogs: rewardLogs.length,
      weeklyReports: weeklyReports.length,
      hitlQueues: hitlQueues.length,
      consentSignatures: consentSignatures.length,
      offlineEntries: offlineEntries.length,
    },
  };
}

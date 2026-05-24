"use server";

// FR-Q-TEACHER + FR-C-017+ — 학부모 알림장 일괄 발송 Server Action.
//
// 책임:
//   1) Supabase auth.getUser → 비로그인 → forbidden (UI 가 redirect)
//   2) User.role / institutionId 단건 조회 → RBAC L2
//      - teacher/principal/admin 만 통과 (expert/parent 403)
//   3) loadClassroomForBatch(classId, viewer) — Class fetch + 권한 (R4 cross-tenant 차단)
//   4) enforceClassroomRateLimit(classId) — 반당 1시간 1회 (429 매핑)
//   5) 각 학생별:
//      - 최신 EvaluationResult 1건 fetch
//      - processStudentForBatch → sendCushionNoteEmail (graceful)
//   6) 결과 카운트 (attempted / sent / skipped / errors / batchId)
//   7) 발송 직후 markClassroomBatchSent(classId) — 다음 1시간 차단
//
// R4 보호:
//   - parentEmail 본인 only (수신자 = 부모)
//   - 분석/응답에 email/이름/userId 직접 노출 금지 — 카운트 + classId + batchId 만
//
// graceful: 개별 학생 실패가 다른 학생을 막지 않음 (processStudentForBatch 가 throw 금지).
//
// 호출 측:
//   - components/admin/teacher/SendClassroomCushionButton.tsx (Client Component)

import { prisma } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  loadClassroomForBatch,
  processStudentForBatch,
  enforceClassroomRateLimit,
  markClassroomBatchSent,
  ClassroomBatchError,
  BATCH_MAX_STUDENTS,
  type ClassroomBatchViewer,
  type LatestEvaluationSnapshot,
  type StudentBatchOutcome,
} from "@/lib/classroom/cushion-batch";

const ALLOWED_ROLES = new Set(["teacher", "principal", "admin"] as const);

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

/// 호출자에게 noop 결과를 만들어주는 helper (status 분기에서 사용).
function emptyResult(
  status: SendClassroomCushionStatus,
  batchId: string,
  extra?: Partial<SendClassroomCushionResult>,
): SendClassroomCushionResult {
  return {
    status,
    attempted: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    batchId,
    ...extra,
  };
}

/// 분석 로그 — Vercel Logs (R4: classId + 카운트만, email/userId 0).
function logBatchTelemetry(
  classId: string,
  result: SendClassroomCushionResult,
): void {
  try {
    console.log(
      JSON.stringify({
        level: "info",
        event: "classroom_cushion_batch_sent",
        classId,
        attempted: result.attempted,
        sent: result.sent,
        skipped: result.skipped,
        errors: result.errors,
        batchId: result.batchId,
        status: result.status,
      }),
    );
  } catch {
    // 로그 실패는 무시 — 응답 흐름 차단 금지.
  }
}

function makeBatchId(): string {
  // 단순 — Date + random hex (UUID 의존 회피, R4 라벨 용도).
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `cb_${ts}_${rnd}`;
}

/**
 * 반 단위 쿠션어 알림장 일괄 발송 Server Action.
 *
 * 결과 status:
 *   - "ok"            : 발송 정상 완료 (attempted ≥ 0)
 *   - "unauthorized"  : 비로그인
 *   - "forbidden"     : role 불통 (expert/parent) 또는 RBAC L2 (다른 반)
 *   - "not_found"     : classId 존재하지 않음
 *   - "rate_limited"  : 직전 1시간 안에 동일 반 발송 이력
 *   - "invalid_input" : classId 빈값
 *
 * graceful: 절대 throw 하지 않음 — 모든 분기는 result 로 반환.
 */
export async function sendClassroomCushionNotes(
  input: SendClassroomCushionInput,
): Promise<SendClassroomCushionResult> {
  const batchId = makeBatchId();
  const classId = (input.classId ?? "").trim();

  if (classId.length === 0) {
    return emptyResult("invalid_input", batchId);
  }

  // 1. Supabase auth.
  let viewerId: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const result = emptyResult("unauthorized", batchId);
      logBatchTelemetry(classId, result);
      return result;
    }
    viewerId = data.user.id;
  } catch {
    const result = emptyResult("unauthorized", batchId);
    logBatchTelemetry(classId, result);
    return result;
  }

  // 2. role / institutionId 단건 조회.
  let viewerRole: string | null = null;
  let viewerInstitutionId: string | null = null;
  try {
    const row = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { role: true, institutionId: true },
    });
    viewerRole = row?.role ?? null;
    viewerInstitutionId = row?.institutionId ?? null;
  } catch {
    const result = emptyResult("forbidden", batchId);
    logBatchTelemetry(classId, result);
    return result;
  }

  if (!viewerRole || !(ALLOWED_ROLES as Set<string>).has(viewerRole)) {
    const result = emptyResult("forbidden", batchId);
    logBatchTelemetry(classId, result);
    return result;
  }

  const viewer: ClassroomBatchViewer = {
    userId: viewerId,
    role: viewerRole as ClassroomBatchViewer["role"],
    institutionId: viewerInstitutionId,
  };

  // 3. Class fetch + RBAC L2 (cross-tenant 차단).
  let context;
  try {
    context = await loadClassroomForBatch(classId, viewer);
  } catch (err) {
    if (err instanceof ClassroomBatchError) {
      const status: SendClassroomCushionStatus =
        err.code === "not_found" ? "not_found" : "forbidden";
      const result = emptyResult(status, batchId);
      logBatchTelemetry(classId, result);
      return result;
    }
    // 알 수 없는 에러 — forbidden 로 안전 폴백 (Prisma 장애 시 정보 노출 회피).
    const result = emptyResult("forbidden", batchId);
    logBatchTelemetry(classId, result);
    return result;
  }

  // 4. Rate-limit 검사 (실 발송 전).
  const limit = enforceClassroomRateLimit(classId);
  if (!limit.allowed) {
    const result = emptyResult("rate_limited", batchId, {
      retryAfterSec: limit.retryAfterSec,
    });
    logBatchTelemetry(classId, result);
    return result;
  }

  // 5. 학생 fan-out. BATCH_MAX_STUDENTS 가 prisma take 에서 적용되었지만 방어적 clamp.
  const students = context.students.slice(0, BATCH_MAX_STUDENTS);

  // 빈 반 → attempted=0 + 발송 안 함. Rate-limit 카운터 증가 X (실 발송 0).
  if (students.length === 0) {
    const result: SendClassroomCushionResult = {
      status: "ok",
      attempted: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      batchId,
    };
    logBatchTelemetry(classId, result);
    return result;
  }

  // 6. 학생별 최신 EvaluationResult 1건 fetch (병렬).
  const userIds = students.map((s) => s.userId);
  let latestByUser: Map<string, LatestEvaluationSnapshot> = new Map();
  try {
    // Prisma 7 groupBy 대신 단순 findMany + 클라이언트 측 첫번째 그룹화.
    // userId 별 최신 1건 — orderBy createdAt desc + distinct on (Postgres 한정).
    // 대안: 학생 1명당 1쿼리 — 100명 한도 안에서 acceptable.
    const evals = await Promise.all(
      userIds.map((uid) =>
        prisma.evaluationResult.findFirst({
          where: { userId: uid },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            userId: true,
            targetPhoneme: true,
            articulationScore: true,
            linguisticScore: true,
            acousticScore: true,
          },
        }),
      ),
    );
    latestByUser = new Map(
      evals
        .filter((e): e is NonNullable<typeof e> => !!e)
        .map((e) => [
          e.userId,
          {
            id: e.id,
            targetPhoneme: e.targetPhoneme,
            articulationScore: e.articulationScore,
            linguisticScore: e.linguisticScore,
            acousticScore: e.acousticScore,
          },
        ]),
    );
  } catch {
    // EvaluationResult fetch 자체가 실패해도 student loop 는 진행 — 모두 skipped(no_evaluation).
    latestByUser = new Map();
  }

  // 7. 학생별 processStudentForBatch 순차 호출.
  //    - Resend 호출이 외부 SDK 라 병렬 대량 발송 시 quota 폭발 위험 → 순차로 보수적.
  //    - 100명 한도 안에서 latency acceptable (한 학생당 ~1~5s).
  let sent = 0;
  let skipped = 0;
  let errors = 0;
  const outcomes: StudentBatchOutcome[] = [];

  for (const student of students) {
    const latest = latestByUser.get(student.userId) ?? null;
    const out = await processStudentForBatch(student, latest, {
      institutionName: context.institutionName,
    });
    outcomes.push(out);
    if (out.kind === "sent") sent += 1;
    else if (out.kind === "skipped") skipped += 1;
    else errors += 1;
  }

  // 8. 실 발송이 1건이라도 있었거나 학생 fan-out 을 진행했으면 rate-limit 마킹.
  //    (전부 skipped 인 경우에도 fan-out 자원이 소진되므로 동일하게 1시간 차단)
  markClassroomBatchSent(classId);

  const result: SendClassroomCushionResult = {
    status: "ok",
    attempted: students.length,
    sent,
    skipped,
    errors,
    batchId,
  };
  logBatchTelemetry(classId, result);
  return result;
}

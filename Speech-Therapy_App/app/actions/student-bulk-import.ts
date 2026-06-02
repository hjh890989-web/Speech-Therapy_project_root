"use server";

// FR-C-016 (#39) — Server Action: 원아 100명 일괄 등록.
//
// 책임:
//   1) Supabase auth — 익명 차단 (401-like 에러)
//   2) User.role 조회 — principal / admin 만 허용 (expert 제외 — 운영자 전용)
//   3) 호출자의 institutionId 강제 — 클라이언트 입력의 institutionId 와 일치 여부 검증
//   4) validateStudentRows + bulkUpsertStudents (lib/admin/student-bulk-import)
//   5) 기존 등록 학번 (existingStudentIds) Prisma 조회 — 재시도 흐름 멱등 보장
//   6) BulkImportResult 만 반환 — 다른 institution 의 raw 정보 절대 미반환 (R4)
//
// RBAC:
//   - proxy.ts 가 /admin RBAC 이미 통과 (admin / principal / expert)
//   - 본 Action 은 expert 제외 (운영 등록 권한은 원장/관리자만) — 추가 게이트
//
// 금칙어: "치료" / "진단" / "장애" 사용 금지.
// R4: 다른 institutionId 의 student 정보 cross-read 절대 금지.

import { revalidateTag } from "next/cache";
// Next.js 16 — revalidateTag signature `(tag: string, profile: string | CacheLifeConfig)`.
// 본 호출에서는 default 프로파일 (`'default'`) 로 즉시 invalidate. 단순 시그니처 정합 목적.
const REVALIDATE_PROFILE_DEFAULT = "default" as const;
import { prisma } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  bulkImportStudents,
  validateStudentRows,
  type BulkImportResult,
  type ImportErrorRow,
  type PrismaCreateManyArgs,
} from "@/lib/admin/student-bulk-import";
import { principalDashboardCacheTag } from "@/lib/admin/principal-aggregator";
import { sendParentInvite } from "@/app/actions/parent-invite";

// FR-PERF-3-USE-SERVER-REFACTOR — non-async exports 는 ./student-bulk-import-shape 으로 분리.
import type {
  SubmitBulkImportOptions,
  SubmitBulkImportResult,
} from "./student-bulk-import-shape";

/** Server Action 권한 분기 — 익명/권한부족 시 errorCount 만 보고. */
const PRINCIPAL_ALLOWED_ROLES = ["admin", "principal"] as const;

/**
 * 원아 일괄 등록 Server Action.
 *
 * @param rows 클라이언트가 검증한 행 배열 (서버에서도 재검증).
 * @param institutionId 클라이언트가 주장하는 institutionId — 서버가 호출자 ctx 와 대조.
 * @param options FR-Q-009 / FR-C-005 — 부모 초대 발송 옵션 (선택). 미설정 시
 *   기본값 sendParentInvites=false (helper 만 제공, UI 통합은 후속 PR).
 */
export async function submitBulkImport(
  rows: unknown[],
  institutionId: string,
  options: SubmitBulkImportOptions = {},
): Promise<SubmitBulkImportResult> {
  // 1) Supabase auth.
  let supabase;
  try {
    supabase = await getSupabaseServerClient();
  } catch (err) {
    return {
      status: "unauthorized",
      message: `인증 환경 오류 — ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { status: "unauthorized", message: "로그인이 필요해요." };
  }

  // 2) role + 호출자의 institutionId 직접 조회.
  // R4: 클라이언트가 주장한 institutionId 가 호출자 본인 institutionId 와 일치해야 함.
  let userRow: { role: string | null; institutionId: string | null } | null;
  try {
    const { data, error } = await supabase
      .from("User")
      .select("role, institutionId")
      .eq("id", user.id)
      .maybeSingle<{ role: string | null; institutionId: string | null }>();
    if (error) {
      return {
        status: "forbidden",
        message: `사용자 정보 조회 실패 — ${error.message}`,
      };
    }
    userRow = data;
  } catch (err) {
    return {
      status: "forbidden",
      message: `사용자 정보 조회 예외 — ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  if (!userRow?.role || !(PRINCIPAL_ALLOWED_ROLES as readonly string[]).includes(userRow.role)) {
    return {
      status: "forbidden",
      message: "원아 일괄 등록은 원장 또는 관리자만 사용할 수 있어요.",
    };
  }
  // R4: 호출자가 주장한 institutionId 가 실제 본인 institutionId 와 일치해야 함.
  if (!userRow.institutionId || userRow.institutionId !== institutionId) {
    return {
      status: "forbidden",
      message: "본인 소속 기관의 원아만 등록할 수 있어요.",
    };
  }

  // 3) 입력 검증 — rows 배열인지.
  if (!Array.isArray(rows)) {
    return { status: "invalid_input", message: "행 데이터 형식이 올바르지 않아요." };
  }
  if (rows.length === 0) {
    return {
      status: "ok",
      result: {
        successCount: 0,
        errorCount: 0,
        errors: [],
        insertedStudentIds: [],
      },
      parentInvites: { attempted: 0, sent: 0, skipped: 0 },
    };
  }
  if (rows.length > 1000) {
    return {
      status: "invalid_input",
      message: "한 번에 최대 1,000명까지 등록할 수 있어요.",
    };
  }

  // 4) 기존 등록 학번 조회 — 동일 institution scope 만 (R4).
  // 본 PR 의 User 모델은 studentId 컬럼이 부재 → 현재는 빈 set 으로 안전 폴백.
  // 후속 PR 에서 Student 모델 도입 시 본 조회를 Prisma student.findMany 로 교체.
  const existingStudentIds: ReadonlySet<string> = new Set<string>();

  // 5) 서버측 재검증 + 일괄 INSERT.
  // R4: validateStudentRows 가 cross-tenant row (institutionId 불일치) 를 reject.
  try {
    const result = await bulkImportStudents(
      rows,
      { institutionId, existingStudentIds },
      makePrismaCreateMany(userRow.institutionId),
    );
    // 텔레메트리 — 서버측 console.log (PII 0건).
    logSubmitTelemetry({
      totalRows: rows.length,
      successCount: result.successCount,
      errorCount: result.errorCount,
    });

    // 6) (옵션) 부모 초대 메일 발송 — sendParentInvites=true 인 경우만.
    // R4: 본인 institution 검증은 sendParentInvite 가 다시 RBAC 통과 (depth-in-defense).
    const parentInvites = await maybeSendParentInvites(
      rows,
      result,
      options,
    );

    // Performance 감사 2차 — principal dashboard cache 무효화.
    // 신규 원아 등록 시 다음 dashboard 진입에서 즉시 fresh 데이터 노출.
    // 실패해도 사용자 흐름 차단 금지 (graceful) — revalidateTag 는 동기 + throw 가능성 낮음.
    if (result.successCount > 0) {
      try {
        revalidateTag(
          principalDashboardCacheTag(userRow.institutionId),
          REVALIDATE_PROFILE_DEFAULT,
        );
      } catch (err) {
        console.error("student-bulk-import: revalidateTag failed", err);
      }
    }

    return { status: "ok", result, parentInvites };
  } catch (err) {
    // Prisma 실패 — 부분 성공 미보고 (트랜잭션 단일 호출). 검증 errors 만 노출.
    const fallback = validateStudentRows(rows, { institutionId, existingStudentIds });
    const failureMessage =
      err instanceof Error ? err.message : "알 수 없는 DB 오류";
    return {
      status: "ok",
      result: {
        successCount: 0,
        errorCount: fallback.errors.length,
        errors: appendDbFailureNote(fallback.errors, failureMessage),
        insertedStudentIds: [],
      },
      parentInvites: { attempted: 0, sent: 0, skipped: 0 },
    };
  }
}

/**
 * Prisma createMany 함수 — User 모델 활용 매핑.
 *
 * Sprint 단순화:
 *   - role: 'parent' 로 등록 (부모-자녀 단위)
 *   - email: parentEmail (있다면, unique 충돌 시 Prisma 가 0건 INSERT — graceful)
 *   - childAgeMonths: birthDate 로부터 계산 (오늘 기준)
 *   - studentId / classroomName / name 은 User 에 저장 불가 (컬럼 부재) — 후속 PR.
 *
 * skipDuplicates: true — email unique 충돌 graceful.
 * Prisma 7 의 createMany 는 PostgreSQL 에서 batch INSERT 1회.
 */
function makePrismaCreateMany(
  callerInstitutionId: string,
): (args: PrismaCreateManyArgs) => Promise<{ count: number }> {
  return async (args) => {
    const today = new Date();
    const data = args.data.map((row) => {
      // R4: 호출자 institutionId 가 server-side 에서 다시 강제 (depth-in-defense).
      if (row.institutionId !== callerInstitutionId) {
        throw new Error("cross-tenant row in batch — aborting");
      }
      return {
        institutionId: row.institutionId,
        email: row.parentEmail ?? null,
        role: "parent" as const,
        childAgeMonths: computeAgeMonths(row.birthDate, today),
      };
    });
    const result = await prisma.user.createMany({
      data,
      skipDuplicates: true,
    });
    return { count: result.count };
  };
}

/** birthDate (YYYY-MM-DD) → 오늘 기준 만 개월 (24~84 clamp). */
function computeAgeMonths(birthDate: string, today: Date): number {
  const [yStr, mStr, dStr] = birthDate.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return 24;
  const birth = new Date(y, m - 1, d);
  let months =
    (today.getFullYear() - birth.getFullYear()) * 12 +
    (today.getMonth() - birth.getMonth());
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 24) return 24;
  if (months > 84) return 84;
  return months;
}

/** DB 실패 시 errors 배열 끝에 사유 메모 추가 (UI 노출용). */
function appendDbFailureNote(
  errors: ImportErrorRow[],
  message: string,
): ImportErrorRow[] {
  return [
    ...errors,
    {
      rowIndex: -1,
      reason: "parse_error",
      message: `DB 저장 단계 실패 — ${message}. 잠시 후 다시 시도해 주세요.`,
      raw: null,
    },
  ];
}

/** Server-side telemetry — R4 보호 (행별 raw 정보 미노출). */
function logSubmitTelemetry(properties: {
  totalRows: number;
  successCount: number;
  errorCount: number;
}) {
  try {
    console.log(
      JSON.stringify({
        level: "info",
        event: "student_bulk_import_submitted",
        properties,
      }),
    );
  } catch {
    // graceful — 텔레메트리 실패는 사용자 흐름 차단 X.
  }
}

/**
 * FR-Q-009 / FR-C-005 통합 — 등록 성공 행 중 parentEmail 이 있는 행에 부모 초대 발송.
 *
 * 정책:
 *   - options.sendParentInvites !== true → 발송 없음 (helper 만 제공).
 *   - parentEmail 부재 행 → skip (attempted 카운트 미증가).
 *   - insertedStudentIds 에 포함된 행만 발송 — 검증 실패 / 중복 제거된 행은 제외.
 *   - childId 는 임시 placeholder (rowIdx) 사용 — User 모델에 studentId 컬럼 부재 →
 *     실제 UserId 매핑은 후속 PR 에서 createManyAndReturn 도입 후 교체.
 *   - sendParentInvite 가 graceful (throw 금지) — 본 helper 도 throw 금지.
 *
 * R4: parentEmail / studentId 는 결과에 노출 안 됨 — 집계만.
 */
async function maybeSendParentInvites(
  rows: unknown[],
  result: BulkImportResult,
  options: SubmitBulkImportOptions,
): Promise<{ attempted: number; sent: number; skipped: number }> {
  if (!options.sendParentInvites) {
    return { attempted: 0, sent: 0, skipped: 0 };
  }

  const institutionName =
    options.institutionName && options.institutionName.trim().length > 0
      ? options.institutionName.trim()
      : "어린이집/유치원";

  // 등록 성공한 studentId 의 set — Server Action 응답으로부터 정확한 매칭.
  const insertedSet = new Set(result.insertedStudentIds);

  let attempted = 0;
  let sent = 0;
  let skipped = 0;

  for (const raw of rows) {
    if (
      !raw ||
      typeof raw !== "object" ||
      Array.isArray(raw)
    ) {
      continue;
    }
    const rec = raw as Record<string, unknown>;
    const studentId = typeof rec["studentId"] === "string" ? rec["studentId"] : "";
    const parentEmailRaw =
      typeof rec["parentEmail"] === "string" ? rec["parentEmail"] : "";
    const parentEmail = parentEmailRaw.trim().toLowerCase();
    const childName = typeof rec["name"] === "string" ? rec["name"] : undefined;

    // 등록 성공 + parentEmail 존재 행만 시도.
    if (!parentEmail || !insertedSet.has(studentId)) continue;

    attempted += 1;
    // childId placeholder — schema 에 부모-자녀 연결 컬럼 부재 (CON-FR-C-016).
    // studentId 를 임시 식별자로 활용. 후속 PR 에서 user.id (createManyAndReturn) 로 교체.
    const inviteResult = await sendParentInvite({
      parentEmail,
      childId: studentId,
      institutionName,
      childName,
    });
    if (inviteResult.sent) {
      sent += 1;
    } else {
      skipped += 1;
    }
  }

  return { attempted, sent, skipped };
}

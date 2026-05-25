// DB-011 후속 — /admin/audit 페이지 AuditLog 조회 helper.
//
// 책임 (Server-side only):
//   1) `prisma.auditLog.findMany` 로 필터 + cursor 페이지네이션 조회.
//   2) `where` 절: action / actorId / tableName / createdAt 범위 조합.
//   3) cursor 페이지네이션: createdAt DESC 정렬 → cursor 는 직전 페이지 마지막 row 의
//      AuditLog.id (UUID). 본 값보다 "이전 (작은) createdAt" row 부터 다음 페이지 fetch.
//      ID 기반이 createdAt 기반보다 안전 — 동일 createdAt 중복 처리 불필요.
//   4) take+1 trick — 50+1 row fetch 후 마지막 절단 → hasMore 정확성.
//   5) Prisma 에러 → graceful empty + console.warn (admin 페이지 차단 금지).
//
// 호출 측 책임 (page.tsx):
//   - admin role 사전 검증 (page-level RBAC).
//   - filter.actorId / tableName 은 사용자 입력 — 본 함수는 Prisma 가 SQL injection
//     방어하지만, 1차 길이 / 공백 trim 은 호출 측 책임 (단순 검증).
//
// R4 (자녀 식별 정보 보호):
//   - diff JSONB 안의 자녀 PII 는 TRIGGER (`audit_sanitize_jsonb`) 가 자동 [REDACTED].
//   - 본 모듈은 raw 데이터 그대로 반환 — UI 측 표시도 sanitized 결과 그대로.
//
// CON-04 (의료 금칙어): 본 모듈은 UI 카피 미생성 — 데이터만 반환.
//
// 성능:
//   - 50 row / page → 50건 LIMIT (REQ-NF-004 RSC LCP ≤ 3,000ms 안에 충분).
//   - createdAt DESC 인덱스 + actorId / tableName 인덱스 활용 (schema.prisma 참고).

import { prisma } from "@/lib/db";

/// 1 페이지 default row 수 — Prisma findMany take 값.
export const AUDIT_LOGS_PER_PAGE = 50;

/// 1 페이지 최대 row 수 — 호출 측이 limit override 시 상한 (DoS 방어).
export const AUDIT_LOGS_MAX_PAGE_SIZE = 200;

/** AuditLog 단일 row 형태 — Prisma 가 생성하는 타입 대신 명시 (test mock 호환). */
export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  tableName: string;
  rowId: string | null;
  /// diff JSONB — TRIGGER 가 sanitize 한 결과 그대로. unknown 으로 안전 표면.
  diff: unknown;
  createdAt: Date;
}

/** loadAuditLogs 입력 필터. 모든 필드 optional — undefined 시 해당 조건 미적용. */
export interface AuditLogFilter {
  /// action 정확 매칭 (예: "consent_sign", "User_update").
  action?: string;
  /// actorId 정확 매칭 (예: Supabase user.id UUID).
  actorId?: string;
  /// tableName 정확 매칭 (예: "ConsentSignature").
  tableName?: string;
  /// createdAt >= fromDate 범위 필터.
  fromDate?: Date;
  /// createdAt <= toDate 범위 필터.
  toDate?: Date;
}

/** loadAuditLogs 결과. */
export interface AuditLogResult {
  /// 본 페이지에 노출할 entries (최대 limit 개).
  entries: AuditLogEntry[];
  /// 다음 페이지 존재 여부 (take+1 trick).
  hasMore: boolean;
  /// 다음 페이지 cursor — 본 페이지 마지막 entry 의 id. hasMore=false 면 undefined.
  nextCursor?: string;
}

/**
 * filter 객체에서 Prisma where 절을 빌드.
 *
 * 각 필드는 빈 문자열 / 길이 0 시 skip — 호출 측의 폼 default 처리 단순화.
 * fromDate / toDate 가 둘 다 있으면 `{ createdAt: { gte, lte } }` 결합.
 */
function buildWhere(filter: AuditLogFilter): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (filter.action && filter.action.trim().length > 0) {
    where.action = filter.action.trim();
  }
  if (filter.actorId && filter.actorId.trim().length > 0) {
    where.actorId = filter.actorId.trim();
  }
  if (filter.tableName && filter.tableName.trim().length > 0) {
    where.tableName = filter.tableName.trim();
  }
  if (filter.fromDate || filter.toDate) {
    const createdAt: Record<string, Date> = {};
    if (filter.fromDate) createdAt.gte = filter.fromDate;
    if (filter.toDate) createdAt.lte = filter.toDate;
    where.createdAt = createdAt;
  }
  return where;
}

/**
 * AuditLog 페이지네이션 조회 — Server-side only.
 *
 * @param filter — action / actorId / tableName / 날짜 범위 필터. 모두 optional.
 * @param cursor — 직전 페이지 마지막 AuditLog.id. undefined / 빈 문자열 시 첫 페이지.
 * @param limit  — 1 페이지 row 수. default `AUDIT_LOGS_PER_PAGE` (50). max `AUDIT_LOGS_MAX_PAGE_SIZE` (200).
 *
 * cursor 동작:
 *   - 정렬: { createdAt: 'desc', id: 'desc' } — 동일 createdAt tiebreaker.
 *   - cursor 가 있으면 Prisma `cursor: { id: cursor }, skip: 1` 사용 — 안전한
 *     keyset 페이지네이션.
 *
 * graceful 실패:
 *   - Prisma 오류 시 console.warn + 빈 결과 반환 (admin 페이지 차단 금지).
 */
export async function loadAuditLogs(
  filter: AuditLogFilter,
  cursor?: string,
  limit?: number,
): Promise<AuditLogResult> {
  const effectiveLimit = Math.min(
    Math.max(typeof limit === "number" && Number.isFinite(limit) ? limit : AUDIT_LOGS_PER_PAGE, 1),
    AUDIT_LOGS_MAX_PAGE_SIZE,
  );
  const take = effectiveLimit + 1; // take+1 trick — hasMore 판정용.
  const where = buildWhere(filter);

  // Prisma findMany 옵션 구성 — cursor 가 유효할 때만 cursor/skip 추가.
  const findOptions: {
    where: Record<string, unknown>;
    orderBy: Array<Record<string, "asc" | "desc">>;
    take: number;
    cursor?: { id: string };
    skip?: number;
  } = {
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  };
  if (typeof cursor === "string" && cursor.length > 0) {
    findOptions.cursor = { id: cursor };
    findOptions.skip = 1; // cursor row 자체 제외.
  }

  try {
    // Prisma typed client (`prisma.auditLog`) 의존 — schema.prisma 의 AuditLog 모델 활성화 필요.
    // 호출 측이 `npx prisma generate` 미실행 시 런타임 에러 — 본 try/catch 가 graceful 처리.
    const prismaAny = prisma as unknown as {
      auditLog: {
        findMany: (opts: unknown) => Promise<AuditLogEntry[]>;
      };
    };
    const fetched = await prismaAny.auditLog.findMany(findOptions);

    const hasMore = fetched.length > effectiveLimit;
    const entries = hasMore ? fetched.slice(0, effectiveLimit) : fetched;
    const nextCursor = hasMore ? entries[entries.length - 1]?.id : undefined;

    return {
      entries,
      hasMore,
      ...(nextCursor ? { nextCursor } : {}),
    };
  } catch (err) {
    console.warn(
      "[audit-aggregator] AuditLog findMany 실패 — graceful empty 반환:",
      err,
    );
    return {
      entries: [],
      hasMore: false,
    };
  }
}

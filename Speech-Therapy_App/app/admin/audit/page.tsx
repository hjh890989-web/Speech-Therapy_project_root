// DB-011 후속 — /admin/audit 페이지 (Server Component).
//
// 책임:
//   1) Supabase auth.getUser() + Prisma User.role 조회 (cached-get-user 사용 — request-scope dedup).
//   2) **admin only** 강제 (page-level L2 가드). proxy.ts (L1) 는 admin/principal/expert/teacher
//      통과하나, 본 페이지는 admin 외 role 모두 403 차단.
//   3) searchParams 비동기 처리 (Next.js 16) — action / actorId / tableName / from / to / cursor.
//   4) loadAuditLogs(filter, cursor) 호출 → AuditLogTable + AuditLogFilter 렌더.
//   5) 페이지네이션: "다음 페이지" Link (`?cursor=<nextCursor>` + 기존 필터 유지).
//   6) audit_log_viewed telemetry (server-side console.log — Vercel Logs).
//
// 접근 제어 계층:
//   - L1: proxy.ts 가 /admin RBAC 1차 통과 (admin/principal/expert/teacher).
//   - L2: 본 페이지가 admin 외 role 차단 (R4 — AuditLog 가 다른 user 의 데이터).
//
// R4 (자녀 식별 정보 보호):
//   - AuditLog 자체가 _다른 사용자_ 의 변경 이력 → admin 외 절대 노출 금지.
//   - diff JSONB 는 TRIGGER 측 audit_sanitize_jsonb 으로 [REDACTED] 처리됨 (자동).
//   - lib/audit.ts 경로는 호출자 sanitize 책임 — admin 만 보므로 운영 정책상 허용.
//
// CON-04 (의료 금칙어): 화면 카피 "치료/진단/장애" 사용 금지 — "감사 기록", "조회".
//
// REQ-NF-004: RSC LCP ≤ 3,000ms — loadAuditLogs 단일 쿼리 (50 row) + cursor keyset.

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCachedUserRoleResult } from "@/lib/auth/cached-get-user";
import {
  loadAuditLogs,
  type AuditLogResult,
  type AuditLogFilter as AuditLogFilterType,
} from "@/lib/admin/audit-aggregator";
import { AuditLogFilter } from "@/components/admin/audit/AuditLogFilter";
import { AuditLogTable } from "@/components/admin/audit/AuditLogTable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "감사 기록 — Speech-Therapy",
  description:
    "관리자 전용 AuditLog 조회 페이지. 필터 + 페이지네이션으로 시스템 변경 이력을 확인합니다.",
};

/// 본 페이지 진입 허용 role — admin 만.
const PAGE_ALLOWED_ROLE = "admin";

/**
 * YYYY-MM-DD (HTML date input) → Date (UTC 자정).
 * 유효성 검사 실패 시 undefined.
 */
function parseDateParam(raw: string | undefined): Date | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  // YYYY-MM-DD 형식만 허용 (사용자 입력 sanitize 1차).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  const d = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

/// toDate 는 종일 포함 — 23:59:59.999Z 까지.
function parseDateParamEndOfDay(raw: string | undefined): Date | undefined {
  const d = parseDateParam(raw);
  if (!d) return undefined;
  return new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/// 사용자 입력 actorId / tableName 1차 sanitize — 길이 / 공백 trim.
function sanitizeStringParam(
  raw: string | undefined,
  maxLength = 200,
): string | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > maxLength) return trimmed.slice(0, maxLength);
  return trimmed;
}

/// audit_log_viewed telemetry — server-side console.log (Vercel Logs).
function logAuditView(filter: AuditLogFilterType, result: AuditLogResult) {
  try {
    const filterCount = [
      filter.action,
      filter.actorId,
      filter.tableName,
      filter.fromDate,
      filter.toDate,
    ].filter((v) => v !== undefined && v !== null).length;
    console.log(
      JSON.stringify({
        level: "info",
        event: "audit_log_viewed",
        filterCount,
        resultCount: result.entries.length,
      }),
    );
  } catch {
    // logging 실패는 무시 — UI 렌더 차단 금지.
  }
}

/**
 * Page props — Next.js 16 부터 searchParams 는 Promise 로 변경됨.
 */
interface AuditPageProps {
  searchParams: Promise<{
    action?: string;
    actorId?: string;
    tableName?: string;
    from?: string;
    to?: string;
    cursor?: string;
  }>;
}

export default async function AuditLogPage({ searchParams }: AuditPageProps) {
  const params = await searchParams;

  // L2 가드 — admin only.
  const ctx = await getCachedUserRoleResult();

  if (ctx.status === "anonymous") {
    redirect("/login?next=/admin/audit");
  }

  if (ctx.status === "error" || ctx.role !== PAGE_ALLOWED_ROLE) {
    return (
      <main
        data-testid="audit-forbidden"
        className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6"
        role="alert"
        aria-live="polite"
      >
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-xl font-semibold">
            감사 기록 페이지 접근 권한이 없어요
          </h1>
          <p className="mt-2 text-sm">
            본 페이지는 관리자(admin) 전용이에요. 권한이 필요하시면 운영팀에 요청해 주세요.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  // 필터 sanitize (사용자 입력 1차 검증).
  const actionParam = sanitizeStringParam(params.action);
  const actorIdParam = sanitizeStringParam(params.actorId);
  const tableNameParam = sanitizeStringParam(params.tableName);
  const fromDate = parseDateParam(params.from);
  const toDate = parseDateParamEndOfDay(params.to);
  const cursor = sanitizeStringParam(params.cursor);

  const filter: AuditLogFilterType = {
    ...(actionParam ? { action: actionParam } : {}),
    ...(actorIdParam ? { actorId: actorIdParam } : {}),
    ...(tableNameParam ? { tableName: tableNameParam } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  };

  const result = await loadAuditLogs(filter, cursor);
  logAuditView(filter, result);

  // "다음 페이지" Link href — 현재 필터 + 새 cursor 유지.
  const nextHref = (() => {
    if (!result.hasMore || !result.nextCursor) return null;
    const search = new URLSearchParams();
    if (actionParam) search.set("action", actionParam);
    if (actorIdParam) search.set("actorId", actorIdParam);
    if (tableNameParam) search.set("tableName", tableNameParam);
    if (params.from) search.set("from", params.from);
    if (params.to) search.set("to", params.to);
    search.set("cursor", result.nextCursor);
    return `/admin/audit?${search.toString()}`;
  })();

  return (
    <main
      data-testid="admin-audit-page"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
      aria-labelledby="audit-heading"
    >
      <header className="mb-6">
        <h1
          id="audit-heading"
          className="text-2xl font-bold text-slate-900 sm:text-3xl"
        >
          감사 기록 (AuditLog)
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          시스템 변경 이력을 필터 + 페이지네이션으로 조회합니다. 관리자 전용 화면이에요.
        </p>
      </header>

      <AuditLogFilter
        initialAction={actionParam ?? ""}
        initialActorId={actorIdParam ?? ""}
        initialTableName={tableNameParam ?? ""}
        initialFromDate={params.from ?? ""}
        initialToDate={params.to ?? ""}
      />

      <AuditLogTable entries={result.entries} />

      {nextHref ? (
        <nav
          aria-label="페이지네이션"
          className="mt-6 flex items-center justify-end"
        >
          <Link
            href={nextHref}
            data-testid="audit-log-next-page"
            className="inline-flex min-h-[44px] items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            다음 페이지 →
          </Link>
        </nav>
      ) : null}

      <footer
        aria-label="안내"
        className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"
      >
        <p className="mb-1 font-semibold text-slate-800">표시 정책</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>AuditLog 의 diff 본문은 PostgreSQL TRIGGER 가 자동 [REDACTED] 처리해요 (R4).</li>
          <li>본 페이지는 관리자(admin) 전용 — 다른 역할 접근 차단.</li>
          <li>1 페이지 50건 기준 cursor 페이지네이션. createdAt 내림차순 정렬.</li>
        </ul>
      </footer>
    </main>
  );
}

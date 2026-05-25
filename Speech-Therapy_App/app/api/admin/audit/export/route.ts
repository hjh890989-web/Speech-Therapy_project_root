// DB-011 후속 — GET /api/admin/audit/export Route Handler (CSV / JSON 다운로드).
//
// 책임:
//   1) admin 전용 RBAC (Supabase auth.getUser + Role SELECT — page-level L2 와 동일 정책).
//   2) searchParams 기반 filter (action / actorId / tableName / from / to) + format (csv|json).
//   3) loadAuditLogs(filter, undefined, EXPORT_LIMIT) 호출 — cursor 없이 한 번에 추출.
//   4) format=csv → text/csv 응답, format=json → application/json 응답.
//   5) Content-Disposition: attachment + filename (audit-YYYYMMDD.{ext}) → 브라우저 파일 다운로드.
//   6) telemetry (server-side console.log) — audit_log_exported (format / recordCount).
//
// RBAC (R4):
//   - admin 외 role 모두 403 (proxy.ts L1 통과 후 본 endpoint L2 차단).
//   - AuditLog 자체가 _다른 사용자_ 의 변경 이력 → admin 외 절대 노출 금지.
//
// 메모리 정책:
//   - EXPORT_LIMIT 5000 row × 평균 200B → 1MB 이하 — Vercel Hobby 응답 한계 안에서 안전.
//   - 단일 응답 (stream 아님) — 5000 row 이내에선 stream 오버헤드 < 추가 복잡도. 향후 LIMIT
//     상향 시 ReadableStream 으로 전환 (별도 PR).
//
// CSV 인코딩:
//   - RFC 4180 compliant — 큰따옴표 escape, 줄바꿈 포함 셀은 quote.
//   - UTF-8 BOM (﻿) prefix — Excel 한글 깨짐 방지.
//   - diff JSON 은 한 줄 stringify (JSON.stringify) — 셀 안에서 escape.
//
// 캐시: no-store — 매 요청 fresh + 다른 admin 캐시 누설 방어.
//
// CON-04: 화면 카피 / 에러 메시지 / filename 에 "치료/진단/장애" 금칙어 사용 금지.

import { NextResponse } from "next/server";

import {
  loadAuditLogs,
  type AuditLogEntry,
  type AuditLogFilter,
} from "@/lib/admin/audit-aggregator";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** CSV / JSON export 시 한 번에 추출 가능한 row 상한. */
export const AUDIT_EXPORT_LIMIT = 5000;

/** UTF-8 BOM (U+FEFF) — Excel 한글 깨짐 방지. 문자 literal 이 invisible 이라 escape 사용. */
const UTF8_BOM = "﻿";

/** export 응답 가능한 format 타입. */
type ExportFormat = "csv" | "json";

/** /admin/audit 페이지의 sanitize 패턴과 동일 — 사용자 입력 1차 trim + 길이 cap. */
function sanitizeStringParam(
  raw: string | null | undefined,
  maxLength = 200,
): string | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > maxLength) return trimmed.slice(0, maxLength);
  return trimmed;
}

/** YYYY-MM-DD 형식만 허용 (사용자 입력 sanitize 1차). */
function parseDateParam(raw: string | null | undefined): Date | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  const d = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

/** toDate 는 종일 포함 (23:59:59.999Z). */
function parseDateParamEndOfDay(raw: string | null | undefined): Date | undefined {
  const d = parseDateParam(raw);
  if (!d) return undefined;
  return new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** format 파라미터 정규화. csv / json 외 입력 → json 폴백 (안전한 default). */
function parseFormat(raw: string | null | undefined): ExportFormat {
  if (raw === "csv") return "csv";
  return "json";
}

/** Date → YYYYMMDD 변환 (UTC 기준 filename 안전). */
function toFilenameDate(date: Date): string {
  const yyyy = date.getUTCFullYear().toString().padStart(4, "0");
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = date.getUTCDate().toString().padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

/**
 * RFC 4180 CSV 셀 escape — 큰따옴표 / 쉼표 / 줄바꿈 포함 시 quote.
 *
 * - null / undefined → 빈 셀.
 * - Date → ISO 문자열.
 * - object → JSON.stringify (한 줄, escape 적용).
 * - 그 외 → String() 후 quote 처리.
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str: string;
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === "object") {
    try {
      str = JSON.stringify(value);
    } catch {
      str = "(직렬화 불가)";
    }
  } else {
    str = String(value);
  }
  // 쉼표 / 큰따옴표 / 줄바꿈 / 캐리지 리턴 포함 시 quote 처리.
  const needsQuote = /[",\r\n]/.test(str);
  if (!needsQuote) return str;
  // 셀 안 큰따옴표는 두 번 (RFC 4180).
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * AuditLog entries → RFC 4180 CSV 문자열.
 *
 * 컬럼: id / createdAt / actorId / action / tableName / rowId / diff
 *
 * UTF-8 BOM (﻿) prefix — Excel 한글 깨짐 방지.
 */
function entriesToCsv(entries: AuditLogEntry[]): string {
  const headers = [
    "id",
    "createdAt",
    "actorId",
    "action",
    "tableName",
    "rowId",
    "diff",
  ];
  const lines: string[] = [headers.join(",")];
  for (const entry of entries) {
    lines.push(
      [
        csvCell(entry.id),
        csvCell(entry.createdAt),
        csvCell(entry.actorId),
        csvCell(entry.action),
        csvCell(entry.tableName),
        csvCell(entry.rowId),
        csvCell(entry.diff),
      ].join(","),
    );
  }
  // UTF-8 BOM (﻿) + CRLF 줄바꿈 (Excel 한글 깨짐 방지 + Excel 호환).
  return `${UTF8_BOM}${lines.join("\r\n")}\r\n`;
}

/**
 * AuditLog entries → JSON 문자열 (downloadable export 형식).
 *
 * 스키마: { exportedAt, recordCount, entries }
 *   - exportedAt: ISO 문자열 (응답 시점).
 *   - recordCount: entries.length.
 *   - entries: AuditLogEntry 배열 — createdAt 은 ISO 문자열로 직렬화 (JSON.stringify 기본).
 */
function entriesToJson(entries: AuditLogEntry[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      recordCount: entries.length,
      entries,
    },
    null,
    2,
  );
}

/**
 * audit_log_exported telemetry — server-side console.log (Vercel Logs).
 *
 * R4: filter 본문 / actorId 의 raw value 노출 X — 카운트 + 옵션만.
 */
function logAuditExport(format: ExportFormat, recordCount: number) {
  try {
    console.log(
      JSON.stringify({
        level: "info",
        event: "audit_log_exported",
        format,
        recordCount,
      }),
    );
  } catch {
    // 텔레메트리 실패는 응답 차단 금지.
  }
}

/**
 * GET /api/admin/audit/export?format=csv|json&action=&actorId=&tableName=&from=&to=
 *
 * 응답:
 *   - 200 + CSV 또는 JSON body + Content-Disposition: attachment
 *   - 401 → 비로그인
 *   - 403 → admin 외 role
 *   - 500 → DB / 내부 에러 (loadAuditLogs 는 graceful empty 반환하나 auth 흐름 자체 실패 시)
 */
export async function GET(request: Request): Promise<Response> {
  // 1) Supabase auth — 비로그인 차단.
  let supabase;
  try {
    supabase = await getSupabaseServerClient();
  } catch (err) {
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // 2) admin 만 — page-level L2 정책과 동일 (admin 외 role 모두 차단).
  let role: string | null = null;
  try {
    const { data: userRow, error: roleError } = await supabase
      .from("User")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: string | null }>();
    if (roleError) {
      return NextResponse.json(
        { error: "INTERNAL_ERROR", detail: roleError.message },
        { status: 500 },
      );
    }
    role = userRow?.role ?? null;
  } catch (err) {
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  // export 는 admin 만 — principal / expert / teacher 도 차단 (R4 — AuditLog 다른 user 데이터).
  // ADMIN_ALLOWED_ROLES (admin/principal/expert) 와 _별도_ — export 는 admin 한정.
  if (role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // 3) searchParams → filter + format.
  const url = new URL(request.url);
  const format = parseFormat(url.searchParams.get("format"));
  const actionParam = sanitizeStringParam(url.searchParams.get("action"));
  const actorIdParam = sanitizeStringParam(url.searchParams.get("actorId"));
  const tableNameParam = sanitizeStringParam(url.searchParams.get("tableName"));
  const fromDate = parseDateParam(url.searchParams.get("from"));
  const toDate = parseDateParamEndOfDay(url.searchParams.get("to"));

  const filter: AuditLogFilter = {
    ...(actionParam ? { action: actionParam } : {}),
    ...(actorIdParam ? { actorId: actorIdParam } : {}),
    ...(tableNameParam ? { tableName: tableNameParam } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  };

  // 4) 데이터 추출 — cursor 없이 EXPORT_LIMIT row 일괄.
  //    loadAuditLogs 는 graceful — DB 실패 시 빈 결과 반환 (admin UI 차단 금지 정책).
  const result = await loadAuditLogs(filter, undefined, AUDIT_EXPORT_LIMIT);
  const entries = result.entries;

  // 5) 텔레메트리 (응답 직전).
  logAuditExport(format, entries.length);

  // 6) format 별 응답.
  const filenameDate = toFilenameDate(new Date());
  if (format === "csv") {
    const body = entriesToCsv(entries);
    const headers = new Headers({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-${filenameDate}.csv"`,
      "Cache-Control": "no-store, max-age=0",
      "Content-Length": String(Buffer.byteLength(body, "utf8")),
    });
    return new Response(body, { status: 200, headers });
  }

  const body = entriesToJson(entries);
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": `attachment; filename="audit-${filenameDate}.json"`,
    "Cache-Control": "no-store, max-age=0",
    "Content-Length": String(Buffer.byteLength(body, "utf8")),
  });
  return new Response(body, { status: 200, headers });
}

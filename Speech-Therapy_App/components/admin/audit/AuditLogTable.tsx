"use client";

// DB-011 후속 — /admin/audit AuditLog 결과 표 (Client Component).
//
// 책임:
//   - 서버에서 받은 entries 를 row 별로 표시 (createdAt / actorId / action / tableName / rowId).
//   - "상세 보기" 버튼 → AuditLogDetailModal 오픈 (선택된 entry).
//   - 빈 결과 안내 (`audit-log-empty`).
//
// Client Component 이유:
//   - 모달 open/close state + useState 가 필요.
//   - server-side 에서 받은 createdAt 은 JSON 직렬화로 string 으로 도착 가능 →
//     본 컴포넌트는 entry.createdAt 을 Date 로 normalize 후 표시.
//
// 표시 정책 (R4):
//   - actorId 는 8자리 truncate 표시 + 풀길이는 모달 안에서.
//   - rowId 도 8자리 truncate (UUID 안전).
//   - diff 본문은 표에서 미노출 — 모달에서만.
//
// CON-04: 화면 카피 "치료/진단/장애" 사용 금지 — "감사 기록", "상세".

import { useState } from "react";

import type { AuditLogEntry } from "@/lib/admin/audit-aggregator";
import { formatKstDateTime } from "@/lib/timeline/tz";

import { AuditLogDetailModal } from "./AuditLogDetailModal";

export interface AuditLogTableProps {
  /// 본 페이지 노출 entries (loadAuditLogs 결과).
  entries: AuditLogEntry[];
}

/// UUID 등 긴 식별자를 앞 8자 + 말줄임 표시.
function truncateId(value: string | null | undefined, len = 8): string {
  if (!value) return "—";
  if (value.length <= len) return value;
  return `${value.slice(0, len)}…`;
}

/// createdAt 이 string 으로 들어와도 안전하게 KST 시각으로 표시.
/// FR-TZ-UNIFY-EXTEND: 기존 ISO (UTC 기준) → KST wall-clock 으로 통일.
/// 한국 사용자가 인지하는 발생 시각 그대로 노출 (서버 TZ 무관).
function formatCreatedAt(value: Date | string | number): string {
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return formatKstDateTime(d);
  } catch {
    return String(value);
  }
}

/// entry.createdAt 을 Date 로 normalize (서버 → 클라이언트 직렬화 호환).
function normalizeEntry(entry: AuditLogEntry): AuditLogEntry {
  if (entry.createdAt instanceof Date) return entry;
  return { ...entry, createdAt: new Date(entry.createdAt as unknown as string) };
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  if (entries.length === 0) {
    return (
      <section
        data-testid="audit-log-empty"
        aria-label="결과 없음"
        className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700"
      >
        <p className="font-semibold text-slate-900">
          조건에 맞는 audit log 가 없어요
        </p>
        <p className="mt-1 text-slate-600">
          필터를 조정하거나 초기화 후 다시 시도해 주세요.
        </p>
      </section>
    );
  }

  return (
    <>
      <div
        data-testid="audit-log-table-wrapper"
        className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm"
      >
        <table
          data-testid="audit-log-table"
          className="min-w-full divide-y divide-slate-200 text-sm"
        >
          <caption className="sr-only">감사 기록 목록</caption>
          <thead className="bg-slate-50">
            <tr>
              <th
                scope="col"
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                발생 시각
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                actor
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                동작
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                테이블
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                row ID
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                <span className="sr-only">상세 보기</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((raw) => {
              const entry = normalizeEntry(raw);
              return (
                <tr
                  key={entry.id}
                  data-testid={`audit-log-row-${entry.id}`}
                  className="hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-700">
                    {formatCreatedAt(entry.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="font-mono text-xs text-slate-700"
                      title={entry.actorId}
                    >
                      {truncateId(entry.actorId)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="break-all text-slate-900">{entry.action}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{entry.tableName}</td>
                  <td className="px-3 py-2">
                    <span
                      className="font-mono text-xs text-slate-700"
                      title={entry.rowId ?? "—"}
                    >
                      {truncateId(entry.rowId)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(entry)}
                      data-testid={`audit-log-detail-button-${entry.id}`}
                      className="inline-flex min-h-[36px] items-center rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      상세 보기
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AuditLogDetailModal entry={selected} onClose={() => setSelected(null)} />
    </>
  );
}

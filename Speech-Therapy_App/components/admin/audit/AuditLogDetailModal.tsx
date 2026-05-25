"use client";

// DB-011 후속 — /admin/audit AuditLog 상세 보기 modal (Client Component).
//
// 책임:
//   - 단일 AuditLog entry 의 diff JSONB 를 pre-formatted JSON 으로 표시.
//   - actorId 풀길이 + tableName / rowId / action / createdAt 메타 정보 표시.
//   - 닫기 버튼 / Esc 키 / 배경 클릭 시 모달 close.
//
// 표시 정책:
//   - diff 본문은 raw JSON (TRIGGER 가 자동 sanitize 한 결과 그대로 — 자녀 PII 자동 [REDACTED]).
//   - JSON.stringify(diff, null, 2) 으로 pretty print.
//   - lib/audit.ts 측 INSERT 는 호출자 책임 — TRIGGER 외 경로는 sanitize 미보장이라 R4 약속 X.
//     본 UI 는 admin only 진입이므로 R4 위반 아님.
//
// 접근성:
//   - role="dialog" + aria-modal="true" + aria-labelledby
//   - Esc 키 닫기 — keydown handler
//   - 포커스 트랩은 단순화 — 닫기 버튼만 autoFocus
//
// CON-04: 화면 카피 "치료/진단/장애" 사용 금지 — "기록 상세", "감사 정보".

import { useEffect, useCallback } from "react";

import type { AuditLogEntry } from "@/lib/admin/audit-aggregator";
import { formatKstDateTime } from "@/lib/timeline/tz";

export interface AuditLogDetailModalProps {
  /// 표시할 entry. null 이면 modal 미렌더.
  entry: AuditLogEntry | null;
  /// 모달 닫기 콜백.
  onClose: () => void;
}

export function AuditLogDetailModal({ entry, onClose }: AuditLogDetailModalProps) {
  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!entry) return;
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [entry, handleKey]);

  if (!entry) return null;

  const diffJson = (() => {
    try {
      return JSON.stringify(entry.diff, null, 2);
    } catch {
      return "[직렬화 실패 — diff 가 circular 또는 비표준 타입]";
    }
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-detail-heading"
      data-testid="audit-log-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <header className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2
              id="audit-detail-heading"
              className="text-lg font-semibold text-slate-900"
            >
              감사 기록 상세
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              <span data-testid="audit-detail-id">{entry.id}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            data-testid="audit-detail-close"
            aria-label="닫기"
            className="ml-4 inline-flex h-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <span aria-hidden>×</span>
          </button>
        </header>

        <div className="px-5 py-4 text-sm text-slate-800">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                동작 (action)
              </dt>
              <dd data-testid="audit-detail-action" className="mt-1 break-all">
                {entry.action}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                대상 테이블
              </dt>
              <dd data-testid="audit-detail-table-name" className="mt-1 break-all">
                {entry.tableName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                actor ID (전체)
              </dt>
              <dd
                data-testid="audit-detail-actor-id"
                className="mt-1 break-all font-mono text-xs"
              >
                {entry.actorId}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                row ID
              </dt>
              <dd
                data-testid="audit-detail-row-id"
                className="mt-1 break-all font-mono text-xs"
              >
                {entry.rowId ?? "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                발생 시각 (KST)
              </dt>
              <dd className="mt-1">
                {/*
                  FR-TZ-UNIFY-EXTEND: 한국 사용자 wall-clock (KST) 으로 표시.
                  기존 toISOString (UTC) 은 9시간 어긋나 운영팀이 헷갈림.
                */}
                {entry.createdAt instanceof Date
                  ? formatKstDateTime(entry.createdAt)
                  : (() => {
                      const d = new Date(entry.createdAt as unknown as string);
                      return Number.isNaN(d.getTime())
                        ? String(entry.createdAt)
                        : formatKstDateTime(d);
                    })()}
              </dd>
            </div>
          </dl>

          <div className="mt-5">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              diff (sanitized JSON)
            </h3>
            <pre
              data-testid="audit-detail-diff"
              className="max-h-96 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800"
            >
              {diffJson}
            </pre>
            <p className="mt-2 text-xs text-slate-500">
              자녀 식별 정보 추정 키는 PostgreSQL TRIGGER 가 자동 [REDACTED] 처리해요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

// DB-011 후속 — /admin/audit 페이지 필터 form (Client Component).
//
// 책임:
//   - action (select + custom input) / actorId (text) / tableName (select + custom)
//     / fromDate / toDate 입력 받아 URL searchParams 로 router.push.
//   - "필터 적용" 버튼: 현재 입력값을 query string 으로 직렬화 후 /admin/audit?... 로 이동.
//   - "초기화" 버튼: 빈 searchParams 로 /admin/audit 진입 (모든 필터 해제).
//
// URL 라운드트립:
//   - 모든 필터 상태는 URL searchParams 가 진실 — 본 컴포넌트는 초기값을 prop 으로만 수신,
//     이후 변경은 router.push 로 server-side roundtrip → loadAuditLogs 재호출.
//   - cursor 는 필터 변경 시 reset (새 필터로 1페이지부터 다시 시작).
//
// 접근성:
//   - label/input 1:1 매칭 (useId).
//   - 모든 인터랙티브 영역 ≥ 44px (sm:py-2).
//   - 키보드 nav: tab 순서 — action → actorId → tableName → fromDate → toDate → 버튼.
//
// CON-04 금칙어: 화면 카피 "치료/진단/장애" 사용 금지 — "감사 기록", "조회" 표현.
// R4: actorId 는 사용자 입력 — diff 본문 / 자녀 식별 정보 본문은 본 컴포넌트와 무관.

import { useId, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

/** lib/audit.ts AuditAction + TRIGGER 패턴 ({Table}_{op}) 일부 — UI 빠른 선택용. */
const COMMON_ACTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "sign_in", label: "로그인 (sign_in)" },
  { value: "consent_sign", label: "동의서 서명 (consent_sign)" },
  { value: "hitl_assign", label: "HITL 배정 (hitl_assign)" },
  { value: "hitl_comment_added", label: "HITL 코멘트 (hitl_comment_added)" },
  { value: "hitl_manually_escalated", label: "HITL 수동 escalate" },
  { value: "reward_grant", label: "보상 발급 (reward_grant)" },
  { value: "config_change", label: "환경 설정 변경" },
  { value: "data_export", label: "데이터 export" },
  { value: "data_delete", label: "데이터 삭제" },
  { value: "User_update", label: "User 변경 (TRIGGER)" },
  { value: "User_delete", label: "User 삭제 (TRIGGER)" },
  { value: "HITLQueue_update", label: "HITLQueue 변경 (TRIGGER)" },
  { value: "HITLQueue_delete", label: "HITLQueue 삭제 (TRIGGER)" },
  { value: "RewardLog_insert", label: "RewardLog 적재 (TRIGGER)" },
];

/** 자주 사용하는 tableName — 빠른 선택용. 빈 값 = 전체. */
const COMMON_TABLES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "전체" },
  { value: "User", label: "User" },
  { value: "ConsentSignature", label: "ConsentSignature" },
  { value: "HITLQueue", label: "HITLQueue" },
  { value: "RewardLog", label: "RewardLog" },
  { value: "OfflineEntry", label: "OfflineEntry" },
];

export interface AuditLogFilterProps {
  /// 현재 URL 의 필터 초기값 (server-side 에서 searchParams 디코드 후 전달).
  initialAction?: string;
  initialActorId?: string;
  initialTableName?: string;
  /// YYYY-MM-DD 포맷 (HTML date input). 빈 문자열 = 미설정.
  initialFromDate?: string;
  initialToDate?: string;
}

export function AuditLogFilter({
  initialAction = "",
  initialActorId = "",
  initialTableName = "",
  initialFromDate = "",
  initialToDate = "",
}: AuditLogFilterProps) {
  const router = useRouter();

  const [action, setAction] = useState(initialAction);
  const [actorId, setActorId] = useState(initialActorId);
  const [tableName, setTableName] = useState(initialTableName);
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);

  const actionId = useId();
  const actorIdId = useId();
  const tableNameId = useId();
  const fromDateId = useId();
  const toDateId = useId();

  const handleApply = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const params = new URLSearchParams();
      if (action.trim()) params.set("action", action.trim());
      if (actorId.trim()) params.set("actorId", actorId.trim());
      if (tableName.trim()) params.set("tableName", tableName.trim());
      if (fromDate.trim()) params.set("from", fromDate.trim());
      if (toDate.trim()) params.set("to", toDate.trim());
      // cursor 는 필터 변경 시 reset — 1페이지부터 다시 시작.
      const qs = params.toString();
      router.push(qs ? `/admin/audit?${qs}` : "/admin/audit");
    },
    [action, actorId, tableName, fromDate, toDate, router],
  );

  const handleReset = useCallback(() => {
    setAction("");
    setActorId("");
    setTableName("");
    setFromDate("");
    setToDate("");
    router.push("/admin/audit");
  }, [router]);

  return (
    <form
      data-testid="audit-log-filter"
      onSubmit={handleApply}
      className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="audit-filter-heading"
    >
      <h2
        id="audit-filter-heading"
        className="mb-3 text-sm font-semibold text-slate-800"
      >
        감사 기록 필터
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* action */}
        <div>
          <label
            htmlFor={actionId}
            className="mb-1 block text-xs font-medium text-slate-700"
          >
            동작 (action)
          </label>
          <input
            id={actionId}
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            list={`${actionId}-list`}
            placeholder="예: consent_sign"
            data-testid="audit-filter-action"
            className="block min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <datalist id={`${actionId}-list`}>
            {COMMON_ACTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </datalist>
        </div>

        {/* actorId */}
        <div>
          <label
            htmlFor={actorIdId}
            className="mb-1 block text-xs font-medium text-slate-700"
          >
            actor ID (UUID 또는 system / anonymous)
          </label>
          <input
            id={actorIdId}
            type="text"
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            placeholder="예: 11111111-1111-..."
            data-testid="audit-filter-actor-id"
            className="block min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* tableName */}
        <div>
          <label
            htmlFor={tableNameId}
            className="mb-1 block text-xs font-medium text-slate-700"
          >
            대상 테이블
          </label>
          <select
            id={tableNameId}
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            data-testid="audit-filter-table-name"
            className="block min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {COMMON_TABLES.map((opt) => (
              <option key={opt.value || "__all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* fromDate */}
        <div>
          <label
            htmlFor={fromDateId}
            className="mb-1 block text-xs font-medium text-slate-700"
          >
            시작일 (from)
          </label>
          <input
            id={fromDateId}
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            data-testid="audit-filter-from-date"
            className="block min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* toDate */}
        <div>
          <label
            htmlFor={toDateId}
            className="mb-1 block text-xs font-medium text-slate-700"
          >
            종료일 (to)
          </label>
          <input
            id={toDateId}
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            data-testid="audit-filter-to-date"
            className="block min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          data-testid="audit-filter-apply"
          className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
        >
          필터 적용
        </button>
        <button
          type="button"
          onClick={handleReset}
          data-testid="audit-filter-reset"
          className="inline-flex min-h-[44px] items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
        >
          초기화
        </button>
      </div>
    </form>
  );
}

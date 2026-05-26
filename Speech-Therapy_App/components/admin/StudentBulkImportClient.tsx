"use client";

// FR-C-016 (#39) — 원아 일괄 등록 Client Component.
//
// UX 상태:
//   idle → parsing → validating → reviewing → submitting → success | partial | error
//
// 핵심 흐름:
//   1. 파일 입력 (.csv, .tsv, .txt) 선택 → ArrayBuffer 변환 → parseStudentBuffer
//   2. 결과 테이블 노출 — header: 행번호 / 학번 / 이름 / 생년월일 / 반 / 부모이메일 / 오류
//   3. 오류 행: 빨간색 강조 + 인라인 input 으로 수정 가능
//   4. "재검증" 버튼 → 클라이언트 측 validateStudentRows 재호출
//   5. "등록 시작" 버튼 → submitBulkImport Server Action 호출 → BulkImportResult 표시
//
// RBAC:
//   - 본 컴포넌트는 권한 검사 미수행 — 진입 페이지 + Server Action 이 server-side 에서 강제
//
// R4 (자녀 정보 보호):
//   - 본명 / 주민번호 같은 추가 키는 Zod 가 strip (lib/admin/student-bulk-import)
//   - 다른 institution 의 정보는 server 가 reject
//
// 금칙어: "치료" / "진단" / "장애" 사용 금지.

import { useMemo, useRef, useState } from "react";

// FR-PERF-4-DYNAMIC-IMPORT — student-bulk-import parser (~291KB unique chunk) 를
// 파일 업로드 시점까지 defer. type-only import 는 erased — 초기 bundle 영향 0.
import type {
  ImportErrorRow,
  StudentImportRow,
} from "@/lib/admin/student-bulk-import";
import { submitBulkImport } from "@/app/actions/student-bulk-import";
import { trackEvent } from "@/lib/analytics";

export interface StudentBulkImportClientProps {
  /** 원장 본인의 institutionId — server 가 다시 검증. */
  institutionId: string;
  /**
   * 기관 이름 — 부모 초대 이메일 본문에 표시. 미전달 시 "우리 기관" 기본값.
   *
   * Server Component 에서 prisma.institution.findUnique 로 조회 후 prop drop.
   */
  institutionName?: string;
}

/** 화면에 표시되는 행 모델 — 사용자가 인라인 수정 시 mutable. */
interface EditableRow {
  studentId: string;
  name: string;
  birthDate: string;
  classroomName: string;
  parentEmail: string;
}

/**
 * FR-Q-009 / FR-C-005 — 부모 초대 요약 (UI 표시용).
 *
 * Server Action 응답의 parentInvites 그대로 — 집계 카운트만 (R4: PII 0건).
 */
interface ParentInviteSummaryView {
  attempted: number;
  sent: number;
  skipped: number;
}

type Phase =
  | { state: "idle" }
  | { state: "parsing" }
  | { state: "reviewing" }
  | { state: "submitting" }
  | {
      state: "success" | "partial";
      successCount: number;
      errorCount: number;
      /** 옵션 체크 + 응답에 parentInvites 가 있을 때만 set. */
      parentInvites?: ParentInviteSummaryView;
    }
  | { state: "error"; message: string };

function emptyEditableRow(): EditableRow {
  return {
    studentId: "",
    name: "",
    birthDate: "",
    classroomName: "",
    parentEmail: "",
  };
}

function rawToEditable(raw: unknown): EditableRow {
  if (!raw || typeof raw !== "object") return emptyEditableRow();
  const r = raw as Record<string, unknown>;
  return {
    studentId: typeof r.studentId === "string" ? r.studentId : "",
    name: typeof r.name === "string" ? r.name : "",
    birthDate: typeof r.birthDate === "string" ? r.birthDate : "",
    classroomName: typeof r.classroomName === "string" ? r.classroomName : "",
    parentEmail: typeof r.parentEmail === "string" ? r.parentEmail : "",
  };
}

function editableToRaw(row: EditableRow, institutionId: string): unknown {
  const out: Record<string, unknown> = {
    studentId: row.studentId.trim(),
    name: row.name.trim(),
    birthDate: row.birthDate.trim().replace(/[./]/g, "-"),
    institutionId,
  };
  if (row.classroomName.trim()) out.classroomName = row.classroomName.trim();
  if (row.parentEmail.trim()) out.parentEmail = row.parentEmail.trim();
  return out;
}

export function StudentBulkImportClient({
  institutionId,
  institutionName,
}: StudentBulkImportClientProps) {
  const [phase, setPhase] = useState<Phase>({ state: "idle" });
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [errors, setErrors] = useState<ImportErrorRow[]>([]);
  /**
   * FR-Q-009 / FR-C-005 — 부모 초대 같이 발송 옵션 체크박스 상태.
   * default false — 옵트인 (실수 발송 방지).
   */
  const [sendInvites, setSendInvites] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /** 부모 초대 이메일 본문에 표시할 기관 이름. 미설정 시 default. */
  const effectiveInstitutionName =
    institutionName && institutionName.trim().length > 0
      ? institutionName.trim()
      : "우리 기관";

  const errorsByRow = useMemo(() => {
    const map = new Map<number, ImportErrorRow>();
    for (const e of errors) {
      if (e.rowIndex >= 0) map.set(e.rowIndex, e);
    }
    return map;
  }, [errors]);

  const fileLevelError = useMemo(
    () => errors.find((e) => e.rowIndex < 0) ?? null,
    [errors],
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhase({ state: "parsing" });
    try {
      // FR-PERF-4-DYNAMIC-IMPORT — 파일 업로드 시점에 lazy load (~291KB chunk).
      const { parseStudentBuffer, validateStudentRows } = await import(
        "@/lib/admin/student-bulk-import"
      );
      const buffer = await file.arrayBuffer();
      const { rows: parsedRows, parseErrors } = parseStudentBuffer(
        buffer,
        institutionId,
      );
      if (parseErrors.length > 0 && parsedRows.length === 0) {
        setRows([]);
        setErrors(parseErrors);
        setPhase({ state: "error", message: parseErrors[0]!.message });
        return;
      }
      const editable = parsedRows.map(rawToEditable);
      const { errors: validationErrors } = validateStudentRows(parsedRows, {
        institutionId,
        existingStudentIds: new Set<string>(),
      });
      setRows(editable);
      setErrors([...parseErrors, ...validationErrors]);
      setPhase({ state: "reviewing" });
    } catch (err) {
      setPhase({
        state: "error",
        message: `파일 읽기 실패 — ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  function handleCellChange(
    rowIndex: number,
    field: keyof EditableRow,
    value: string,
  ) {
    setRows((prev) =>
      prev.map((r, i) => (i === rowIndex ? { ...r, [field]: value } : r)),
    );
  }

  async function handleRevalidate() {
    // 재검증은 파싱 직후에만 의미 — handleFileChange 가 lazy load 했으므로 캐시 hit.
    // 보수적으로 동일 dynamic import (캐시) 사용.
    const { validateStudentRows } = await import(
      "@/lib/admin/student-bulk-import"
    );
    const rawRows = rows.map((r) => editableToRaw(r, institutionId));
    const { errors: validationErrors } = validateStudentRows(rawRows, {
      institutionId,
      existingStudentIds: new Set<string>(),
    });
    setErrors(validationErrors);
    setPhase({ state: "reviewing" });
  }

  async function handleSubmit() {
    if (rows.length === 0) return;
    setPhase({ state: "submitting" });
    const rawRows = rows.map((r) => editableToRaw(r, institutionId));
    try {
      // FR-Q-009 / FR-C-005 — 체크박스 선택 시에만 sendParentInvites=true 전달.
      // institutionName 은 항상 함께 전달 (서버 측 기본값 폴백 보유).
      const res = await submitBulkImport(rawRows, institutionId, {
        sendParentInvites: sendInvites,
        institutionName: effectiveInstitutionName,
      });
      if (res.status !== "ok") {
        setPhase({ state: "error", message: res.message });
        return;
      }
      const { successCount, errorCount, errors: serverErrors } = res.result;
      setErrors(serverErrors);
      // 텔레메트리 — PII 0건.
      trackEvent("student_bulk_import_submitted", {
        totalRows: rows.length,
        successCount,
        errorCount,
      });
      // 부모 초대 응답 — 옵션 미선택 / 응답 부재 / 0 attempted 인 경우 UI 표시 skip.
      const inviteSummary =
        sendInvites && res.parentInvites && res.parentInvites.attempted > 0
          ? {
              attempted: res.parentInvites.attempted,
              sent: res.parentInvites.sent,
              skipped: res.parentInvites.skipped,
            }
          : undefined;
      setPhase({
        state: errorCount === 0 ? "success" : "partial",
        successCount,
        errorCount,
        parentInvites: inviteSummary,
      });
    } catch (err) {
      setPhase({
        state: "error",
        message: `등록 실패 — ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  function handleReset() {
    setRows([]);
    setErrors([]);
    setPhase({ state: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const canRevalidate =
    phase.state === "reviewing" || phase.state === "partial" || phase.state === "success";
  const canSubmit =
    rows.length > 0 &&
    errors.filter((e) => e.rowIndex >= 0).length === 0 &&
    (phase.state === "reviewing" || phase.state === "partial");

  return (
    <section
      data-testid="student-bulk-import-client"
      data-phase={phase.state}
      className="space-y-6"
      aria-labelledby="bulk-import-section-heading"
    >
      <h2
        id="bulk-import-section-heading"
        className="sr-only"
      >
        원아 정보 업로드 영역
      </h2>

      {/* 1. 파일 입력 */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <label
          htmlFor="student-bulk-import-file"
          className="block text-sm font-medium text-slate-800"
        >
          CSV / TSV 파일 선택
        </label>
        <input
          ref={fileInputRef}
          id="student-bulk-import-file"
          data-testid="student-bulk-import-file"
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
          onChange={handleFileChange}
          disabled={phase.state === "parsing" || phase.state === "submitting"}
          className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-slate-500">
          첫 행은 header (학번, 이름, 생년월일, 반, 부모이메일) 여야 해요.
        </p>
      </div>

      {/* 2. 상태 표시 */}
      <div
        role="status"
        aria-live="polite"
        data-testid="student-bulk-import-status"
        className="text-sm"
      >
        {phase.state === "idle" && (
          <span className="text-slate-500">파일을 업로드해 주세요.</span>
        )}
        {phase.state === "parsing" && (
          <span className="text-slate-700">파일을 읽는 중…</span>
        )}
        {phase.state === "reviewing" && rows.length > 0 && (
          <span className="text-slate-700">
            총 {rows.length}행 / 오류 {errors.filter((e) => e.rowIndex >= 0).length}건 —
            오류 행을 인라인으로 수정 후 ‘재검증’ 또는 ‘등록 시작’ 을 눌러 주세요.
          </span>
        )}
        {phase.state === "submitting" && (
          <span className="text-slate-700">등록 중…</span>
        )}
        {phase.state === "success" && (
          <span
            data-testid="student-bulk-import-success"
            className="font-semibold text-emerald-700"
          >
            성공: {phase.successCount}건 등록 완료.
          </span>
        )}
        {phase.state === "partial" && (
          <span
            data-testid="student-bulk-import-partial"
            className="font-semibold text-amber-700"
          >
            부분 성공: {phase.successCount}건 등록, {phase.errorCount}건 오류 (인라인 수정 후 재시도).
          </span>
        )}
        {phase.state === "error" && (
          <span
            data-testid="student-bulk-import-error"
            role="alert"
            className="font-semibold text-rose-700"
          >
            {phase.message}
          </span>
        )}
      </div>

      {/* 3. 파일 레벨 에러 (header / parse) */}
      {fileLevelError && (
        <div
          role="alert"
          data-testid="student-bulk-import-file-error"
          className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {fileLevelError.message}
        </div>
      )}

      {/* 4. 행 테이블 */}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table
            data-testid="student-bulk-import-table"
            className="w-full min-w-[720px] text-left text-sm"
          >
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-2 py-2">#</th>
                <th scope="col" className="px-2 py-2">학번</th>
                <th scope="col" className="px-2 py-2">이름</th>
                <th scope="col" className="px-2 py-2">생년월일</th>
                <th scope="col" className="px-2 py-2">반</th>
                <th scope="col" className="px-2 py-2">부모 이메일</th>
                <th scope="col" className="px-2 py-2">오류</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const err = errorsByRow.get(idx);
                const rowClass = err
                  ? "border-t border-rose-200 bg-rose-50"
                  : "border-t border-slate-100";
                return (
                  <tr
                    key={idx}
                    data-testid={`student-bulk-row-${idx}`}
                    data-row-error={err ? "true" : "false"}
                    className={rowClass}
                  >
                    <td className="px-2 py-1 font-mono text-xs text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="px-2 py-1">
                      <input
                        data-testid={`student-bulk-row-${idx}-studentId`}
                        value={row.studentId}
                        onChange={(e) => handleCellChange(idx, "studentId", e.target.value)}
                        className={`w-32 rounded border px-1.5 py-1 text-xs ${
                          err?.field === "studentId"
                            ? "border-rose-400 bg-white"
                            : "border-slate-200 bg-white"
                        }`}
                        aria-label={`행 ${idx + 1} 학번`}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        data-testid={`student-bulk-row-${idx}-name`}
                        value={row.name}
                        onChange={(e) => handleCellChange(idx, "name", e.target.value)}
                        className={`w-28 rounded border px-1.5 py-1 text-xs ${
                          err?.field === "name"
                            ? "border-rose-400 bg-white"
                            : "border-slate-200 bg-white"
                        }`}
                        aria-label={`행 ${idx + 1} 이름`}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        data-testid={`student-bulk-row-${idx}-birthDate`}
                        value={row.birthDate}
                        onChange={(e) => handleCellChange(idx, "birthDate", e.target.value)}
                        placeholder="YYYY-MM-DD"
                        className={`w-32 rounded border px-1.5 py-1 text-xs ${
                          err?.field === "birthDate"
                            ? "border-rose-400 bg-white"
                            : "border-slate-200 bg-white"
                        }`}
                        aria-label={`행 ${idx + 1} 생년월일`}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        data-testid={`student-bulk-row-${idx}-classroomName`}
                        value={row.classroomName}
                        onChange={(e) => handleCellChange(idx, "classroomName", e.target.value)}
                        className="w-24 rounded border border-slate-200 bg-white px-1.5 py-1 text-xs"
                        aria-label={`행 ${idx + 1} 반`}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        data-testid={`student-bulk-row-${idx}-parentEmail`}
                        value={row.parentEmail}
                        onChange={(e) => handleCellChange(idx, "parentEmail", e.target.value)}
                        type="email"
                        className={`w-48 rounded border px-1.5 py-1 text-xs ${
                          err?.field === "parentEmail"
                            ? "border-rose-400 bg-white"
                            : "border-slate-200 bg-white"
                        }`}
                        aria-label={`행 ${idx + 1} 부모 이메일`}
                      />
                    </td>
                    <td
                      data-testid={`student-bulk-row-${idx}-error`}
                      className="px-2 py-1 text-xs text-rose-700"
                    >
                      {err?.message ?? ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. 부모 초대 발송 옵션 (FR-Q-009 / FR-C-005) */}
      {rows.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <label
            htmlFor="student-bulk-import-send-invites"
            className="flex items-start gap-2"
            data-testid="student-bulk-import-invite-label"
          >
            <input
              id="student-bulk-import-send-invites"
              data-testid="student-bulk-import-send-invites"
              type="checkbox"
              checked={sendInvites}
              onChange={(e) => setSendInvites(e.target.checked)}
              disabled={
                phase.state === "parsing" || phase.state === "submitting"
              }
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-slate-800">
              부모 초대 이메일 같이 발송하기
              <span className="ml-1 text-xs text-slate-500">
                — 부모 이메일이 입력된 행에만 발송됩니다.
              </span>
            </span>
          </label>
        </div>
      )}

      {/* 6. 부모 초대 결과 (성공/부분성공 + 옵션 ON 시) */}
      {(phase.state === "success" || phase.state === "partial") &&
        phase.parentInvites && (
          <div
            data-testid="student-bulk-import-invite-result"
            className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
            role="status"
            aria-live="polite"
          >
            <p className="font-semibold">부모 초대 발송 결과</p>
            <ul className="mt-1 ml-4 list-disc space-y-0.5 text-xs text-emerald-800">
              <li data-testid="student-bulk-import-invite-sent">
                발송 성공: {phase.parentInvites.sent}건
              </li>
              <li data-testid="student-bulk-import-invite-skipped">
                발송 보류: {phase.parentInvites.skipped}건
                <span className="ml-1 text-emerald-700">
                  (부모 이메일 부재 또는 발송 환경 미설정)
                </span>
              </li>
            </ul>
          </div>
        )}

      {/* 7. 액션 버튼 */}
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="student-bulk-import-revalidate"
            onClick={handleRevalidate}
            disabled={!canRevalidate}
            className="inline-flex min-h-[36px] items-center rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            재검증
          </button>
          <button
            type="button"
            data-testid="student-bulk-import-submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex min-h-[36px] items-center rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase.state === "submitting" ? "등록 중…" : "등록 시작"}
          </button>
          <button
            type="button"
            data-testid="student-bulk-import-reset"
            onClick={handleReset}
            disabled={phase.state === "parsing" || phase.state === "submitting"}
            className="inline-flex min-h-[36px] items-center rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            초기화
          </button>
        </div>
      )}
    </section>
  );
}

// 명시적 type export — 테스트가 import 가능하도록.
export type { StudentImportRow };

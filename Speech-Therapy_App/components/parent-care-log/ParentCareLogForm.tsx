"use client";

// FR-Q-NEW-F17-UI-A — 부모 본인 케어로그 입력 폼 (V07 F17).
//
// 책임:
//   - 활동 유형 (parent_play / parent_external_session) 선택
//   - 메모 입력 (최대 500자)
//   - 활동 시각 입력 (default 현재, datetime-local)
//   - submitParentCareLog Server Action 호출 + graceful error 매트릭스
//
// CON-04: UI 카피 / placeholder 무위반.
// R4: 자녀 식별 정보 미수신 — Server Action 이 인증 user.id 로 author=subject=본인 자동.

import { useId, useState, useTransition } from "react";

import { submitParentCareLog } from "@/app/actions/parent-care-log";
import type { SubmitParentCareLogResult } from "@/app/actions/parent-care-log-shape";
import {
  PARENT_CARE_LOG_KINDS,
  type ParentCareLogKind,
} from "@/lib/offline-entry/types";

const KIND_LABEL: Record<ParentCareLogKind, string> = {
  parent_play: "가정 놀이",
  parent_external_session: "외부 센터 세션",
};

const KIND_PLACEHOLDER: Record<ParentCareLogKind, string> = {
  parent_play:
    "예: 10분 동안 함께 그림책 읽으며 의성어 따라하기 놀이 했어요.",
  parent_external_session:
    "예: 어제 OO 센터에서 30분 발음 가이드 세션 참여했어요.",
};

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; observedAt: string; activityKind: ParentCareLogKind }
  | { kind: "error"; message: string };

/** YYYY-MM-DDTHH:mm — datetime-local 기본값 (로컬 시각). */
function defaultObservedAtLocal(): string {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  const local = new Date(now.getTime() - tzOffsetMs);
  return local.toISOString().slice(0, 16);
}

export function ParentCareLogForm() {
  const [activityKind, setActivityKind] = useState<ParentCareLogKind>("parent_play");
  const [note, setNote] = useState("");
  const [observedAtLocal, setObservedAtLocal] = useState<string>(
    defaultObservedAtLocal(),
  );
  const [state, setState] = useState<FormState>({ kind: "idle" });
  const [, startTransition] = useTransition();

  const noteId = useId();
  const kindId = useId();
  const observedAtId = useId();

  const remainingChars = 500 - note.length;
  const submitDisabled =
    state.kind === "submitting" || note.trim().length === 0 || remainingChars < 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitDisabled) return;

    const observedAtIso = observedAtLocal
      ? new Date(observedAtLocal).toISOString()
      : undefined;

    setState({ kind: "submitting" });
    startTransition(async () => {
      const result: SubmitParentCareLogResult = await submitParentCareLog({
        kind: activityKind,
        note: note.trim(),
        observedAt: observedAtIso,
      });

      if (result.success) {
        setState({
          kind: "success",
          observedAt: result.observedAt,
          activityKind,
        });
        setNote("");
        // 다음 입력 편의 — 시각 초기화.
        setObservedAtLocal(defaultObservedAtLocal());
      } else {
        const MESSAGES: Record<string, string> = {
          unauthorized: "로그인 후 다시 시도해 주세요.",
          consent_required:
            "개인정보 동의가 필요해요. 설정 페이지에서 동의 항목을 확인해 주세요.",
          invalid_input: result.issues?.[0] ?? "입력을 다시 확인해 주세요.",
          forbidden_term:
            "메모에 사용할 수 없는 단어가 포함되어 있어요. 발음 가이드 표현으로 다시 작성해 주세요.",
          internal_error:
            "저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
        };
        setState({
          kind: "error",
          message: MESSAGES[result.reason] ?? "알 수 없는 오류가 발생했어요.",
        });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border bg-card p-6"
      data-testid="parent-care-log-form"
    >
      <div>
        <label htmlFor={kindId} className="block text-sm font-medium">
          활동 유형
        </label>
        <select
          id={kindId}
          value={activityKind}
          onChange={(e) =>
            setActivityKind(e.target.value as ParentCareLogKind)
          }
          className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
          disabled={state.kind === "submitting"}
          data-testid="parent-care-log-kind"
        >
          {PARENT_CARE_LOG_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={observedAtId} className="block text-sm font-medium">
          활동 시각
        </label>
        <input
          id={observedAtId}
          type="datetime-local"
          value={observedAtLocal}
          onChange={(e) => setObservedAtLocal(e.target.value)}
          className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
          disabled={state.kind === "submitting"}
          data-testid="parent-care-log-observed-at"
        />
      </div>

      <div>
        <label htmlFor={noteId} className="flex items-center justify-between text-sm font-medium">
          <span>메모</span>
          <span
            className={`text-xs ${
              remainingChars < 0 ? "text-red-600" : "text-muted-foreground"
            }`}
          >
            {remainingChars}자 남음
          </span>
        </label>
        <textarea
          id={noteId}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={KIND_PLACEHOLDER[activityKind]}
          rows={4}
          maxLength={500}
          className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
          disabled={state.kind === "submitting"}
          data-testid="parent-care-log-note"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          기록한 내용은 주간 리포트와 자녀 활동 타임라인에 함께 보여드려요.
        </p>
        <button
          type="submit"
          disabled={submitDisabled}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          data-testid="parent-care-log-submit"
        >
          {state.kind === "submitting" ? "저장 중..." : "기록 저장"}
        </button>
      </div>

      {state.kind === "success" && (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
          role="status"
          data-testid="parent-care-log-success"
        >
          기록을 저장했어요. ({KIND_LABEL[state.activityKind]} —{" "}
          {new Date(state.observedAt).toLocaleString("ko-KR")})
        </div>
      )}
      {state.kind === "error" && (
        <div
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
          role="alert"
          data-testid="parent-care-log-error"
        >
          {state.message}
        </div>
      )}
    </form>
  );
}

"use client";

// FR-Q-013 후속 — OfflineEntryForm Client Component.
//
// 책임:
//   - kind (select) + note (textarea max 500자) + observedAt (date picker, default 오늘)
//     입력을 받아 submitOfflineEntry Server Action 호출.
//   - 상태: idle / submitting / success / error.
//   - 성공 시 router.refresh() + 폼 reset.
//
// R4: userId 는 prop 으로만 전달 — DOM 에 hidden field 로 노출.
// CON-04: 화면 카피 "치료/진단/장애" 금칙어 0건 — "활동 기록" / "발음 연습" 표현.
// 접근성: label/input 1:1 매칭, error 메시지 aria-live, 모든 인터랙티브 영역 ≥ 44px.

import { useCallback, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { submitOfflineEntry } from "@/app/actions/offline-entry";
// FR-PERF-3-USE-SERVER-REFACTOR — type-only import 는 shape 모듈 (non-"use server") 에서.
import type { SubmitOfflineEntryResult } from "@/app/actions/offline-entry-shape";
// FR-PERF-3-CLIENT-LEAK-GUARD — Client Component 는 prisma 비의존 types 모듈만 import.
// `@/lib/offline-entry/repo` (server-only, prisma 의존) 직접 import 시 build 실패.
import {
  OFFLINE_ENTRY_KINDS,
  OFFLINE_ENTRY_NOTE_MAX_LENGTH,
  type OfflineEntryKind,
} from "@/lib/offline-entry/types";

export interface OfflineEntryFormProps {
  /// 대상 자녀(보호자) User.id. 본 컴포넌트는 본문에 노출하지 않음 (data-* 만).
  userId: string;
}

type FormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; entryId: string }
  | { status: "error"; message: string };

const KIND_LABEL: Record<OfflineEntryKind, string> = {
  practice: "발음 연습",
  observation: "관찰",
  note: "메모",
};

/** YYYY-MM-DDTHH:mm 형식 — `<input type="datetime-local" />` 기본값. */
function defaultObservedAtLocal(): string {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  const local = new Date(now.getTime() - tzOffsetMs);
  return local.toISOString().slice(0, 16);
}

/** datetime-local string → ISO (UTC). 빈 문자열 → undefined. */
function localToIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function OfflineEntryForm({ userId }: OfflineEntryFormProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState<FormState>({ status: "idle" });

  const initialObservedAt = useMemo(() => defaultObservedAtLocal(), []);
  const [kind, setKind] = useState<OfflineEntryKind>("practice");
  const [note, setNote] = useState("");
  const [observedAt, setObservedAt] = useState(initialObservedAt);

  const kindId = useId();
  const noteId = useId();
  const observedAtId = useId();
  const errorId = useId();

  const isSubmitting = state.status === "submitting";
  const noteLength = note.length;
  const noteOverLimit = noteLength > OFFLINE_ENTRY_NOTE_MAX_LENGTH;
  const submitDisabled =
    isSubmitting ||
    note.trim().length === 0 ||
    noteOverLimit ||
    userId.length === 0;

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (submitDisabled) return;
      setState({ status: "submitting" });

      startTransition(async () => {
        let result: SubmitOfflineEntryResult;
        try {
          result = await submitOfflineEntry({
            userId,
            kind,
            note: note.trim(),
            observedAt: localToIso(observedAt),
          });
        } catch {
          setState({
            status: "error",
            message: "저장 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
          });
          return;
        }

        if (result.success) {
          setState({ status: "success", entryId: result.entryId });
          // 폼 reset — observedAt 은 새 default 시각으로 갱신.
          setNote("");
          setKind("practice");
          setObservedAt(defaultObservedAtLocal());
          // RSC 데이터 (entries list) 갱신.
          router.refresh();
        } else {
          setState({ status: "error", message: result.message });
        }
      });
    },
    [submitDisabled, userId, kind, note, observedAt, router],
  );

  return (
    <form
      data-testid="offline-entry-form"
      data-user-id={userId}
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      aria-labelledby={`${kindId}-heading`}
    >
      <h3
        id={`${kindId}-heading`}
        className="text-base font-semibold text-slate-900"
      >
        오프라인 활동 기록 추가
      </h3>

      <div>
        <label
          htmlFor={kindId}
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          활동 유형
        </label>
        <select
          id={kindId}
          data-testid="offline-entry-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as OfflineEntryKind)}
          disabled={isSubmitting}
          className="block w-full min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {OFFLINE_ENTRY_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={observedAtId}
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          활동 시각
        </label>
        <input
          id={observedAtId}
          data-testid="offline-entry-observed-at"
          type="datetime-local"
          value={observedAt}
          onChange={(e) => setObservedAt(e.target.value)}
          disabled={isSubmitting}
          className="block w-full min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label
          htmlFor={noteId}
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          메모 (최대 {OFFLINE_ENTRY_NOTE_MAX_LENGTH}자)
        </label>
        <textarea
          id={noteId}
          data-testid="offline-entry-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isSubmitting}
          rows={4}
          maxLength={OFFLINE_ENTRY_NOTE_MAX_LENGTH + 50}
          aria-describedby={`${noteId}-count`}
          placeholder="오늘의 발음 연습 활동을 짧게 기록해 주세요."
          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <p
          id={`${noteId}-count`}
          data-testid="offline-entry-note-count"
          className={`mt-1 text-right text-xs ${
            noteOverLimit ? "text-red-600" : "text-slate-500"
          }`}
        >
          {noteLength} / {OFFLINE_ENTRY_NOTE_MAX_LENGTH}
        </p>
      </div>

      <div className="flex items-center justify-end gap-2">
        {state.status === "success" ? (
          <p
            data-testid="offline-entry-success"
            role="status"
            aria-live="polite"
            className="text-sm font-medium text-emerald-700"
          >
            기록을 저장했어요.
          </p>
        ) : null}
        {state.status === "error" ? (
          <p
            id={errorId}
            data-testid="offline-entry-error"
            role="alert"
            aria-live="polite"
            className="text-sm font-medium text-red-700"
          >
            {state.message}
          </p>
        ) : null}
        <button
          type="submit"
          data-testid="offline-entry-submit"
          disabled={submitDisabled}
          aria-busy={isSubmitting}
          className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}

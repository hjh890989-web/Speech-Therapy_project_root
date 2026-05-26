"use client";

// FR-C-ACCOUNT — 계정 삭제 버튼 (Client Component, 비가역 작업 — 확인 텍스트 매칭 게이트).
//
// 책임:
//   - "계정 삭제" 버튼 클릭 → 확장 panel (혹은 inline form) 표시.
//   - 사용자가 ACCOUNT_DELETE_CONFIRMATION_TEXT 정확 입력 → "최종 삭제" 버튼 활성화.
//   - 클릭 → deleteAccount Server Action 호출.
//   - 성공 시 분석 이벤트 account_deleted 발송 (delete 직전이 아니라 직후 — Server Action 반환값에
//     analytics meta 가 포함되어 있어 정확 발송 가능).
//   - 성공 후 window.location.assign("/") — Supabase 쿠키는 admin SDK 가 삭제했고 새로고침으로 anon.
//
// CON-04: 모든 UI / aria-label / 주석에 "치료/진단/장애" 금칙어 0건.
//
// R4 (자녀 보호):
//   - userId 는 분석 백엔드 자동 해시 가정 — UI 자체는 user id 미노출.
//   - 경고 메시지에 자녀 식별 정보 0건.

import { useCallback, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { deleteAccount } from "@/app/actions/delete-account";
// FR-PERF-3-USE-SERVER-REFACTOR — const 는 shape 모듈 (non-"use server") 에서.
import { ACCOUNT_DELETE_CONFIRMATION_TEXT } from "@/app/actions/delete-account-shape";

/** 삭제 머신. */
type DeleteStatus = "idle" | "expanded" | "deleting" | "error";

export function AccountDeleteButton() {
  const [status, setStatus] = useState<DeleteStatus>("idle");
  const [confirmationInput, setConfirmationInput] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExpand = useCallback(() => {
    setStatus("expanded");
    setErrorMessage(null);
  }, []);

  const handleCancel = useCallback(() => {
    setStatus("idle");
    setConfirmationInput("");
    setErrorMessage(null);
  }, []);

  const handleFinalDelete = useCallback(async () => {
    if (confirmationInput !== ACCOUNT_DELETE_CONFIRMATION_TEXT) {
      setStatus("error");
      setErrorMessage(
        `정확한 확인 문구를 입력해 주세요: "${ACCOUNT_DELETE_CONFIRMATION_TEXT}"`,
      );
      return;
    }
    setStatus("deleting");
    setErrorMessage(null);
    try {
      const result = await deleteAccount({ confirmation: confirmationInput });
      if (!result.success) {
        setStatus("error");
        setErrorMessage(result.message);
        return;
      }

      // 분석 이벤트 — Server Action 이 반환한 analytics meta 사용 (DB delete 직후 캡처된 role).
      // R4: userId 는 분석 백엔드 자동 해시.
      trackEvent("account_deleted", {
        userId: result.analytics.userId,
        role: result.analytics.role,
      });

      // 새로고침으로 로그인 상태 reset — Supabase 쿠키는 admin SDK 가 정리.
      // window 미존재 (테스트) 분기 대비.
      if (typeof window !== "undefined") {
        window.location.assign("/");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "계정 삭제 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  }, [confirmationInput]);

  const isExpanded = status === "expanded" || status === "deleting" || status === "error";
  const isDeleting = status === "deleting";
  const canSubmit =
    confirmationInput === ACCOUNT_DELETE_CONFIRMATION_TEXT && !isDeleting;

  return (
    <div data-testid="account-delete-root" className="space-y-3">
      {!isExpanded && (
        <button
          type="button"
          data-testid="account-delete-open-button"
          onClick={handleExpand}
          aria-label="계정 삭제 안내 열기"
          className="inline-flex min-h-[44px] items-center rounded-md border border-rose-300 bg-white px-5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400 dark:border-rose-700 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/40"
        >
          계정 삭제
        </button>
      )}

      {isExpanded && (
        <div
          data-testid="account-delete-panel"
          role="region"
          aria-label="계정 삭제 확인 패널"
          className="space-y-4 rounded-lg border border-rose-300 bg-rose-50 p-5 dark:border-rose-700 dark:bg-rose-950/30"
        >
          <p
            data-testid="account-delete-warning"
            className="text-sm font-semibold text-rose-900 dark:text-rose-100"
          >
            이 작업은 되돌릴 수 없어요. 자녀의 발음 확인 기록, 미션 기록, 보상 기록이 모두 삭제됩니다.
          </p>

          <p className="text-sm text-rose-900 dark:text-rose-100">
            아래 칸에{" "}
            <span
              data-testid="account-delete-required-text"
              className="rounded bg-rose-200 px-1.5 py-0.5 font-mono text-rose-900 dark:bg-rose-900/60 dark:text-rose-50"
            >
              {ACCOUNT_DELETE_CONFIRMATION_TEXT}
            </span>{" "}
            을 정확히 입력해 주세요.
          </p>

          <label
            htmlFor="account-delete-confirm-input"
            className="sr-only"
          >
            계정 삭제 확인 문구 입력
          </label>
          <input
            id="account-delete-confirm-input"
            data-testid="account-delete-confirm-input"
            type="text"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            placeholder={ACCOUNT_DELETE_CONFIRMATION_TEXT}
            disabled={isDeleting}
            autoComplete="off"
            aria-label="계정 삭제 확인 문구"
            className="w-full rounded-md border border-rose-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-rose-700 dark:bg-slate-900 dark:text-slate-100"
          />

          {status === "error" && errorMessage && (
            <p
              data-testid="account-delete-error"
              role="alert"
              className="rounded-md bg-rose-100 px-4 py-2 text-sm text-rose-800 dark:bg-rose-900/50 dark:text-rose-100"
            >
              {errorMessage}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="account-delete-final-button"
              onClick={() => void handleFinalDelete()}
              disabled={!canSubmit}
              aria-label="최종 계정 삭제"
              className="inline-flex min-h-[44px] items-center rounded-md bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              {isDeleting ? "삭제 중..." : "최종 삭제"}
            </button>
            <button
              type="button"
              data-testid="account-delete-cancel-button"
              onClick={handleCancel}
              disabled={isDeleting}
              aria-label="계정 삭제 취소"
              className="inline-flex min-h-[44px] items-center rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

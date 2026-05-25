"use client";

// FR-C-ACCOUNT — 이메일 변경 폼 (Client Component, /settings/account 카드).
//
// 책임:
//   - 현재 이메일 표시 + 새 이메일 입력 + "변경 요청" 버튼.
//   - 클릭 → requestEmailChange Server Action 호출.
//   - 성공 시:
//     - "확인 메일을 새 이메일 주소로 보냈어요" 안내 노출.
//     - trackEvent("email_change_requested") 1회 발송.
//   - 실패 분기 (invalid_email / same_as_current / unauthorized / supabase_error) 별 메시지.
//
// CON-04: 모든 UI / aria-label / 주석에 "치료/진단/장애" 금칙어 0건.
//
// R4 (자녀 보호):
//   - userId 는 분석 백엔드 자동 해시 가정 — UI 자체는 userId 미노출.
//   - 이메일은 본인 입력 → Supabase 가 본인 세션으로만 updateUser 호출.

import { useCallback, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { requestEmailChange } from "@/app/actions/change-email";

/** 상태 머신. */
type Status = "idle" | "submitting" | "success" | "error";

export interface EmailChangeFormProps {
  /** 현재 이메일 (표시용) — page.tsx 가 prefetch 후 prop 으로 전달. */
  currentEmail: string | null;
}

export function EmailChangeForm({ currentEmail }: EmailChangeFormProps) {
  const [newEmail, setNewEmail] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = newEmail.trim();
    if (!trimmed) {
      setStatus("error");
      setErrorMessage("새 이메일을 입력해 주세요.");
      return;
    }
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const result = await requestEmailChange({ newEmail: trimmed });
      if (!result.success) {
        setStatus("error");
        setErrorMessage(result.message);
        return;
      }
      // 분석 이벤트 — R4: userId 는 분석 백엔드 자동 해시 가정.
      trackEvent("email_change_requested", {
        userId: result.analytics.userId,
      });
      setPendingEmail(result.pendingEmail);
      setStatus("success");
      setNewEmail("");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "변경 요청 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  }, [newEmail]);

  const isSubmitting = status === "submitting";
  const canSubmit = newEmail.trim().length > 0 && !isSubmitting;
  const showSuccess = status === "success" && pendingEmail;

  return (
    <form
      data-testid="email-change-form"
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      {/* 현재 이메일 표시. */}
      <div className="text-sm">
        <span className="text-slate-500 dark:text-slate-400">현재 이메일: </span>
        <span
          data-testid="email-change-current"
          className="break-all font-medium text-slate-900 dark:text-slate-100"
        >
          {currentEmail ?? "정보 없음"}
        </span>
      </div>

      {/* 새 이메일 입력. */}
      <div className="space-y-2">
        <label
          htmlFor="email-change-new-input"
          className="block text-sm font-medium text-slate-800 dark:text-slate-200"
        >
          새 이메일
        </label>
        <input
          id="email-change-new-input"
          data-testid="email-change-new-input"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          disabled={isSubmitting}
          autoComplete="email"
          placeholder="new-email@example.com"
          aria-label="새 이메일 주소 입력"
          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* 안내. */}
      <p className="text-xs text-slate-600 dark:text-slate-400">
        새 이메일 주소로 확인 메일이 발송돼요. 메일의 링크를 클릭해야 변경이 완료됩니다.
      </p>

      {/* 에러 메시지. */}
      {status === "error" && errorMessage && (
        <p
          data-testid="email-change-error"
          role="alert"
          className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {errorMessage}
        </p>
      )}

      {/* 성공 안내. */}
      {showSuccess && (
        <p
          data-testid="email-change-success"
          role="status"
          aria-live="polite"
          className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
        >
          확인 메일을{" "}
          <span className="break-all font-semibold">{pendingEmail}</span> 으로
          보냈어요. 메일의 링크를 클릭하면 변경이 완료됩니다.
        </p>
      )}

      {/* 제출 버튼. */}
      <div className="flex justify-end">
        <button
          type="submit"
          data-testid="email-change-submit"
          disabled={!canSubmit}
          aria-label="이메일 변경 요청"
          className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {isSubmitting ? "요청 중..." : "변경 요청"}
        </button>
      </div>
    </form>
  );
}

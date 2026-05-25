"use client";

// FR-C-SECURITY — 2FA TOTP 비활성화 flow (Client Component, /settings/security 카드).
//
// 책임:
//   - 현재 활성 상태 표시 ("2단계 인증이 활성화되어 있어요").
//   - "2단계 인증 비활성화" 버튼 → confirmation modal/inline 패널 노출.
//   - 패널 안에 경고 + 현재 TOTP 6자리 코드 입력 (재인증 강화).
//   - "확인" 버튼 → disableTotp Server Action 호출 → success 시 안내.
//
// 상태: idle → confirming → submitting → disabled | error
//
// CON-04: 모든 UI / 주석에 "치료/진단/장애" 금칙어 0건.
// R4: 외부 factorId 입력 안 받음 — Server Action 안에서 listFactors 로 회수.

import { useCallback, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { disableTotp } from "@/app/actions/disable-totp";

type Status =
  | "idle"
  | "confirming"
  | "submitting"
  | "disabled"
  | "error";

export function DisableTotpFlow() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState<string>("");

  const handleOpenConfirm = useCallback(() => {
    setStatus("confirming");
    setErrorMessage(null);
    setTotpCode("");
  }, []);

  const handleCancel = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
    setTotpCode("");
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = totpCode.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setErrorMessage("6자리 숫자 코드를 입력해 주세요.");
      return;
    }
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const result = await disableTotp({ totpCode: trimmed });
      if (!result.success) {
        setStatus("confirming");
        setErrorMessage(result.message);
        if (
          result.analytics?.userId &&
          (result.reason === "invalid_code" || result.reason === "supabase_error")
        ) {
          // invalid_code 만 verification_failed 텔레메트리 — supabase_error 는 별개.
          if (result.reason === "invalid_code") {
            trackEvent("totp_verification_failed", {
              userId: result.analytics.userId,
              reason: "wrong_code",
            });
          }
        }
        return;
      }
      setStatus("disabled");
      setTotpCode("");
      trackEvent("totp_disabled", { userId: result.analytics.userId });
    } catch (err) {
      setStatus("confirming");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "비활성화 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  }, [totpCode]);

  // -------- 비활성화 완료 --------
  if (status === "disabled") {
    return (
      <div
        data-testid="disable-totp-done"
        className="rounded-md border border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900"
      >
        <p className="font-semibold text-slate-900 dark:text-slate-100">
          2단계 인증을 비활성화했어요.
        </p>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          이제 비밀번호만으로 로그인할 수 있어요. 보안을 위해 다시 활성화를
          권장해요. 페이지를 새로고침하면 활성화 옵션이 표시돼요.
        </p>
      </div>
    );
  }

  // -------- confirming / submitting --------
  if (
    status === "confirming" ||
    status === "submitting" ||
    (status === "error" && totpCode)
  ) {
    const isSubmitting = status === "submitting";
    return (
      <form
        data-testid="disable-totp-confirm-form"
        className="space-y-4 rounded-md border-2 border-rose-300 bg-rose-50 p-4 dark:border-rose-700 dark:bg-rose-950/30"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <p className="font-semibold text-rose-900 dark:text-rose-100">
          비활성화하면 비밀번호만으로 로그인할 수 있게 되어 보안 강도가 낮아져요.
          계속하시려면 현재 인증 앱의 6자리 코드를 입력해 주세요.
        </p>

        <div className="space-y-2">
          <label
            htmlFor="disable-totp-code-input"
            className="block text-sm font-medium text-rose-900 dark:text-rose-100"
          >
            현재 인증 앱 6자리 코드
          </label>
          <input
            id="disable-totp-code-input"
            data-testid="disable-totp-code-input"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/[^\d]/g, ""))}
            disabled={isSubmitting}
            autoComplete="one-time-code"
            placeholder="000000"
            aria-label="현재 2단계 인증 6자리 코드 입력"
            className="block w-full max-w-xs rounded-md border border-rose-300 bg-white px-3 py-2 text-center font-mono text-lg tracking-widest text-rose-900 placeholder:text-rose-300 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-rose-700 dark:bg-slate-900 dark:text-rose-100"
          />
        </div>

        {errorMessage && (
          <p
            data-testid="disable-totp-error"
            role="alert"
            className="rounded-md bg-rose-100 px-4 py-3 text-sm text-rose-900 dark:bg-rose-900/40 dark:text-rose-100"
          >
            {errorMessage}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            data-testid="disable-totp-cancel"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="inline-flex min-h-[44px] items-center rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            취소
          </button>
          <button
            type="submit"
            data-testid="disable-totp-submit"
            disabled={isSubmitting || totpCode.trim().length !== 6}
            aria-label="2단계 인증 비활성화 확인"
            className="inline-flex min-h-[44px] items-center rounded-md bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            {isSubmitting ? "비활성화 중..." : "비활성화 확인"}
          </button>
        </div>
      </form>
    );
  }

  // -------- idle --------
  return (
    <div data-testid="disable-totp-idle" className="space-y-4">
      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-950/30">
        <p className="font-semibold text-emerald-900 dark:text-emerald-100">
          2단계 인증이 활성화되어 있어요.
        </p>
        <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-100">
          로그인 시 비밀번호와 함께 인증 앱의 6자리 코드를 입력하셔야 해요.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          data-testid="disable-totp-open"
          onClick={handleOpenConfirm}
          aria-label="2단계 인증 비활성화"
          className="inline-flex min-h-[44px] items-center rounded-md border border-rose-300 bg-white px-5 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-rose-700 dark:bg-slate-900 dark:text-rose-300"
        >
          2단계 인증 비활성화
        </button>
      </div>
    </div>
  );
}

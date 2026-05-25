"use client";

// FR-C-ACCOUNT — 비밀번호 reset 링크 발송 버튼 (Client Component, /settings/account 카드).
//
// 책임:
//   - "비밀번호 재설정 메일 받기" 버튼 → requestPasswordReset Server Action 호출.
//   - 성공 시:
//     - "현재 이메일 (xxx@yyy) 로 재설정 메일을 보냈어요" 안내 노출.
//     - trackEvent("password_reset_requested") 1회 발송.
//   - 실패 분기 (unauthorized / no_email / supabase_error) 별 메시지.
//
// CON-04: 모든 UI / aria-label / 주석에 "치료/진단/장애" 금칙어 0건.
//
// R4 (자녀 보호):
//   - userId 는 분석 백엔드 자동 해시 가정.
//   - reset 링크는 본인 이메일로만 발송 (Supabase 본인 세션 기반).

import { useCallback, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { requestPasswordReset } from "@/app/actions/request-password-reset";

/** 상태 머신. */
type Status = "idle" | "submitting" | "success" | "error";

export function RequestPasswordResetButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const result = await requestPasswordReset();
      if (!result.success) {
        setStatus("error");
        setErrorMessage(result.message);
        return;
      }
      // 분석 이벤트 — R4: userId 는 분석 백엔드 자동 해시 가정.
      trackEvent("password_reset_requested", {
        userId: result.analytics.userId,
      });
      setSentToEmail(result.sentToEmail);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "메일 발송 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  }, []);

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success" && sentToEmail;

  return (
    <div data-testid="password-reset-root" className="space-y-3">
      <button
        type="button"
        data-testid="password-reset-button"
        onClick={() => void handleClick()}
        disabled={isSubmitting || isSuccess !== false}
        aria-label="비밀번호 재설정 메일 받기"
        className="inline-flex min-h-[44px] items-center rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {isSubmitting
          ? "보내는 중..."
          : isSuccess
            ? "메일 발송 완료"
            : "비밀번호 재설정 메일 받기"}
      </button>

      {status === "error" && errorMessage && (
        <p
          data-testid="password-reset-error"
          role="alert"
          className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {errorMessage}
        </p>
      )}

      {isSuccess && (
        <p
          data-testid="password-reset-success"
          role="status"
          aria-live="polite"
          className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
        >
          현재 이메일{" "}
          <span className="break-all font-semibold">{sentToEmail}</span> 로
          비밀번호 재설정 메일을 보냈어요. 받은 메일의 링크를 클릭하면 새 비밀번호를 설정할 수 있어요.
        </p>
      )}
    </div>
  );
}

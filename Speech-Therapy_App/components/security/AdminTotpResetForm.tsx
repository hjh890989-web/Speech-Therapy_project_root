"use client";

// FR-2FA-RECOVERY — admin TOTP reset 폼 (Client Component, /admin/security/totp-reset 카드).
//
// 책임:
//   - 두 개의 email 입력 (target + confirmation) + 제출 버튼.
//   - submit → adminResetTotp Server Action 호출 → success / error 분기 렌더.
//   - state machine: idle → submitting → success | error (error 시 retry 가능).
//   - success 안내 카피: "User can now log in without TOTP. Inform them to re-enroll at /settings/security."
//
// 보안 UX:
//   - 두 email 가 일치해야 button enabled (client-side 사전 게이트, server 가 final 검증).
//   - "치명적 작업" 강조 — amber/rose 색감 + 명시적 경고 카피.
//
// CON-04: 모든 UI / 주석에 "치료/진단/장애" 금칙어 0건.
// R4: target email 은 form 입력에만 사용 — 분석 이벤트엔 userId 만 노출.

import { useCallback, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { adminResetTotp } from "@/app/actions/admin-reset-totp";

export interface AdminTotpResetFormProps {
  /**
   * URL search param 등에서 미리 채울 target email (optional).
   * 운영자가 사용자로부터 받은 이메일을 검색 link 로 전달받는 시나리오.
   */
  prefilledTargetEmail?: string;
}

type Status = "idle" | "submitting" | "success" | "error";

export function AdminTotpResetForm({
  prefilledTargetEmail = "",
}: AdminTotpResetFormProps) {
  const [targetEmail, setTargetEmail] = useState<string>(prefilledTargetEmail);
  const [confirmEmail, setConfirmEmail] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successDetail, setSuccessDetail] = useState<{
    factorsUnenrolled: number;
    previousBackupCodesCount: number;
  } | null>(null);

  // client-side 사전 게이트 — server 가 final 검증하지만 button disable UX 강화.
  const emailsMatch =
    targetEmail.trim().length > 0 &&
    targetEmail.trim().toLowerCase() === confirmEmail.trim().toLowerCase();

  const handleSubmit = useCallback(async () => {
    if (!emailsMatch) {
      setErrorMessage(
        "대상 이메일과 확인용 이메일이 일치하지 않아요. 정확히 같게 입력해 주세요.",
      );
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const result = await adminResetTotp({
        targetUserEmail: targetEmail,
        confirmationEmail: confirmEmail,
      });
      if (!result.success) {
        setStatus("error");
        setErrorMessage(result.message);
        return;
      }
      setSuccessDetail({
        factorsUnenrolled: result.factorsUnenrolled,
        previousBackupCodesCount: result.previousBackupCodesCount,
      });
      setStatus("success");
      trackEvent("admin_totp_reset", {
        adminUserId: result.analytics.adminUserId,
        targetUserId: result.analytics.targetUserId,
      });
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "요청 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  }, [emailsMatch, targetEmail, confirmEmail]);

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
    setSuccessDetail(null);
  }, []);

  // -------- success 분기 --------
  if (status === "success") {
    return (
      <div
        data-testid="admin-totp-reset-success"
        className="space-y-3 rounded-md border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-700 dark:bg-emerald-950/30"
      >
        <p className="font-semibold text-emerald-900 dark:text-emerald-100">
          2단계 인증 초기화가 완료됐어요.
        </p>
        <p className="text-sm text-emerald-900 dark:text-emerald-100">
          해당 사용자는 다음 로그인부터 TOTP 코드 없이 이메일/비밀번호만으로 진입할 수 있어요.
          재활성화는 사용자 본인이 직접 <code className="rounded bg-emerald-100 px-1 dark:bg-emerald-900">/settings/security</code> 에서 다시 등록해 주세요.
        </p>
        {successDetail && (
          <ul
            data-testid="admin-totp-reset-success-detail"
            className="ml-4 list-disc space-y-1 text-xs text-emerald-900 dark:text-emerald-100"
          >
            <li>해제된 MFA factor: {successDetail.factorsUnenrolled}개</li>
            <li>
              초기화 직전 백업 코드: {successDetail.previousBackupCodesCount}개
              (모두 무효화됨)
            </li>
          </ul>
        )}
        <button
          type="button"
          data-testid="admin-totp-reset-retry"
          onClick={handleRetry}
          className="inline-flex min-h-[36px] items-center rounded-md border border-emerald-600 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:border-emerald-500 dark:bg-slate-900 dark:text-emerald-300"
        >
          다른 사용자 초기화
        </button>
      </div>
    );
  }

  // -------- idle / submitting / error --------
  const isSubmitting = status === "submitting";
  return (
    <form
      data-testid="admin-totp-reset-form"
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <div
        role="note"
        className="rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-100"
      >
        <p className="font-semibold">주의 — 비가역 작업</p>
        <p className="mt-1 text-xs">
          본 작업은 대상 사용자의 2단계 인증을 즉시 해제하고 모든 백업 코드를 무효화해요.
          사용자 본인의 동의 (이메일/전화 등) 를 받은 뒤에만 진행해 주세요. 모든 호출은
          감사 로그에 기록되고 운영팀에 즉시 알림이 발송돼요.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="admin-totp-reset-target"
          className="block text-sm font-medium text-slate-800 dark:text-slate-200"
        >
          대상 사용자 이메일
        </label>
        <input
          id="admin-totp-reset-target"
          data-testid="admin-totp-reset-target"
          type="email"
          autoComplete="off"
          value={targetEmail}
          onChange={(e) => setTargetEmail(e.target.value)}
          disabled={isSubmitting}
          placeholder="user@example.com"
          aria-label="대상 사용자 이메일"
          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="admin-totp-reset-confirm"
          className="block text-sm font-medium text-slate-800 dark:text-slate-200"
        >
          확인 — 위 이메일을 다시 입력해 주세요
        </label>
        <input
          id="admin-totp-reset-confirm"
          data-testid="admin-totp-reset-confirm"
          type="email"
          autoComplete="off"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          disabled={isSubmitting}
          placeholder="user@example.com"
          aria-label="대상 사용자 이메일 재입력 (확인용)"
          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {status === "error" && errorMessage && (
        <p
          data-testid="admin-totp-reset-error"
          role="alert"
          className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          data-testid="admin-totp-reset-submit"
          disabled={isSubmitting || !emailsMatch}
          aria-label="2단계 인증 초기화 실행"
          className="inline-flex min-h-[44px] items-center rounded-md bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
        >
          {isSubmitting ? "처리 중..." : "2단계 인증 초기화"}
        </button>
      </div>
    </form>
  );
}

"use client";

// FR-CONSENT-REMINDER-UI — 부모 self-service 동의서 재발송 버튼 (Client Component).
//
// 책임:
//   - "다시 보내기" 버튼 → resendConsentReminder Server Action 호출.
//   - 상태 머신: idle → sending → success / error.
//   - success: 버튼 disabled + "다시 보냈어요" 안내 + trackEvent("consent_reminder_resent").
//   - error: 메시지 노출 + 버튼 재활성화 (재시도 허용).
//
// CON-04: 모든 UI / aria-label / 주석에 "치료/진단/장애" 금칙어 0건.
//
// R4 (자녀 보호):
//   - userId 는 분석 백엔드 자동 해시 가정.
//   - parentEmail / 자녀 이름 등 PII 는 UI 에 노출 X — 페이지 상위에서 표시 책임.
//
// Performance: per-row local state — 동시에 N row 가 마운트돼도 서로 영향 없음.

import { useCallback, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { resendConsentReminder } from "@/app/actions/resend-consent-reminder";

/** 상태 머신. */
type Status = "idle" | "sending" | "success" | "error";

export interface ConsentResendButtonProps {
  /** ConsentSignature.id (UUID). */
  consentSignatureId: string;
}

export function ConsentResendButton({
  consentSignatureId,
}: ConsentResendButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailSkipped, setEmailSkipped] = useState<boolean>(false);

  const handleClick = useCallback(async () => {
    setStatus("sending");
    setErrorMessage(null);
    try {
      const result = await resendConsentReminder({ consentSignatureId });
      if (!result.success) {
        setStatus("error");
        setErrorMessage(result.message);
        return;
      }
      // 분석 이벤트 — R4: userId 는 분석 백엔드 자동 해시 가정.
      trackEvent("consent_reminder_resent", {
        userId: result.analytics.userId,
        consentSignatureId: result.analytics.consentSignatureId,
      });
      setEmailSkipped(result.emailSkipped);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "재발송 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  }, [consentSignatureId]);

  const isSending = status === "sending";
  const isSuccess = status === "success";

  return (
    <div
      data-testid="consent-resend-root"
      data-consent-id={consentSignatureId}
      className="space-y-2"
    >
      <button
        type="button"
        data-testid="consent-resend-button"
        onClick={() => void handleClick()}
        disabled={isSending || isSuccess}
        aria-label="동의서 안내 메일 다시 보내기"
        className="inline-flex min-h-[40px] items-center rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        {isSending
          ? "보내는 중..."
          : isSuccess
            ? "다시 보냈어요"
            : "다시 보내기"}
      </button>

      {status === "error" && errorMessage && (
        <p
          data-testid="consent-resend-error"
          role="alert"
          className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {errorMessage}
        </p>
      )}

      {isSuccess && (
        <p
          data-testid="consent-resend-success"
          role="status"
          aria-live="polite"
          className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
        >
          {emailSkipped
            ? "재발송 처리를 완료했어요. (시스템 설정상 실제 발송은 지연될 수 있어요.)"
            : "동의서 안내 메일을 다시 보냈어요. 메일이 도착하면 링크를 통해 서명해 주세요."}
        </p>
      )}
    </div>
  );
}

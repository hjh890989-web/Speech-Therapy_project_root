"use client";

// FR-C-SECURITY (MFA 마무리) — 로그인 시 MFA challenge 입력 폼 (Client Component).
//
// 책임:
//   - mode === "totp": 6자리 숫자 코드 입력 → verifyMfaChallenge.
//   - mode === "backup": 8자 백업 코드 입력 → verifyMfaChallenge.
//   - 모드 토글 링크 ("백업 코드 사용" / "인증 앱으로 돌아가기").
//   - 성공 시 next URL (props) 또는 "/" 로 router.replace.
//   - 실패 시 reason 별 메시지 + trackEvent.
//   - 잔여 backup code 카운트 안내 (backup mode 성공 / 실패 시).
//
// 상태: idle → submitting → (성공: redirecting) | (실패: idle + errorMessage)
//
// CON-04: 모든 UI / aria-label / 주석에 "치료/진단/장애" 금칙어 0건.
// R4: factorId 는 props 로 받음 — 외부 query string 미사용 (page 가 listFactors 로 회수).

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { trackEvent } from "@/lib/analytics";
import { verifyMfaChallenge } from "@/app/actions/verify-mfa-challenge";

export interface MfaChallengeFormProps {
  /** verified TOTP factor id (page 가 listFactors 로 회수해 전달). */
  factorId: string;
  /** 검증 성공 시 이동할 next URL. 기본 "/". */
  next?: string;
}

type Mode = "totp" | "backup";
type Status = "idle" | "submitting" | "redirecting";

export function MfaChallengeForm({ factorId, next }: MfaChallengeFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("totp");
  const [status, setStatus] = useState<Status>("idle");
  const [code, setCode] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingHint, setRemainingHint] = useState<number | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = code.trim();
    if (mode === "totp" && !/^\d{6}$/.test(trimmed)) {
      setErrorMessage("6자리 숫자 코드를 입력해 주세요.");
      return;
    }
    if (mode === "backup" && !/^[a-zA-Z0-9]{8}$/.test(trimmed)) {
      setErrorMessage("8자 백업 코드를 입력해 주세요.");
      return;
    }
    setStatus("submitting");
    setErrorMessage(null);
    setRemainingHint(null);
    try {
      const result =
        mode === "totp"
          ? await verifyMfaChallenge({ mode: "totp", factorId, code: trimmed })
          : await verifyMfaChallenge({ mode: "backup", code: trimmed });
      if (!result.success) {
        setStatus("idle");
        setErrorMessage(result.message);
        if (mode === "backup" && typeof result.remainingBackupCodes === "number") {
          setRemainingHint(result.remainingBackupCodes);
        }
        if (result.analytics?.userId) {
          const reasonMap: "wrong_code" | "expired" | "rate_limited" | "supabase_error" =
            result.reason === "expired"
              ? "expired"
              : result.reason === "rate_limited"
                ? "rate_limited"
                : result.reason === "supabase_error"
                  ? "supabase_error"
                  : "wrong_code";
          trackEvent("mfa_challenge_failed", {
            userId: result.analytics.userId,
            mode: result.analytics.mode,
            reason: reasonMap,
          });
        }
        return;
      }
      // 성공.
      trackEvent("mfa_challenge_succeeded", {
        userId: result.analytics.userId,
        mode: result.analytics.mode,
      });
      if (
        mode === "backup" &&
        typeof result.remainingBackupCodes === "number"
      ) {
        setRemainingHint(result.remainingBackupCodes);
      }
      setStatus("redirecting");
      router.replace(next && next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setStatus("idle");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "검증 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  }, [code, factorId, mode, next, router]);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "totp" ? "backup" : "totp"));
    setCode("");
    setErrorMessage(null);
    setRemainingHint(null);
  }, []);

  const isSubmitting = status === "submitting";
  const isRedirecting = status === "redirecting";

  return (
    <form
      data-testid="mfa-challenge-form"
      data-mode={mode}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      {mode === "totp" ? (
        <div className="space-y-2">
          <label
            htmlFor="mfa-totp-input"
            className="block text-sm font-medium text-slate-800 dark:text-slate-200"
          >
            인증 앱에 표시된 6자리 코드를 입력해 주세요
          </label>
          <input
            id="mfa-totp-input"
            data-testid="mfa-totp-input"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, ""))}
            disabled={isSubmitting || isRedirecting}
            autoComplete="one-time-code"
            placeholder="000000"
            aria-label="2단계 인증 6자리 코드 입력"
            className="block w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-center font-mono text-lg tracking-widest text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <label
            htmlFor="mfa-backup-input"
            className="block text-sm font-medium text-slate-800 dark:text-slate-200"
          >
            보관 중인 백업 코드 8자를 입력해 주세요
          </label>
          <input
            id="mfa-backup-input"
            data-testid="mfa-backup-input"
            type="text"
            inputMode="text"
            maxLength={8}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
            }
            disabled={isSubmitting || isRedirecting}
            autoComplete="off"
            placeholder="ABCDEFGH"
            aria-label="백업 코드 8자 입력"
            className="block w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-center font-mono text-lg tracking-widest text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      )}

      {errorMessage && (
        <p
          data-testid="mfa-challenge-error"
          role="alert"
          className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {errorMessage}
        </p>
      )}

      {remainingHint !== null && (
        <p
          data-testid="mfa-challenge-remaining"
          className="text-xs text-slate-600 dark:text-slate-400"
        >
          {remainingHint > 0
            ? `백업 코드 ${remainingHint}개 남았어요.`
            : "백업 코드를 모두 사용했어요. 보안 설정에서 재생성하세요."}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          data-testid="mfa-toggle-mode"
          onClick={toggleMode}
          disabled={isSubmitting || isRedirecting}
          className="text-sm font-medium text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300"
        >
          {mode === "totp" ? "백업 코드 사용" : "인증 앱으로 돌아가기"}
        </button>

        <button
          type="submit"
          data-testid="mfa-challenge-submit"
          disabled={
            isSubmitting ||
            isRedirecting ||
            (mode === "totp" && code.trim().length !== 6) ||
            (mode === "backup" && code.trim().length !== 8)
          }
          aria-label="2단계 인증 코드 확인"
          className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {isSubmitting ? "확인 중..." : isRedirecting ? "이동 중..." : "확인"}
        </button>
      </div>
    </form>
  );
}

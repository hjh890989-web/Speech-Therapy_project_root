"use client";

// FR-C-SECURITY — 2FA TOTP enroll flow (Client Component, /settings/security 카드).
//
// 책임:
//   - Step 1 (idle): "2단계 인증 시작" 버튼 → requestEnrollTotp Server Action 호출
//     → 응답에 QR + secret + factorId → enrolling 상태로 전환 후 Step 2 노출
//   - Step 2 (awaiting_verification): QR 표시 + secret 텍스트 + 6자리 코드 입력 폼
//     → "확인" 버튼 → verifyTotpEnroll Server Action → success 시 verified 로 전환
//   - Step 3 (verified): 활성화 완료 안내 + backup codes 표시 (1회만)
//     → "안전한 곳에 보관하세요" 강조
//
// 상태 머신: idle → enrolling → awaiting_verification → verifying → verified
//          (error 시 직전 상태로 복귀 + errorMessage 표시)
//
// CON-04: 모든 UI / aria-label / 주석에 "치료/진단/장애" 금칙어 0건.
// R4: userId 는 server action 의 analytics meta 만 사용 (분석 백엔드 자동 해시 가정).

import { useCallback, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { requestEnrollTotp } from "@/app/actions/enroll-totp";
import { verifyTotpEnroll } from "@/app/actions/verify-totp";

type Status =
  | "idle"
  | "enrolling"
  | "awaiting_verification"
  | "verifying"
  | "verified"
  | "error";

export function EnrollTotpFlow() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string>("");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [secretCopied, setSecretCopied] = useState<boolean>(false);
  const [backupCopied, setBackupCopied] = useState<boolean>(false);

  // Step 1 — enroll 시작.
  const handleStartEnroll = useCallback(async () => {
    setStatus("enrolling");
    setErrorMessage(null);
    try {
      const result = await requestEnrollTotp();
      if (!result.success) {
        setStatus("error");
        setErrorMessage(result.message);
        return;
      }
      setFactorId(result.factorId);
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setStatus("awaiting_verification");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "2단계 인증 시작 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  }, []);

  // Step 2 — code verify.
  const handleVerify = useCallback(async () => {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setErrorMessage("6자리 숫자 코드를 입력해 주세요.");
      return;
    }
    setStatus("verifying");
    setErrorMessage(null);
    try {
      const result = await verifyTotpEnroll({ factorId, code: trimmed });
      if (!result.success) {
        setStatus("awaiting_verification");
        setErrorMessage(result.message);
        // 분석 — 실패 분류 (wrong_code / expired) 전송.
        if (result.analytics?.userId) {
          const reasonMap: "wrong_code" | "expired" =
            result.reason === "expired" ? "expired" : "wrong_code";
          trackEvent("totp_verification_failed", {
            userId: result.analytics.userId,
            reason: reasonMap,
          });
        }
        return;
      }
      setBackupCodes(result.backupCodes);
      setStatus("verified");
      setCode("");
      trackEvent("totp_enrolled", { userId: result.analytics.userId });
    } catch (err) {
      setStatus("awaiting_verification");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "인증 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  }, [code, factorId]);

  const handleCopySecret = useCallback(async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      // graceful — 클립보드 미지원/거부 시 사용자가 수동 복사.
    }
  }, [secret]);

  const handleCopyBackup = useCallback(async () => {
    if (backupCodes.length === 0) return;
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setBackupCopied(true);
      setTimeout(() => setBackupCopied(false), 2000);
    } catch {
      // graceful.
    }
  }, [backupCodes]);

  // -------- Step 3 (verified) --------
  if (status === "verified") {
    return (
      <div
        data-testid="enroll-totp-verified"
        className="space-y-4 rounded-md border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-700 dark:bg-emerald-950/30"
      >
        <p className="font-semibold text-emerald-900 dark:text-emerald-100">
          2단계 인증이 활성화되었어요.
        </p>
        <p className="text-sm text-emerald-900 dark:text-emerald-100">
          다음 로그인부터는 비밀번호와 함께 인증 앱의 6자리 코드를 입력하셔야
          해요.
        </p>

        <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
          <p className="font-semibold text-amber-900 dark:text-amber-100">
            백업 코드 — 안전한 곳에 보관하세요 (이 화면을 닫으면 다시 볼 수
            없어요)
          </p>
          <p className="text-xs text-amber-900 dark:text-amber-100">
            인증 앱을 사용할 수 없을 때 한 번씩만 쓸 수 있는 코드예요. 비밀번호
            매니저 또는 안전한 메모에 보관해 주세요.
          </p>
          <ul
            data-testid="enroll-totp-backup-codes"
            className="grid grid-cols-2 gap-2 font-mono text-sm text-amber-900 dark:text-amber-100"
          >
            {backupCodes.map((c) => (
              <li
                key={c}
                className="rounded bg-white px-3 py-2 text-center dark:bg-slate-900"
              >
                {c}
              </li>
            ))}
          </ul>
          <button
            type="button"
            data-testid="enroll-totp-backup-copy"
            onClick={() => void handleCopyBackup()}
            className="inline-flex min-h-[36px] items-center rounded-md bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {backupCopied ? "복사됨" : "백업 코드 복사"}
          </button>
        </div>
      </div>
    );
  }

  // -------- Step 2 (awaiting_verification / verifying) --------
  if (
    status === "awaiting_verification" ||
    status === "verifying" ||
    (status === "error" && qrCode)
  ) {
    const isVerifying = status === "verifying";
    return (
      <form
        data-testid="enroll-totp-verify-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleVerify();
        }}
      >
        <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            1) Google Authenticator / 1Password / Authy 등 인증 앱으로 아래
            QR 코드를 스캔해 주세요.
          </p>
          {qrCode ? (
            // Supabase 가 반환한 data URL 을 그대로 표시 (별도 라이브러리 불필요).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              data-testid="enroll-totp-qr"
              src={qrCode}
              alt="2단계 인증 QR 코드"
              width={200}
              height={200}
              className="mx-auto rounded border border-slate-300 bg-white p-2 dark:border-slate-600"
            />
          ) : null}

          <div className="space-y-1">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              QR 코드를 스캔할 수 없다면 다음 비밀 키를 인증 앱에 직접 입력해
              주세요:
            </p>
            <div className="flex items-center gap-2">
              <code
                data-testid="enroll-totp-secret"
                className="block flex-1 break-all rounded bg-slate-100 px-3 py-2 font-mono text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
              >
                {secret}
              </code>
              <button
                type="button"
                data-testid="enroll-totp-secret-copy"
                onClick={() => void handleCopySecret()}
                className="inline-flex min-h-[36px] items-center rounded-md bg-slate-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {secretCopied ? "복사됨" : "복사"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="enroll-totp-code-input"
            className="block text-sm font-medium text-slate-800 dark:text-slate-200"
          >
            2) 인증 앱에 표시된 6자리 코드를 입력해 주세요
          </label>
          <input
            id="enroll-totp-code-input"
            data-testid="enroll-totp-code-input"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, ""))}
            disabled={isVerifying}
            autoComplete="one-time-code"
            placeholder="000000"
            aria-label="2단계 인증 6자리 코드 입력"
            className="block w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-center font-mono text-lg tracking-widest text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        {errorMessage && (
          <p
            data-testid="enroll-totp-error"
            role="alert"
            className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
          >
            {errorMessage}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            data-testid="enroll-totp-verify-submit"
            disabled={isVerifying || code.trim().length !== 6}
            aria-label="2단계 인증 코드 확인"
            className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {isVerifying ? "확인 중..." : "코드 확인"}
          </button>
        </div>
      </form>
    );
  }

  // -------- Step 1 (idle / enrolling / error before QR) --------
  const isEnrolling = status === "enrolling";
  return (
    <div data-testid="enroll-totp-idle" className="space-y-4">
      <p className="text-sm text-slate-700 dark:text-slate-300">
        2단계 인증을 활성화하면 비밀번호 외에도 인증 앱에서 발급한 6자리 코드를
        함께 입력해야 로그인할 수 있어요. 도용된 비밀번호만으로는 로그인이
        불가능해 계정이 더 안전해져요.
      </p>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Google Authenticator / 1Password / Authy 등 표준 TOTP 인증 앱이 필요해요.
      </p>

      {errorMessage && status === "error" && (
        <p
          data-testid="enroll-totp-error"
          role="alert"
          className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          data-testid="enroll-totp-start"
          onClick={() => void handleStartEnroll()}
          disabled={isEnrolling}
          aria-label="2단계 인증 시작"
          className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {isEnrolling ? "시작 중..." : "2단계 인증 시작"}
        </button>
      </div>
    </div>
  );
}

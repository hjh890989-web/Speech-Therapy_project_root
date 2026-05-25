"use client";

// FR-C-SECURITY (MFA 마무리) — Backup codes 잔여 카운트 + 재생성 패널 (Client Component).
//
// 책임:
//   - 초기 props 로 잔여 카운트 표시 ("백업 코드 X개 남음").
//   - "재생성" 버튼 → regenerateBackupCodes Server Action 호출 → 새 8개 codes 표시.
//   - "재생성" 후 새 codes 평문 1회 표시 (사용자 메모) — UI 닫으면 다시 못 봄.
//   - 분석: 성공 시 'totp_backup_codes_regenerated' 1회.
//
// 상태: idle → regenerating → showing_new | error
//
// CON-04: 모든 UI / 주석에 "치료/진단/장애" 금칙어 0건.
// R4: userId 는 Server Action analytics meta 만 (분석 백엔드 해시 가정).

import { useCallback, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { regenerateBackupCodes } from "@/app/actions/regenerate-backup-codes";

export interface BackupCodesPanelProps {
  /** Server 측에서 조회한 초기 잔여 카운트. */
  initialRemaining: number;
}

type Status = "idle" | "regenerating" | "showing_new" | "error";

export function BackupCodesPanel({ initialRemaining }: BackupCodesPanelProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [remaining, setRemaining] = useState<number>(initialRemaining);
  const [newCodes, setNewCodes] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleRegenerate = useCallback(async () => {
    setStatus("regenerating");
    setErrorMessage(null);
    try {
      const result = await regenerateBackupCodes();
      if (!result.success) {
        setStatus("error");
        setErrorMessage(result.message);
        return;
      }
      setNewCodes(result.backupCodes);
      setRemaining(result.backupCodes.length);
      setStatus("showing_new");
      trackEvent("totp_backup_codes_regenerated", {
        userId: result.analytics.userId,
      });
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "재생성 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (newCodes.length === 0) return;
    try {
      await navigator.clipboard.writeText(newCodes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // graceful — 클립보드 미지원 시 사용자가 수동 복사.
    }
  }, [newCodes]);

  const isBusy = status === "regenerating";

  return (
    <div
      data-testid="backup-codes-panel"
      className="space-y-4 rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          data-testid="backup-codes-remaining"
          className="text-sm font-medium text-slate-800 dark:text-slate-200"
        >
          {remaining > 0
            ? `잔여 백업 코드: ${remaining}개`
            : "백업 코드를 모두 사용했어요. 재생성을 권장해요."}
        </p>
        <button
          type="button"
          data-testid="backup-codes-regenerate"
          onClick={() => void handleRegenerate()}
          disabled={isBusy}
          aria-label="백업 코드 재생성"
          className="inline-flex min-h-[36px] items-center rounded-md border border-emerald-600 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:border-emerald-500 dark:bg-slate-900 dark:text-emerald-300"
        >
          {isBusy ? "재생성 중..." : "재생성"}
        </button>
      </div>

      {status === "error" && errorMessage && (
        <p
          data-testid="backup-codes-error"
          role="alert"
          className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {errorMessage}
        </p>
      )}

      {status === "showing_new" && newCodes.length > 0 && (
        <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
          <p className="font-semibold text-amber-900 dark:text-amber-100">
            새 백업 코드 — 안전한 곳에 보관하세요 (이 화면을 닫으면 다시 볼 수
            없어요)
          </p>
          <p className="text-xs text-amber-900 dark:text-amber-100">
            기존 백업 코드는 모두 무효화됐어요. 새 코드를 비밀번호 매니저 또는
            안전한 메모에 옮겨 주세요.
          </p>
          <ul
            data-testid="backup-codes-new-list"
            className="grid grid-cols-2 gap-2 font-mono text-sm text-amber-900 dark:text-amber-100"
          >
            {newCodes.map((c) => (
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
            data-testid="backup-codes-copy"
            onClick={() => void handleCopy()}
            className="inline-flex min-h-[36px] items-center rounded-md bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {copied ? "복사됨" : "백업 코드 복사"}
          </button>
        </div>
      )}
    </div>
  );
}

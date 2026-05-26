"use client";

// FR-C-ACCOUNT — 새 비밀번호 입력 폼 (Client Component, /auth/reset-password 진입 후 표시).
//
// 책임:
//   - reset 링크 클릭 → Supabase 가 자동으로 PASSWORD_RECOVERY 세션 부여 (URL fragment 처리).
//   - 본 컴포넌트는 새 비밀번호 + 확인 비밀번호 2개 입력 받음.
//   - 두 값 매치 + 최소 8자 + 영문/숫자 혼합 권장 (Zod-like 검증) 시 활성화.
//   - "비밀번호 설정" → supabase.auth.updateUser({ password: newPassword }) 호출.
//   - 성공 시 토스트 ("비밀번호가 변경되었어요!") + redirect (props.redirectAfter ?? "/settings/account").
//   - 실패 분기 (네트워크 / Supabase error / 검증) — 메시지 노출, 폼은 유지.
//
// CON-04: 모든 UI / aria-label / 주석에 "치료/진단/장애" 금칙어 0건.
//
// R4 (자녀 보호):
//   - 비밀번호는 Supabase 가 hash → 본 컴포넌트는 raw plain text 만 일시 보유 (state).
//   - 분석 이벤트는 본 PR 에서 발송 안 함 (sensitive surface — 별도 PR 에서 신중히).

import { useCallback, useMemo, useState } from "react";

// FR-PERF-4-DYNAMIC-IMPORT — Supabase browser client (~212KB) 는 submit 클릭
// 시점에 lazy load. /auth/reset-password 첫 진입 LCP 영향 0.

/** 새 비밀번호 검증 정책 — 최소 8자 + (영문+숫자 권장 — 권장만, blocking 아님). */
const MIN_LENGTH = 8;

/** 상태 머신. */
type Status = "idle" | "submitting" | "success" | "error";

export interface NewPasswordFormProps {
  /** 성공 후 이동할 경로. 기본 "/settings/account". */
  redirectAfter?: string;
}

/** 비밀번호 강도 + 매치 검증 결과. */
interface ValidationState {
  /** 두 입력이 모두 8자 이상이고 매치하는지. blocking 조건. */
  canSubmit: boolean;
  /** UI 가 표시할 힌트 (강도 / 매치 / 길이 부족). */
  hint: string | null;
}

function validate(pw: string, confirm: string): ValidationState {
  if (pw.length === 0 && confirm.length === 0) {
    return { canSubmit: false, hint: null };
  }
  if (pw.length < MIN_LENGTH) {
    return {
      canSubmit: false,
      hint: `비밀번호는 최소 ${MIN_LENGTH}자 이상이어야 해요.`,
    };
  }
  if (confirm.length === 0) {
    return { canSubmit: false, hint: "확인용 비밀번호를 한 번 더 입력해 주세요." };
  }
  if (pw !== confirm) {
    return { canSubmit: false, hint: "두 비밀번호가 일치하지 않아요." };
  }
  // 권장 — 영문 + 숫자 혼합 (blocking 아님, 안내만).
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  if (!hasLetter || !hasDigit) {
    return {
      canSubmit: true,
      hint: "영문과 숫자를 함께 쓰면 더 안전해요. (권장)",
    };
  }
  return { canSubmit: true, hint: null };
}

export function NewPasswordForm({
  redirectAfter = "/settings/account",
}: NewPasswordFormProps) {
  const [password, setPassword] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validation = useMemo(() => validate(password, confirm), [password, confirm]);

  const handleSubmit = useCallback(async () => {
    if (!validation.canSubmit) return;
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setStatus("error");
        setErrorMessage(
          error.message ??
            "비밀번호 변경에 실패했어요. 잠시 후 다시 시도해 주세요.",
        );
        return;
      }
      setStatus("success");
      // 짧은 시각 후 redirect — toast 가 잠깐 노출 시간을 갖도록.
      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.location.assign(redirectAfter);
        }, 1200);
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "비밀번호 변경 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  }, [validation.canSubmit, password, redirectAfter]);

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";

  return (
    <form
      data-testid="new-password-form"
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      {/* 새 비밀번호 입력. */}
      <div className="space-y-2">
        <label
          htmlFor="new-password-input"
          className="block text-sm font-medium text-slate-800 dark:text-slate-200"
        >
          새 비밀번호
        </label>
        <input
          id="new-password-input"
          data-testid="new-password-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting || isSuccess}
          autoComplete="new-password"
          aria-label="새 비밀번호 입력"
          minLength={MIN_LENGTH}
          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* 확인 비밀번호 입력. */}
      <div className="space-y-2">
        <label
          htmlFor="new-password-confirm-input"
          className="block text-sm font-medium text-slate-800 dark:text-slate-200"
        >
          비밀번호 확인
        </label>
        <input
          id="new-password-confirm-input"
          data-testid="new-password-confirm-input"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={isSubmitting || isSuccess}
          autoComplete="new-password"
          aria-label="새 비밀번호 한 번 더 입력"
          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* 검증 힌트 (강도 / 매치). */}
      {validation.hint && !isSuccess && (
        <p
          data-testid="new-password-hint"
          className="text-xs text-slate-600 dark:text-slate-400"
        >
          {validation.hint}
        </p>
      )}

      {/* 에러 메시지. */}
      {status === "error" && errorMessage && (
        <p
          data-testid="new-password-error"
          role="alert"
          className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {errorMessage}
        </p>
      )}

      {/* 성공 토스트. */}
      {isSuccess && (
        <p
          data-testid="new-password-success"
          role="status"
          aria-live="polite"
          className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
        >
          비밀번호가 변경되었어요! 잠시 후 이동합니다.
        </p>
      )}

      {/* 제출 버튼. */}
      <div className="flex justify-end">
        <button
          type="submit"
          data-testid="new-password-submit"
          disabled={!validation.canSubmit || isSubmitting || isSuccess}
          aria-label="새 비밀번호 설정"
          className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {isSubmitting ? "변경 중..." : "비밀번호 설정"}
        </button>
      </div>
    </form>
  );
}

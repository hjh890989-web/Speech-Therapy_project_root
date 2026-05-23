"use client";

// FR-Q-009 / FR-C-005 — 부모 가입 form (signup link 진입 후).
//
// 책임:
//   - email (token 에서 prefill, readonly — R4: 본인 신원 변경 방지)
//   - password 입력 (8자 이상)
//   - submit → completeParentSignup Server Action 호출
//   - 성공 시 안내 + 메인으로 이동, 실패 시 reason 별 메시지 노출
//
// trackEvent('parent_invite_accepted') — 성공 분기 1회.
//   daysFromSent 는 클라이언트에서 알 수 없으므로 0 (token iat 가 server-side 인 점)
//   대신 본 PR 은 daysFromSent 계산을 생략 — Server Action 응답에 일자 정보 미포함.
//   향후 응답에 iat 추가 시 정확한 일수 산출 가능.

import { useState } from "react";
import { completeParentSignup } from "@/app/actions/complete-parent-signup";
import { trackEvent } from "@/lib/analytics";

interface Props {
  /// 초대 token (URL query param 에서 전달).
  token: string;
  /// 부모 이메일 prefill — token payload 에서 추출 (server-side).
  prefillEmail: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const PASSWORD_MIN_LENGTH = 8;

export function ParentSignupForm({ token, prefillEmail }: Props) {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < PASSWORD_MIN_LENGTH) {
      setStatus({
        kind: "error",
        message: `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 해요.`,
      });
      return;
    }
    setStatus({ kind: "submitting" });
    try {
      const result = await completeParentSignup({ token, password });
      if (result.success) {
        setStatus({ kind: "success", message: result.message });
        // 본 PR 단순화 — daysFromSent=0 (정확한 산출은 후속 PR).
        trackEvent("parent_invite_accepted", {
          institutionId: "",
          daysFromSent: 0,
        });
        return;
      }
      setStatus({ kind: "error", message: result.message });
    } catch (err) {
      setStatus({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  };

  if (status.kind === "success") {
    return (
      <div
        data-testid="parent-signup-success"
        role="status"
        className="rounded-md bg-emerald-50 px-4 py-4 text-sm text-emerald-900"
      >
        <p className="font-medium">{status.message}</p>
        <p className="mt-2">
          이메일 인증 후 자녀의 발음 발달 확인을 시작할 수 있어요.
        </p>
      </div>
    );
  }

  const isBusy = status.kind === "submitting";

  return (
    <form
      data-testid="parent-signup-form"
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label
          htmlFor="parent-email"
          className="block text-sm font-medium text-slate-900"
        >
          이메일
        </label>
        <input
          id="parent-email"
          name="email"
          type="email"
          value={prefillEmail}
          readOnly
          aria-readonly="true"
          className="block w-full cursor-not-allowed rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
        />
        <p className="text-xs text-slate-500">
          초대 메일의 수신 주소로 고정돼요 (R4 본인 신원 보호).
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="parent-password"
          className="block text-sm font-medium text-slate-900"
        >
          비밀번호
        </label>
        <input
          id="parent-password"
          name="password"
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder={`${PASSWORD_MIN_LENGTH}자 이상`}
          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isBusy}
        className="w-full rounded-md bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {isBusy ? "처리 중..." : "가입 완료"}
      </button>

      {status.kind === "error" && (
        <p
          role="alert"
          data-testid="parent-signup-error"
          className="text-sm text-red-700"
        >
          {status.message}
        </p>
      )}
    </form>
  );
}

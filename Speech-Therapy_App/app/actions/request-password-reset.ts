"use server";

// FR-C-ACCOUNT — 비밀번호 reset 링크 발송 Server Action.
//
// 흐름:
//   1) Supabase auth.getUser → user.id + 현재 email 확인 (비로그인 차단).
//   2) currentEmail 부재 시 no_email (OAuth-only 가입 또는 외부 anon — 거의 발생 X).
//   3) supabase.auth.resetPasswordForEmail(currentEmail, { redirectTo }) 호출
//      → Supabase 가 현재 이메일로 recovery 링크 발송.
//      → 사용자가 링크 클릭 → /auth/reset-password 진입 → 새 비밀번호 입력 후 updateUser({ password }).
//   4) graceful — Supabase throw / error → { success: false, reason: 'supabase_error' }.
//
// RBAC (R4):
//   - 외부 인자 없음 — auth.getUser 의 uid + email 만 사용.
//   - 다른 사용자의 reset 링크 발송 절대 불가능.
//
// redirectTo URL:
//   - 우선순위: process.env.NEXT_PUBLIC_BASE_URL → "/auth/reset-password" 폴백.
//   - prod: https://speech-therapy.example.com/auth/reset-password (Vercel 배포 URL).
//
// 분석 이벤트: password_reset_requested (호출 측 Client Component 가 trackEvent — 본 Action 은 결과만).
//
// CON-04: 본 파일의 모든 메시지 / 주석에 "치료/진단/장애" 금칙어 0건.

import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Server Action 결과 — graceful (throw 없음). */
export type RequestPasswordResetResult =
  | {
      success: true;
      /** Supabase 가 reset 링크를 발송한 _현재_ 이메일 주소 (UI 표시용). */
      sentToEmail: string;
      /** 분석 이벤트 발송용 메타. */
      analytics: {
        userId: string;
      };
    }
  | {
      success: false;
      reason: "unauthorized" | "no_email" | "supabase_error";
      message: string;
    };

/** reset link redirect 의 BASE_URL 결정. 환경변수 부재 시 폴백. */
function getResetRedirectUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "";
  if (base) {
    // trailing slash 제거 후 path 부착.
    const trimmed = base.replace(/\/+$/, "");
    return `${trimmed}/auth/reset-password`;
  }
  // 폴백 — relative path (브라우저가 자동으로 origin 조립).
  return "/auth/reset-password";
}

/**
 * 비밀번호 reset 링크 발송 — /settings/account 의 RequestPasswordResetButton 에서 호출.
 *
 * Supabase 가 현재 이메일로 recovery 링크 발송. 사용자는 그 링크를 클릭해
 * /auth/reset-password 페이지로 진입한 후 새 비밀번호를 입력해야 변경 완료.
 *
 * RBAC: Supabase auth uid + email 만 사용. 외부에서 email 입력 받지 않음.
 */
export async function requestPasswordReset(): Promise<RequestPasswordResetResult> {
  // 1) auth — 비로그인 차단.
  let userId: string;
  let currentEmail: string | null = null;
  let supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  try {
    supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) {
      return {
        success: false,
        reason: "unauthorized",
        message: "로그인 후 다시 시도해 주세요.",
      };
    }
    userId = data.user.id;
    currentEmail = data.user.email ?? null;
  } catch {
    return {
      success: false,
      reason: "unauthorized",
      message: "로그인 상태를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 2) 현재 이메일 부재 (OAuth-only 분기 — 거의 발생 X) — graceful.
  if (!currentEmail) {
    return {
      success: false,
      reason: "no_email",
      message:
        "현재 계정에 이메일이 연결되어 있지 않아요. 관리자에게 문의해 주세요.",
    };
  }

  // 3) Supabase resetPasswordForEmail — 현재 이메일로 recovery 링크 발송.
  const redirectTo = getResetRedirectUrl();
  try {
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
      currentEmail,
      { redirectTo },
    );
    if (resetErr) {
      console.warn(
        `[request-password-reset] supabase resetPasswordForEmail 실패 — userId=${userId} message=${resetErr.message}`,
      );
      return {
        success: false,
        reason: "supabase_error",
        message:
          "비밀번호 재설정 메일 발송에 실패했어요. 잠시 후 다시 시도해 주세요.",
      };
    }
  } catch (err) {
    console.error(
      "[request-password-reset] supabase resetPasswordForEmail 예외",
      err,
    );
    return {
      success: false,
      reason: "supabase_error",
      message:
        "비밀번호 재설정 메일 발송에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  return {
    success: true,
    sentToEmail: currentEmail,
    analytics: { userId },
  };
}

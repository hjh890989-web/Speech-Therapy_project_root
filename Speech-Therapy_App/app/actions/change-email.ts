"use server";

// FR-C-ACCOUNT — 이메일 변경 요청 Server Action.
//
// 흐름:
//   1) Supabase auth.getUser → user.id + 현재 email 확인 (비로그인 차단).
//   2) Zod validation — newEmail RFC 5321 형식 + 현재 이메일과 다름.
//   3) supabase.auth.updateUser({ email: newEmail }) 호출
//      → Supabase 가 _새_ 이메일 주소로 confirmation 링크 발송.
//      → 사용자가 새 이메일에 도착한 링크 클릭 → /auth/callback 에서 변경 완료
//        (auth/callback 의 user.email 갱신은 기존 upsert 로 자동 반영).
//   4) graceful — Supabase throw / error → { success: false, reason: 'supabase_error' }.
//
// RBAC (R4):
//   - 본 Action 은 외부에서 user id 입력 받지 않음 — auth.getUser 의 uid 만 사용.
//   - Supabase 자체가 본인 세션의 user 만 updateUser 호출 허용 (anon key + session token).
//   - 다른 사용자의 이메일 변경 절대 불가능 (cross-write 0건).
//
// 분석 이벤트: email_change_requested (호출 측 Client Component 가 trackEvent — 본 Action 은 결과만).
//
// CON-04: 본 파일의 모든 메시지 / 주석에 "치료/진단/장애" 금칙어 0건.

import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Server Action 입력 — 새 이메일 주소만. user id 는 auth 에서. */
export interface ChangeEmailInput {
  /** 사용자가 입력한 새 이메일 주소 — Zod email + max 254 (RFC 5321) 검증. */
  newEmail: string;
}

/** Server Action 결과 — graceful (throw 없음). */
export type ChangeEmailResult =
  | {
      success: true;
      /** Supabase 가 confirmation 링크를 발송한 _새_ 이메일 주소 (UI 표시용). */
      pendingEmail: string;
      /** 분석 이벤트 발송용 메타 — Client Component 가 trackEvent 호출 시 사용. */
      analytics: {
        userId: string;
      };
    }
  | {
      success: false;
      reason:
        | "unauthorized"
        | "invalid_email"
        | "same_as_current"
        | "supabase_error";
      message: string;
    };

/** 새 이메일 입력 검증 — RFC 5321 형식 + 길이 제한. */
const NewEmailSchema = z
  .string()
  .trim()
  .max(254, { message: "이메일이 너무 길어요." })
  .email({ message: "올바른 이메일 형식이 아니에요." });

/**
 * 이메일 변경 요청 — /settings/account 의 EmailChangeForm 에서 호출.
 *
 * Supabase 가 confirmation 링크를 _새_ 이메일로 발송한다. 사용자가 그 링크를
 * 클릭해야 비로소 user.email 이 갱신된다 (본 Action 만으로는 변경 완료 X).
 *
 * RBAC: Supabase auth uid 만 본인 세션 updateUser — 외부 인자로 받은 user id 절대 사용 X.
 */
export async function requestEmailChange(
  input: ChangeEmailInput,
): Promise<ChangeEmailResult> {
  // 1) 입력 검증 — auth 호출 전에 비용 0 으로 reject (CSRF + 실수 방어).
  const rawNewEmail =
    typeof input?.newEmail === "string" ? input.newEmail : "";
  const parsed = NewEmailSchema.safeParse(rawNewEmail);
  if (!parsed.success) {
    return {
      success: false,
      reason: "invalid_email",
      message:
        parsed.error.issues[0]?.message ?? "올바른 이메일 형식이 아니에요.",
    };
  }
  const newEmail = parsed.data.toLowerCase();

  // 2) auth — 비로그인 차단 + 현재 email 회수.
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

  // 3) 현재 이메일과 동일 비교 (대소문자 무시).
  if (
    currentEmail &&
    currentEmail.trim().toLowerCase() === newEmail
  ) {
    return {
      success: false,
      reason: "same_as_current",
      message: "현재 이메일과 동일해요. 다른 이메일을 입력해 주세요.",
    };
  }

  // 4) Supabase updateUser — 새 이메일로 confirmation 링크 발송.
  //    Supabase 정책: 본인 세션 토큰 기반 — 다른 user 의 이메일 변경 불가능.
  try {
    const { error: updateErr } = await supabase.auth.updateUser({
      email: newEmail,
    });
    if (updateErr) {
      console.warn(
        `[change-email] supabase updateUser 실패 — userId=${userId} message=${updateErr.message}`,
      );
      return {
        success: false,
        reason: "supabase_error",
        message:
          "이메일 변경 요청에 실패했어요. 잠시 후 다시 시도해 주세요.",
      };
    }
  } catch (err) {
    console.error("[change-email] supabase updateUser 예외", err);
    return {
      success: false,
      reason: "supabase_error",
      message: "이메일 변경 요청에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  return {
    success: true,
    pendingEmail: newEmail,
    analytics: { userId },
  };
}

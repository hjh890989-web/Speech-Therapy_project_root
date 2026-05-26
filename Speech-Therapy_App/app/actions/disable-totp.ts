"use server";

// FR-C-SECURITY — 2FA TOTP 비활성화 Server Action (재인증 강화).
//
// 흐름:
//   1) Supabase auth.getUser → user.id 확인 (비로그인 차단).
//   2) Zod validation — totpCode (6자리 숫자) — 재인증용.
//   3) auth.mfa.listFactors() → verified TOTP factor 조회 (factorId 회수).
//      → factor 없음 시 not_enrolled 반환 (멱등 — UI 동기화 문제 분기).
//   4) auth.mfa.challenge({ factorId }) → challengeId.
//   5) auth.mfa.verify({ factorId, challengeId, code: totpCode }) → 재인증 검증.
//      → 실패 시 invalid_code (도용 / 실수 방어).
//   6) auth.mfa.unenroll({ factorId }) → factor 제거.
//   7) graceful — Supabase throw 별 reason 분기.
//
// RBAC (R4):
//   - 외부 user id 입력 없음 — auth.uid 만 사용.
//   - factorId 는 본 Action 안에서 listFactors 로 회수 → 외부 입력 차단 (R4 강화).
//
// 분석 이벤트: 호출 측 (DisableTotpFlow) 가 'totp_disabled' 1회 발송 (success 시).
//
// CON-04: 모든 메시지에 "치료/진단/장애" 금칙어 0건.

import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";

// FR-PERF-3-USE-SERVER-REFACTOR — non-async exports 는 ./disable-totp-shape 으로 분리.
import type {
  DisableTotpInput,
  DisableTotpResult,
} from "./disable-totp-shape";

/** 입력 검증 — 6자리 숫자만. */
const InputSchema = z.object({
  totpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { message: "6자리 숫자 코드를 입력해 주세요." }),
});

/**
 * 2FA TOTP 비활성화 — /settings/security 의 DisableTotpFlow 에서 호출.
 *
 * 재인증 강화: 현재 TOTP 코드를 다시 입력받아 검증한 뒤에만 unenroll 한다.
 * 도용된 세션에서의 무단 disable 차단.
 */
export async function disableTotp(
  input: DisableTotpInput,
): Promise<DisableTotpResult> {
  // 1) 입력 검증.
  const parsed = InputSchema.safeParse({
    totpCode: typeof input?.totpCode === "string" ? input.totpCode : "",
  });
  if (!parsed.success) {
    return {
      success: false,
      reason: "invalid_input",
      message:
        parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요.",
    };
  }
  const { totpCode } = parsed.data;

  // 2) auth — 비로그인 차단.
  let userId: string;
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
  } catch {
    return {
      success: false,
      reason: "unauthorized",
      message: "로그인 상태를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 3) listFactors — verified TOTP factor 회수 (R4: 외부 factorId 입력 차단).
  let factorId = "";
  try {
    const listResp = await supabase.auth.mfa.listFactors();
    if (listResp.error) {
      console.warn(
        `[disable-totp] listFactors 실패 — userId=${userId} message=${listResp.error.message}`,
      );
      return {
        success: false,
        reason: "supabase_error",
        message:
          "2단계 인증 비활성화에 실패했어요. 잠시 후 다시 시도해 주세요.",
        analytics: { userId },
      };
    }
    const totpList =
      (listResp.data as { totp?: Array<{ id?: string; status?: string }> } | null)
        ?.totp ?? [];
    const verified = totpList.find((f) => f?.status === "verified" && f?.id);
    if (!verified || !verified.id) {
      return {
        success: false,
        reason: "not_enrolled",
        message:
          "활성화된 2단계 인증이 없어요. 페이지를 새로고침해 주세요.",
        analytics: { userId },
      };
    }
    factorId = verified.id;
  } catch (err) {
    console.error("[disable-totp] listFactors 예외", err);
    return {
      success: false,
      reason: "supabase_error",
      message: "2단계 인증 비활성화에 실패했어요. 잠시 후 다시 시도해 주세요.",
      analytics: { userId },
    };
  }

  // 4) challenge — challengeId 발급.
  let challengeId = "";
  try {
    const chResp = await supabase.auth.mfa.challenge({ factorId });
    if (chResp.error || !chResp.data?.id) {
      console.warn(
        `[disable-totp] challenge 실패 — userId=${userId} message=${
          chResp.error?.message ?? "unknown"
        }`,
      );
      return {
        success: false,
        reason: "supabase_error",
        message:
          "2단계 인증 비활성화에 실패했어요. 잠시 후 다시 시도해 주세요.",
        analytics: { userId },
      };
    }
    challengeId = chResp.data.id;
  } catch (err) {
    console.error("[disable-totp] challenge 예외", err);
    return {
      success: false,
      reason: "supabase_error",
      message: "2단계 인증 비활성화에 실패했어요. 잠시 후 다시 시도해 주세요.",
      analytics: { userId },
    };
  }

  // 5) verify — 재인증 (현재 TOTP 코드 검증).
  try {
    const verifyResp = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: totpCode,
    });
    if (verifyResp.error) {
      const msg = verifyResp.error.message ?? "";
      const isInvalidCode =
        /invalid|incorrect|wrong/i.test(msg) || /code/i.test(msg);
      if (isInvalidCode) {
        return {
          success: false,
          reason: "invalid_code",
          message: "코드가 일치하지 않아요. 다시 확인 후 입력해 주세요.",
          analytics: { userId },
        };
      }
      console.warn(
        `[disable-totp] verify 실패 — userId=${userId} message=${msg}`,
      );
      return {
        success: false,
        reason: "supabase_error",
        message:
          "2단계 인증 비활성화에 실패했어요. 잠시 후 다시 시도해 주세요.",
        analytics: { userId },
      };
    }
  } catch (err) {
    console.error("[disable-totp] verify 예외", err);
    return {
      success: false,
      reason: "supabase_error",
      message: "2단계 인증 비활성화에 실패했어요. 잠시 후 다시 시도해 주세요.",
      analytics: { userId },
    };
  }

  // 6) unenroll — factor 제거.
  try {
    const unenrollResp = await supabase.auth.mfa.unenroll({ factorId });
    if (unenrollResp.error) {
      console.warn(
        `[disable-totp] unenroll 실패 — userId=${userId} message=${unenrollResp.error.message}`,
      );
      return {
        success: false,
        reason: "supabase_error",
        message:
          "2단계 인증 비활성화에 실패했어요. 잠시 후 다시 시도해 주세요.",
        analytics: { userId },
      };
    }
  } catch (err) {
    console.error("[disable-totp] unenroll 예외", err);
    return {
      success: false,
      reason: "supabase_error",
      message: "2단계 인증 비활성화에 실패했어요. 잠시 후 다시 시도해 주세요.",
      analytics: { userId },
    };
  }

  return {
    success: true,
    analytics: { userId },
  };
}

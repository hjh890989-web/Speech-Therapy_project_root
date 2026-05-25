"use server";

// FR-C-SECURITY — 2FA TOTP enroll verify Server Action.
//
// 흐름:
//   1) Supabase auth.getUser → user.id 확인 (비로그인 차단).
//   2) Zod validation — factorId (UUID) + code (6자리 숫자).
//   3) auth.mfa.challenge({ factorId }) → challengeId 발급.
//   4) auth.mfa.verify({ factorId, challengeId, code }) → 성공 시 factor 가 verified 상태로 활성.
//   5) 성공 직후 generateBackupCodes() 호출 → 사용자에게 1회 표시 (DB 저장 X, 본 PR 단순화).
//   6) graceful — code 불일치 / 만료 / Supabase throw 별 reason 분기.
//
// RBAC (R4):
//   - 외부 user id 입력 없음 — auth.uid 만 사용.
//   - factorId 는 enroll 응답을 가져온 그대로 전달 — Supabase 가 본인 factor 만 verify.
//
// 분석 이벤트:
//   - 호출 측 (EnrollTotpFlow) 가 성공 시 'totp_enrolled' / 실패 시 'totp_verification_failed' 발송.
//   - 본 Action 은 analytics.userId 메타만 제공 (server 측 trackEvent X — Client beacon 정책).
//
// CON-04: 모든 메시지에 "치료/진단/장애" 금칙어 0건.

import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { generateBackupCodes } from "@/lib/security/backup-codes";
import { storeBackupCodes } from "@/lib/security/backup-codes-store";

/** verify 입력 — factorId (enroll 응답) + 6자리 코드. */
export interface VerifyTotpEnrollInput {
  factorId: string;
  code: string;
}

/** Server Action 결과 — graceful (throw 없음). */
export type VerifyTotpEnrollResult =
  | {
      success: true;
      /** 사용자에게 1회 표시할 backup codes (8자 8개) — 본 PR 단순 표시, DB 저장 X. */
      backupCodes: string[];
      analytics: {
        userId: string;
      };
    }
  | {
      success: false;
      reason:
        | "unauthorized"
        | "invalid_input"
        | "invalid_code"
        | "expired"
        | "supabase_error";
      message: string;
      analytics?: {
        userId: string;
      };
    };

/** 입력 검증 — factorId 는 빈문자열 차단, code 는 6자리 숫자만. */
const InputSchema = z.object({
  factorId: z
    .string()
    .trim()
    .min(1, { message: "factorId 가 없어요. 처음부터 다시 시도해 주세요." })
    .max(128, { message: "factorId 가 올바르지 않아요." }),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { message: "6자리 숫자 코드를 입력해 주세요." }),
});

/**
 * 2FA TOTP enroll 의 verify 단계 — /settings/security 의 EnrollTotpFlow Step 3 에서 호출.
 *
 * Supabase MFA challenge → verify 2-step 흐름:
 *   1. challenge({ factorId }) → challengeId
 *   2. verify({ factorId, challengeId, code }) → success 시 factor 가 verified 활성
 *
 * 성공 시 backup codes 8개 생성 후 1회 표시 (DB 저장 안 함, 후속 PR 에서 hash 저장 검토).
 */
export async function verifyTotpEnroll(
  input: VerifyTotpEnrollInput,
): Promise<VerifyTotpEnrollResult> {
  // 1) 입력 검증 — auth 호출 전에 비용 0 으로 reject.
  const parsed = InputSchema.safeParse({
    factorId: typeof input?.factorId === "string" ? input.factorId : "",
    code: typeof input?.code === "string" ? input.code : "",
  });
  if (!parsed.success) {
    return {
      success: false,
      reason: "invalid_input",
      message:
        parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요.",
    };
  }
  const { factorId, code } = parsed.data;

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

  // 3) Supabase MFA challenge — challengeId 발급.
  let challengeId = "";
  try {
    const chResp = await supabase.auth.mfa.challenge({ factorId });
    if (chResp.error || !chResp.data?.id) {
      const msg = chResp.error?.message ?? "";
      // Supabase 가 challenge 단계에서 만료/잘못된 factor 응답 시 expired 로 분류.
      if (msg.toLowerCase().includes("expire")) {
        return {
          success: false,
          reason: "expired",
          message:
            "인증 시간이 만료되었어요. 처음부터 다시 시도해 주세요.",
          analytics: { userId },
        };
      }
      console.warn(
        `[verify-totp] challenge 실패 — userId=${userId} message=${msg}`,
      );
      return {
        success: false,
        reason: "supabase_error",
        message:
          "2단계 인증 검증에 실패했어요. 잠시 후 다시 시도해 주세요.",
        analytics: { userId },
      };
    }
    challengeId = chResp.data.id;
  } catch (err) {
    console.error("[verify-totp] challenge 예외", err);
    return {
      success: false,
      reason: "supabase_error",
      message: "2단계 인증 검증에 실패했어요. 잠시 후 다시 시도해 주세요.",
      analytics: { userId },
    };
  }

  // 4) Supabase MFA verify — 6자리 코드 검증.
  try {
    const verifyResp = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });
    if (verifyResp.error) {
      const msg = verifyResp.error.message ?? "";
      // 일반적인 잘못된 코드 메시지 매칭.
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
      if (/expire/i.test(msg)) {
        return {
          success: false,
          reason: "expired",
          message:
            "인증 시간이 만료되었어요. 처음부터 다시 시도해 주세요.",
          analytics: { userId },
        };
      }
      console.warn(
        `[verify-totp] verify 실패 — userId=${userId} message=${msg}`,
      );
      return {
        success: false,
        reason: "supabase_error",
        message:
          "2단계 인증 검증에 실패했어요. 잠시 후 다시 시도해 주세요.",
        analytics: { userId },
      };
    }
  } catch (err) {
    console.error("[verify-totp] verify 예외", err);
    return {
      success: false,
      reason: "supabase_error",
      message: "2단계 인증 검증에 실패했어요. 잠시 후 다시 시도해 주세요.",
      analytics: { userId },
    };
  }

  // 5) 성공 — backup codes 1회 생성, hash 저장 후 평문 응답에 포함 (사용자 1회 표시).
  //    MFA 마무리 PR 정책: sha256 hash 8개를 User.totpBackupCodes 에 저장 →
  //    로그인 시 인증 앱 분실 fallback 으로 사용 (1회용 제거).
  const backupCodes = generateBackupCodes();
  try {
    await storeBackupCodes(userId, backupCodes);
  } catch (err) {
    // hash 저장 실패는 enroll 성공 자체를 막지 않음 (TOTP 활성은 이미 완료).
    // 후속 사용자가 backup code 가 동작 안 함을 경험하면 "재생성" 으로 복구.
    console.error(
      `[verify-totp] storeBackupCodes 실패 — userId=${userId} err=${
        err instanceof Error ? err.message : "unknown"
      }`,
    );
  }

  return {
    success: true,
    backupCodes,
    analytics: { userId },
  };
}

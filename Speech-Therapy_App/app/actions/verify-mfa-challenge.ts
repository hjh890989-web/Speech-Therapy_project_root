"use server";

// FR-C-SECURITY (MFA 마무리) — 로그인 시 MFA challenge 검증 Server Action.
//
// 책임:
//   - AAL1 세션 사용자가 입력한 TOTP 6자리 코드 또는 backup code 를 검증.
//   - TOTP: auth.mfa.challengeAndVerify({ factorId, code }) → AAL2 부여.
//   - Backup code: useBackupCode(userId, code) → 1회용 hash 매칭 → 잔여 카운트.
//     * backup code 경로는 Supabase AAL 을 직접 갱신하지 않음 — 본 PR 정책상
//       application-layer "AAL2-equivalent" 처리 (DB 컬럼 사용 0건, 호출 측이
//       세션 cookie 에 별도 마킹할 수도 있으나 본 PR 은 단순 success 반환).
//     * 후속 PR: backup code 사용 직후 TOTP factor 일시 비활성 + 재enroll 강제.
//
// 흐름 분기:
//   - mode === "totp"   : 6자리 숫자 → challengeAndVerify.
//   - mode === "backup" : 8자 영숫자 → useBackupCode.
//
// RBAC (R4):
//   - 외부 user id 입력 받지 않음 — auth.uid 만 사용.
//   - factorId 는 client 가 listFactors 응답에서 전달 — Supabase 가 본인 factor 만 매칭.
//
// 분석 이벤트:
//   - 호출 측 (MfaChallengeForm) 가 success/failure 후 trackEvent 발송.
//
// graceful:
//   - Supabase env 미설정 / 일시 장애 → reason='supabase_error'.
//   - rate limit / invalid 분기 메시지 분류.
//
// CON-04: 모든 메시지에 "치료/진단/장애" 금칙어 0건.

import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  useBackupCode,
  getRemainingBackupCodesCount,
} from "@/lib/security/backup-codes-store";

// FR-PERF-3-USE-SERVER-REFACTOR — non-async exports 는 ./verify-mfa-challenge-shape 으로 분리.
import type {
  VerifyMfaChallengeInput,
  VerifyMfaChallengeResult,
} from "./verify-mfa-challenge-shape";

const TotpSchema = z.object({
  mode: z.literal("totp"),
  factorId: z
    .string()
    .trim()
    .min(1)
    .max(128),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { message: "6자리 숫자 코드를 입력해 주세요." }),
});

const BackupSchema = z.object({
  mode: z.literal("backup"),
  // 8자 영숫자 (헷갈리는 글자 제외 alphabet) — 대소문자 무관, useBackupCode 가 normalize.
  code: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9]{8}$/, {
      message: "8자 백업 코드를 입력해 주세요.",
    }),
});

/**
 * 로그인 후 AAL2 승격을 위한 MFA challenge 검증.
 *
 * 호출 시점: /auth/mfa-challenge 페이지의 MfaChallengeForm 에서 사용자가 코드 제출 시.
 *
 * 본인 (auth.uid) 검증만 수행 — cross-user 호출 방지는 Supabase 측이 세션 기반으로 보장.
 */
export async function verifyMfaChallenge(
  input: VerifyMfaChallengeInput,
): Promise<VerifyMfaChallengeResult> {
  // 1) 입력 검증 — auth 호출 전.
  let mode: "totp" | "backup";
  let factorId = "";
  let code = "";
  if (input && typeof input === "object" && (input as { mode?: unknown }).mode === "totp") {
    const parsed = TotpSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        reason: "invalid_input",
        message:
          parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요.",
      };
    }
    mode = "totp";
    factorId = parsed.data.factorId;
    code = parsed.data.code;
  } else if (input && typeof input === "object" && (input as { mode?: unknown }).mode === "backup") {
    const parsed = BackupSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        reason: "invalid_input",
        message:
          parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요.",
      };
    }
    mode = "backup";
    code = parsed.data.code;
  } else {
    return {
      success: false,
      reason: "invalid_input",
      message: "입력이 올바르지 않아요.",
    };
  }

  // 2) auth — 비로그인 차단 (AAL1 세션이라도 user.id 노출됨).
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

  // 3) mode 분기.
  if (mode === "totp") {
    try {
      // challengeAndVerify: 1회 호출로 challenge + verify 동시 수행 (UI 단순화).
      const resp = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (resp.error) {
        const msg = resp.error.message ?? "";
        if (/expire/i.test(msg)) {
          return {
            success: false,
            reason: "expired",
            message:
              "인증 시간이 만료되었어요. 처음부터 다시 시도해 주세요.",
            analytics: { userId, mode },
          };
        }
        if (/rate|too many|limit/i.test(msg)) {
          return {
            success: false,
            reason: "rate_limited",
            message:
              "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
            analytics: { userId, mode },
          };
        }
        const isInvalidCode =
          /invalid|incorrect|wrong/i.test(msg) || /code/i.test(msg);
        if (isInvalidCode) {
          return {
            success: false,
            reason: "invalid_code",
            message: "코드가 일치하지 않아요. 다시 확인 후 입력해 주세요.",
            analytics: { userId, mode },
          };
        }
        console.warn(
          `[verify-mfa-challenge] totp 실패 — userId=${userId} message=${msg}`,
        );
        return {
          success: false,
          reason: "supabase_error",
          message:
            "2단계 인증 검증에 실패했어요. 잠시 후 다시 시도해 주세요.",
          analytics: { userId, mode },
        };
      }
      return {
        success: true,
        analytics: { userId, mode },
      };
    } catch (err) {
      console.error("[verify-mfa-challenge] totp 예외", err);
      return {
        success: false,
        reason: "supabase_error",
        message: "2단계 인증 검증에 실패했어요. 잠시 후 다시 시도해 주세요.",
        analytics: { userId, mode },
      };
    }
  }

  // mode === "backup" — useBackupCode 호출 (server-side 함수 — React Hook 아님).
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = await useBackupCode(userId, code);
    if (!result.ok) {
      return {
        success: false,
        reason: "invalid_code",
        message: "백업 코드가 일치하지 않아요. 다른 코드를 사용해 주세요.",
        remainingBackupCodes: result.remaining,
        analytics: { userId, mode },
      };
    }
    return {
      success: true,
      remainingBackupCodes: result.remaining,
      analytics: { userId, mode },
    };
  } catch (err) {
    console.error("[verify-mfa-challenge] backup 예외", err);
    // 실패 시 잔여 카운트는 graceful 0 fallback (lookup 도 실패할 수 있음).
    let remaining = 0;
    try {
      remaining = await getRemainingBackupCodesCount(userId);
    } catch {
      remaining = 0;
    }
    return {
      success: false,
      reason: "supabase_error",
      message: "백업 코드 검증에 실패했어요. 잠시 후 다시 시도해 주세요.",
      remainingBackupCodes: remaining,
      analytics: { userId, mode },
    };
  }
}

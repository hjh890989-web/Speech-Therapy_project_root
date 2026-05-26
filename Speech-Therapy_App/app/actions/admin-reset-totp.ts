"use server";

// FR-2FA-RECOVERY — admin TOTP reset Server Action (부모 lockout 복구).
//
// 흐름:
//   1) Zod validation — targetUserEmail / confirmationEmail (email 형식 + 비공백).
//   2) confirmationEmail === targetUserEmail (대소문자 무관 + trim) — 정확 매칭 게이트.
//   3) Supabase auth.getUser → caller user 확인 (비로그인 → unauthorized).
//   4) prisma.user.findUnique({id: caller.id}) → role === 'admin' 교차 검증 (forbidden 차단).
//   5) prisma.user.findUnique({email: targetUserEmail}) → target row 회수 (없으면 target_not_found).
//   6) Supabase Admin SDK → auth.admin.mfa.listFactors({userId: target.id}) → 회수된 factor 전부 unenroll.
//   7) withActor(caller.id, async (tx) => { tx.user.update({ totpBackupCodes: [] }) }) — audit actor 캡처.
//   8) recordAudit + alertIfCritical("totp_disabled") — Slack 알림 (운영팀 즉시 감지).
//
// RBAC (R4 강화):
//   - caller.role === 'admin' 만 진입 — principal/teacher 등 다른 elevated role 도 차단.
//   - target user id 는 _server-side 조회_ 결과만 사용 — 외부 입력 절대 신뢰 X.
//
// 멱등성:
//   - factor 0개 (이미 모두 unenroll) → success + factorsUnenrolled: 0 (graceful — 멱등).
//   - totpBackupCodes 이미 빈 array → update no-op (Prisma update 항상 성공).
//
// graceful (throw 절대 금지):
//   - 모든 단계의 Supabase / Prisma 예외는 reason 분기 + console.error.
//
// CON-04: 모든 메시지에 "치료/진단/장애" 금칙어 0건.

import { z } from "zod";

import { withActor } from "@/lib/db/with-actor";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { alertIfCritical } from "@/lib/audit/critical-alert";

import type {
  AdminResetTotpInput,
  AdminResetTotpResult,
} from "./admin-reset-totp-shape";

/** 입력 검증 — email 형식 + 비공백. */
const InputSchema = z.object({
  targetUserEmail: z
    .string()
    .trim()
    .min(1, { message: "대상 사용자 이메일을 입력해 주세요." })
    .email({ message: "올바른 이메일 형식이 아니에요." }),
  confirmationEmail: z
    .string()
    .trim()
    .min(1, { message: "확인용 이메일을 입력해 주세요." }),
});

/// caller / target email 비교 — 대소문자 무관 + trim.
function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * admin TOTP reset — /admin/security/totp-reset 의 AdminTotpResetForm 에서 호출.
 *
 * 부모(또는 임의 user) 의 authenticator 분실 + backup codes 8개 모두 소진 시
 * 영구 lockout 회피용 "support ticket reset" 패턴.
 */
export async function adminResetTotp(
  input: AdminResetTotpInput,
): Promise<AdminResetTotpResult> {
  // 1) 입력 검증.
  const parsed = InputSchema.safeParse({
    targetUserEmail:
      typeof input?.targetUserEmail === "string" ? input.targetUserEmail : "",
    confirmationEmail:
      typeof input?.confirmationEmail === "string" ? input.confirmationEmail : "",
  });
  if (!parsed.success) {
    return {
      success: false,
      reason: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요.",
    };
  }
  const targetEmailNormalized = normalizeEmail(parsed.data.targetUserEmail);
  const confirmEmailNormalized = normalizeEmail(parsed.data.confirmationEmail);

  // 2) confirmation 정확 매칭 — 실수 방지 게이트 (auth 검증보다 _먼저_ 차단).
  if (targetEmailNormalized !== confirmEmailNormalized) {
    return {
      success: false,
      reason: "email_mismatch",
      message:
        "대상 이메일과 확인용 이메일이 일치하지 않아요. 정확히 같게 입력해 주세요.",
    };
  }

  // 3) caller auth — 비로그인 차단.
  let callerId: string;
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) {
      return {
        success: false,
        reason: "unauthorized",
        message: "로그인 후 다시 시도해 주세요.",
      };
    }
    callerId = data.user.id;
  } catch {
    return {
      success: false,
      reason: "unauthorized",
      message: "로그인 상태를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 4) caller role === 'admin' 교차 검증 (Prisma).
  //    Supabase auth uid 는 jwt 위변조 risk 0 이지만, 본 PR 은 _DB 측_ 권한도
  //    재확인하여 dual-source 검증 (jwt 캐싱 / role 변경 직후 elevated 상태 잔존 방지).
  const { prisma } = await import("@/lib/db");
  let callerRole: string | null = null;
  try {
    const callerRow = await prisma.user.findUnique({
      where: { id: callerId },
      select: { role: true },
    });
    callerRole = callerRow?.role ?? null;
  } catch (err) {
    console.error("[admin-reset-totp] caller findUnique 실패", err);
    return {
      success: false,
      reason: "db_failed",
      message: "권한 확인에 실패했어요. 잠시 후 다시 시도해 주세요.",
      analytics: { adminUserId: callerId },
    };
  }
  if (callerRole !== "admin") {
    return {
      success: false,
      reason: "forbidden",
      message: "관리자(admin) 권한이 필요해요.",
      analytics: { adminUserId: callerId },
    };
  }

  // 5) target user 회수 — email 로 조회.
  //    Prisma User.email 은 UNIQUE — 단건 조회 (RLS 없음, server-side query).
  let targetUser: { id: string; email: string | null; totpBackupCodes: string[] } | null;
  try {
    targetUser = await prisma.user.findUnique({
      where: { email: targetEmailNormalized },
      select: { id: true, email: true, totpBackupCodes: true },
    });
  } catch (err) {
    console.error("[admin-reset-totp] target findUnique 실패", err);
    return {
      success: false,
      reason: "db_failed",
      message: "대상 사용자 조회에 실패했어요. 잠시 후 다시 시도해 주세요.",
      analytics: { adminUserId: callerId },
    };
  }
  if (!targetUser) {
    return {
      success: false,
      reason: "target_not_found",
      message: "해당 이메일의 사용자를 찾을 수 없어요.",
      analytics: { adminUserId: callerId },
    };
  }
  const targetUserId = targetUser.id;
  const previousBackupCodesCount = targetUser.totpBackupCodes?.length ?? 0;

  // 6) Supabase Admin SDK — target user 의 MFA factor 회수 + 전부 unenroll.
  //    멱등: factor 0개여도 success (이미 reset 된 상태).
  let factorsUnenrolled = 0;
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      console.warn(
        `[admin-reset-totp] Supabase Admin SDK 미설정 — auth factor unenroll skip. targetUserId=${targetUserId}`,
      );
      // dev/preview 분기: admin SDK 없이도 DB 측 backup codes 초기화는 진행 (graceful).
    } else {
      // Supabase Admin SDK 의 mfa.listFactors / deleteFactor 시그니처:
      //   - admin.auth.admin.mfa.listFactors({ userId })
      //   - admin.auth.admin.mfa.deleteFactor({ userId, id })
      // (typescript 정의가 정확하지 않을 수 있으므로 unknown cast — runtime shape 만 의존.)
      const adminAuth = admin.auth.admin as unknown as {
        mfa?: {
          listFactors?: (args: { userId: string }) => Promise<{
            data?: { factors?: Array<{ id?: string }> } | null;
            error?: { message?: string } | null;
          }>;
          deleteFactor?: (args: { userId: string; id: string }) => Promise<{
            data?: unknown;
            error?: { message?: string } | null;
          }>;
        };
      };

      const mfa = adminAuth.mfa;
      if (mfa?.listFactors && mfa?.deleteFactor) {
        const listResp = await mfa.listFactors({ userId: targetUserId });
        if (listResp.error) {
          console.warn(
            `[admin-reset-totp] listFactors 실패 — targetUserId=${targetUserId} message=${listResp.error.message ?? "unknown"}`,
          );
          return {
            success: false,
            reason: "supabase_error",
            message:
              "Supabase MFA 조회에 실패했어요. 잠시 후 다시 시도해 주세요.",
            analytics: { adminUserId: callerId, targetUserId },
          };
        }
        const factors = listResp.data?.factors ?? [];
        for (const f of factors) {
          if (!f?.id) continue;
          try {
            const delResp = await mfa.deleteFactor({
              userId: targetUserId,
              id: f.id,
            });
            if (delResp.error) {
              console.warn(
                `[admin-reset-totp] deleteFactor 실패 — targetUserId=${targetUserId} factorId=${f.id} message=${delResp.error.message ?? "unknown"}`,
              );
              return {
                success: false,
                reason: "supabase_error",
                message:
                  "Supabase MFA factor 삭제에 실패했어요. 잠시 후 다시 시도해 주세요.",
                analytics: { adminUserId: callerId, targetUserId },
              };
            }
            factorsUnenrolled += 1;
          } catch (delErr) {
            console.error(
              "[admin-reset-totp] deleteFactor 예외",
              delErr,
            );
            return {
              success: false,
              reason: "supabase_error",
              message:
                "Supabase MFA factor 삭제 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
              analytics: { adminUserId: callerId, targetUserId },
            };
          }
        }
      } else {
        // SDK 버전이 mfa.admin 인터페이스 미지원 — 본 PR 은 graceful skip.
        // (admin SDK 가 deleteFactor 를 미지원하면 운영자가 수동 처리 필요.)
        console.warn(
          "[admin-reset-totp] Supabase Admin SDK 가 mfa.{listFactors,deleteFactor} 미지원 — skip.",
        );
      }
    }
  } catch (err) {
    console.error("[admin-reset-totp] Supabase Admin SDK 예외", err);
    return {
      success: false,
      reason: "supabase_error",
      message: "Supabase 호출 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      analytics: { adminUserId: callerId, targetUserId },
    };
  }

  // 7) totpBackupCodes 초기화 — withActor 로 audit actor 캡처 (caller = admin).
  try {
    await withActor(callerId, async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { totpBackupCodes: [] },
      });
    });
  } catch (err) {
    console.error("[admin-reset-totp] totpBackupCodes 초기화 실패", err);
    return {
      success: false,
      reason: "db_failed",
      message:
        "백업 코드 초기화에 실패했어요. 잠시 후 다시 시도해 주세요.",
      analytics: { adminUserId: callerId, targetUserId },
    };
  }

  // 8) critical alert — Slack 즉시 알림 (totp_disabled 는 CRITICAL_ACTIONS Set 포함).
  //    R4: diff 본문은 _자녀 식별 정보 0_ — 단순 카운트 + uuid 라벨만.
  //    fire-and-forget — 호출 측 흐름 차단 X (graceful — alertIfCritical 자체가 throw 0).
  void alertIfCritical("totp_disabled", callerId, {
    targetUserId,
    factorsUnenrolled,
    previousBackupCodesCount,
    source: "admin_reset_totp",
  }).catch((err) => {
    console.error(
      "[admin-reset-totp] alertIfCritical 백그라운드 예외 (graceful):",
      err,
    );
  });

  return {
    success: true,
    analytics: {
      adminUserId: callerId,
      targetUserId,
    },
    factorsUnenrolled,
    previousBackupCodesCount,
  };
}

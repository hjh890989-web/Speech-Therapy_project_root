"use server";

// FR-C-ACCOUNT — 계정 삭제 Server Action (GDPR + 한국 개인정보보호법 대응).
//
// 책임:
//   - Supabase auth.getUser → userId 본인만 삭제 가능.
//   - confirmation 텍스트 정확 매칭 ("계정을 삭제합니다") — 실수 방지 게이트.
//   - withActor(userId, async (tx) => { ... }) — DB transaction 안에서 본인 User row 삭제.
//     - Prisma schema 의 onDelete: Cascade 가 SessionLog / EvaluationResult / WeeklyReport /
//       RewardLog / RewardProgress / HITLQueue (subject) / OfflineEntry (subject) 자동 삭제.
//     - ConsentSignature 는 User FK 미보유 (parentEmail 매칭) → 별도 처리 X (cron 만료 위임).
//     - Class.teacherId / HITLQueue.assignedExpertId / OfflineEntry.authorId 같은 nullable
//       참조는 SET NULL 또는 그대로 유지 (본인이 teacher/expert/author 인 경우 cascade 안 됨).
//   - Supabase admin SDK 로 auth user 삭제 — 없으면 graceful skip + 경고 로그.
//
// RBAC (R4):
//   - 외부 인자로 user id 받지 않음 — auth.getUser 의 uid 만 사용.
//
// graceful (비가역 작업이지만 throw 절대 금지 — 호출 측이 UI 결과 분기):
//   - 비로그인 → unauthorized
//   - confirmation 미매칭 → invalid_confirmation
//   - DB delete 실패 → db_failed (auth user 는 살아 있음)
//   - DB delete 성공 + Supabase admin 실패 → partial_success (DB 는 삭제됐고 auth 만 살아있음,
//     호출 측은 성공으로 처리하되 메시지로 안내)
//
// 분석 이벤트: account_deleted (DB delete 직전에 발송 — DB row 가 사라지면 분석 백엔드 join 불가).
//   R4: userId 는 server-side 텔레메트리 백엔드 자동 해시 가정.
//
// CON-04: 본 파일의 모든 메시지 / 주석에 "치료/진단/장애" 금칙어 0건.

import { withActor } from "@/lib/db/with-actor";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** 계정 삭제 확인 텍스트 — 정확 매칭 (공백 / 대소문자 / 자모 분리 모두 reject). */
export const ACCOUNT_DELETE_CONFIRMATION_TEXT = "계정을 삭제합니다";

/** Server Action 입력 — confirmation 텍스트만. user id 는 auth 에서. */
export interface DeleteAccountInput {
  /** 사용자가 입력한 확인 텍스트 — ACCOUNT_DELETE_CONFIRMATION_TEXT 와 정확 매칭 필요. */
  confirmation: string;
}

/** Server Action 결과 — graceful (throw 없음). */
export type DeleteAccountResult =
  | {
      success: true;
      userId: string;
      role: string | null;
      /** Supabase auth user 삭제까지 성공했는지. false 면 DB 만 삭제 (호출 측 안내). */
      authUserDeleted: boolean;
      /** 분석 이벤트 발송용 메타 — Client Component 가 trackEvent 호출 시 사용. */
      analytics: {
        userId: string;
        role: string;
      };
    }
  | {
      success: false;
      reason:
        | "unauthorized"
        | "invalid_confirmation"
        | "db_failed"
        | "user_not_found";
      message: string;
    };

/**
 * 계정 삭제 — /settings/account 의 AccountDeleteButton 이 confirmation 검증 후 호출.
 *
 * 비가역 작업:
 *   - User row + cascade 대상 모델 row 들 일괄 삭제.
 *   - Supabase auth user 도 삭제 시도 (admin SDK 부재 시 graceful skip).
 *
 * RBAC: Supabase auth uid 만 본인 row 삭제 — 외부 인자로 받은 user id 절대 사용 X.
 */
export async function deleteAccount(
  input: DeleteAccountInput,
): Promise<DeleteAccountResult> {
  // 1) confirmation 텍스트 정확 매칭 — auth 검증보다 _먼저_ 차단 (CSRF + 실수 방어).
  const confirmation =
    typeof input?.confirmation === "string" ? input.confirmation : "";
  if (confirmation !== ACCOUNT_DELETE_CONFIRMATION_TEXT) {
    return {
      success: false,
      reason: "invalid_confirmation",
      message: `정확한 확인 문구를 입력해 주세요: "${ACCOUNT_DELETE_CONFIRMATION_TEXT}"`,
    };
  }

  // 2) auth — 비로그인 차단.
  let userId: string;
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
    userId = data.user.id;
  } catch {
    return {
      success: false,
      reason: "unauthorized",
      message: "로그인 상태를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 3) User row 사전 조회 — role + 존재 여부 (분석 이벤트 / 멱등 분기).
  //    이미 삭제된 user 재호출 → user_not_found (graceful, throw X).
  let role: string | null = null;
  try {
    const { prisma } = await import("@/lib/db");
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!row) {
      // 멱등 — DB 에 user row 부재 (이미 삭제 또는 외부 auth-only). auth user 만 정리 시도.
      let authUserDeleted = false;
      try {
        const admin = getSupabaseAdmin();
        if (admin) {
          const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
          authUserDeleted = !deleteErr;
        } else {
          console.warn(
            `[delete-account] Supabase admin SDK 미설정 — auth user ${userId} 삭제 skip.`,
          );
        }
      } catch (err) {
        console.error("[delete-account] auth user 삭제 예외 (user_not_found 분기)", err);
      }
      return {
        success: true,
        userId,
        role: null,
        authUserDeleted,
        analytics: { userId, role: "unknown" },
      };
    }
    role = row.role;
  } catch (err) {
    console.error("[delete-account] user findUnique 실패", err);
    return {
      success: false,
      reason: "db_failed",
      message: "계정 삭제 준비에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 4) DB delete — withActor (audit_trigger_fn actor_id 캡처 후 본인 row 삭제).
  //    Prisma onDelete: Cascade 가 자식 row 들 자동 삭제 (SessionLog / EvaluationResult /
  //    WeeklyReport / RewardLog / RewardProgress / HITLQueue subject / OfflineEntry subject).
  try {
    await withActor(userId, async (tx) => {
      await tx.user.delete({ where: { id: userId } });
    });
  } catch (err) {
    console.error("[delete-account] user delete 실패", err);
    return {
      success: false,
      reason: "db_failed",
      message: "계정 삭제 처리에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 5) Supabase admin SDK — auth user 삭제 시도 (부재 시 graceful skip).
  //    DB delete 성공 후 auth 실패는 partial — 본 PR 정책은 success: true + authUserDeleted: false.
  let authUserDeleted = false;
  try {
    const admin = getSupabaseAdmin();
    if (admin) {
      const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
      if (deleteErr) {
        console.warn(
          `[delete-account] Supabase admin auth user 삭제 실패 — DB 는 삭제됨. userId=${userId} error=${deleteErr.message}`,
        );
      } else {
        authUserDeleted = true;
      }
    } else {
      console.warn(
        `[delete-account] Supabase admin SDK 미설정 — auth user ${userId} 삭제 skip (DB 는 삭제 완료).`,
      );
    }
  } catch (err) {
    // graceful — admin 호출 자체 예외 시에도 DB 는 이미 삭제됨.
    console.error("[delete-account] Supabase admin auth user 삭제 예외", err);
  }

  return {
    success: true,
    userId,
    role,
    authUserDeleted,
    analytics: {
      userId,
      role: role ?? "unknown",
    },
  };
}

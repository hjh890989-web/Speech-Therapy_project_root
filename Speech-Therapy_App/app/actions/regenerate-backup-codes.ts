"use server";

// FR-C-SECURITY (MFA 마무리) — Backup codes 재생성 Server Action.
//
// 흐름:
//   1) Supabase auth.getUser → user.id 확인 (비로그인 차단).
//   2) auth.mfa.listFactors() → verified TOTP factor 존재 확인 (미등록 사용자는 차단).
//   3) generateBackupCodes() → 새 8개 평문 codes.
//   4) storeBackupCodes(userId, codes) → 기존 hash 전부 무효화 + 새 hash 저장.
//   5) 평문 codes 응답에 포함 → UI 가 1회 표시 (사용자 메모).
//
// RBAC (R4):
//   - 외부 user id 입력 없음 — auth.uid 만.
//   - 본인 totpBackupCodes 만 수정 (storeBackupCodes 가 withActor 로 audit 캡처).
//
// 분석 이벤트:
//   - 호출 측 UI 가 success 직후 'totp_backup_codes_regenerated' 1회 발송.
//   - 본 Action 은 analytics.userId 메타만 제공.
//
// 보안:
//   - 재생성 자체는 _재인증 요구 없음_ — 이미 AAL1+ 세션 안에서 호출됨 (path 보호).
//     강한 재인증은 후속 PR (TOTP 재입력 강제) — 본 PR 은 enroll 직후 분실 케이스 우선.
//
// CON-04: 모든 메시지에 "치료/진단/장애" 금칙어 0건.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { generateBackupCodes } from "@/lib/security/backup-codes";
import { storeBackupCodes } from "@/lib/security/backup-codes-store";

// FR-PERF-3-USE-SERVER-REFACTOR — non-async exports 는 ./regenerate-backup-codes-shape 으로 분리.
import type { RegenerateBackupCodesResult } from "./regenerate-backup-codes-shape";

/**
 * Backup codes 재생성 — /settings/security 의 BackupCodesPanel "재생성" 버튼에서 호출.
 *
 * 정책:
 *   - 기존 hash 전부 무효화 (사용자 분실 시 복구 path).
 *   - TOTP 미등록 사용자는 차단 (backup codes 는 TOTP 부속 — 단독 활성화 불가).
 */
export async function regenerateBackupCodes(): Promise<RegenerateBackupCodesResult> {
  // 1) auth — 비로그인 차단.
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

  // 2) listFactors — verified TOTP factor 필수.
  try {
    const listResp = await supabase.auth.mfa.listFactors();
    if (listResp.error) {
      console.warn(
        `[regenerate-backup-codes] listFactors 실패 — userId=${userId} message=${listResp.error.message}`,
      );
      return {
        success: false,
        reason: "supabase_error",
        message:
          "백업 코드 재생성에 실패했어요. 잠시 후 다시 시도해 주세요.",
        analytics: { userId },
      };
    }
    const totpList =
      (listResp.data as { totp?: Array<{ status?: string }> } | null)?.totp ??
      [];
    const hasVerified = totpList.some((f) => f?.status === "verified");
    if (!hasVerified) {
      return {
        success: false,
        reason: "not_enrolled",
        message:
          "2단계 인증이 활성화되어 있지 않아요. 먼저 인증 앱을 등록해 주세요.",
        analytics: { userId },
      };
    }
  } catch (err) {
    console.error("[regenerate-backup-codes] listFactors 예외", err);
    return {
      success: false,
      reason: "supabase_error",
      message: "백업 코드 재생성에 실패했어요. 잠시 후 다시 시도해 주세요.",
      analytics: { userId },
    };
  }

  // 3) 새 8개 생성 + DB 교체 (기존 hash 무효화).
  const backupCodes = generateBackupCodes();
  try {
    await storeBackupCodes(userId, backupCodes);
  } catch (err) {
    console.error("[regenerate-backup-codes] storeBackupCodes 실패", err);
    return {
      success: false,
      reason: "supabase_error",
      message: "백업 코드 저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
      analytics: { userId },
    };
  }

  return {
    success: true,
    backupCodes,
    analytics: { userId },
  };
}

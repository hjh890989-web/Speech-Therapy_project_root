"use server";

// SEC-COMP-PIPA (Grill #3A A1+A2) — PIPA 동의 일시 저장 Server Action.
//
// 흐름:
//   1) Supabase auth.getUser() 로 본인 user.id 확보 — 비인증이면 graceful 실패.
//   2) 입력 두 boolean 모두 true 확인 — 하나라도 false 면 "both_required" 반환 (UI 에서 안내).
//   3) withActor(userId, tx => tx.user.update({
//        pipaUnderageConsentAt: new Date(),
//        overseasTransferConsentAt: new Date(),
//      })). AuditLog 에 동의 일시 기록.
//
// 멱등:
//   - 이미 동의한 user 가 재호출 → 새 timestamp 로 갱신 (success: true).
//   - 부작용 0 — 정책은 NULL vs not-NULL 만 보므로 timestamp 갱신은 무영향.
//
// R4 (자녀 보호):
//   - 본 Action 은 자녀 식별 정보 0건 — 본인 user.id 의 timestamp 만 갱신.
//
// CON-04: 의료 단정 표현 금칙어 0건.

import { revalidatePath } from "next/cache";
import { withActor } from "@/lib/db/with-actor";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// FR-PERF-3-USE-SERVER-REFACTOR — non-async exports 는 ./privacy-consent-shape 으로 분리.
import type {
  SavePrivacyConsentInput,
  SavePrivacyConsentResult,
} from "./privacy-consent-shape";

/**
 * PIPA 14세 미만 + 국외 이전 동의 일시를 사용자 row 에 저장.
 *
 * 정책:
 *   - 두 동의 모두 필수 (둘 중 하나라도 false → 실패).
 *   - 인증된 본인 row 만 수정 (다른 user.id 변경 차단).
 *   - 실패 시에도 throw 없이 graceful boolean 반환.
 *
 * 호출 측:
 *   - /settings/privacy-consent 페이지의 폼 submit.
 *   - 향후 onboarding wizard 의 동의 step (별도 PR 예정).
 */
export async function savePrivacyConsent(
  input: SavePrivacyConsentInput,
): Promise<SavePrivacyConsentResult> {
  // 1) 두 동의 모두 체크 여부 확인 — 클라이언트 측 가드 우회 차단.
  if (!input.pipaUnderage || !input.overseasTransfer) {
    return { success: false, reason: "both_required" };
  }

  // 2) auth — 비인증 시 graceful 실패.
  let userId: string;
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) {
      return { success: false, reason: "unauthorized" };
    }
    userId = data.user.id;
  } catch {
    return { success: false, reason: "unauthorized" };
  }

  // 3) DB update — withActor 로 audit actor 캡처.
  const now = new Date();
  try {
    await withActor(userId, async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          pipaUnderageConsentAt: now,
          overseasTransferConsentAt: now,
        },
      });
    });
  } catch {
    return { success: false, reason: "db_failed" };
  }

  // 4) 설정 페이지 캐시 무효화 — 다음 진입 시 동의 상태 fresh 반영.
  revalidatePath("/settings/privacy-consent");
  revalidatePath("/settings");

  return { success: true };
}

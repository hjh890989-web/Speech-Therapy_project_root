"use server";

// FR-C-PARENT-ONBOARDING (follow-up) — onboarding 완료 DB 동기화 Server Action.
//
// 흐름:
//   1) Supabase auth.getUser() 로 본인 user.id 확보 — 비인증이면 { success: false }.
//   2) withActor(userId, tx => tx.user.update({ onboardingCompletedAt: new Date() })).
//      withActor (DB-011) 가 audit_trigger_fn 의 actor_id 캡처 → AuditLog 에서
//      _누가_ 완료 마킹했는지 식별 가능.
//   3) 모든 분기 graceful — throw 없이 boolean 결과 반환.
//
// localStorage 동시 마킹:
//   - 본 Action 은 server-side 만 — client 측 markOnboardingCompleted() 와 별개.
//   - 호출 측 (OnboardingWizardClient) 가 양쪽 동시 호출 → DB 실패해도 localStorage 마킹
//     은 진행 (해당 device 의 즉시 UX 보존). 다음 device 진입 시 layout redirect 가 다시
//     wizard 노출 → DB 마킹 재시도.
//
// 멱등:
//   - 이미 onboardingCompletedAt 가 set 된 user 재호출 → 새 timestamp 로 갱신 (success: true).
//   - 부작용 0 — wizard 노출 분기는 NULL vs not-NULL 만 보므로 timestamp 갱신은 UX 무영향.
//
// R4 (자녀 보호):
//   - 본 Action 은 자녀 식별 정보 0건 — 단순 timestamp 만 갱신.
//   - 본인 user.id 만 수정 (다른 user 변경 차단).
//
// CON-04: 본 Action 의 메시지 / 주석에 의료 단정 금칙어 0건.

import { withActor } from "@/lib/db/with-actor";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Server Action 결과 — 호출 측이 graceful 분기. */
export interface MarkOnboardingCompletedResult {
  /** true: DB 동기화 성공. false: 비인증 / DB 오류 등 graceful 실패. */
  success: boolean;
  /** 실패 사유 (디버깅/분석용). 성공 시 undefined. */
  reason?: "unauthorized" | "db_failed";
}

/**
 * 서버 측 onboarding 완료 마킹 — wizard Step 4 완료 시 호출.
 *
 * 호출 정책:
 *   - client 측 markOnboardingCompleted() (localStorage) 직후 호출 권장.
 *   - 결과 graceful — 실패해도 호출 측 UX 흐름 차단 X.
 *
 * RBAC:
 *   - Supabase auth uid 만 본인 User row 수정.
 *   - 다른 user.id 변경 시도 차단 (본 Action 은 인증된 본인 id 만 사용).
 */
export async function markOnboardingCompletedInDb(): Promise<MarkOnboardingCompletedResult> {
  // 1) auth — 비인증이면 graceful 실패.
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

  // 2) DB update — withActor 로 audit actor 캡처.
  try {
    await withActor(userId, async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { onboardingCompletedAt: new Date() },
      });
    });
  } catch {
    return { success: false, reason: "db_failed" };
  }

  return { success: true };
}

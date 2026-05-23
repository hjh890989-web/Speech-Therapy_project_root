// FR-C-PARENT-ONBOARDING (follow-up) — 서버 측 onboarding 완료 상태 조회.
//
// 책임:
//   1) Supabase auth.getUser() 로 인증 user.id 확인 — 비인증이면 null.
//   2) prisma.user.findUnique 로 onboardingCompletedAt 조회 — 존재 여부 boolean 반환.
//   3) 모든 분기 graceful — auth 오류 / DB 오류 / env 미설정 → null (인증 상태 미확정 취급).
//
// localStorage vs DB 정책:
//   - localStorage 는 단일 디바이스/브라우저의 즉시 UX 마킹 (client 측 snapshot).
//   - DB 는 canonical 진실원 — 다중 디바이스/브라우저에서 동일 user 의 동일 wizard 노출 여부 결정.
//   - 본 helper 는 서버 측 (RSC / Server Action) 에서만 사용 — localStorage 접근 X.
//
// 반환 시맨틱:
//   - null  : 비인증 또는 상태 미확정 (graceful) — 호출 측은 redirect 하지 않음.
//   - true  : 인증된 user 가 wizard 완료 (onboardingCompletedAt set).
//   - false : 인증된 user 가 wizard 미완료 (onboardingCompletedAt null).
//
// CON-04: 본 모듈의 주석에 의료 단정 금칙어 0건.

import { prisma } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 서버 측 onboarding 완료 여부 조회.
 *
 * @returns null  비인증 (또는 상태 조회 불가). 호출 측은 redirect 안 함.
 * @returns true  인증 user 가 onboardingCompletedAt set.
 * @returns false 인증 user 가 onboardingCompletedAt null (= 미완료).
 */
export async function hasCompletedOnboardingServerSide(): Promise<
  boolean | null
> {
  // 1) auth — 비인증이면 즉시 null.
  let userId: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) {
      return null;
    }
    userId = data.user.id;
  } catch {
    // env 누락 / 네트워크 오류 — 미확정 처리 (graceful).
    return null;
  }

  // 2) DB lookup — 본인 row 의 onboardingCompletedAt 만 조회 (cross-read 없음).
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompletedAt: true },
    });
    if (!row) {
      // User row 미존재 — provisioning 직전 상태. 미완료로 취급 (wizard 노출 허용).
      return false;
    }
    return row.onboardingCompletedAt !== null;
  } catch {
    // DB 일시 오류 — 미확정 처리. 호출 측이 redirect 하지 않음으로써 사용자 흐름 보존.
    return null;
  }
}

// SEC-COMP-PIPA (Grill #3A A1+A2) — 서버 측 PIPA 동의 상태 조회.
//
// 책임:
//   1) Supabase auth.getUser() 로 인증 user.id 확인 — 비인증이면 null.
//   2) prisma.user.findUnique 로 두 동의 일시 (pipaUnderageConsentAt, overseasTransferConsentAt) 조회.
//   3) 둘 다 not-NULL 일 때만 true. 하나라도 NULL 이면 false.
//   4) 모든 분기 graceful — auth 오류 / DB 오류 / env 미설정 → null (상태 미확정).
//
// 반환 시맨틱:
//   - null  : 비인증 또는 상태 미확정 (graceful) — 호출 측은 redirect 하지 않음.
//   - true  : 인증된 user 가 두 동의 모두 완료.
//   - false : 인증된 user 가 한 가지 이상 미동의 — redirect 대상.
//
// 호출 위치:
//   - (public)/layout.tsx 의 ConsentRedirectShim → ConsentRedirectGate 에 prop 주입.
//   - 향후 Server Action 진입 시 가드 helper 로도 재사용 가능 (analyzeDiagnosis 등).
//
// CON-04: 본 모듈의 주석에 의료 단정 금칙어 0건.

import { prisma } from "@/lib/db";
import { getCachedUser } from "@/lib/auth/cached-get-user";

/**
 * 서버 측 PIPA 두 동의 완료 여부 조회.
 *
 * @returns null  비인증 또는 상태 조회 불가. 호출 측은 redirect 안 함.
 * @returns true  인증 user 가 두 동의 모두 완료 (pipaUnderageConsentAt + overseasTransferConsentAt 둘 다 set).
 * @returns false 인증 user 가 한 가지 이상 미동의 — redirect 대상.
 */
export async function hasCompletedPrivacyConsentServerSide(): Promise<
  boolean | null
> {
  // 1) auth — 비인증이면 즉시 null.
  // Performance: getCachedUser (React cache()) — layout 의 다른 RSC (MainNav / OnboardingRedirectShim) 와 dedup.
  const user = await getCachedUser();
  if (!user) {
    return null;
  }
  const userId = user.id;

  // 2) DB lookup — 본인 row 만 (cross-read 없음).
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pipaUnderageConsentAt: true,
        overseasTransferConsentAt: true,
      },
    });
    if (!row) {
      // User row 미존재 — provisioning 직전 상태. 미동의로 취급 (redirect 허용).
      return false;
    }
    return row.pipaUnderageConsentAt !== null && row.overseasTransferConsentAt !== null;
  } catch {
    // DB 오류 — graceful null (redirect 차단).
    return null;
  }
}

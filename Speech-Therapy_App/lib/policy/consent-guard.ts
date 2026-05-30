// SEC-COMP-PIPA (Grill #3A) — Server Action 측 PIPA 동의 hard 가드.
//
// 책임:
//   - 인증된 user 의 두 동의 (pipaUnderageConsentAt + overseasTransferConsentAt) 가
//     모두 not-NULL 인지 server-side 에서 검증.
//   - 미동의 시 ConsentRequiredError throw — Server Action 호출 측이 잡아서 UI 안내.
//
// 익명 user 정책:
//   - 본 가드는 _인증 user 만_ cover (auth.getUser() === null 시 통과).
//   - 익명 진단의 PIPA §22-6 부모 동의는 별도 설계 (cookie 권위 흐름 통합 — 별도 PR).
//   - 가드 통과 ≠ 동의 완료 — 익명 진단은 cookie 권위 흐름 측에서 별도 검증.
//
// UI 가드 (ConsentRedirectGate) 와 보완:
//   - UI 가드: layout 진입 시 페이지 redirect (soft, 사용자 친화).
//   - 본 가드: Server Action 진입 시 hard error (UI 우회 / 직접 API 호출 차단).
//   - 두 가드 모두 적용하여 컴플라이언스 binding 확보.
//
// CON-04: 본 모듈의 메시지 / 주석에 의료 단정 금칙어 0건.

import { prisma } from "@/lib/db";
import { getCachedUser } from "@/lib/auth/cached-get-user";

/**
 * 인증 user 의 PIPA 동의 누락 시 throw. message 는 "PIPA_CONSENT_REQUIRED"
 * (안정 ID — client 에서 instanceof 또는 message 매칭으로 분기).
 */
export class ConsentRequiredError extends Error {
  readonly code = "PIPA_CONSENT_REQUIRED";
  constructor() {
    super("PIPA_CONSENT_REQUIRED");
    this.name = "ConsentRequiredError";
  }
}

/**
 * 현재 인증 user 의 PIPA 두 동의 (14세 미만 + 국외 이전) 모두 완료 여부 확인.
 * - 익명 user: 통과 (null 반환과 동일 — 호출 측은 별도 분기 불필요).
 * - 인증 user + DB row 미존재: 통과 (provisioning 직전, 안전 default).
 * - 인증 user + 한 가지 이상 미동의: throw ConsentRequiredError.
 *
 * 호출 위치: Server Action 의 입력 검증 직후, 본격 처리 직전.
 *
 * 멱등 / 부수효과 0:
 *   - DB SELECT 1 회 (React cache 없이 본 helper 자체적으로 매 호출 fetch — Server Action 은
 *     매 호출 새 request 라 cache 효과 미미).
 *   - 가드 통과 시 returns void, 가드 실패 시 throw — caller graceful 분기.
 */
/// 가드 옵션. failClosedOnDbError: 국외이전(§17) 직전 관문처럼 컴플라이언스가 binding 인 경로는
/// DB 일시 장애 시에도 *차단*(throw)해 미동의 데이터의 외부 전송을 막는다. 기본 false(graceful — 진단/F11).
export interface ConsentGuardOptions {
  failClosedOnDbError?: boolean;
}

export async function assertConsentedIfAuthenticated(
  options: ConsentGuardOptions = {},
): Promise<void> {
  // 1) 인증 user 확인 — getCachedUser 는 React cache() 기반이지만 Server Action 호출당
  //    request 가 새로 시작되므로 cache miss 가 정상.
  const user = await getCachedUser();
  if (!user) {
    return; // 익명 — 본 가드 scope 외.
  }

  // 2) 두 동의 일시 조회.
  let row: { pipaUnderageConsentAt: Date | null; overseasTransferConsentAt: Date | null } | null;
  try {
    row = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        pipaUnderageConsentAt: true,
        overseasTransferConsentAt: true,
      },
    });
  } catch {
    // DB 일시 장애. 기본은 graceful 통과(사용자 흐름 보존 — 진단/F11). 단 binding 경로(국외이전 직전)는
    // fail-closed: 동의 확인 불가 상태에서 미동의 데이터가 외부로 나가지 않도록 차단(적대적 검증 high).
    if (options.failClosedOnDbError) throw new ConsentRequiredError();
    return;
  }
  if (!row) {
    // User row 미존재 — provisioning 직전. 가드 통과 (안전 default).
    return;
  }

  // 3) 둘 다 not-NULL 이어야 통과.
  if (
    row.pipaUnderageConsentAt === null ||
    row.overseasTransferConsentAt === null
  ) {
    throw new ConsentRequiredError();
  }
}

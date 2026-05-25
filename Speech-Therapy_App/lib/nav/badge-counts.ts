// FR-NAV-BADGE — MainNav 의 role 별 미처리 항목 카운트 helper.
//
// 책임:
//   - admin/principal/teacher/expert 의 "HITL 큐" 메뉴에 미처리 (pending + in_review)
//     건수를 dot/badge 로 노출하기 위한 read-only 집계.
//   - Server Component (`components/nav/MainNav.tsx`) 에서만 호출 — client bundle 0.
//
// React cache():
//   - 동일 request 안에서 layout/page 가 동일 인자로 본 helper 를 N 회 호출해도
//     실제 Prisma count 쿼리는 1회만 실행. fetchCurrentNavRole + 본 helper 는 별도
//     cache key 라 병렬 실행 시 서로 영향 없음.
//
// graceful:
//   - 실패 (DB 장애 / 권한 거부 / institutionId 누락) 시 모두 0 반환. nav 차단 금지.
//
// role 매트릭스:
//   - admin     : 전체 HITLQueue pending+in_review 카운트 (institution 무관)
//   - principal : 본인 institutionId 의 HITLQueue (HITLQueue.user.institutionId == 본인)
//   - teacher   : 동일 (institution scope) — Teacher portal 노출용
//   - expert    : assignedExpertId == userId 인 HITLQueue 만 (본인 담당 큐)
//   - parent    : HITL 카운트 0 (메뉴 자체 미노출 — 호환을 위해 0)
//   - anonymous : 0 (호출 가드)
//
// missionPendingToday (선택):
//   - 본 PR 은 HITL 카운트만 노출 — missionPendingToday 는 항상 0 으로 보존.
//   - 후속 PR 에서 parent role 의 "미션 도전" 메뉴 badge 로 확장 예정.

import { cache } from "react";

import { prisma } from "@/lib/db";

/// 메뉴 badge 카운트 결과. 0 인 필드는 UI 에서 미노출.
export interface NavBadgeCounts {
  /// admin/principal/teacher/expert 메뉴 "HITL 큐" 옆 badge.
  hitlPending: number;
  /// (선택) parent 의 "미션 도전" 메뉴 badge — 본 PR 미사용 (항상 0).
  missionPendingToday: number;
}

/// HITLQueue 의 미처리 status — admin.ts ACTIVE_HITL_STATUSES 와 동일 의미.
/// (admin.ts 와 import 순환 방지 위해 본 파일에 별도 상수 보존 — 값/순서 일치.)
const HITL_PENDING_STATUSES = ["pending", "in_review"] as const;

export interface NavBadgeCountsInput {
  /// MainNavRole 의 superset — string 으로 받아 unknown role 도 graceful 처리.
  role: string;
  /// principal/teacher 의 institution scope. parent/admin/expert/anonymous 는 null 가능.
  institutionId: string | null;
  /// expert 의 assignedExpertId 매칭용. expert 외 role 은 null 가능.
  userId: string | null;
}

/**
 * MainNav role 별 미처리 badge 카운트.
 *
 * - React `cache()` 로 동일 request 안 N 회 호출 → 1회 query.
 * - 모든 실패는 graceful → 0 반환.
 *
 * @example
 *   const counts = await getNavBadgeCounts({ role: "admin", institutionId: null, userId: "u-1" });
 *   // → { hitlPending: 3, missionPendingToday: 0 }
 */
export const getNavBadgeCounts = cache(
  async (input: NavBadgeCountsInput): Promise<NavBadgeCounts> => {
    const empty: NavBadgeCounts = { hitlPending: 0, missionPendingToday: 0 };
    const { role, institutionId, userId } = input;

    // anonymous / parent 는 HITL 메뉴 자체가 없음 → 0 (안전 가드).
    if (role === "anonymous" || role === "parent") {
      return empty;
    }

    try {
      let hitlPending = 0;
      if (role === "admin") {
        // admin: 전체 미처리 카운트 (institution 무관).
        hitlPending = await prisma.hITLQueue.count({
          where: { status: { in: [...HITL_PENDING_STATUSES] } },
        });
      } else if (role === "principal" || role === "teacher") {
        // principal/teacher: 본인 institution 의 HITL 만.
        if (!institutionId) return empty;
        hitlPending = await prisma.hITLQueue.count({
          where: {
            status: { in: [...HITL_PENDING_STATUSES] },
            user: { institutionId },
          },
        });
      } else if (role === "expert") {
        // expert: 본인이 담당으로 할당된 HITL 만.
        if (!userId) return empty;
        hitlPending = await prisma.hITLQueue.count({
          where: {
            status: { in: [...HITL_PENDING_STATUSES] },
            assignedExpertId: userId,
          },
        });
      } else {
        // unknown role — 안전 fallback.
        return empty;
      }

      return { hitlPending, missionPendingToday: 0 };
    } catch (err) {
      // graceful: DB 장애 / 권한 거부 → 0 (nav 차단 금지).
      console.error("[FR-NAV-BADGE] getNavBadgeCounts 실패 (graceful):", err);
      return empty;
    }
  },
);

/**
 * 동일 request 안에서 institutionId 조회 캐시 wrapper.
 *
 * `getCachedUserRoleResult` 는 role 만 select — 본 helper 는 nav badge 산출에
 * 필요한 institutionId 만 추가 select. select 칼럼이 다르므로 별도 cache key 로 운용.
 *
 * - 비인증 / row 없음 / 에러 → null (graceful).
 */
export const getCachedUserInstitutionId = cache(
  async (userId: string | null): Promise<string | null> => {
    if (!userId) return null;
    try {
      const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { institutionId: true },
      });
      return row?.institutionId ?? null;
    } catch (err) {
      console.error(
        "[FR-NAV-BADGE] getCachedUserInstitutionId 실패 (graceful):",
        err,
      );
      return null;
    }
  },
);

// FR-NAV-BADGE — MainNav 의 role 별 미처리 항목 카운트 helper.
//
// 책임:
//   - admin/principal/teacher/expert 의 "HITL 큐" 메뉴에 미처리 (pending + in_review)
//     건수를 dot/badge 로 노출하기 위한 read-only 집계.
//   - parent 의 "미션 도전" 메뉴에 "오늘 미완료" SessionLog 건수를 dot/badge 로 노출.
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
//   - admin     : 전체 HITLQueue pending+in_review 카운트 (institution 무관) + missionPendingToday=0 + weeklyReportUnread=0
//   - principal : 본인 institutionId 의 HITLQueue (HITLQueue.user.institutionId == 본인) + missionPendingToday=0 + weeklyReportUnread=0
//   - teacher   : 동일 (institution scope) — Teacher portal 노출용 + missionPendingToday=0 + weeklyReportUnread=0
//   - expert    : assignedExpertId == userId 인 HITLQueue 만 (본인 담당 큐) + missionPendingToday=0 + weeklyReportUnread=0
//   - parent    : HITL 카운트 0 + missionPendingToday = 본인 (R4) 오늘 미완료 SessionLog 카운트 + weeklyReportUnread = 본인 (R4) viewedAt IS NULL 카운트
//   - anonymous : 0 (호출 가드)
//
// missionPendingToday 정의 (parent 전용):
//   - "오늘" = KST 자정 ~ 현재. `lib/timeline/tz.ts::kstStartOfDay(new Date())` 사용.
//   - "미완료" = SessionLog 중 missionId != null AND startTime >= todayKstStart AND durationSec <= 0.
//   - 근거: lib/analytics/funnel.ts 의 mission_completed 정의 (`durationSec > 0`) 의 부정 — schema 상
//     별도 status 컬럼 부재로 인한 근사. 시작했지만 진행 0초인 mission session = "시작했지만 완료 안 된"
//     상태로 해석. funnel.ts 와 동일 schema 가정을 공유하여 향후 MissionSession 모델 도입 시 일괄 갱신.
//   - R4: parent 본인 userId 만 조회 (cross-read 금지) — auth.id 기준.
//
// weeklyReportUnread 정의 (parent 전용):
//   - WeeklyReport 중 userId == 본인 AND viewedAt IS NULL 카운트.
//   - 의미: cron 으로 생성된 새 주간 리뷰가 있는데 부모가 /weekly-review 페이지를 아직 안 봄.
//   - retention: 북극성 KPI W-AUR 의 핵심 surface — 미열람 dot 으로 nudge.
//   - cap: 표시 목적이므로 정확한 카운트는 불필요하나, 자연스럽게 1~N 노출.
//   - R4: 본인 userId 만 (cross-read 금지).

import { cache } from "react";

import { prisma } from "@/lib/db";
import { kstStartOfDay } from "@/lib/timeline/tz";

/// 메뉴 badge 카운트 결과. 0 인 필드는 UI 에서 미노출.
export interface NavBadgeCounts {
  /// admin/principal/teacher/expert 메뉴 "HITL 큐" 옆 badge.
  hitlPending: number;
  /// parent 의 "미션 도전" 메뉴 badge — 오늘 KST 자정 이후 시작된 SessionLog 중
  /// durationSec <= 0 인 (시작했지만 완료 안 된) 본인 미션 카운트. parent 외 role 0.
  missionPendingToday: number;
  /// parent 의 "우리 아이 주간 리뷰" 메뉴 badge — viewedAt IS NULL 인 본인 WeeklyReport 카운트.
  /// 의미: cron 으로 생성된 새 주간 리뷰가 있는데 부모가 페이지를 아직 안 봄. parent 외 role 0.
  weeklyReportUnread: number;
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
 * - parent 는 본인 (R4) "오늘 미완료 미션" 카운트 — KST 자정 기준.
 *
 * @example
 *   const counts = await getNavBadgeCounts({ role: "admin", institutionId: null, userId: "u-1" });
 *   // → { hitlPending: 3, missionPendingToday: 0 }
 *
 * @example
 *   const counts = await getNavBadgeCounts({ role: "parent", institutionId: null, userId: "p-1" });
 *   // → { hitlPending: 0, missionPendingToday: 2 }  // 오늘 시작했지만 durationSec=0 인 미션 2건
 */
export const getNavBadgeCounts = cache(
  async (input: NavBadgeCountsInput): Promise<NavBadgeCounts> => {
    const empty: NavBadgeCounts = {
      hitlPending: 0,
      missionPendingToday: 0,
      weeklyReportUnread: 0,
    };
    const { role, institutionId, userId } = input;

    // anonymous: 인증 안 됨 → 0 (안전 가드).
    if (role === "anonymous") {
      return empty;
    }

    // parent: "오늘 미완료 미션" + "미열람 주간 리뷰" 카운트 (HITL 메뉴 미노출).
    if (role === "parent") {
      if (!userId) return empty;
      const [missionPendingToday, weeklyReportUnread] = await Promise.all([
        countMissionPendingToday(userId).catch((err) => {
          console.error(
            "[FR-NAV-BADGE] missionPendingToday(parent) 실패 (graceful):",
            err,
          );
          return 0;
        }),
        countWeeklyReportUnread(userId).catch((err) => {
          console.error(
            "[FR-NAV-BADGE] weeklyReportUnread(parent) 실패 (graceful):",
            err,
          );
          return 0;
        }),
      ]);
      return {
        hitlPending: 0,
        missionPendingToday,
        weeklyReportUnread,
      };
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

      return { hitlPending, missionPendingToday: 0, weeklyReportUnread: 0 };
    } catch (err) {
      // graceful: DB 장애 / 권한 거부 → 0 (nav 차단 금지).
      console.error("[FR-NAV-BADGE] getNavBadgeCounts 실패 (graceful):", err);
      return empty;
    }
  },
);

/**
 * parent 의 "오늘 미완료 미션" 카운트 산출.
 *
 * 정의 (옵션 A — 시작했지만 완료 안 됨):
 *   - missionId != null (진단 세션 제외)
 *   - startTime >= kstStartOfDay(now) (KST 자정 기준 — UTC 보정 자동)
 *   - durationSec <= 0 (funnel.ts 의 `completed = durationSec > 0` 부정)
 *
 * R4: 본인 userId 만. 호출 측 (getNavBadgeCounts) 에서 auth.id 전달 책임.
 *
 * @internal helper — getNavBadgeCounts 의 parent 분기 내부에서만 호출.
 */
async function countMissionPendingToday(userId: string): Promise<number> {
  const todayStart = kstStartOfDay(new Date());
  return prisma.sessionLog.count({
    where: {
      userId,
      missionId: { not: null },
      startTime: { gte: todayStart },
      durationSec: { lte: 0 },
    },
  });
}

/**
 * parent 의 "미열람 주간 리뷰" 카운트 산출 (FR-WEEKLY-UNREAD).
 *
 * 정의:
 *   - WeeklyReport 중 userId == 본인 AND viewedAt IS NULL.
 *   - 의미: cron 으로 생성된 새 row 가 있는데 부모가 /weekly-review 페이지를 안 열어 봄.
 *
 * UPDATE 시점:
 *   - 부모가 /weekly-review 페이지를 열면 latest.viewedAt 가 now() 로 update (page 책임).
 *   - 다음 주 cron 으로 새 row 생성 시 default NULL → 다시 badge 노출.
 *
 * R4: 본인 userId 만. 호출 측 (getNavBadgeCounts) 에서 auth.id 전달 책임.
 *
 * @internal helper — getNavBadgeCounts 의 parent 분기 내부에서만 호출.
 */
async function countWeeklyReportUnread(userId: string): Promise<number> {
  return prisma.weeklyReport.count({
    where: {
      userId,
      viewedAt: null,
    },
  });
}

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

// FR-C-REENGAGE-BANNER — "오늘 시작했지만 미완료"인 미션 id 산출 (resume 딥링크 타깃).
//
// 정의 (lib/nav/badge-counts.countMissionPendingToday 의 WHERE 와 정합 + 완료 suppression):
//   - missionId != null (진단 세션 제외)
//   - startTime >= kstStartOfDay(now)  (KST 자정 기준)
//   - durationSec <= 0  (funnel 의 completed = durationSec>0 의 부정 — 시작했지만 미완료)
//   - 단, *같은 미션을 오늘 이미 완료(durationSec>0)* 했다면 제외.
//     → resume 완료가 기존 pending row 를 UPDATE 하지 않고 새 row 를 INSERT 하므로
//        (mission.ts), suppression 없으면 완료 후에도 pending row 가 남아 배너가 잔존한다.
//        '오늘 완료한 missionId 집합'을 빼서 잔존/재완료 유도를 차단한다.
//
// 설계 원칙(streak.ts 동일): raw SessionLog 불변, *display 파생*만. 완료 동선 미관여.
// R4: 본인 userId 만. graceful — DB 장애 시 undefined(배너 미표시, 페이지 차단 0).

import { prisma } from "@/lib/db";
import { kstStartOfDay } from "@/lib/timeline/tz";

/// pending 조회 상한 — 하루 시작 미션이 이보다 많을 일은 사실상 없음(무한 조회 방지).
const PENDING_SCAN_LIMIT = 20;

/**
 * 본인(R4) "오늘 시작·미완료(오늘 완료 안 한)" 미션 중 가장 최근 1건의 missionId. 없으면 undefined.
 *
 * now 주입 가능(테스트 결정성).
 */
export async function getResumableMission(
  userId: string,
  now: Date = new Date(),
): Promise<string | undefined> {
  try {
    const todayStart = kstStartOfDay(now);

    // 오늘 완료한 미션 id 집합 (suppression 기준).
    const completedToday = await prisma.sessionLog.findMany({
      where: {
        userId,
        missionId: { not: null },
        startTime: { gte: todayStart },
        durationSec: { gt: 0 },
      },
      select: { missionId: true },
    });
    const completedIds = new Set(
      completedToday
        .map((r) => r.missionId)
        .filter((id): id is string => id !== null),
    );

    // 오늘 시작·미완료 미션(최신순) — 완료된 것 제외하고 첫 번째.
    const pending = await prisma.sessionLog.findMany({
      where: {
        userId,
        missionId: { not: null },
        startTime: { gte: todayStart },
        durationSec: { lte: 0 },
      },
      select: { missionId: true },
      orderBy: { startTime: "desc" },
      take: PENDING_SCAN_LIMIT,
    });

    for (const row of pending) {
      if (row.missionId && !completedIds.has(row.missionId)) {
        return row.missionId;
      }
    }
    return undefined;
  } catch (err) {
    console.error("[FR-C-REENGAGE-BANNER] getResumableMission 실패(graceful):", err);
    return undefined;
  }
}

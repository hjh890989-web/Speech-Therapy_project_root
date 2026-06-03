// 북극성 KPI W-AUR(주간 미션 완수율) owner 추세 — 라이브 집계(영속 스냅샷 X).
//
// 배경(funnel-bottleneck-readiness 감사, 2026-06-03):
//   per-user WeeklyReport 는 있으나 owner 가 읽을 *집단 W-AUR rate* 표면이 없었다
//   ("persisted-but-unread"). 본 모듈은 /admin/waur 가 매 조회 시 호출하는 라이브 집계.
//   과거 주의 raw(SessionLog/EvaluationResult)는 안정적이라 라이브 재계산 = 스냅샷과 동일.
//
// W-AUR 정의(FR-C-WAUR-SWITCH 정합):
//   - 분자(achievedUsers) = 그 주 미션 완료 ≥ W_AUR_MIN_MISSIONS(4) 인 distinct 사용자.
//     미션 완료 = SessionLog(missionId!=null AND durationSec>0). (per-user wAurAchieved 와 동일 기준.)
//   - 분모(activeUsers) = 그 주 *활성* distinct 사용자 = 진단(EvaluationResult) ∪ 미션완료(SessionLog).
//     ⚠️ cron 의 getActiveUsers(진단 게이팅)와 달리 **미션전용 유저 포함** — 북극성 분모로 더 정확.
//   - rate = achievedUsers / activeUsers (분모 0 → 0). achievedUsers ⊆ activeUsers 이므로 rate ≤ 1.
//
// 주 윈도우 = weekBounds(KST). 현재(진행중) 주는 제외(직전 주부터). graceful(실패 시 0).
// R4: userId 만 사용(distinct 카운트), 자녀 식별 정보 0건.

import { prisma } from "@/lib/db";
import { W_AUR_MIN_MISSIONS } from "@/lib/reports/weekly-aggregator";
import {
  getCurrentWeekNumber,
  previousWeek,
  weekBounds,
} from "@/lib/weekly-report";

/// 북극성 목표 — W-AUR ≥ 60% (PRD §1).
export const W_AUR_TARGET_RATE = 0.6;

export interface WaurWeek {
  year: number;
  week: number;
  /// 그 주 활성 distinct 사용자(진단 ∪ 미션완료) — 분모.
  activeUsers: number;
  /// 미션 ≥4회 완료 distinct 사용자 — 분자.
  achievedUsers: number;
  /// achievedUsers / activeUsers (0~1).
  rate: number;
}

/**
 * 단일 (year, week) 의 W-AUR 라이브 집계. graceful — 실패 시 0 채움.
 */
export async function computeWaurForWeek(
  year: number,
  week: number,
): Promise<WaurWeek> {
  try {
    const { start, end } = weekBounds(year, week);

    // 분자 — 미션 ≥4회 완료한 distinct 사용자(groupBy userId + having count>=4).
    const achievedGroups = await prisma.sessionLog.groupBy({
      by: ["userId"],
      where: {
        missionId: { not: null },
        durationSec: { gt: 0 },
        startTime: { gte: start, lt: end },
      },
      _count: { _all: true },
      having: { userId: { _count: { gte: W_AUR_MIN_MISSIONS } } },
    });
    const achievedUsers = achievedGroups.length;

    // 분모 — 활성 distinct 사용자(진단 ∪ 미션완료).
    const [diagUsers, missionUsers] = await Promise.all([
      prisma.evaluationResult.findMany({
        where: { createdAt: { gte: start, lt: end } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.sessionLog.findMany({
        where: {
          missionId: { not: null },
          durationSec: { gt: 0 },
          startTime: { gte: start, lt: end },
        },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);
    const active = new Set<string>();
    for (const r of diagUsers) active.add(r.userId);
    for (const r of missionUsers) active.add(r.userId);
    const activeUsers = active.size;

    const rate = activeUsers > 0 ? achievedUsers / activeUsers : 0;
    return { year, week, activeUsers, achievedUsers, rate };
  } catch (err) {
    console.error("[W-AUR] computeWaurForWeek 실패(graceful):", year, week, err);
    return { year, week, activeUsers: 0, achievedUsers: 0, rate: 0 };
  }
}

/**
 * 최근 `weeks` 주(현재 진행중 주 제외, 직전 주부터 과거로)의 W-AUR 추세.
 * 반환 순서 = 최신 → 과거. now 주입 가능(테스트 결정성).
 */
export async function getRecentWaurTrend(
  now: Date = new Date(),
  weeks = 12,
): Promise<WaurWeek[]> {
  const current = getCurrentWeekNumber(now);
  const targets: { year: number; week: number }[] = [];
  let cursor = previousWeek(current.year, current.week);
  for (let i = 0; i < weeks; i++) {
    targets.push(cursor);
    cursor = previousWeek(cursor.year, cursor.week);
  }
  return Promise.all(targets.map((t) => computeWaurForWeek(t.year, t.week)));
}

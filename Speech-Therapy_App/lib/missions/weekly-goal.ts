// FR-C-WEEKLY-MISSION-GOAL — 이번 주 미션 진행도(라이브 W-AUR 목표 시각화).
//
// 북극성 KPI W-AUR(주 N회 미션 완료)을 부모에게 "이번 주 X/N" 게이지로 실시간 노출 →
// 목표 지향 주간 재방문 유도. cron 생성 weekly-report(과거 주)와 달리 *현재 주 라이브* 집계.
//
// 단일 소스 재사용: countWeeklyMissionCompletions + W_AUR_MIN_MISSIONS(weekly-aggregator) +
//   getCurrentWeekNumber(weekly-report) — W-AUR 정의와 항상 정합(FR-C-WAUR-SWITCH).
//
// display 파생만(raw SessionLog 불변). graceful — DB 장애 시 0/goal(페이지 차단 0).

import {
  countWeeklyMissionCompletions,
  W_AUR_MIN_MISSIONS,
} from "@/lib/reports/weekly-aggregator";
import { getCurrentWeekNumber } from "@/lib/weekly-report";

export interface WeeklyMissionGoal {
  /// 이번 주(KST ISO 주차) 미션 완료수.
  completed: number;
  /// 목표(W_AUR_MIN_MISSIONS).
  goal: number;
  /// 목표까지 남은 횟수(0 이상).
  remaining: number;
  /// completed >= goal.
  achieved: boolean;
}

/**
 * 본인(R4) 이번 주 미션 목표 진행도. 호출 측(missions 페이지)에서 resolveUserId 후 전달.
 * now 주입 가능(테스트 결정성).
 */
export async function getWeeklyMissionGoal(
  userId: string,
  now: Date = new Date(),
): Promise<WeeklyMissionGoal> {
  const goal = W_AUR_MIN_MISSIONS;
  try {
    const { year, week } = getCurrentWeekNumber(now);
    const completed = await countWeeklyMissionCompletions(userId, year, week);
    return {
      completed,
      goal,
      remaining: Math.max(0, goal - completed),
      achieved: completed >= goal,
    };
  } catch (err) {
    console.error("[FR-C-WEEKLY-MISSION-GOAL] getWeeklyMissionGoal 실패(graceful):", err);
    return { completed: 0, goal, remaining: goal, achieved: false };
  }
}

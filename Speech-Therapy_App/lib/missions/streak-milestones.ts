// FR-C-STREAK-MILESTONE — 연속 활동 마일스톤 정의(공유, 순수).
//
// 서버(app/actions/mission.ts: 보너스 적립) + 클라이언트/페이지(missions: '다음 보너스까지 D일'
// 카피, MissionRunner: 연출)가 동일 정의를 참조하도록 단일 소스로 분리. Prisma 의존 0.
//
// 보너스 별 수는 RewardInputSchema.amount.max(10) 준수(각 ≤10). 멱등키는 milestone 만 포함해
// 평생 1회(파밍 차단) — 적립 로직은 mission.ts.

export const STREAK_MILESTONES = [3, 7, 14, 30] as const;

/// 마일스톤별 보너스 별 수(escalating, ≤10).
export const STREAK_MILESTONE_BONUS: Record<number, number> = {
  3: 2,
  7: 3,
  14: 5,
  30: 10,
};

/// 이 마일스톤 이상부터 나무 1 성장 동반(incrementTreeGrowth).
export const STREAK_TREE_MIN_MILESTONE = 7;

/**
 * current 연속일 기준 *다음* 마일스톤까지 남은 일수. 이미 최고(30+) 도달이면 null.
 * (display 전용 — 적립 판정은 mission.ts 가 streak.current 정확 일치로 수행.)
 */
export function nextStreakMilestone(
  current: number,
): { milestone: number; daysLeft: number } | null {
  for (const m of STREAK_MILESTONES) {
    if (current < m) return { milestone: m, daysLeft: m - current };
  }
  return null;
}

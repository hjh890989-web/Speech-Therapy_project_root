// FR-Q-LIT (CR-2026-009 / Phase 4) — 주간 리포트 '문해력 활동' 축 집계 (순수 함수).
//
// 책임: 한 주의 LiteracyResult 를 부모 리포트용 **활동량 요약**으로 집계.
//   - rawScore 의미가 놀이마다 다름(정답수·완료시간 ms·완료 1 등) → 교차 합산은 무의미.
//     따라서 정확도 합산이 아니라 **engagement**(총 횟수·활동일·단계별·놀이별 분포)만 집계한다.
//   - 결정적 순수 함수 — prisma 호출은 로더(weekly-review-loader)가 담당.
//
// 임상 안전(연습-only): 점수 등급/판정/임상밴드 미산출 — 활동 빈도 표시만. raw 불변.
// CON-04: 본 모듈은 라벨을 만들지 않는다(카드가 registry/stages 라벨 매핑) — 금칙어 노출 0.

import { LITERACY_STAGES } from "@/lib/literacy/stages";

/// 집계 입력 행 (LiteracyResult 의 부분 — 활동량에 필요한 필드만).
export interface LiteracyWeeklyRow {
  stage: string;
  gameSlug: string;
  createdAt: Date;
}

export interface LiteracyWeeklySummary {
  /// 이번 주 완료한 문해력 놀이 총 횟수.
  totalSessions: number;
  /// 활동한 날 수(서로 다른 날짜).
  activeDays: number;
  /// 단계별 횟수 (count>0 인 단계만, stages.ts 순서 S0→S4).
  byStage: Array<{ stage: string; count: number }>;
  /// 놀이별 횟수 (count desc, 동률은 slug 사전순 — 결정적).
  byGame: Array<{ gameSlug: string; count: number }>;
}

const STAGE_ORDER: readonly string[] = LITERACY_STAGES.map((s) => s.id);

/// 한 주 LiteracyResult 행 → 활동량 요약. 0건이면 null (카드 미렌더 트리거).
export function aggregateLiteracyWeekly(
  rows: readonly LiteracyWeeklyRow[],
): LiteracyWeeklySummary | null {
  if (rows.length === 0) return null;

  const stageCounts = new Map<string, number>();
  const gameCounts = new Map<string, number>();
  const days = new Set<string>();

  for (const r of rows) {
    stageCounts.set(r.stage, (stageCounts.get(r.stage) ?? 0) + 1);
    gameCounts.set(r.gameSlug, (gameCounts.get(r.gameSlug) ?? 0) + 1);
    // 활동일 — createdAt 의 ISO 날짜(YYYY-MM-DD). (활동량 근사 — TZ 보정은 추후.)
    days.add(r.createdAt.toISOString().slice(0, 10));
  }

  const byStage = STAGE_ORDER.filter((s) => stageCounts.has(s)).map((stage) => ({
    stage,
    count: stageCounts.get(stage) as number,
  }));

  const byGame = [...gameCounts.entries()]
    .map(([gameSlug, count]) => ({ gameSlug, count }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.gameSlug.localeCompare(b.gameSlug)));

  return {
    totalSessions: rows.length,
    activeDays: days.size,
    byStage,
    byGame,
  };
}

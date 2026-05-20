// DB-007 §AC — 주간 리포트 집계 + ISO 주차 계산.
// FR-C-010 (Vercel Cron 배치) + FR-Q-005 (그래프 UI) 가 본 모듈을 호출.

import { z } from "zod";
import { prisma } from "@/lib/db";

// ----- ScoreTrend JSON 스키마 (Zod) -----
export const ScoreTrendEntrySchema = z.object({
  /// ISO 8601 day (예: 2026-05-12).
  date: z.string(),
  phoneme: z.string(),
  articulation: z.number().min(0).max(100),
  linguistic: z.number().min(0).max(100),
  acoustic: z.number().min(0).max(100),
  peerPercentile: z.number().min(0).max(100),
});
export const ScoreTrendSchema = z.array(ScoreTrendEntrySchema);
export type ScoreTrend = z.infer<typeof ScoreTrendSchema>;

// ----- ISO 8601 주차 계산 -----
/// 주어진 Date 의 ISO 8601 주차 번호를 반환 (1~53).
/// ISO 8601: 월요일이 한 주의 시작, 1월 4일이 포함된 주가 1주차.
export function getCurrentWeekNumber(date: Date = new Date()): { year: number; week: number } {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { year: target.getUTCFullYear(), week };
}

// ----- 주간 집계 -----
/// 사용자의 (year, week) 주의 evaluation_results 를 집계.
/// 0건이면 null 반환 (REQ-FUNC-029, FR-Q-006 의 긍정 메시지 분기 트리거).
export async function aggregateWeeklyScores(
  userId: string,
  year: number,
  week: number
): Promise<{
  scoreTrend: ScoreTrend;
  articulationAvg: number;
  linguisticAvg: number;
  acousticAvg: number;
  peerPercentileAvg: number;
  sessionCount: number;
} | null> {
  const { start, end } = weekBounds(year, week);

  const results = await prisma.evaluationResult.findMany({
    where: {
      userId,
      createdAt: { gte: start, lt: end },
    },
    orderBy: { createdAt: "asc" },
  });

  if (results.length === 0) return null;

  const scoreTrend: ScoreTrend = results.map((r) => ({
    date: r.createdAt.toISOString().slice(0, 10),
    phoneme: r.targetPhoneme,
    articulation: r.articulationScore,
    linguistic: r.linguisticScore,
    acoustic: r.acousticScore,
    peerPercentile: r.peerPercentile,
  }));

  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  return {
    scoreTrend,
    articulationAvg: avg(results.map((r) => r.articulationScore)),
    linguisticAvg: avg(results.map((r) => r.linguisticScore)),
    acousticAvg: avg(results.map((r) => r.acousticScore)),
    peerPercentileAvg: avg(results.map((r) => r.peerPercentile)),
    sessionCount: results.length,
  };
}

// ----- FR-Q-006 데이터 충분성 평가 -----
//
// REQ-FUNC-029: 데이터 부족 시 긍정 메시지 분기.
// 단순화 모드 — 임계값 옵션화로 추후 조정 용이.

export type DataSufficiency = "full" | "partial" | "insufficient";
export type EmptyVariant = "new_user" | "week_empty" | "long_absent";

export interface SufficiencyInput {
  /// 본 주 evaluation_results 건수.
  weekSessionCount: number;
  /// 가장 최근 evaluation_result 까지 경과일 (null = 평생 0건).
  lastSessionDaysAgo: number | null;
  /// 평생 총 evaluation_results 건수 (직전 주 데이터 존재 판단용).
  lifetimeSessionCount: number;
}

export interface SufficiencyResult {
  sufficiency: DataSufficiency;
  /// sufficiency='insufficient' 시 EmptyState 분기 키.
  emptyVariant?: EmptyVariant;
}

export interface AssessSufficiencyOptions {
  /// 충분 임계 (이 이상이면 full). 기본 5.
  fullThreshold?: number;
  /// 부분 임계 (이 이상이면 partial). 기본 2.
  partialThreshold?: number;
  /// 장기 미접속 임계 일수. 기본 21 (3주).
  longAbsenceDays?: number;
}

/**
 * 주간 리포트 데이터 충분성 + EmptyState 분기 키 결정.
 * insufficient 분기 우선순위:
 *   1. lifetimeSessionCount === 0 → new_user
 *   2. lastSessionDaysAgo ≥ longAbsenceDays → long_absent
 *   3. 그 외 → week_empty (직전 주 등 이전 데이터 있음)
 */
export function assessDataSufficiency(
  input: SufficiencyInput,
  options: AssessSufficiencyOptions = {},
): SufficiencyResult {
  const { fullThreshold = 5, partialThreshold = 2, longAbsenceDays = 21 } = options;
  const { weekSessionCount, lastSessionDaysAgo, lifetimeSessionCount } = input;

  if (weekSessionCount >= fullThreshold) return { sufficiency: "full" };
  if (weekSessionCount >= partialThreshold) return { sufficiency: "partial" };

  // insufficient — 3-분기 EmptyState 결정.
  if (lifetimeSessionCount === 0) return { sufficiency: "insufficient", emptyVariant: "new_user" };
  if (lastSessionDaysAgo !== null && lastSessionDaysAgo >= longAbsenceDays) {
    return { sufficiency: "insufficient", emptyVariant: "long_absent" };
  }
  return { sufficiency: "insufficient", emptyVariant: "week_empty" };
}

// ----- 내부: ISO 주차의 UTC 시작/끝 시각 -----
function weekBounds(year: number, week: number) {
  // ISO 8601: 1월 4일이 1주차에 포함.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return { start, end };
}

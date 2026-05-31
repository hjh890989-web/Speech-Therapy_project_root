// DB-007 §AC — 주간 리포트 집계 + ISO 주차 계산.
// FR-C-010 (Vercel Cron 배치) + FR-Q-005 (그래프 UI) 가 본 모듈을 호출.
//
// TZ 통일 (9f204cd 후속):
//   ISO 주차 계산 입력 Date 의 "달력 일자" 가 KST 기준으로 산출되도록 변환.
//   기존: 입력 Date 의 UTC 일자 사용 → KST 일요일 00:00~08:59 구간에서
//        UTC 로는 토요일 → 직전 주차로 잘못 분류 가능.
//   변경 후: 입력 Date 를 KST wall-clock 으로 옮긴 후 그 일자 기반 ISO 주차 산출.

import { z } from "zod";
import { prisma } from "@/lib/db";
import { toKst } from "@/lib/timeline/tz";

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

// ----- ISO 8601 주차 계산 (KST 기준) -----
/// 주어진 Date 의 ISO 8601 주차 번호를 반환 (1~53).
/// ISO 8601: 월요일이 한 주의 시작, 1월 4일이 포함된 주가 1주차.
///
/// TZ: 입력 Date 의 "달력 일자" 는 KST 기준으로 산출 — Korea 사용자가 보는 주차와 동일.
///   - 예: UTC 2026-05-23T22:00:00 = KST 2026-05-24T07:00 → KST 일요일 → 다음 주차.
///   - 기존 (UTC 기준) 로는 토요일 → 직전 주차로 잘못 분류됨.
export function getCurrentWeekNumber(date: Date = new Date()): { year: number; week: number } {
  // KST wall-clock 으로 변환 — toKst 반환 Date 의 UTC 메서드는 KST 시각을 반환.
  const kst = toKst(date);
  const target = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
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

  // Performance 감사 1차 — `select` 명시화 (이전엔 모든 컬럼 fetch).
  //   제외 컬럼: id / sessionId / confidence / hitlReviewed / aiCushionText (큰 텍스트)
  //   / acousticFeatures (JSON) / childAgeMonths — 본 집계에서 미사용.
  //   기존 row.targetPhoneme / scores / peerPercentile / createdAt 만 필요.
  const results = await prisma.evaluationResult.findMany({
    where: {
      userId,
      createdAt: { gte: start, lt: end },
    },
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true,
      targetPhoneme: true,
      articulationScore: true,
      linguisticScore: true,
      acousticScore: true,
      peerPercentile: true,
    },
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

// ----- FR-Q-005 Scenario 4 — week-over-week 변동 -----
//
// REQ-FUNC-027 보조: 직전 주 종합 평균 (3축 평균의 평균) 과 이번 주 평균을 비교.
// 본 함수는 순수 함수 — prisma 호출은 호출 측에서 두 주 aggregate 후 본 함수에 위임.
// 직전 주 0건 (= null) 이면 delta=null (UI 는 "—" 또는 비교 카드 미노출).

export interface WeekAverages {
  articulationAvg: number;
  linguisticAvg: number;
  acousticAvg: number;
}

/**
 * 두 주 평균 점수 차이 계산.
 * - 평균 산출: 3축 평균 (articulation + linguistic + acoustic) / 3 — 종합 점수.
 * - 정수 반올림으로 UI 표시 친화.
 * - 직전 주가 null 이면 null 반환 (비교 불가).
 */
export function computeWeekOverWeekDelta(
  current: WeekAverages,
  previous: WeekAverages | null,
): number | null {
  if (previous === null) return null;
  const currentAvg = (current.articulationAvg + current.linguisticAvg + current.acousticAvg) / 3;
  const previousAvg =
    (previous.articulationAvg + previous.linguisticAvg + previous.acousticAvg) / 3;
  return Math.round(currentAvg - previousAvg);
}

/// 직전 ISO 주차 계산 (week=1 이면 (year-1, 52 또는 53)).
/// 단순화: 항상 52 를 반환하고 호출 측에서 비어 있으면 null 처리 — week 53 인 해도 데이터 0건이면 null 로 분기.
export function previousWeek(year: number, week: number): { year: number; week: number } {
  if (week <= 1) return { year: year - 1, week: 52 };
  return { year, week: week - 1 };
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

// ----- 내부: ISO 주차의 KST 기준 시작/끝 instant (UTC Date) -----
//
// TZ 통일 (9f204cd 후속):
//   주차 boundary 는 KST 월요일 00:00 = UTC 일요일 15:00.
//   기존 (UTC 월요일 00:00) 은 KST 사용자의 주차 인지와 9시간 어긋남.
//   본 함수 호출 측 (aggregateWeeklyScores) 은 결과를 prisma.where.createdAt.gte/lt 로 사용 —
//   `createdAt` 은 UTC instant 이므로 반환 Date 도 instant 단위로 -9h 보정.
export function weekBounds(year: number, week: number) {
  // ISO 8601: 1월 4일이 1주차에 포함 (year, week 의 "year" 는 KST 기준 ISO year).
  // KST wall-clock 의 1월 4일 자정을 가리키는 instant = UTC 1월 3일 15:00.
  // 단순화: UTC 1월 4일 자정 기준으로 주차 계산 후 마지막에 -9h.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  // KST 기준 wall-clock 자정 → UTC instant 로는 -9h.
  // 즉, start = "KST 월요일 00:00" = UTC 일요일 15:00.
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  return {
    start: new Date(start.getTime() - KST_OFFSET_MS),
    end: new Date(end.getTime() - KST_OFFSET_MS),
  };
}

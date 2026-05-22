// FR-C-010 (#33) — 주간 리포트 집계 / W-AUR / 멱등 upsert 공개 표면.
//
// 본 모듈은 두 가지 책임을 분리해 cron route 를 thin wrapper 로 유지한다:
//   1) 직전 주 활성 사용자 식별 (getActiveUsers)
//   2) 사용자별 집계 + W-AUR 판정 + (mock) 예측 점수 (aggregateWeeklyReport)
//   3) 멱등 upsert (upsertWeeklyReport) — 수동 재실행 안전
//
// 기존 lib/weekly-report.ts 의 aggregateWeeklyScores / getCurrentWeekNumber / previousWeek
// 는 그대로 유지 (FR-Q-005/006 등 다수 호출자). 본 모듈은 그 위에 cron 도메인 의미를 추가.
//
// W-AUR 정의 (북극성 KPI):
//   - 본 PR (FR-C-010) 기준: "직전 주 evaluationResult sessionCount ≥ 4 (주 4회 이상 발화 세션 완료)"
//   - 임계값은 W_AUR_MIN_SESSIONS 상수로 노출 — 후속 조정 시 본 상수만 변경하면 cron + 단위 테스트 동시 갱신.
//   - 본 정의는 SRS REQ-FUNC-027 + PRD §1 (W-AUR ≥ 60%) 의 단순 환원.
//
// 예측 점수 (predictedNextScore):
//   - FR-C-011 (Gemini 회귀) 통합 전 placeholder.
//   - 본 모듈은 "직전 주 3축 평균의 평균 + 5" 라는 mock 공식만 제공.
//   - 후속 PR 에서 lib/ai/predict-next-score 등 실 회귀 모델로 교체 시 본 함수만 갱신.
//
// R4 (자녀 식별 정보 0): aggregateWeeklyReport 의 반환에는 userId / 집계 숫자만 포함.
// 이름·email·transcript 등 자녀 식별 정보는 절대 미포함.

import { prisma } from "@/lib/db";
import {
  aggregateWeeklyScores,
  type ScoreTrend,
} from "@/lib/weekly-report";
import { predictNextScore as predictNextScoreFromGemini } from "@/lib/predictions/gemini";

// ----- W-AUR 임계값 -----

/// W-AUR 충족 최소 sessionCount (주 N회 이상 발화 세션 완료).
/// 변경 시 cron + 단위 테스트가 본 상수로 동기 — 외부 문서 (PRD §1) 와 충돌 시 본 상수가 source of truth.
export const W_AUR_MIN_SESSIONS = 4;

// ----- 집계 결과 타입 -----

/**
 * 단일 사용자 1주 집계 결과.
 * - cron upsert 의 입력이자, 분석 이벤트 (`weekly_report_generated`) 의 properties source.
 * - aggregate 결과가 null (0 session) 인 경우 본 객체 자체가 null — 호출 측에서 skip.
 */
export interface WeeklyReportData {
  userId: string;
  year: number;
  weekNumber: number;
  scoreTrend: ScoreTrend;
  articulationAvg: number;
  linguisticAvg: number;
  acousticAvg: number;
  peerPercentileAvg: number;
  sessionCount: number;
  /// W-AUR 충족 (sessionCount >= W_AUR_MIN_SESSIONS) 여부 — 본 PR 정의.
  wAurAchieved: boolean;
  /// FR-C-011 통합 전 mock — "직전 주 3축 평균의 평균 + 5", 0~100 클램프.
  /// FR-C-011 통합 후 본 필드는 실 회귀 모델 결과로 교체.
  predictedNextScore: number | null;
}

// ----- 활성 사용자 식별 -----

/**
 * 주어진 [weekStart, weekEnd) 범위에 evaluationResult 가 1건 이상인 unique userId 반환.
 * cron 의 출발점 — 활동 0인 user 는 weeklyReport 자체를 생성하지 않는다 (DB 비용 절감 + EmptyState 분기).
 */
export async function getActiveUsers(
  weekStart: Date,
  weekEnd: Date,
): Promise<string[]> {
  const rows = await prisma.evaluationResult.findMany({
    where: { createdAt: { gte: weekStart, lt: weekEnd } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.map((r) => r.userId);
}

// ----- 핵심 집계 + W-AUR + mock 예측 -----

export interface AggregateInput {
  userId: string;
  year: number;
  weekNumber: number;
}

/**
 * 사용자 1명, 주 1회 집계.
 * - 0 session → null (호출 측에서 skip, FR-Q-006 의 긍정 메시지는 별도 RSC 분기 책임).
 * - wAurAchieved 는 sessionCount 기반 — W_AUR_MIN_SESSIONS 상수만 source of truth.
 * - predictedNextScore 는 FR-C-011 통합 후 lib/predictions/gemini.predictNextScore 사용
 *   (graceful — Gemini 실패 시 mock fallback 으로 항상 number 반환).
 *   * NODE_ENV === 'test' / GEMINI_DISABLED='1' 시 mock 만 사용 — 기존 prisma mock 보존.
 *   * prod 환경에선 직전 4주 weeklyReport 를 추가 조회하여 회귀 입력으로 사용.
 */
export async function aggregateWeeklyReport(
  input: AggregateInput,
): Promise<WeeklyReportData | null> {
  const { userId, year, weekNumber } = input;
  const agg = await aggregateWeeklyScores(userId, year, weekNumber);
  if (!agg) return null;

  const wAurAchieved = agg.sessionCount >= W_AUR_MIN_SESSIONS;

  // FR-C-011 — Gemini 회귀 예측 (graceful fallback). 테스트 / mock 환경에서는 weekHistory 조회 skip
  // 하여 기존 prisma.evaluationResult.findMany mock 시나리오와 충돌 회피.
  const weekHistory = await fetchWeekHistoryForPrediction(userId);
  const prediction = await predictNextScoreFromGemini({
    userId,
    // 현재 주 + 직전 주들 → Gemini 회귀 입력. 비어 있어도 graceful (mock fallback).
    weekHistory: [
      ...weekHistory,
      {
        weekNumber,
        articulationAvg: agg.articulationAvg,
        linguisticAvg: agg.linguisticAvg,
        acousticAvg: agg.acousticAvg,
        sessionCount: agg.sessionCount,
        wAurAchieved,
      },
    ],
  });
  const predictedNextScore = prediction.predicted;

  return {
    userId,
    year,
    weekNumber,
    scoreTrend: agg.scoreTrend,
    articulationAvg: agg.articulationAvg,
    linguisticAvg: agg.linguisticAvg,
    acousticAvg: agg.acousticAvg,
    peerPercentileAvg: agg.peerPercentileAvg,
    sessionCount: agg.sessionCount,
    wAurAchieved,
    predictedNextScore,
  };
}

/**
 * 직전 4주 weeklyReport 조회 — Gemini 회귀 입력용.
 * 테스트 환경 / GEMINI_DISABLED='1' / API key 미설정 시 빈 배열 반환 (Gemini 미호출 → 추가 DB 조회 절감).
 * R4: userId 만 사용, 자녀 식별 정보 0건.
 */
async function fetchWeekHistoryForPrediction(userId: string): Promise<
  Array<{
    weekNumber: number;
    articulationAvg: number;
    linguisticAvg: number;
    acousticAvg: number;
    sessionCount: number;
    wAurAchieved: boolean;
  }>
> {
  // 강제 mock 모드면 weekHistory 불필요 (mock 은 직전 주 평균만 사용).
  if (
    process.env.NODE_ENV === "test" ||
    process.env.GEMINI_DISABLED === "1" ||
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ) {
    return [];
  }
  try {
    const recents = await prisma.weeklyReport.findMany({
      where: { userId },
      orderBy: { generatedAt: "desc" },
      take: 4,
      select: {
        weekNumber: true,
        articulationAvg: true,
        linguisticAvg: true,
        acousticAvg: true,
        sessionCount: true,
      },
    });
    return recents.map((r) => ({
      weekNumber: r.weekNumber,
      articulationAvg: r.articulationAvg,
      linguisticAvg: r.linguisticAvg,
      acousticAvg: r.acousticAvg,
      sessionCount: r.sessionCount,
      wAurAchieved: r.sessionCount >= W_AUR_MIN_SESSIONS,
    }));
  } catch {
    return [];
  }
}

// ----- 멱등 upsert -----

/**
 * weeklyReport upsert — 멱등 (수동 재실행 안전).
 * - 복합 unique 키: (userId, year, weekNumber).
 * - generatedAt 은 update path 에서만 now() 로 갱신 (create 는 default).
 * - WeeklyReport 모델에 wAurAchieved 컬럼이 없으므로 본 함수는 sessionCount + predictedNextScore 만 DB 에 저장.
 *   wAurAchieved 는 aggregator 응답 / 분석 이벤트 / cron 응답에서만 노출 (derived).
 */
export async function upsertWeeklyReport(data: WeeklyReportData): Promise<void> {
  await prisma.weeklyReport.upsert({
    where: {
      userId_year_weekNumber: {
        userId: data.userId,
        year: data.year,
        weekNumber: data.weekNumber,
      },
    },
    create: {
      userId: data.userId,
      year: data.year,
      weekNumber: data.weekNumber,
      scoreTrend: data.scoreTrend,
      articulationAvg: data.articulationAvg,
      linguisticAvg: data.linguisticAvg,
      acousticAvg: data.acousticAvg,
      peerPercentileAvg: data.peerPercentileAvg,
      sessionCount: data.sessionCount,
      predictedNextScore: data.predictedNextScore,
    },
    update: {
      scoreTrend: data.scoreTrend,
      articulationAvg: data.articulationAvg,
      linguisticAvg: data.linguisticAvg,
      acousticAvg: data.acousticAvg,
      peerPercentileAvg: data.peerPercentileAvg,
      sessionCount: data.sessionCount,
      predictedNextScore: data.predictedNextScore,
      generatedAt: new Date(),
    },
  });
}

// ----- mock 예측 -----

export interface AxisAverages {
  articulationAvg: number;
  linguisticAvg: number;
  acousticAvg: number;
}

/**
 * FR-C-011 통합 전 mock — "3축 평균의 평균 + 5", 0~100 클램프.
 * - 회귀 모델 (Gemini) 통합 시 본 함수 호출부만 교체 (lib/ai/predict-next-score 등).
 * - 클램프 이유: 평균이 95 이상이면 +5 가 100 을 초과 → UI score bar 가 깨짐.
 */
export function computeMockPredictedScore(input: AxisAverages): number {
  const avg =
    (input.articulationAvg + input.linguisticAvg + input.acousticAvg) / 3;
  return Math.max(0, Math.min(100, Math.round((avg + 5) * 10) / 10));
}

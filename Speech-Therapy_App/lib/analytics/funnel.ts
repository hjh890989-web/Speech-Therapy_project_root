// MON-001 (#64) — 퍼널 CVR 집계 helper.
//
// 책임:
//   - landing → diagnose_started → diagnose_completed → mission_started → mission_completed → reward_granted
//     6단계 funnel 단계별 count + step / cumulative conversion 계산.
//   - 일일 기준 (UTC) 집계 — 단일 기간 (from~to) 의 단계별 누적 count.
//   - aggregateFunnelByDay() — 동일 로직을 일자별로 반복 호출 → 일간 변동 비교용 (cron alert).
//
// 데이터 소스 (옵션 A — 기존 도메인 테이블 역산):
//   - lib/analytics.ts 의 trackEvent 는 현재 console.debug stub 만 — 이벤트 저장 store 부재.
//   - 신규 AnalyticsEvent Prisma 모델 추가 (옵션 B) 는 trackEvent 통합 + 마이그레이션 + RLS 등
//     scope 폭발 → 본 PR 범위 밖.
//   - 옵션 A 는 기존 EvaluationResult / SessionLog / MissionCard / RewardLog / User 를 역산해
//     funnel KPI 를 도출. 인프라 변경 0, ground truth (실 DB 도메인 데이터) 기반.
//
// 단계 정의 + Prisma 매핑 (옵션 A):
//   - landing            ≈ EvaluationResult.userId distinct count (실 landing 이벤트 측정 불가능 시
//                          "진입했지만 진단 1회는 한 사용자" 의 대안 정의. distinct userId 기준).
//                          User.createdAt 카운트 (anonymous 포함) 도 후보였으나
//                          User 테이블이 인증 후에만 row 생성되어 funnel landing 정의로 부적합 (drop-off).
//   - diagnose_started   = EvaluationResult.createdAt 카운트 (현재 인프라엔 started/completed 미분리,
//                          단일 모델로 매핑 → started ≈ completed. 별도 PartialEvaluation 모델 도입
//                          후 분리 필요 — 본 PR 범위 밖).
//   - diagnose_completed = EvaluationResult.createdAt 카운트 (= started).
//   - mission_started    = SessionLog where missionId IS NOT NULL 카운트.
//   - mission_completed  = SessionLog where missionId IS NOT NULL AND durationSec > 0 카운트.
//                          (MissionSession 별도 모델 부재 → SessionLog 의 missionId + durationSec
//                          으로 완료 여부 근사. 향후 MissionCompletion 모델 도입 시 교체.)
//   - reward_granted     = RewardLog 카운트 (멱등성 보장된 발급 이력).
//
// R4 보호 (자녀 식별 정보 노출 금지):
//   - 본 함수의 모든 반환값은 집계 카운트 + 비율만. userId / sessionId / 이름 / email 0건.
//   - dashboard / cron alert 도 동일 정책 (호출 측 책임).
//
// CON-04 금칙어 ("치료" / "진단" / "장애"):
//   - 본 파일 내 변수 / 주석 / 상수 / 단계명 모두 "diagnose_" 영문만 사용 — 한글 금칙어 0건.
//
// 시간 처리:
//   - 모든 일자 비교는 UTC 기준 (Vercel cron 의 schedule 도 UTC).
//   - dateRange 의 from / to 는 inclusive 가 아닌 [from, to) — 명시적 half-open interval.
//     호출 측이 day boundary 를 신경쓰기 쉬움 (toDayStartUtc / addUtcDays 사용).

import { prisma } from "@/lib/db";

export type FunnelStepName =
  | "landing"
  | "diagnose_started"
  | "diagnose_completed"
  | "mission_started"
  | "mission_completed"
  | "reward_granted";

export interface FunnelStep {
  name: FunnelStepName;
  count: number;
  /// 직전 단계 대비 conversion (0~1). 첫 단계(landing) 는 null.
  conversionFromPrev: number | null;
  /// landing 대비 누적 conversion (0~1). landing 자체는 1 (count > 0 시).
  cumulativeConversion: number;
}

export interface FunnelSummary {
  /// YYYY-MM-DD (UTC). 단일 기간 집계 시엔 from 의 날짜로 표시.
  date: string;
  steps: FunnelStep[];
  /// landing 단계 count (편의용 alias — UI 카드 표시).
  totalUsers: number;
}

export const FUNNEL_STEP_ORDER: readonly FunnelStepName[] = [
  "landing",
  "diagnose_started",
  "diagnose_completed",
  "mission_started",
  "mission_completed",
  "reward_granted",
] as const;

/// YYYY-MM-DD (UTC) 포맷터. Intl.DateTimeFormat 의 UTC time zone 사용.
export function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/// UTC 자정 정렬 (date 부분만 보존).
export function toDayStartUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/// UTC 일 단위 가산.
export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

interface RawCounts {
  landingDistinctUsers: number;
  diagnoseStarted: number;
  diagnoseCompleted: number;
  missionStarted: number;
  missionCompleted: number;
  rewardGranted: number;
}

/// landing 정의 — distinct userId 카운트 (EvaluationResult 기준).
/// SessionLog 의 userId 도 후보였으나, EvaluationResult 가 funnel 의 "최소 1회 진단 진입" 을
/// 가장 정확히 표현 (mission-only session 은 funnel landing 정의 밖).
async function countLandingDistinctUsers(from: Date, to: Date): Promise<number> {
  const rows = await prisma.evaluationResult.findMany({
    where: { createdAt: { gte: from, lt: to } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.length;
}

async function countDiagnoseRows(from: Date, to: Date): Promise<number> {
  return prisma.evaluationResult.count({
    where: { createdAt: { gte: from, lt: to } },
  });
}

async function countMissionStarted(from: Date, to: Date): Promise<number> {
  return prisma.sessionLog.count({
    where: {
      missionId: { not: null },
      startTime: { gte: from, lt: to },
    },
  });
}

async function countMissionCompleted(from: Date, to: Date): Promise<number> {
  // durationSec > 0 → 실제 mission 진행 (시작 직후 abort 가 아닌 완수 근사).
  // 별도 status 컬럼 부재로 인한 근사 — 향후 MissionSession 모델 도입 시 status='completed' 직접 사용.
  return prisma.sessionLog.count({
    where: {
      missionId: { not: null },
      startTime: { gte: from, lt: to },
      durationSec: { gt: 0 },
    },
  });
}

async function countRewardGranted(from: Date, to: Date): Promise<number> {
  return prisma.rewardLog.count({
    where: { createdAt: { gte: from, lt: to } },
  });
}

async function fetchRawCounts(from: Date, to: Date): Promise<RawCounts> {
  const [landing, started, completed, mStart, mComplete, reward] = await Promise.all([
    countLandingDistinctUsers(from, to),
    countDiagnoseRows(from, to),
    countDiagnoseRows(from, to),
    countMissionStarted(from, to),
    countMissionCompleted(from, to),
    countRewardGranted(from, to),
  ]);
  return {
    landingDistinctUsers: landing,
    diagnoseStarted: started,
    diagnoseCompleted: completed,
    missionStarted: mStart,
    missionCompleted: mComplete,
    rewardGranted: reward,
  };
}

/// 0 나누기 보호 — denominator 0 시 0 반환 (conversion 정의 불가능 시 안전 default).
function safeRatio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

/// RawCounts → FunnelStep[] 변환 (순수 함수, 테스트 결정성).
export function buildSteps(raw: RawCounts): FunnelStep[] {
  const ordered: { name: FunnelStepName; count: number }[] = [
    { name: "landing", count: raw.landingDistinctUsers },
    { name: "diagnose_started", count: raw.diagnoseStarted },
    { name: "diagnose_completed", count: raw.diagnoseCompleted },
    { name: "mission_started", count: raw.missionStarted },
    { name: "mission_completed", count: raw.missionCompleted },
    { name: "reward_granted", count: raw.rewardGranted },
  ];

  const landingCount = ordered[0].count;
  const steps: FunnelStep[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const cur = ordered[i];
    const prev = i > 0 ? ordered[i - 1].count : null;
    const conversionFromPrev = prev === null ? null : safeRatio(cur.count, prev);
    const cumulativeConversion =
      i === 0 ? (landingCount > 0 ? 1 : 0) : safeRatio(cur.count, landingCount);
    steps.push({
      name: cur.name,
      count: cur.count,
      conversionFromPrev,
      cumulativeConversion,
    });
  }
  return steps;
}

/// MON-001 핵심 export — 단일 기간 funnel 집계.
///
/// dateRange:
///   - from: inclusive (UTC). 일자 boundary 정렬 권장 (toDayStartUtc).
///   - to:   exclusive (UTC). 7일 range 시 from + 7d.
///
/// 반환:
///   - date: from 의 YYYY-MM-DD (UTC). 다일 range 시 첫 날짜만 표기 (UI 호출 측이 별도 라벨 책임).
///   - steps: 6단계 FunnelStep 배열 (FUNNEL_STEP_ORDER 순서).
///   - totalUsers: landing 단계 count (편의용 alias).
export async function aggregateFunnel(dateRange: {
  from: Date;
  to: Date;
}): Promise<FunnelSummary> {
  const { from, to } = dateRange;
  const raw = await fetchRawCounts(from, to);
  const steps = buildSteps(raw);
  return {
    date: formatUtcDate(from),
    steps,
    totalUsers: raw.landingDistinctUsers,
  };
}

/// 일자별 funnel 집계 — 일간 변동 비교 + 다일 dashboard 차트용.
/// from~to (half-open) 사이의 모든 UTC 일자에 대해 aggregateFunnel 을 순차 호출.
export async function aggregateFunnelByDay(dateRange: {
  from: Date;
  to: Date;
}): Promise<FunnelSummary[]> {
  const startDay = toDayStartUtc(dateRange.from);
  const endDay = toDayStartUtc(dateRange.to);
  const results: FunnelSummary[] = [];
  let cursor = startDay;
  // 최대 안전 가드 — 1년 (365일) 초과 시 즉시 중단 (DB 폭주 방어).
  let guard = 0;
  while (cursor.getTime() < endDay.getTime() && guard < 365) {
    const next = addUtcDays(cursor, 1);
    const summary = await aggregateFunnel({ from: cursor, to: next });
    results.push(summary);
    cursor = next;
    guard += 1;
  }
  return results;
}

/// 두 FunnelSummary 의 단계별 conversion 변동 (Δ percent point) 계산.
/// 정의:
///   - baseline 의 단계 conversionFromPrev 와 target 의 conversionFromPrev 절대 차.
///   - landing 단계는 conversionFromPrev = null → 비교 제외.
///   - baseline conversionFromPrev = 0 (denominator 0 인 day) → 비교 불가 → null delta.
///
/// 반환 단위:
///   - deltaPp: percent point (예: 60% → 40% 일 때 -20).
///   - deltaRelative: 상대 변화율 (deltaPp / baseline * 100, baseline=0 시 null).
export interface StepDelta {
  name: FunnelStepName;
  baselineConversion: number | null;
  targetConversion: number | null;
  deltaPp: number | null;
  deltaRelative: number | null;
}

export function compareConversions(
  baseline: FunnelSummary,
  target: FunnelSummary,
): StepDelta[] {
  const deltas: StepDelta[] = [];
  const baselineByName = new Map(baseline.steps.map((s) => [s.name, s]));
  for (const step of target.steps) {
    const base = baselineByName.get(step.name);
    if (!base) {
      deltas.push({
        name: step.name,
        baselineConversion: null,
        targetConversion: step.conversionFromPrev,
        deltaPp: null,
        deltaRelative: null,
      });
      continue;
    }
    const b = base.conversionFromPrev;
    const t = step.conversionFromPrev;
    if (b === null || t === null) {
      deltas.push({
        name: step.name,
        baselineConversion: b,
        targetConversion: t,
        deltaPp: null,
        deltaRelative: null,
      });
      continue;
    }
    const deltaPp = (t - b) * 100;
    const deltaRelative = b > 0 ? (deltaPp / (b * 100)) * 100 : null;
    deltas.push({
      name: step.name,
      baselineConversion: b,
      targetConversion: t,
      deltaPp,
      deltaRelative,
    });
  }
  return deltas;
}

/// MON-001 — Alert 임계값:
///   - |deltaPp| > 20 (절대 percent point) OR
///   - |deltaRelative| > 20 (상대 % — baseline 대비 ±20%)
/// baseline 0 (deltaRelative=null) 인데 deltaPp > 20 만 만족해도 alert 발생.
export const FUNNEL_ALERT_THRESHOLD_PP = 20;
export const FUNNEL_ALERT_THRESHOLD_REL_PCT = 20;

export interface FunnelAlertItem {
  step: FunnelStepName;
  baselineConversion: number;
  targetConversion: number;
  deltaPp: number;
  deltaRelative: number | null;
  direction: "up" | "down";
}

/// 임계 초과 단계만 추출 (cron alert 의사결정).
export function pickAlertSteps(deltas: StepDelta[]): FunnelAlertItem[] {
  const items: FunnelAlertItem[] = [];
  for (const d of deltas) {
    if (d.deltaPp === null || d.baselineConversion === null || d.targetConversion === null) {
      continue;
    }
    const absPp = Math.abs(d.deltaPp);
    const absRel = d.deltaRelative === null ? 0 : Math.abs(d.deltaRelative);
    const triggered =
      absPp > FUNNEL_ALERT_THRESHOLD_PP || absRel > FUNNEL_ALERT_THRESHOLD_REL_PCT;
    if (!triggered) continue;
    items.push({
      step: d.name,
      baselineConversion: d.baselineConversion,
      targetConversion: d.targetConversion,
      deltaPp: d.deltaPp,
      deltaRelative: d.deltaRelative,
      direction: d.deltaPp >= 0 ? "up" : "down",
    });
  }
  return items;
}

/// 사용자 친화적 단계명 (UI / Slack 본문 공통).
export const FUNNEL_STEP_LABEL: Record<FunnelStepName, string> = {
  landing: "유입",
  diagnose_started: "발음 확인 시작",
  diagnose_completed: "발음 확인 완료",
  mission_started: "미션 시작",
  mission_completed: "미션 완료",
  reward_granted: "보상 발급",
};

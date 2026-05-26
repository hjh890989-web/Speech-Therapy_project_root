// MON-001 (#64) — funnel shape + 순수 helper (CLIENT-SAFE).
//
// 본 모듈은 _순수 데이터 형/상수/순수 함수_ 만 보유 — Prisma 호출 0건. Client Component
// (FunnelChartImpl / FunnelDailyChart) 에서 직접 import 안전.
//
// 분리 사유 (Performance 3차 — preference / offline-entry shape 분리와 동일 패턴):
//   - 이전엔 `lib/analytics/funnel.ts` 가 Prisma 호출 (aggregate*) 과 순수 helper /
//     상수 / 타입을 모두 한 파일에 둠.
//   - Client Component (FunnelChartImpl) 가 그 파일에서 상수 + 타입만 import 해도
//     ESM 그래프상 prisma 까지 transitively client bundle 로 끌려와 Turbopack chunking
//     failure (`node:module` 외부 모듈 오류) 발생.
//   - shape 만 분리하여 client 측은 본 파일만 import → prisma 비의존.
//
// CON-04: 본 파일의 모든 주석 / 상수에 "치료/진단/장애" 금칙어 0건 — diagnose_ 영문만.

import {
  formatKstDate as formatKstDateCanonical,
  toDayStartKst as toDayStartKstCanonical,
  addKstDays as addKstDaysCanonical,
} from "@/lib/timeline/tz";

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
/// Backwards-compat — 신규 호출자는 KST 그루핑이면 `formatKstDate` 사용.
export function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/// YYYY-MM-DD (KST) 포맷터 — 본 instant 의 KST 일자 wall-clock.
/// FR-TZ-UNIFY-EXTEND: 본 함수는 `lib/timeline/tz.ts::formatKstDate` 의 thin re-export.
/// 신규 호출자는 `@/lib/timeline/tz` 직접 import 권장 (단일 진실).
export function formatKstDate(date: Date): string {
  return formatKstDateCanonical(date);
}

/// UTC 자정 정렬 (date 부분만 보존).
/// Backwards-compat — 신규 호출자는 KST 그루핑이면 `toDayStartKst` 사용.
export function toDayStartUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/// KST 자정 정렬 — `kstStartOfDay` 의 funnel 도메인 alias.
/// 반환 Date 는 "KST 일자의 자정" instant (UTC 로는 전날 15:00).
/// FR-TZ-UNIFY-EXTEND: 본 함수는 `lib/timeline/tz.ts::toDayStartKst` 의 thin re-export.
export function toDayStartKst(date: Date): Date {
  return toDayStartKstCanonical(date);
}

/// UTC 일 단위 가산.
/// Backwards-compat — 신규 호출자는 KST 그루핑이면 `addKstDays` 사용.
export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/// KST 일 단위 가산 — Korea DST 없음으로 24h * days 단순 가산.
/// 반환 instant 는 `date` 의 KST wall-clock 에서 `days` 만큼 더한 시각.
/// FR-TZ-UNIFY-EXTEND: 본 함수는 `lib/timeline/tz.ts::addKstDays` 의 thin re-export.
export function addKstDays(date: Date, days: number): Date {
  return addKstDaysCanonical(date, days);
}

export interface RawCounts {
  landingDistinctUsers: number;
  diagnoseStarted: number;
  diagnoseCompleted: number;
  missionStarted: number;
  missionCompleted: number;
  rewardGranted: number;
}

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

/// 캐시 tag — funnel-alert cron 또는 신규 분석 ingestion 시 invalidate.
export const FUNNEL_CACHE_TAG = "funnel:aggregate";

/// unstable_cache TTL — 퍼널 KPI 는 분/시간 단위 모니터링 충분 (5분 stale 허용).
export const FUNNEL_CACHE_TTL_SECONDS = 300;

/// 단계별 conversion 변동을 비교한 결과 (StepDelta).
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
    if (
      d.deltaPp === null ||
      d.baselineConversion === null ||
      d.targetConversion === null
    ) {
      continue;
    }
    const absPp = Math.abs(d.deltaPp);
    const absRel = d.deltaRelative === null ? 0 : Math.abs(d.deltaRelative);
    const triggered =
      absPp > FUNNEL_ALERT_THRESHOLD_PP ||
      absRel > FUNNEL_ALERT_THRESHOLD_REL_PCT;
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

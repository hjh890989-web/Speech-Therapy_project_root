// MON-001 (#64) — lib/analytics/funnel.ts 단위 테스트 (Prisma mock).
//
// 검증 시나리오 (총 11 케이스):
//   1. aggregateFunnel — 정상 6단계 카운트 + conversion 비율 정합
//   2. buildSteps — landing > 0 시 cumulativeConversion 정합 (각 단계 / landing)
//   3. buildSteps — landing = 0 시 모든 cumulativeConversion = 0 (safe divide)
//   4. buildSteps — denominator 0 (이전 단계 = 0, 현재 단계 > 0) → conversionFromPrev = 0
//   5. compareConversions — baseline 60% / target 40% → deltaPp = -20, direction down
//   6. compareConversions — baseline conversionFromPrev = null (landing step) → delta null
//   7. compareConversions — baseline conversionFromPrev = 0 → deltaRelative = null
//   8. pickAlertSteps — |Δpp| > 20 만족 → triggered
//   9. pickAlertSteps — |Δpp| ≤ 20 && |Δrel| ≤ 20 → skip
//  10. pickAlertSteps — |Δrel| > 20 만족 (작은 절대값이지만 상대 변화 큼) → triggered
//  11. aggregateFunnelByDay — 3일 range → 3개 FunnelSummary, 각 일자별 from~to UTC 정합

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// AnalyticsEvent 재연결 후 — 6단계 모두 distinct userId(findMany + distinct).
const analyticsFindManyMock = vi.fn();
const evalFindManyMock = vi.fn();
const sessionLogFindManyMock = vi.fn();
const rewardLogFindManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    analyticsEvent: {
      findMany: (...args: unknown[]) => analyticsFindManyMock(...args),
    },
    evaluationResult: {
      findMany: (...args: unknown[]) => evalFindManyMock(...args),
    },
    sessionLog: {
      findMany: (...args: unknown[]) => sessionLogFindManyMock(...args),
    },
    rewardLog: {
      findMany: (...args: unknown[]) => rewardLogFindManyMock(...args),
    },
  },
}));

import {
  addUtcDays,
  aggregateFunnel,
  aggregateFunnelByDay,
  buildSteps,
  compareConversions,
  FUNNEL_ALERT_THRESHOLD_PP,
  FUNNEL_ALERT_THRESHOLD_REL_PCT,
  FUNNEL_STEP_ORDER,
  formatUtcDate,
  pickAlertSteps,
  toDayStartUtc,
  type FunnelSummary,
} from "@/lib/analytics/funnel";

beforeEach(() => {
  analyticsFindManyMock.mockReset();
  evalFindManyMock.mockReset();
  sessionLogFindManyMock.mockReset();
  rewardLogFindManyMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// [시나리오 1] aggregateFunnel 정상 흐름
// =============================================================================
describe("aggregateFunnel — 정상 6단계 카운트 + conversion (모두 distinct userId)", () => {
  it("[시나리오 1] landing 100 / d_start 80 / d_complete 70 / m_start 50 / m_complete 30 / reward 25 → 정합", async () => {
    // 진입/시작 3단계 = AnalyticsEvent funnel_step_reached distinct userId (step 분기).
    const stepCounts: Record<string, number> = {
      landing: 100,
      diagnose_started: 80,
      mission_started: 50,
    };
    analyticsFindManyMock.mockImplementation(
      (arg: { where?: { properties?: { equals?: string } } }) => {
        const step = arg?.where?.properties?.equals ?? "";
        const n = stepCounts[step] ?? 0;
        return Promise.resolve(
          Array.from({ length: n }, (_, i) => ({ userId: `u-${step}-${i}` })),
        );
      },
    );
    // 완료 3단계 = 도메인 테이블 distinct userId (findMany row 수).
    evalFindManyMock.mockResolvedValue(
      Array.from({ length: 70 }, (_, i) => ({ userId: `u-dc-${i}` })),
    ); // diagnose_completed
    sessionLogFindManyMock.mockResolvedValue(
      Array.from({ length: 30 }, (_, i) => ({ userId: `u-mc-${i}` })),
    ); // mission_completed
    rewardLogFindManyMock.mockResolvedValue(
      Array.from({ length: 25 }, (_, i) => ({ userId: `u-r-${i}` })),
    ); // reward_granted

    const from = new Date("2026-05-21T00:00:00Z");
    const to = new Date("2026-05-22T00:00:00Z");
    const summary = await aggregateFunnel({ from, to });

    expect(summary.date).toBe("2026-05-21");
    expect(summary.totalUsers).toBe(100);
    expect(summary.steps).toHaveLength(6);
    expect(summary.steps.map((s) => s.name)).toEqual([...FUNNEL_STEP_ORDER]);

    const byName = new Map(summary.steps.map((s) => [s.name, s]));
    expect(byName.get("landing")?.count).toBe(100);
    expect(byName.get("landing")?.conversionFromPrev).toBeNull();
    expect(byName.get("landing")?.cumulativeConversion).toBe(1);
    expect(byName.get("diagnose_started")?.count).toBe(80);
    expect(byName.get("diagnose_started")?.conversionFromPrev).toBeCloseTo(0.8, 5);
    expect(byName.get("diagnose_completed")?.count).toBe(70);
    expect(byName.get("mission_started")?.count).toBe(50);
    expect(byName.get("mission_completed")?.count).toBe(30);
    expect(byName.get("reward_granted")?.count).toBe(25);
    expect(byName.get("reward_granted")?.cumulativeConversion).toBeCloseTo(0.25, 5);

    // 진입/시작 = AnalyticsEvent funnel_step_reached, distinct userId, userId not null, step 분기.
    const landingArg = analyticsFindManyMock.mock.calls.find(
      (c) =>
        (c[0] as { where?: { properties?: { equals?: string } } }).where
          ?.properties?.equals === "landing",
    )?.[0] as {
      where: {
        name: string;
        createdAt: { gte: Date; lt: Date };
        userId: { not: null };
        properties: { path: string[]; equals: string };
      };
      distinct: string[];
    };
    expect(landingArg.where.name).toBe("funnel_step_reached");
    expect(landingArg.where.properties.path).toEqual(["step"]);
    expect(landingArg.where.userId).toEqual({ not: null });
    expect(landingArg.distinct).toContain("userId");
    expect(landingArg.where.createdAt.gte.getTime()).toBe(from.getTime());
    expect(landingArg.where.createdAt.lt.getTime()).toBe(to.getTime());

    // mission_completed = SessionLog distinct userId, durationSec>0.
    const sessArg = sessionLogFindManyMock.mock.calls[0][0] as {
      where: { durationSec: { gt: number }; missionId: { not: null } };
      distinct: string[];
    };
    expect(sessArg.where.durationSec).toEqual({ gt: 0 });
    expect(sessArg.distinct).toContain("userId");

    // reward_granted = RewardLog distinct userId, 'mission-' prefix (진단 별 제외 — 단조성).
    const rewardArg = rewardLogFindManyMock.mock.calls[0][0] as {
      where: { idempotencyKey?: { startsWith?: string } };
      distinct: string[];
    };
    expect(rewardArg.where.idempotencyKey?.startsWith).toBe("mission-");
    expect(rewardArg.distinct).toContain("userId");
  });
});

// =============================================================================
// [시나리오 2-4] buildSteps 순수 함수 분기
// =============================================================================
describe("buildSteps — cumulativeConversion + safe divide", () => {
  it("[시나리오 2] landing 200 / 모든 단계 정상 → 누적 = count / landing", () => {
    const steps = buildSteps({
      landingDistinctUsers: 200,
      diagnoseStarted: 150,
      diagnoseCompleted: 120,
      missionStarted: 80,
      missionCompleted: 40,
      rewardGranted: 20,
    });
    expect(steps[0].cumulativeConversion).toBe(1);
    expect(steps[1].cumulativeConversion).toBeCloseTo(150 / 200, 5);
    expect(steps[5].cumulativeConversion).toBeCloseTo(20 / 200, 5);
  });

  it("[시나리오 3] landing 0 → 모든 cumulativeConversion = 0 (zero-divide 방어)", () => {
    const steps = buildSteps({
      landingDistinctUsers: 0,
      diagnoseStarted: 0,
      diagnoseCompleted: 0,
      missionStarted: 0,
      missionCompleted: 0,
      rewardGranted: 0,
    });
    for (const step of steps) {
      expect(step.cumulativeConversion).toBe(0);
    }
    expect(steps[0].conversionFromPrev).toBeNull();
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].conversionFromPrev).toBe(0);
    }
  });

  it("[시나리오 4] 이전 단계 = 0, 현재 단계 > 0 → conversionFromPrev = 0 (정의 불가능 시 safe)", () => {
    // 실 운영에선 funnel 정의상 발생 불가능 (상위 단계 카운트가 항상 ≥ 하위) 하지만,
    // race-condition / 데이터 inconsistency 시 안전 default.
    const steps = buildSteps({
      landingDistinctUsers: 10,
      diagnoseStarted: 0,
      diagnoseCompleted: 5,
      missionStarted: 0,
      missionCompleted: 0,
      rewardGranted: 0,
    });
    // diagnose_started conversionFromPrev = 0/10 = 0.
    expect(steps[1].conversionFromPrev).toBe(0);
    // diagnose_completed = 5 / 0 → 0 (safe).
    expect(steps[2].conversionFromPrev).toBe(0);
  });
});

// =============================================================================
// [시나리오 5-7] compareConversions
// =============================================================================
describe("compareConversions — baseline vs target Δ 계산", () => {
  function makeSummary(values: number[]): FunnelSummary {
    // values[0]=landing, values[1..]=각 단계 count.
    const raw = {
      landingDistinctUsers: values[0],
      diagnoseStarted: values[1] ?? 0,
      diagnoseCompleted: values[2] ?? 0,
      missionStarted: values[3] ?? 0,
      missionCompleted: values[4] ?? 0,
      rewardGranted: values[5] ?? 0,
    };
    return {
      date: "2026-05-21",
      steps: buildSteps(raw),
      totalUsers: raw.landingDistinctUsers,
    };
  }

  it("[시나리오 5] baseline conv 60% / target 40% → deltaPp ≈ -20, direction down", () => {
    // landing 100 / d_start 60 → conv 60%.
    const baseline = makeSummary([100, 60, 0, 0, 0, 0]);
    // landing 100 / d_start 40 → conv 40%.
    const target = makeSummary([100, 40, 0, 0, 0, 0]);
    const deltas = compareConversions(baseline, target);
    const diagStart = deltas.find((d) => d.name === "diagnose_started")!;
    expect(diagStart.baselineConversion).toBeCloseTo(0.6, 5);
    expect(diagStart.targetConversion).toBeCloseTo(0.4, 5);
    expect(diagStart.deltaPp).toBeCloseTo(-20, 5);
    // 상대: -20 / 60 = -33.33%.
    expect(diagStart.deltaRelative).toBeCloseTo(-33.333, 2);
  });

  it("[시나리오 6] landing step → conversionFromPrev null → delta null", () => {
    const baseline = makeSummary([100, 60, 30, 10, 5, 2]);
    const target = makeSummary([80, 40, 20, 8, 3, 1]);
    const deltas = compareConversions(baseline, target);
    const landing = deltas.find((d) => d.name === "landing")!;
    expect(landing.deltaPp).toBeNull();
    expect(landing.deltaRelative).toBeNull();
  });

  it("[시나리오 7] baseline conv = 0 → deltaRelative null (divide-by-zero)", () => {
    // baseline: landing 10 / d_start 0 → conv 0.
    const baseline = makeSummary([10, 0, 0, 0, 0, 0]);
    // target: landing 10 / d_start 5 → conv 50%.
    const target = makeSummary([10, 5, 0, 0, 0, 0]);
    const deltas = compareConversions(baseline, target);
    const diagStart = deltas.find((d) => d.name === "diagnose_started")!;
    expect(diagStart.baselineConversion).toBe(0);
    expect(diagStart.targetConversion).toBeCloseTo(0.5, 5);
    expect(diagStart.deltaPp).toBeCloseTo(50, 5);
    expect(diagStart.deltaRelative).toBeNull();
  });
});

// =============================================================================
// [시나리오 8-10] pickAlertSteps 임계 분기
// =============================================================================
describe("pickAlertSteps — |Δpp| > 20 or |Δrel| > 20% 임계", () => {
  it("[시나리오 8] |Δpp| > 20 → triggered", () => {
    const items = pickAlertSteps([
      {
        name: "diagnose_started",
        baselineConversion: 0.6,
        targetConversion: 0.35,
        deltaPp: -25,
        deltaRelative: -41.6,
      },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].direction).toBe("down");
    expect(items[0].deltaPp).toBe(-25);
  });

  it("[시나리오 9] |Δpp| = 10 && |Δrel| = 10% → skip (둘 다 임계 이내)", () => {
    const items = pickAlertSteps([
      {
        name: "mission_started",
        baselineConversion: 0.5,
        targetConversion: 0.45,
        deltaPp: -5,
        deltaRelative: -10,
      },
    ]);
    expect(items).toHaveLength(0);
  });

  it("[시나리오 10] |Δpp| 작아도 |Δrel| > 20% → triggered (작은 카운트 큰 비율 변화)", () => {
    const items = pickAlertSteps([
      {
        name: "reward_granted",
        baselineConversion: 0.05,
        targetConversion: 0.08,
        deltaPp: 3, // 3%p (절대 작음)
        deltaRelative: 60, // 60% (상대 큼)
      },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].direction).toBe("up");
  });

  it("[시나리오 10b] 임계 상수 노출 정합", () => {
    expect(FUNNEL_ALERT_THRESHOLD_PP).toBe(20);
    expect(FUNNEL_ALERT_THRESHOLD_REL_PCT).toBe(20);
  });
});

// =============================================================================
// [시나리오 11] aggregateFunnelByDay 일자 순회
// =============================================================================
describe("aggregateFunnelByDay — 다일 range", () => {
  it("[시나리오 11] 3일 range → 3개 FunnelSummary + 각 일자 KST boundary 정합 (TZ 통일 PR 후)", async () => {
    // 모든 prisma 호출 빈 결과 (집계 0)
    analyticsFindManyMock.mockResolvedValue([]);
    evalFindManyMock.mockResolvedValue([]);
    sessionLogFindManyMock.mockResolvedValue([]);
    rewardLogFindManyMock.mockResolvedValue([]);

    // 본 테스트 입력 from/to (UTC 자정) 은 KST 09:00 instant — toDayStartKst 가 KST 5-19 00:00 으로 정렬.
    // 따라서 3개 KST 일자 (5-19, 5-20, 5-21) 의 summary 가 생성됨.
    const from = new Date("2026-05-19T00:00:00Z");
    const to = new Date("2026-05-22T00:00:00Z");
    const summaries = await aggregateFunnelByDay({ from, to });
    expect(summaries).toHaveLength(3);
    expect(summaries.map((s) => s.date)).toEqual([
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
    ]);

    // 각 일자별로 findMany / count 호출이 발생했는지 보증 (3일 x 4 mocks).
    expect(evalFindManyMock).toHaveBeenCalledTimes(3);

    // 첫 일자의 from / to 정합 (KST 5-19 00:00 = UTC 5-18 15:00).
    const firstFindArg = evalFindManyMock.mock.calls[0][0] as {
      where: { createdAt: { gte: Date; lt: Date } };
    };
    expect(firstFindArg.where.createdAt.gte.toISOString()).toBe("2026-05-18T15:00:00.000Z");
    expect(firstFindArg.where.createdAt.lt.toISOString()).toBe("2026-05-19T15:00:00.000Z");
  });

  it("[시나리오 11b] 헬퍼 유틸 — formatUtcDate / toDayStartUtc / addUtcDays 정합", () => {
    const d = new Date("2026-05-22T15:30:00Z");
    expect(formatUtcDate(d)).toBe("2026-05-22");
    expect(toDayStartUtc(d).toISOString()).toBe("2026-05-22T00:00:00.000Z");
    const plus3 = addUtcDays(toDayStartUtc(d), 3);
    expect(plus3.toISOString()).toBe("2026-05-25T00:00:00.000Z");
    const minus2 = addUtcDays(toDayStartUtc(d), -2);
    expect(minus2.toISOString()).toBe("2026-05-20T00:00:00.000Z");
  });
});

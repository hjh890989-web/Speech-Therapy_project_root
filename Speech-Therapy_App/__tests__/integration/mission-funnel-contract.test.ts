// 교차 계약 테스트 — 미션 완료 durationSec 규약이 3개 모듈에 일관되게 흐르는지 잠금.
//
// 배경:
//   "미션 완료 = durationSec > 0" 규약이 3곳에 흩어져 있다:
//     1. app/actions/mission.ts  : completed→elapsedSec(>0) / skipped→0 으로 _기록_
//     2. lib/analytics/funnel.ts : mission_completed = SessionLog where durationSec > 0 으로 _집계_
//     3. lib/nav/badge-counts.ts : missionPendingToday = SessionLog where durationSec <= 0 으로 _집계_
//   각 파일은 개별 단위 테스트가 있으나, 세 정의가 _서로 정합_ 한지(특히 funnel-완료 `>0` 와
//   badge-미완료 `<=0` 가 boundary 0 에서 정확히 상보) 잠그는 단일 테스트는 없었다.
//   한 곳이 규약을 바꾸면(예: funnel 을 `>=0`, mission 이 skipped 에 elapsedSec 기록) 개별
//   테스트는 통과하지만 시스템은 깨진다(스킵 미션이 완료로 집계되거나 이중 카운트). 본 테스트가
//   "기록 → funnel 완료 → badge 미완료" realdata 흐름의 교차 불변식을 한 곳에서 회귀 가드한다.
//
// 격리: prisma 공유 mock (3 모듈 모두 @/lib/db prisma 의존) + mission.ts 보조 deps.
//   funnel 의 unstable_cache 는 __tests__/setup.ts 전역 mock(passthrough).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- mission.ts 보조 deps ---
const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({ auth: { getUser: () => getUserMock() } }),
}));

const userUpsertMock = vi.fn();
vi.mock("@/lib/db/with-actor", () => ({
  withActor: async <T,>(_actorId: unknown, fn: (tx: unknown) => Promise<T>) =>
    fn({ user: { upsert: (...a: unknown[]) => userUpsertMock(...a) } }),
}));

const cookieGetMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => cookieGetMock(name) }),
}));

const grantRewardMock = vi.fn();
vi.mock("@/app/actions/reward", () => ({
  grantReward: (...a: unknown[]) => grantRewardMock(...a),
}));

// --- 공유 prisma mock (mission create + funnel/badge count + funnel eval/reward + badge weekly/consent) ---
const sessionCreateMock = vi.fn();
const sessionCountMock = vi.fn();
const evalFindManyMock = vi.fn();
const evalCountMock = vi.fn();
const rewardCountMock = vi.fn();
const weeklyCountMock = vi.fn();
const consentCountMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    sessionLog: {
      create: (...a: unknown[]) => sessionCreateMock(...a),
      count: (...a: unknown[]) => sessionCountMock(...a),
    },
    evaluationResult: {
      findMany: (...a: unknown[]) => evalFindManyMock(...a),
      count: (...a: unknown[]) => evalCountMock(...a),
    },
    rewardLog: { count: (...a: unknown[]) => rewardCountMock(...a) },
    weeklyReport: { count: (...a: unknown[]) => weeklyCountMock(...a) },
    consentSignature: { count: (...a: unknown[]) => consentCountMock(...a) },
    user: { findUnique: vi.fn() },
  },
}));

import { recordMissionCompletion } from "@/app/actions/mission";
import { aggregateFunnel } from "@/lib/analytics/funnel";
import { getNavBadgeCounts } from "@/lib/nav/badge-counts";

/// Prisma int 필터({gt}/{gte}/{lt}/{lte}/{equals}/undefined) → 술어 함수.
type IntFilter =
  | { gt: number }
  | { gte: number }
  | { lt: number }
  | { lte: number }
  | { equals: number }
  | undefined;

function intPredicate(filter: IntFilter): (v: number) => boolean {
  return (v: number) => {
    if (filter === undefined) return true; // 제약 없음 → 전부 포함
    if ("gt" in filter) return v > filter.gt;
    if ("gte" in filter) return v >= filter.gte;
    if ("lt" in filter) return v < filter.lt;
    if ("lte" in filter) return v <= filter.lte;
    if ("equals" in filter) return v === filter.equals;
    return true;
  };
}

type SessionWhere = {
  missionId?: { not: null };
  durationSec?: IntFilter;
};

/// mission.ts 가 기록하는 durationSec 캡처.
async function recordedDurationSec(
  completedReason: "manual_done" | "timer_ended" | "skipped",
  elapsedSec: number,
): Promise<number> {
  sessionCreateMock.mockReset();
  sessionCreateMock.mockResolvedValue({ id: "s" });
  getUserMock.mockResolvedValue({ data: { user: null } });
  cookieGetMock.mockReturnValue(undefined);
  userUpsertMock.mockResolvedValue({});
  grantRewardMock.mockResolvedValue({ success: true, wasSkipped: false });
  await recordMissionCompletion({
    missionId: "m1",
    elapsedSec,
    completedReason,
    anonymousUserId: "a1",
  });
  const arg = sessionCreateMock.mock.calls[0]?.[0] as {
    data: { durationSec: number };
  };
  return arg.data.durationSec;
}

/// funnel 의 mission_started / mission_completed WHERE 캡처.
async function funnelMissionWheres(): Promise<{
  started: SessionWhere;
  completed: SessionWhere;
}> {
  sessionCountMock.mockReset();
  sessionCountMock.mockResolvedValue(0);
  evalFindManyMock.mockResolvedValue([]);
  evalCountMock.mockResolvedValue(0);
  rewardCountMock.mockResolvedValue(0);
  await aggregateFunnel({
    from: new Date("2026-05-21T00:00:00Z"),
    to: new Date("2026-05-22T00:00:00Z"),
  });
  // fetchRawCounts 의 Promise.all 순서: [...eval, missionStarted(#0), missionCompleted(#1), reward]
  return {
    started: (sessionCountMock.mock.calls[0]?.[0] as { where: SessionWhere }).where,
    completed: (sessionCountMock.mock.calls[1]?.[0] as { where: SessionWhere }).where,
  };
}

/// badge 의 missionPendingToday WHERE 캡처.
async function badgePendingWhere(): Promise<SessionWhere> {
  sessionCountMock.mockReset();
  sessionCountMock.mockResolvedValue(0);
  weeklyCountMock.mockResolvedValue(0);
  consentCountMock.mockResolvedValue(0);
  await getNavBadgeCounts({ role: "parent", institutionId: null, userId: "p1" });
  return (sessionCountMock.mock.calls[0]?.[0] as { where: SessionWhere }).where;
}

beforeEach(() => {
  for (const m of [
    getUserMock,
    userUpsertMock,
    cookieGetMock,
    grantRewardMock,
    sessionCreateMock,
    sessionCountMock,
    evalFindManyMock,
    evalCountMock,
    rewardCountMock,
    weeklyCountMock,
    consentCountMock,
  ]) {
    m.mockReset();
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("미션 완료 durationSec 교차 계약 (mission ↔ funnel ↔ badge)", () => {
  it("[C1] funnel mission_completed WHERE = durationSec > 0 (어디서도 미단언이던 정의 잠금)", async () => {
    const { completed } = await funnelMissionWheres();
    expect(completed.missionId).toEqual({ not: null });
    expect(completed.durationSec).toEqual({ gt: 0 });
  });

  it("[C2] funnel mission_started 는 durationSec 무필터 — 완료+스킵 모두 카운트", async () => {
    const { started } = await funnelMissionWheres();
    expect(started.missionId).toEqual({ not: null });
    // started 단계는 durationSec 제약 없음 → 시작(완료/스킵 무관) 전부 포함.
    expect(started.durationSec).toBeUndefined();
  });

  it("[C3] badge missionPendingToday WHERE = durationSec <= 0", async () => {
    const where = await badgePendingWhere();
    expect(where.missionId).toEqual({ not: null });
    expect(where.durationSec).toEqual({ lte: 0 });
  });

  it("[C4] 핵심 불변식 — funnel-완료(>0) 와 badge-미완료(<=0) 는 boundary 0 에서 정확히 상보 (gap/overlap 0)", async () => {
    const { completed } = await funnelMissionWheres();
    const pendingWhere = await badgePendingWhere();
    const isCompleted = intPredicate(completed.durationSec);
    const isPending = intPredicate(pendingWhere.durationSec);

    // 음수·0·양수 전 도메인에서 두 술어는 정확히 서로의 부정이어야 한다.
    for (const v of [-10, -1, 0, 1, 30, 95, 120]) {
      expect(isCompleted(v)).toBe(!isPending(v));
    }
  });

  it("[C5] mission.ts 출력이 두 술어에 정합 — 완료→funnel만, 스킵→badge만", async () => {
    const { completed } = await funnelMissionWheres();
    const pendingWhere = await badgePendingWhere();
    const isCompleted = intPredicate(completed.durationSec);
    const isPending = intPredicate(pendingWhere.durationSec);

    // 정상 완료(manual_done / timer_ended) → durationSec>0 → funnel 완료 ✓ / badge 미완료 ✗
    for (const reason of ["manual_done", "timer_ended"] as const) {
      const dur = await recordedDurationSec(reason, 95);
      expect(dur).toBeGreaterThan(0);
      expect(isCompleted(dur)).toBe(true);
      expect(isPending(dur)).toBe(false);
    }

    // 스킵 → durationSec=0 → funnel 완료 ✗ / badge 미완료 ✓ (elapsedSec 가 컸어도 0 으로 기록)
    const skippedDur = await recordedDurationSec("skipped", 88);
    expect(skippedDur).toBe(0);
    expect(isCompleted(skippedDur)).toBe(false);
    expect(isPending(skippedDur)).toBe(true);
  });

  it("[C6] mission_started 는 완료/스킵 양쪽을 포함 (started ⊇ completed ∪ pending)", async () => {
    const { started } = await funnelMissionWheres();
    const startedPred = intPredicate(started.durationSec); // 무필터 → 항상 true
    const completedDur = await recordedDurationSec("manual_done", 95);
    const skippedDur = await recordedDurationSec("skipped", 88);
    // 시작 단계는 durationSec 부호와 무관하게 둘 다 카운트.
    expect(startedPred(completedDur)).toBe(true);
    expect(startedPred(skippedDur)).toBe(true);
  });
});

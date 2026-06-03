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

// --- 공유 prisma mock ---
// AnalyticsEvent 재연결 후: funnel mission_started=AnalyticsEvent, 완료/보상=도메인 findMany(distinct).
// badge missionPendingToday=sessionLog.count (별도). mission.ts=sessionLog.create.
const sessionCreateMock = vi.fn();
const sessionCountMock = vi.fn(); // badge missionPendingToday
const sessionFindManyMock = vi.fn(); // funnel mission_completed (distinct userId)
const analyticsFindManyMock = vi.fn(); // funnel landing/diagnose_started/mission_started
const evalFindManyMock = vi.fn(); // funnel diagnose_completed
const rewardFindManyMock = vi.fn(); // funnel reward_granted
const weeklyCountMock = vi.fn();
const consentCountMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    sessionLog: {
      create: (...a: unknown[]) => sessionCreateMock(...a),
      count: (...a: unknown[]) => sessionCountMock(...a),
      findMany: (...a: unknown[]) => sessionFindManyMock(...a),
    },
    evaluationResult: {
      findMany: (...a: unknown[]) => evalFindManyMock(...a),
    },
    analyticsEvent: {
      findMany: (...a: unknown[]) => analyticsFindManyMock(...a),
    },
    rewardLog: { findMany: (...a: unknown[]) => rewardFindManyMock(...a) },
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

/// funnel 의 mission_completed WHERE(SessionLog findMany) + mission_started step(AnalyticsEvent) 캡처.
/// (AnalyticsEvent 재연결 후: 완료만 SessionLog 파생, 시작은 funnel_step_reached 이벤트.)
async function funnelMissionCapture(): Promise<{
  completedWhere: SessionWhere;
  missionStartedStep: string | undefined;
}> {
  analyticsFindManyMock.mockReset();
  analyticsFindManyMock.mockResolvedValue([]);
  evalFindManyMock.mockResolvedValue([]);
  sessionFindManyMock.mockReset();
  sessionFindManyMock.mockResolvedValue([]);
  rewardFindManyMock.mockResolvedValue([]);
  await aggregateFunnel({
    from: new Date("2026-05-21T00:00:00Z"),
    to: new Date("2026-05-22T00:00:00Z"),
  });
  // 완료 = sessionLog.findMany 1회(mission_completed). 시작 = analyticsEvent.findMany(step=mission_started).
  const completedWhere = (
    sessionFindManyMock.mock.calls[0]?.[0] as { where: SessionWhere }
  ).where;
  const missionStartedCall = analyticsFindManyMock.mock.calls.find(
    (c) =>
      (c[0] as { where?: { properties?: { equals?: string } } }).where
        ?.properties?.equals === "mission_started",
  );
  const missionStartedStep = (
    missionStartedCall?.[0] as
      | { where?: { properties?: { equals?: string } } }
      | undefined
  )?.where?.properties?.equals;
  return { completedWhere, missionStartedStep };
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
    sessionFindManyMock,
    analyticsFindManyMock,
    evalFindManyMock,
    rewardFindManyMock,
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
  it("[C1] funnel mission_completed WHERE = durationSec > 0 (SessionLog distinct, 정의 잠금)", async () => {
    const { completedWhere } = await funnelMissionCapture();
    expect(completedWhere.missionId).toEqual({ not: null });
    expect(completedWhere.durationSec).toEqual({ gt: 0 });
  });

  it("[C2] funnel mission_started 는 AnalyticsEvent(funnel_step_reached, step=mission_started) — SessionLog 미파생", async () => {
    const { missionStartedStep } = await funnelMissionCapture();
    // AnalyticsEvent 재연결 후: 시작은 SessionLog 무필터 count 가 아니라 funnel_step_reached distinct user.
    expect(missionStartedStep).toBe("mission_started");
    // SessionLog.findMany 는 완료(mission_completed) 단 1회만 — 시작은 SessionLog 미사용.
    expect(sessionFindManyMock).toHaveBeenCalledTimes(1);
  });

  it("[C3] badge missionPendingToday WHERE = durationSec <= 0", async () => {
    const where = await badgePendingWhere();
    expect(where.missionId).toEqual({ not: null });
    expect(where.durationSec).toEqual({ lte: 0 });
  });

  it("[C4] 핵심 불변식 — funnel-완료(>0) 와 badge-미완료(<=0) 는 boundary 0 에서 정확히 상보 (gap/overlap 0)", async () => {
    const { completedWhere } = await funnelMissionCapture();
    const pendingWhere = await badgePendingWhere();
    const isCompleted = intPredicate(completedWhere.durationSec);
    const isPending = intPredicate(pendingWhere.durationSec);

    // 음수·0·양수 전 도메인에서 두 술어는 정확히 서로의 부정이어야 한다.
    for (const v of [-10, -1, 0, 1, 30, 95, 120]) {
      expect(isCompleted(v)).toBe(!isPending(v));
    }
  });

  it("[C5] mission.ts 출력이 두 술어에 정합 — 완료→funnel만, 스킵→badge만", async () => {
    const { completedWhere } = await funnelMissionCapture();
    const pendingWhere = await badgePendingWhere();
    const isCompleted = intPredicate(completedWhere.durationSec);
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
});

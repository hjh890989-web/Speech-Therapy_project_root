// TEST — recordMissionCompletion Server Action (FR-C-MISSION-COMPLETION).
//
// 검증: durationSec 매핑(skipped→0 / 정상→elapsedSec), User provisioning(FK),
//       userId 권위(auth > anonymousUserId > cookie), graceful 실패.

import { describe, it, expect, vi, beforeEach } from "vitest";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({ auth: { getUser: () => getUserMock() } }),
}));

const sessionCreateMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: { sessionLog: { create: (...a: unknown[]) => sessionCreateMock(...a) } },
}));

const userUpsertMock = vi.fn();
const withActorMock = vi.fn();
vi.mock("@/lib/db/with-actor", () => ({
  withActor: async <T,>(
    actorId: string | null | undefined,
    fn: (tx: unknown) => Promise<T>,
  ) => {
    withActorMock(actorId);
    return fn({ user: { upsert: (...a: unknown[]) => userUpsertMock(...a) } });
  },
}));

const cookieGetMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => cookieGetMock(name) }),
}));

const grantRewardMock = vi.fn();
vi.mock("@/app/actions/reward", () => ({
  grantReward: (...a: unknown[]) => grantRewardMock(...a),
}));

// FR-C-STREAK-MILESTONE — 마일스톤 보너스는 getMissionStreak 결과로 분기.
const getMissionStreakMock = vi.fn();
vi.mock("@/lib/missions/streak", () => ({
  getMissionStreak: (...a: unknown[]) => getMissionStreakMock(...a),
}));

import { recordMissionCompletion } from "@/app/actions/mission";

const ANON = "anon-uuid-1";
function input(overrides: Record<string, unknown> = {}) {
  return {
    missionId: "mock-s-3",
    elapsedSec: 95,
    completedReason: "manual_done" as const,
    anonymousUserId: ANON,
    ...overrides,
  };
}
function createArg() {
  return sessionCreateMock.mock.calls[0]?.[0] as {
    data: { id: string; userId: string; missionId: string; durationSec: number };
  };
}

beforeEach(() => {
  getUserMock.mockReset();
  sessionCreateMock.mockReset();
  userUpsertMock.mockReset();
  withActorMock.mockReset();
  cookieGetMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: null } }); // 기본 익명
  cookieGetMock.mockReturnValue(undefined);
  userUpsertMock.mockResolvedValue({});
  sessionCreateMock.mockResolvedValue({ id: "s1" });
  grantRewardMock.mockReset();
  grantRewardMock.mockResolvedValue({
    success: true,
    wasSkipped: false,
    cumulativeStars: 1,
    treeGrowthLevel: 0,
    aiDrawingCount: 0,
  });
  // 기본 — 마일스톤 아님(current=0) → 보너스 미발동(기존 테스트 영향 0).
  getMissionStreakMock.mockReset();
  getMissionStreakMock.mockResolvedValue({ current: 0, activeToday: true });
});

describe("recordMissionCompletion — FR-C-MISSION-COMPLETION", () => {
  it("manual_done → durationSec=elapsedSec(>0), counted=true + 별 +1 적립", async () => {
    const r = await recordMissionCompletion(input({ completedReason: "manual_done", elapsedSec: 95 }));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.counted).toBe(true);
    expect(r.starGranted).toBe(true);
    expect(createArg().data.durationSec).toBe(95);
    expect(createArg().data.missionId).toBe("mock-s-3");
    expect(createArg().data.userId).toBe(ANON);
    // 날짜 스코프 멱등키 — mission-{missionId}-{YYYY-MM-DD}.
    const rewardArg = grantRewardMock.mock.calls[0]?.[0] as {
      userId: string;
      rewardType: string;
      amount: number;
      idempotencyKey: string;
    };
    expect(rewardArg).toMatchObject({ userId: ANON, rewardType: "star", amount: 1 });
    expect(rewardArg.idempotencyKey).toMatch(/^mission-mock-s-3-\d{4}-\d{2}-\d{2}$/);
  });

  it("timer_ended → durationSec=elapsedSec, counted=true", async () => {
    const r = await recordMissionCompletion(input({ completedReason: "timer_ended", elapsedSec: 120 }));
    expect(r.success && r.counted).toBe(true);
    expect(createArg().data.durationSec).toBe(120);
  });

  it("skipped → durationSec=0, counted=false, 별 미적립 (grantReward 미호출)", async () => {
    const r = await recordMissionCompletion(input({ completedReason: "skipped", elapsedSec: 88 }));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.counted).toBe(false);
    expect(r.starGranted).toBe(false);
    expect(createArg().data.durationSec).toBe(0);
    expect(grantRewardMock).not.toHaveBeenCalled();
  });

  it("같은 미션 같은 날 재완수(멱등 wasSkipped) → starGranted=false (파밍 차단)", async () => {
    grantRewardMock.mockResolvedValueOnce({
      success: true,
      wasSkipped: true, // RewardLog @@unique 중복 — 일일 재완수 1회만.
      cumulativeStars: 1,
      treeGrowthLevel: 0,
      aiDrawingCount: 0,
    });
    const r = await recordMissionCompletion(input({ completedReason: "timer_ended" }));
    expect(r.success && r.starGranted).toBe(false);
    expect(r.success && r.counted).toBe(true); // 완수 자체는 기록(SessionLog durationSec>0)
  });

  it("별 적립 실패 → graceful (SessionLog 는 영속, success=true, starGranted=false)", async () => {
    grantRewardMock.mockRejectedValueOnce(new Error("reward db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await recordMissionCompletion(input({ completedReason: "manual_done" }));
    errSpy.mockRestore();
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.starGranted).toBe(false);
    expect(sessionCreateMock).toHaveBeenCalledTimes(1); // 측정 기반은 무손상
  });

  it("User provisioning — withActor + upsert create {id, role:'parent'} (FK 보장, 동의 미변경)", async () => {
    await recordMissionCompletion(input());
    expect(withActorMock).toHaveBeenCalledWith(ANON);
    const upsertArg = userUpsertMock.mock.calls[0]?.[0] as {
      where: { id: string };
      update: Record<string, unknown>;
      create: { id: string; role: string };
    };
    expect(upsertArg.where.id).toBe(ANON);
    expect(upsertArg.create).toEqual({ id: ANON, role: "parent" });
    expect(upsertArg.update).toEqual({}); // 동의/프로필 미변경
  });

  it("userId 권위 — 인증 사용자가 anonymousUserId 보다 우선", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "auth-1" } } });
    await recordMissionCompletion(input({ anonymousUserId: ANON }));
    expect(createArg().data.userId).toBe("auth-1");
    expect(withActorMock).toHaveBeenCalledWith("auth-1");
  });

  it("userId 폴백 — auth/anonymousUserId 없으면 cookie", async () => {
    cookieGetMock.mockReturnValue({ value: "cookie-1" }); // next/headers cookies().get → { value }
    await recordMissionCompletion({
      missionId: "mock-s-3",
      elapsedSec: 60,
      completedReason: "timer_ended",
    });
    expect(createArg().data.userId).toBe("cookie-1");
  });

  it("잘못된 입력(elapsedSec 음수) → invalid_input (INSERT 0)", async () => {
    const r = await recordMissionCompletion(input({ elapsedSec: -1 }));
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.reason).toBe("invalid_input");
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it("FK 위반/DB 장애 → internal_error (graceful, throw 0)", async () => {
    sessionCreateMock.mockRejectedValueOnce(new Error("FK violation: missionId"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await recordMissionCompletion(input());
    errSpy.mockRestore();
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.reason).toBe("internal_error");
  });
});

describe("recordMissionCompletion — FR-C-STREAK-MILESTONE 마일스톤 보너스", () => {
  it("3일 마일스톤 첫 도달 → 별 +2 보너스(streak-3 멱등키), 나무 없음(<7)", async () => {
    getMissionStreakMock.mockResolvedValue({ current: 3, activeToday: true });
    const r = await recordMissionCompletion(input({ completedReason: "manual_done", elapsedSec: 95 }));
    // call[0]=미션 별, call[1]=마일스톤 보너스.
    expect(grantRewardMock).toHaveBeenCalledTimes(2);
    const bonusArg = grantRewardMock.mock.calls[1][0] as {
      rewardType: string;
      amount: number;
      idempotencyKey: string;
    };
    expect(bonusArg).toMatchObject({ rewardType: "star", amount: 2 });
    expect(bonusArg.idempotencyKey).toBe(`streak-3-${ANON}`);
    // result 에 마일스톤 정보(완료 화면 연출용) — 3일은 나무 없음.
    expect(r.success && r.milestoneReached).toBe(3);
    expect(r.success && r.bonusStars).toBe(2);
    expect(r.success && r.treeGranted).toBe(false);
  });

  it("7일 마일스톤 → 별 +3 + 나무 1 성장(streak-tree-7, dead-code 활성)", async () => {
    getMissionStreakMock.mockResolvedValue({ current: 7, activeToday: true });
    const r = await recordMissionCompletion(input({ completedReason: "timer_ended", elapsedSec: 120 }));
    expect(grantRewardMock).toHaveBeenCalledTimes(3); // 미션 별 + 보너스 별 + 나무
    expect((grantRewardMock.mock.calls[1][0] as { amount: number }).amount).toBe(3);
    const treeArg = grantRewardMock.mock.calls[2][0] as {
      rewardType: string;
      amount: number;
      idempotencyKey: string;
    };
    expect(treeArg).toMatchObject({ rewardType: "tree", amount: 1 });
    expect(treeArg.idempotencyKey).toBe(`streak-tree-7-${ANON}`);
    // result — 7일은 나무 동반.
    expect(r.success && r.milestoneReached).toBe(7);
    expect(r.success && r.treeGranted).toBe(true);
  });

  it("30일 마일스톤 → 별 +10 (amount.max(10) 경계)", async () => {
    getMissionStreakMock.mockResolvedValue({ current: 30, activeToday: true });
    await recordMissionCompletion(input());
    expect((grantRewardMock.mock.calls[1][0] as { amount: number }).amount).toBe(10);
  });

  it("비-마일스톤(5일) → 보너스 미발동 (미션 별만)", async () => {
    getMissionStreakMock.mockResolvedValue({ current: 5, activeToday: true });
    await recordMissionCompletion(input());
    expect(grantRewardMock).toHaveBeenCalledTimes(1);
  });

  it("마일스톤 이미 도달(보너스 wasSkipped) → 나무 미발동 (평생 1회 파밍 차단)", async () => {
    getMissionStreakMock.mockResolvedValue({ current: 7, activeToday: true });
    grantRewardMock
      .mockResolvedValueOnce({ success: true, wasSkipped: false, cumulativeStars: 1, treeGrowthLevel: 0, aiDrawingCount: 0 }) // 미션 별
      .mockResolvedValueOnce({ success: true, wasSkipped: true, cumulativeStars: 1, treeGrowthLevel: 0, aiDrawingCount: 0 }); // 보너스 멱등 skip
    await recordMissionCompletion(input());
    // 미션 별 + 보너스(skip) = 2회. 나무는 시도 안 함(wasSkipped 가드).
    expect(grantRewardMock).toHaveBeenCalledTimes(2);
  });

  it("skipped 미션 → 마일스톤 미발동 (durationSec=0)", async () => {
    getMissionStreakMock.mockResolvedValue({ current: 3, activeToday: true });
    await recordMissionCompletion(input({ completedReason: "skipped", elapsedSec: 88 }));
    expect(grantRewardMock).not.toHaveBeenCalled();
  });

  it("마일스톤 보너스 실패 → graceful (success=true, 미션 완료 무손상)", async () => {
    getMissionStreakMock.mockResolvedValue({ current: 3, activeToday: true });
    grantRewardMock
      .mockResolvedValueOnce({ success: true, wasSkipped: false, cumulativeStars: 1, treeGrowthLevel: 0, aiDrawingCount: 0 }) // 미션 별
      .mockRejectedValueOnce(new Error("bonus db down")); // 보너스 적립 실패
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await recordMissionCompletion(input());
    errSpy.mockRestore();
    expect(r.success).toBe(true);
  });
});

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
});

describe("recordMissionCompletion — FR-C-MISSION-COMPLETION", () => {
  it("manual_done → durationSec=elapsedSec(>0), counted=true", async () => {
    const r = await recordMissionCompletion(input({ completedReason: "manual_done", elapsedSec: 95 }));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.counted).toBe(true);
    expect(createArg().data.durationSec).toBe(95);
    expect(createArg().data.missionId).toBe("mock-s-3");
    expect(createArg().data.userId).toBe(ANON);
  });

  it("timer_ended → durationSec=elapsedSec, counted=true", async () => {
    const r = await recordMissionCompletion(input({ completedReason: "timer_ended", elapsedSec: 120 }));
    expect(r.success && r.counted).toBe(true);
    expect(createArg().data.durationSec).toBe(120);
  });

  it("skipped → durationSec=0, counted=false (W-AUR inflate 차단)", async () => {
    const r = await recordMissionCompletion(input({ completedReason: "skipped", elapsedSec: 88 }));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.counted).toBe(false);
    expect(createArg().data.durationSec).toBe(0);
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

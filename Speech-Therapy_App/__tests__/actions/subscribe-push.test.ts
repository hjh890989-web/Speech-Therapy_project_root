// API-020 — subscribePush / unsubscribePush Server Action 단위 테스트.
//
// 격리: supabase auth / prisma(pushSubscription) / withActor / consent-guard / pipa-violation / config.

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getUserMock,
  upsertMock,
  deleteManyMock,
  withActorMock,
  assertConsentMock,
  reportPipaMock,
  isEnabledMock,
  ConsentRequiredError,
} = vi.hoisted(() => {
  class ConsentRequiredError extends Error {}
  return {
    getUserMock: vi.fn(),
    upsertMock: vi.fn(),
    deleteManyMock: vi.fn(),
    withActorMock: vi.fn(),
    assertConsentMock: vi.fn(),
    reportPipaMock: vi.fn(),
    isEnabledMock: vi.fn(),
    ConsentRequiredError,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: (...a: unknown[]) => getUserMock(...a) },
  }),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    pushSubscription: {
      upsert: (...a: unknown[]) => upsertMock(...a),
      deleteMany: (...a: unknown[]) => deleteManyMock(...a),
    },
  },
}));
vi.mock("@/lib/db/with-actor", () => ({
  withActor: async <T,>(
    actorId: string | null | undefined,
    fn: (tx: unknown) => Promise<T>,
  ) => {
    withActorMock(actorId);
    const tx = {
      pushSubscription: {
        upsert: (...a: unknown[]) => upsertMock(...a),
        deleteMany: (...a: unknown[]) => deleteManyMock(...a),
      },
    };
    return fn(tx);
  },
}));
vi.mock("@/lib/policy/consent-guard", () => ({
  assertConsentedIfAuthenticated: (...a: unknown[]) => assertConsentMock(...a),
  ConsentRequiredError,
}));
vi.mock("@/lib/monitoring/pipa-violation", () => ({
  reportPipaViolation: (...a: unknown[]) => reportPipaMock(...a),
}));
vi.mock("@/lib/push/config", () => ({
  isF16PushEnabled: () => isEnabledMock(),
}));

import { subscribePush } from "@/app/actions/subscribe-push";
import { unsubscribePush } from "@/app/actions/unsubscribe-push";

const USER_ID = "user-f16-aaaa-bbbb";
const VALID_INPUT = {
  endpoint: "https://push.example.com/abcdef",
  keys: { p256dh: "pkey", auth: "akey" },
};

beforeEach(() => {
  getUserMock.mockReset();
  upsertMock.mockReset();
  deleteManyMock.mockReset();
  withActorMock.mockReset();
  assertConsentMock.mockReset();
  reportPipaMock.mockReset();
  isEnabledMock.mockReset();
  isEnabledMock.mockReturnValue(true);
  getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  assertConsentMock.mockResolvedValue(undefined);
  upsertMock.mockResolvedValue({ id: "sub-1" });
  deleteManyMock.mockResolvedValue({ count: 1 });
});

describe("subscribePush — API-020", () => {
  it("[1] F16 게이트 off → disabled (auth 미진입)", async () => {
    isEnabledMock.mockReturnValue(false);
    const r = await subscribePush(VALID_INPUT);
    expect(r).toEqual({ success: false, reason: "disabled" });
    expect(getUserMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("[2] 비로그인 → unauthorized", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const r = await subscribePush(VALID_INPUT);
    expect(r).toEqual({ success: false, reason: "unauthorized" });
  });

  it("[3] PIPA 미동의 → consent_required + reportPipaViolation", async () => {
    assertConsentMock.mockRejectedValue(new ConsentRequiredError());
    const r = await subscribePush(VALID_INPUT);
    expect(r).toMatchObject({ success: false, reason: "consent_required" });
    expect(reportPipaMock).toHaveBeenCalledOnce();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("[4] endpoint 비 URL → invalid_input", async () => {
    const r = await subscribePush({
      endpoint: "not-a-url",
      keys: { p256dh: "x", auth: "y" },
    });
    expect(r).toMatchObject({ success: false, reason: "invalid_input" });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("[5] 정상 → upsert(endpoint) + 본인 id + success", async () => {
    const r = await subscribePush(VALID_INPUT);
    expect(r).toEqual({ success: true, subscriptionId: "sub-1" });
    expect(withActorMock).toHaveBeenCalledWith(USER_ID);
    const arg = upsertMock.mock.calls[0][0];
    expect(arg.where).toEqual({ endpoint: VALID_INPUT.endpoint });
    expect(arg.create).toMatchObject({
      userId: USER_ID,
      endpoint: VALID_INPUT.endpoint,
      p256dh: "pkey",
      auth: "akey",
    });
    // 재구독 시 dismissCount reset.
    expect(arg.update.dismissCount).toBe(0);
  });

  it("[6] upsert throw → internal_error", async () => {
    upsertMock.mockRejectedValue(new Error("db"));
    const r = await subscribePush(VALID_INPUT);
    expect(r).toMatchObject({ success: false, reason: "internal_error" });
  });
});

describe("unsubscribePush — API-020 (게이트 무관 수신거부)", () => {
  it("게이트 off 여도 동작 (정보통신망법 §50 — 수신거부 보장)", async () => {
    isEnabledMock.mockReturnValue(false);
    const r = await unsubscribePush(VALID_INPUT.endpoint);
    expect(r).toEqual({ success: true, deletedCount: 1 });
  });

  it("비로그인 → unauthorized (삭제 미실행)", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const r = await unsubscribePush();
    expect(r).toEqual({ success: false, reason: "unauthorized" });
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("endpoint 지정 → where{userId,endpoint} (cross-write 차단)", async () => {
    await unsubscribePush(VALID_INPUT.endpoint);
    expect(deleteManyMock.mock.calls[0][0].where).toEqual({
      userId: USER_ID,
      endpoint: VALID_INPUT.endpoint,
    });
  });

  it("endpoint 미지정 → where{userId} 전체 해지", async () => {
    await unsubscribePush();
    expect(deleteManyMock.mock.calls[0][0].where).toEqual({ userId: USER_ID });
  });
});

// recordFunnelStep — userId 해소 + funnel_step_reached AnalyticsEvent 영속 + 화이트리스트 가드.

import { describe, it, expect, vi, beforeEach } from "vitest";

const resolveUserIdMock = vi.fn();
vi.mock("@/lib/auth/resolve-user-id", () => ({
  resolveUserId: () => resolveUserIdMock(),
}));

const trackServerEventMock = vi.fn();
vi.mock("@/lib/analytics-server", () => ({
  trackServerEvent: (...a: unknown[]) => trackServerEventMock(...a),
}));

import { recordFunnelStep } from "@/app/actions/track-funnel";

beforeEach(() => {
  resolveUserIdMock.mockReset();
  trackServerEventMock.mockReset();
  trackServerEventMock.mockResolvedValue(undefined);
});

describe("recordFunnelStep", () => {
  it("userId 해소 후 funnel_step_reached INSERT (step + userId)", async () => {
    resolveUserIdMock.mockResolvedValue("u-1");
    await recordFunnelStep("landing");
    expect(trackServerEventMock).toHaveBeenCalledWith(
      "funnel_step_reached",
      { step: "landing" },
      "u-1",
    );
  });

  it("userId 없으면 null 로 영속(graceful)", async () => {
    resolveUserIdMock.mockResolvedValue(undefined);
    await recordFunnelStep("mission_started");
    expect(trackServerEventMock).toHaveBeenCalledWith(
      "funnel_step_reached",
      { step: "mission_started" },
      null,
    );
  });

  it("화이트리스트 외 step → 무시 (trackServerEvent 미호출)", async () => {
    resolveUserIdMock.mockResolvedValue("u-1");
    // @ts-expect-error 의도적 잘못된 step — runtime 화이트리스트 가드.
    await recordFunnelStep("bogus");
    expect(trackServerEventMock).not.toHaveBeenCalled();
  });
});

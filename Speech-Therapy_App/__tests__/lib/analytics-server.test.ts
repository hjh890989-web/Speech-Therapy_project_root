// INFRA-005 후속 — trackServerEvent (서버 분석 이벤트 DB sink) 단위 테스트.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: { analyticsEvent: { create: (...args: unknown[]) => createMock(...args) } },
}));

import { trackServerEvent } from "@/lib/analytics-server";

beforeEach(() => {
  createMock.mockReset();
  createMock.mockResolvedValue({ id: "ae-1" });
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("trackServerEvent — 서버 분석 이벤트 DB sink", () => {
  it("NODE_ENV=test → skip (INSERT 0, 테스트 결정성)", async () => {
    await trackServerEvent("diagnose_confidence_low", { confidence: 50, source: "fallback" }, "u1");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("비-test 환경 → AnalyticsEvent INSERT (name/properties/userId)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await trackServerEvent("diagnose_confidence_low", { confidence: 50, source: "fallback" }, "u1");
    expect(createMock).toHaveBeenCalledWith({
      data: {
        name: "diagnose_confidence_low",
        properties: { confidence: 50, source: "fallback" },
        userId: "u1",
      },
    });
  });

  it("userId 미지정 → null 저장", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await trackServerEvent("diagnose_confidence_low", { confidence: 40, source: "gemini" });
    expect(createMock.mock.calls[0]?.[0]?.data?.userId).toBeNull();
  });

  it("graceful — DB 실패해도 throw X (fire-and-forget, 흐름 차단 0)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    createMock.mockRejectedValue(new Error("db down"));
    await expect(
      trackServerEvent("diagnose_confidence_low", { confidence: 50, source: "fallback" }),
    ).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// MON-002 — /api/cron/error-monitor cron route 단위 테스트.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sendSlackMock = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/notifications/slack", () => ({
  sendSlackMessage: (...args: unknown[]) => sendSlackMock(...args),
}));

import { GET } from "@/app/api/cron/error-monitor/route";
import { trackError, trackSuccess, __resetErrorTrackingForTest } from "@/lib/error-tracking";

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

beforeEach(() => {
  __resetErrorTrackingForTest();
  sendSlackMock.mockClear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-22T12:00:00Z"));
  vi.unstubAllEnvs();
  vi.stubEnv("NODE_ENV", "test");
  process.env.CRON_SECRET = "test-secret";
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
});

function authedRequest(): Request {
  return new Request("http://localhost/api/cron/error-monitor", {
    headers: { Authorization: "Bearer test-secret" },
  });
}

describe("/api/cron/error-monitor — auth 가드", () => {
  it("CRON_SECRET 헤더 누락 시 401", async () => {
    const res = await GET(new Request("http://localhost/api/cron/error-monitor"));
    expect(res.status).toBe(401);
  });

  it("잘못된 Bearer → 401", async () => {
    const res = await GET(
      new Request("http://localhost/api/cron/error-monitor", {
        headers: { Authorization: "Bearer wrong" },
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe("/api/cron/error-monitor — 정상 동작", () => {
  it("메트릭 없음 → 200 + breachedCount 0 + alertedCount 0", async () => {
    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.breachedCount).toBe(0);
    expect(body.alertedCount).toBe(0);
    expect(body.results).toHaveLength(2); // stt + gemini
    expect(sendSlackMock).not.toHaveBeenCalled();
  });

  it("STT 임계 초과 → 200 + breachedCount 1 + Slack 1건", async () => {
    for (let i = 0; i < 96; i++) trackSuccess("stt");
    for (let i = 0; i < 4; i++) trackError("stt_network");

    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.breachedCount).toBe(1);
    expect(body.alertedCount).toBe(1);
    expect(sendSlackMock).toHaveBeenCalledTimes(1);
  });

  it("STT + Gemini 둘 다 임계 초과 → breachedCount 2 + Slack 2건", async () => {
    for (let i = 0; i < 96; i++) trackSuccess("stt");
    for (let i = 0; i < 4; i++) trackError("stt_network");
    for (let i = 0; i < 94; i++) trackSuccess("gemini");
    for (let i = 0; i < 6; i++) trackError("gemini_429");

    const res = await GET(authedRequest());
    const body = await res.json();
    expect(body.breachedCount).toBe(2);
    expect(body.alertedCount).toBe(2);
    expect(sendSlackMock).toHaveBeenCalledTimes(2);
  });

  it("응답 구조 검증 — durationMs / snapshot / results 포함", async () => {
    const res = await GET(authedRequest());
    const body = await res.json();
    expect(body.job).toBe("error-monitor");
    expect(body.durationMs).toBeGreaterThanOrEqual(0);
    expect(body.snapshot).toBeDefined();
    expect(body.results).toBeInstanceOf(Array);
  });
});

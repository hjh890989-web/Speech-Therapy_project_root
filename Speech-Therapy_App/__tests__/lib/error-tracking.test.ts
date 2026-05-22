// MON-002 — error-tracking 단위 테스트.
// 검증: 메트릭 누적, 윈도우 prune, 임계 검사, Slack 알림 중복 방지, 환경 prefix.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sendSlackMock = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/notifications/slack", () => ({
  sendSlackMessage: (...args: unknown[]) => sendSlackMock(...args),
}));

import {
  trackError,
  trackSuccess,
  checkErrorThresholds,
  getErrorTrackingSnapshot,
  __resetErrorTrackingForTest,
} from "@/lib/error-tracking";

beforeEach(() => {
  __resetErrorTrackingForTest();
  sendSlackMock.mockClear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-22T12:00:00Z"));
  vi.unstubAllEnvs();
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("trackError + trackSuccess — 메트릭 누적", () => {
  it("초기 snapshot — 모든 source 0건", () => {
    const snap = getErrorTrackingSnapshot();
    expect(snap.sources.stt.callsInWindow).toBe(0);
    expect(snap.sources.gemini.errorCount).toBe(0);
  });

  it("trackSuccess + trackError 누적", () => {
    trackSuccess("stt");
    trackSuccess("stt");
    trackError("stt_network");
    const snap = getErrorTrackingSnapshot();
    expect(snap.sources.stt.callsInWindow).toBe(3); // 2 success + 1 error
    expect(snap.sources.stt.errorCount).toBe(1);
  });
});

describe("checkErrorThresholds — STT 5분 3% 임계", () => {
  it("AC1: 100건 중 4건 에러 (4%) → 임계 초과 + Slack 1건", async () => {
    for (let i = 0; i < 96; i++) trackSuccess("stt");
    for (let i = 0; i < 4; i++) trackError("stt_network");

    const results = await checkErrorThresholds();
    const stt = results.find((r) => r.source === "stt")!;
    expect(stt.errorCount).toBe(4);
    expect(stt.ratio).toBeCloseTo(0.04, 2);
    expect(stt.breached).toBe(true);
    expect(stt.alertSent).toBe(true);
    expect(sendSlackMock).toHaveBeenCalledTimes(1);
    const msg = sendSlackMock.mock.calls[0][0] as string;
    expect(msg).toContain("STT");
    expect(msg).toContain("4.0%");
  });

  it("100건 중 2건 (2%) → 임계 미달, Slack 0건", async () => {
    for (let i = 0; i < 98; i++) trackSuccess("stt");
    for (let i = 0; i < 2; i++) trackError("stt_network");

    const results = await checkErrorThresholds();
    const stt = results.find((r) => r.source === "stt")!;
    expect(stt.breached).toBe(false);
    expect(stt.alertSent).toBe(false);
    expect(sendSlackMock).not.toHaveBeenCalled();
  });

  it("AC4: 중복 Alert 방지 — 임계 초과 지속 시 Slack 1회만", async () => {
    for (let i = 0; i < 96; i++) trackSuccess("stt");
    for (let i = 0; i < 4; i++) trackError("stt_network");

    await checkErrorThresholds();
    expect(sendSlackMock).toHaveBeenCalledTimes(1);

    // 5분 후 재검사 — 같은 윈도우 내, 알림 cooldown 1시간이라 추가 발송 X.
    vi.advanceTimersByTime(5 * 60_000);
    await checkErrorThresholds();
    expect(sendSlackMock).toHaveBeenCalledTimes(1);

    // 1시간 + 1분 후 — cooldown 만료 → 새 알림.
    vi.advanceTimersByTime(56 * 60_000);
    // 추가 에러 발생 (윈도우 prune 후 다시 임계 가능하도록).
    for (let i = 0; i < 96; i++) trackSuccess("stt");
    for (let i = 0; i < 4; i++) trackError("stt_network");
    await checkErrorThresholds();
    expect(sendSlackMock).toHaveBeenCalledTimes(2);
  });
});

describe("checkErrorThresholds — Gemini 1시간 5% 임계 (AC2)", () => {
  it("100건 중 6건 (6%) → 임계 초과 + Slack", async () => {
    for (let i = 0; i < 94; i++) trackSuccess("gemini");
    for (let i = 0; i < 6; i++) trackError("gemini_429");

    const results = await checkErrorThresholds();
    const gemini = results.find((r) => r.source === "gemini")!;
    expect(gemini.ratio).toBeCloseTo(0.06, 2);
    expect(gemini.breached).toBe(true);
    const msg = sendSlackMock.mock.calls[0][0] as string;
    expect(msg).toContain("GEMINI");
    expect(msg).toContain("60분"); // 윈도우
  });

  it("rate_limited 도 에러로 카운트 (SEC-004 자체 차단도 메트릭 포함)", async () => {
    for (let i = 0; i < 90; i++) trackSuccess("gemini");
    for (let i = 0; i < 10; i++) trackError("gemini_rate_limited");

    const results = await checkErrorThresholds();
    expect(results.find((r) => r.source === "gemini")!.errorCount).toBe(10);
  });
});

describe("윈도우 prune — STT 5분 초과 에러 자동 폐기", () => {
  it("에러 발생 후 6분 경과 → 다음 호출 시 prune → errorCount 0", async () => {
    trackError("stt_network");
    expect(getErrorTrackingSnapshot().sources.stt.errorCount).toBe(1);

    vi.advanceTimersByTime(6 * 60_000); // 6분 — 5분 윈도우 밖
    // prune 은 다음 trackError / checkErrorThresholds / snapshot 호출 시 발생.
    const snap = getErrorTrackingSnapshot();
    expect(snap.sources.stt.errorCount).toBe(0);
  });
});

describe("환경 prefix — Vercel ENV / NODE_ENV", () => {
  it("VERCEL_ENV=production → envPrefix='production'", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(getErrorTrackingSnapshot().envPrefix).toBe("production");
  });

  it("NODE_ENV=development (VERCEL_ENV 없음) → 'development'", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getErrorTrackingSnapshot().envPrefix).toBe("development");
  });
});

describe("__resetErrorTrackingForTest", () => {
  it("모든 메트릭 초기화", () => {
    trackError("stt_network");
    trackSuccess("gemini");
    __resetErrorTrackingForTest();
    const snap = getErrorTrackingSnapshot();
    expect(snap.sources.stt.callsInWindow).toBe(0);
    expect(snap.sources.gemini.callsInWindow).toBe(0);
  });
});

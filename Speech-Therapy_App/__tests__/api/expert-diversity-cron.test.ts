// FR-C-HITL-007 — /api/cron/expert-diversity 독립 다양성 Cron 통합 테스트.
//
// 격리: cron-auth / system-config / retraining(aggregateByExpert) / slack mock.
//   expert-diversity lib 은 real (HHI/Gini/Top3 순수 계산 실검증).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentPhaseMock = vi.fn();
const isWithinMock = vi.fn();
const setConfigMock = vi.fn();
const aggregateByExpertMock = vi.fn();
const sendSlackMock = vi.fn();

vi.mock("@/lib/cron-auth", () => ({
  verifyCronSecret: (request: Request) =>
    request.headers.get("authorization") === "Bearer test-cron-secret"
      ? { ok: true }
      : { ok: false, reason: "invalid_authorization" },
}));
vi.mock("@/lib/config/system-config", () => ({
  SYSTEM_CONFIG_KEYS: { HITL_DIVERSITY_ALERTED_AT: "hitl_diversity_alerted_at" },
  getCurrentPhase: () => getCurrentPhaseMock(),
  isWithinIdempotencyWindow: (...a: unknown[]) => isWithinMock(...a),
  setSystemConfig: (...a: unknown[]) => setConfigMock(...a),
}));
vi.mock("@/lib/hitl/retraining", () => ({
  aggregateByExpert: (since: Date) => aggregateByExpertMock(since),
}));
vi.mock("@/lib/notifications/slack", () => ({
  sendSlackMessage: (t: string) => sendSlackMock(t),
}));

import { GET } from "@/app/api/cron/expert-diversity/route";

function makeRequest(authorization: string | null = "Bearer test-cron-secret"): Request {
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  return new Request("http://localhost/api/cron/expert-diversity", { headers });
}

beforeEach(() => {
  getCurrentPhaseMock.mockReset();
  isWithinMock.mockReset();
  setConfigMock.mockReset();
  aggregateByExpertMock.mockReset();
  sendSlackMock.mockReset();
  getCurrentPhaseMock.mockResolvedValue("phase1");
  isWithinMock.mockResolvedValue(false);
  setConfigMock.mockResolvedValue(undefined);
  sendSlackMock.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("/api/cron/expert-diversity — FR-C-HITL-007", () => {
  it("[1] CRON_SECRET 누락 → 401", async () => {
    const res = await GET(makeRequest(null));
    expect(res.status).toBe(401);
    expect(aggregateByExpertMock).not.toHaveBeenCalled();
  });

  it("[2] Phase 1 정상 (Top-3 ≤ 60%) → alert 0건", async () => {
    const dist = new Map<string, number>();
    for (let i = 0; i < 10; i++) dist.set(`e${i}`, 50); // 균등 → top3 30%
    aggregateByExpertMock.mockResolvedValue(dist);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.passed).toBe(true);
    expect(body.alertSent).toBe(false);
    expect(sendSlackMock).not.toHaveBeenCalled();
  });

  it("[3] Phase 1 위반 (Top-3 > 60%) → Slack alert + alerted_at 기록", async () => {
    // A400/D300/B200/C100 → top3 = 900/1000 = 90%
    const dist = new Map([
      ["A", 400],
      ["B", 200],
      ["C", 100],
      ["D", 300],
    ]);
    aggregateByExpertMock.mockResolvedValue(dist);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.passed).toBe(false);
    expect(body.alertSent).toBe(true);
    expect(sendSlackMock).toHaveBeenCalledOnce();
    expect(setConfigMock).toHaveBeenCalledWith(
      "hitl_diversity_alerted_at",
      expect.any(String),
    );
  });

  it("[4] 위반 + 멱등성 윈도우 이내 → alert skip (중복 차단)", async () => {
    isWithinMock.mockResolvedValue(true);
    const dist = new Map([
      ["A", 900],
      ["B", 100],
    ]);
    aggregateByExpertMock.mockResolvedValue(dist);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.passed).toBe(false);
    expect(body.idempotencySkip).toBe(true);
    expect(body.alertSent).toBe(false);
    expect(sendSlackMock).not.toHaveBeenCalled();
    expect(setConfigMock).not.toHaveBeenCalled();
  });

  it("[5] R4 — 응답에 expertId 미노출 (집계 통계만)", async () => {
    const dist = new Map([
      ["expert-secret-uuid", 900],
      ["B", 100],
    ]);
    aggregateByExpertMock.mockResolvedValue(dist);
    const res = await GET(makeRequest());
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("expert-secret-uuid");
  });

  it("[6] Phase 2 분기 — getCurrentPhase=phase2 반영", async () => {
    getCurrentPhaseMock.mockResolvedValue("phase2");
    aggregateByExpertMock.mockResolvedValue(new Map([["A", 50], ["B", 50]]));
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.phase).toBe("phase2");
  });

  it("[7] aggregateByExpert throw → 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    aggregateByExpertMock.mockRejectedValue(new Error("db"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    spy.mockRestore();
  });
});

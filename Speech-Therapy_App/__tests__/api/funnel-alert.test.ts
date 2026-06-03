// MON-001 (#64) — /api/cron/funnel-alert cron route 단위 테스트.
//
// 검증 시나리오 (총 9 케이스):
//   1. production CRON_SECRET 헤더 누락 → 401
//   2. 잘못된 Bearer → 401
//   3. 정상 — 어제 conv 변동 > 20%p → Slack 1회 발송 (alertsSent=1) + 본문 정합 R4 + 금칙어 검증
//   4. 변동 ≤ 20%p && ≤ 20% rel → skip (alertsSent=0, reason='no_significant_delta')
//   5. 어제 totalUsers = 0 → skipped 'no_target_data' (Slack 호출 0)
//   6. 그제 totalUsers = 0 (첫 day, baseline 부재) → skipped 'no_baseline_data'
//   7. Slack 실패 (HTTP 500) → errors 누적, alertsSent=0, 200 반환
//   8. Slack skipped (SLACK_WEBHOOK_URL 미설정) → errors 누적 (slack_skipped)
//   9. DB 실패 → 500 + INTERNAL_ERROR

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Prisma mock — AnalyticsEvent 재연결 후 funnel 은 6단계 모두 findMany(distinct userId).
const analyticsFindManyMock = vi.fn(); // landing / diagnose_started / mission_started
const evalFindManyMock = vi.fn(); // diagnose_completed
const sessionFindManyMock = vi.fn(); // mission_completed
const rewardFindManyMock = vi.fn(); // reward_granted

vi.mock("@/lib/db", () => ({
  prisma: {
    analyticsEvent: {
      findMany: (...args: unknown[]) => analyticsFindManyMock(...args),
    },
    evaluationResult: {
      findMany: (...args: unknown[]) => evalFindManyMock(...args),
    },
    sessionLog: {
      findMany: (...args: unknown[]) => sessionFindManyMock(...args),
    },
    rewardLog: {
      findMany: (...args: unknown[]) => rewardFindManyMock(...args),
    },
  },
}));

import { GET, buildFunnelAlertMessage } from "@/app/api/cron/funnel-alert/route";

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;
const ORIGINAL_SLACK_URL = process.env.SLACK_WEBHOOK_URL;
const ORIGINAL_FETCH = globalThis.fetch;

/// aggregateFunnel 호출을 시뮬레이션하는 helper (AnalyticsEvent 재연결 후).
///
/// aggregateFunnel(yesterday) + aggregateFunnel(dayBefore) 동시 호출. 각 단계 소스:
///   - landing/diagnose_started/mission_started = analyticsEvent.findMany (step + day 분기)
///   - diagnose_completed = evaluationResult.findMany (day)
///   - mission_completed  = sessionLog.findMany (day, startTime)
///   - reward_granted     = rewardLog.findMany (day)
/// 모두 distinct userId rows 배열 반환(length = 카운트). 일자 분기는 where.createdAt/startTime.gte.
function userRows(n: number): { userId: string }[] {
  return Array.from({ length: n }, (_, i) => ({ userId: `u-${i}` }));
}

function setupFunnelMocks(
  yesterday: { landing: number; dStart: number; dComplete: number; mStart: number; mComplete: number; reward: number },
  dayBefore: { landing: number; dStart: number; dComplete: number; mStart: number; mComplete: number; reward: number },
) {
  const isYesterday = (gte: Date) => gte.getUTCDate() === Y_GTE.getUTCDate();

  // 진입/시작 = AnalyticsEvent funnel_step_reached, step(properties.equals) + day 분기.
  analyticsFindManyMock.mockImplementation(
    (arg: { where: { createdAt: { gte: Date }; properties: { equals: string } } }) => {
      const day = isYesterday(arg.where.createdAt.gte) ? yesterday : dayBefore;
      const step = arg.where.properties.equals;
      const n =
        step === "landing"
          ? day.landing
          : step === "diagnose_started"
            ? day.dStart
            : step === "mission_started"
              ? day.mStart
              : 0;
      return Promise.resolve(userRows(n));
    },
  );
  // diagnose_completed = EvaluationResult, day 분기.
  evalFindManyMock.mockImplementation((arg: { where: { createdAt: { gte: Date } } }) => {
    const day = isYesterday(arg.where.createdAt.gte) ? yesterday : dayBefore;
    return Promise.resolve(userRows(day.dComplete));
  });
  // mission_completed = SessionLog, day 분기(startTime).
  sessionFindManyMock.mockImplementation((arg: { where: { startTime: { gte: Date } } }) => {
    const day = isYesterday(arg.where.startTime.gte) ? yesterday : dayBefore;
    return Promise.resolve(userRows(day.mComplete));
  });
  // reward_granted = RewardLog, day 분기.
  rewardFindManyMock.mockImplementation((arg: { where: { createdAt: { gte: Date } } }) => {
    const day = isYesterday(arg.where.createdAt.gte) ? yesterday : dayBefore;
    return Promise.resolve(userRows(day.reward));
  });
}

// 테스트 기준 시각 — 2026-05-22T12:00:00Z 고정.
// 어제 (yesterday) = 2026-05-21T00:00:00Z ~ 2026-05-22T00:00:00Z.
// 그제 (dayBefore) = 2026-05-20T00:00:00Z ~ 2026-05-21T00:00:00Z.
const Y_GTE = new Date("2026-05-21T00:00:00Z");

beforeEach(() => {
  analyticsFindManyMock.mockReset();
  evalFindManyMock.mockReset();
  sessionFindManyMock.mockReset();
  rewardFindManyMock.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-22T12:00:00Z"));
  vi.unstubAllEnvs();
  vi.stubEnv("NODE_ENV", "test");
  process.env.CRON_SECRET = "test-secret";
  process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/T/B/X";
  globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
  process.env.SLACK_WEBHOOK_URL = ORIGINAL_SLACK_URL;
  globalThis.fetch = ORIGINAL_FETCH;
});

function authedRequest(): Request {
  return new Request("http://localhost/api/cron/funnel-alert", {
    headers: { Authorization: "Bearer test-secret" },
  });
}

// =============================================================================
// [시나리오 1, 2] auth 가드
// =============================================================================
describe("/api/cron/funnel-alert — auth 가드", () => {
  it("[시나리오 1] CRON_SECRET 헤더 누락 → 401", async () => {
    const res = await GET(new Request("http://localhost/api/cron/funnel-alert"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("UNAUTHORIZED");
    expect(evalFindManyMock).not.toHaveBeenCalled();
  });

  it("[시나리오 2] 잘못된 Bearer → 401", async () => {
    const res = await GET(
      new Request("http://localhost/api/cron/funnel-alert", {
        headers: { Authorization: "Bearer wrong" },
      }),
    );
    expect(res.status).toBe(401);
  });
});

// =============================================================================
// [시나리오 3] 정상 — 큰 변동 → Slack 발송
// =============================================================================
describe("/api/cron/funnel-alert — 정상 alert", () => {
  it("[시나리오 3] 어제 mission_started conv 40% / 그제 70% → Slack 1회 + 본문 정합", async () => {
    // yesterday: landing 100, d_start 80, d_complete 80, m_start 32 (40% of d_complete),
    //            m_complete 16, reward 5.
    // dayBefore: landing 100, d_start 80, d_complete 80, m_start 56 (70% of d_complete),
    //            m_complete 16, reward 5.
    // → mission_started conversionFromPrev: yesterday 40% vs dayBefore 70% → Δpp = -30 (절대).
    setupFunnelMocks(
      { landing: 100, dStart: 80, dComplete: 80, mStart: 32, mComplete: 16, reward: 5 },
      { landing: 100, dStart: 80, dComplete: 80, mStart: 56, mComplete: 16, reward: 5 },
    );

    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job).toBe("funnel-alert");
    expect(body.skipped).toBe(false);
    expect(body.alertDate).toBe("2026-05-21");
    expect(body.baselineDate).toBe("2026-05-20");
    expect(body.alertsSent).toBe(1);
    expect(body.errors).toEqual([]);
    expect(body.triggeredSteps).toBeGreaterThanOrEqual(1);

    // Slack 1회 호출.
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://hooks.slack.com/services/T/B/X");
    const sentBody = JSON.parse(init.body as string) as { text: string };
    expect(sentBody.text).toContain("퍼널 CVR 일간 ±20% 변동");
    expect(sentBody.text).toContain("2026-05-21");
    expect(sentBody.text).toContain("2026-05-20");
    expect(sentBody.text).toContain("mission_started");

    // R4 — userId / email / sessionId 키워드 0건.
    for (const forbidden of ["userId", "email", "sessionId", "anonymousUserId"]) {
      expect(sentBody.text).not.toContain(forbidden);
    }
    // CON-04 금칙어 0건.
    for (const forbidden of ["치료", "진단", "장애"]) {
      expect(sentBody.text).not.toContain(forbidden);
    }
  });
});

// =============================================================================
// [시나리오 4] 변동 ≤ 20% → skip
// =============================================================================
describe("/api/cron/funnel-alert — skip (변동 작음)", () => {
  it("[시나리오 4] 모든 단계 변동 ≤ 20%p && ≤ 20% rel → no_significant_delta", async () => {
    // yesterday == dayBefore (완전 동일) → Δ = 0.
    setupFunnelMocks(
      { landing: 100, dStart: 80, dComplete: 70, mStart: 50, mComplete: 30, reward: 20 },
      { landing: 100, dStart: 80, dComplete: 70, mStart: 50, mComplete: 30, reward: 20 },
    );

    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alertsSent).toBe(0);
    expect(body.reason).toBe("no_significant_delta");
    expect(body.errors).toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// =============================================================================
// [시나리오 5] 어제 데이터 부재
// =============================================================================
describe("/api/cron/funnel-alert — 데이터 부재 skip", () => {
  it("[시나리오 5] 어제 totalUsers = 0 → skipped 'no_target_data'", async () => {
    setupFunnelMocks(
      { landing: 0, dStart: 0, dComplete: 0, mStart: 0, mComplete: 0, reward: 0 },
      { landing: 50, dStart: 30, dComplete: 25, mStart: 15, mComplete: 10, reward: 5 },
    );

    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(body.reason).toBe("no_target_data");
    expect(body.alertsSent).toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("[시나리오 6] 그제 totalUsers = 0 (첫 day, baseline 부재) → skipped 'no_baseline_data'", async () => {
    setupFunnelMocks(
      { landing: 50, dStart: 30, dComplete: 25, mStart: 15, mComplete: 10, reward: 5 },
      { landing: 0, dStart: 0, dComplete: 0, mStart: 0, mComplete: 0, reward: 0 },
    );

    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(body.reason).toBe("no_baseline_data");
    expect(body.alertsSent).toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// =============================================================================
// [시나리오 7-8] Slack 실패 / skip
// =============================================================================
describe("/api/cron/funnel-alert — Slack 실패 graceful", () => {
  it("[시나리오 7] Slack 응답 ok=false (HTTP 500) → errors 누적, alertsSent=0, 200", async () => {
    setupFunnelMocks(
      { landing: 100, dStart: 80, dComplete: 80, mStart: 32, mComplete: 16, reward: 5 },
      { landing: 100, dStart: 80, dComplete: 80, mStart: 56, mComplete: 16, reward: 5 },
    );
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("err", { status: 500 }));

    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alertsSent).toBe(0);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].reason).toContain("slack_failed");
  });

  it("[시나리오 8] SLACK_WEBHOOK_URL 미설정 → errors[0].reason = 'slack_skipped'", async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    setupFunnelMocks(
      { landing: 100, dStart: 80, dComplete: 80, mStart: 32, mComplete: 16, reward: 5 },
      { landing: 100, dStart: 80, dComplete: 80, mStart: 56, mComplete: 16, reward: 5 },
    );

    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alertsSent).toBe(0);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].reason).toBe("slack_skipped");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// =============================================================================
// [시나리오 9] DB 실패
// =============================================================================
describe("/api/cron/funnel-alert — DB 실패", () => {
  it("[시나리오 9] aggregateFunnel 내부 prisma 실패 → 500 + INTERNAL_ERROR", async () => {
    evalFindManyMock.mockRejectedValue(new Error("DB down"));

    const res = await GET(authedRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("INTERNAL_ERROR");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// =============================================================================
// buildFunnelAlertMessage 단위 — R4 + 금칙어
// =============================================================================
describe("buildFunnelAlertMessage — R4 + 금칙어 + 본문 정합", () => {
  it("step / direction / Δpp / Δrel / 날짜 모두 포함, 식별자 + 금칙어 0건", () => {
    const text = buildFunnelAlertMessage({
      alertDate: "2026-05-21",
      baselineDate: "2026-05-20",
      items: [
        {
          step: "mission_started",
          baselineConversion: 0.7,
          targetConversion: 0.4,
          deltaPp: -30,
          deltaRelative: -42.857,
          direction: "down",
        },
        {
          step: "reward_granted",
          baselineConversion: 0.05,
          targetConversion: 0.1,
          deltaPp: 5,
          deltaRelative: 100,
          direction: "up",
        },
      ],
    });

    expect(text).toContain("2026-05-21");
    expect(text).toContain("2026-05-20");
    expect(text).toContain("mission_started");
    expect(text).toContain("reward_granted");
    expect(text).toContain("▼");
    expect(text).toContain("▲");
    expect(text).toContain("-30.0%p");
    expect(text).toContain("5.0%p");

    for (const forbidden of ["userId", "email", "anonymousUserId", "sessionId"]) {
      expect(text).not.toContain(forbidden);
    }
    for (const forbidden of ["치료", "진단", "장애"]) {
      expect(text).not.toContain(forbidden);
    }
  });
});

// FR-C-010 (#33) — /api/cron/weekly-reports route 전용 단위 테스트.
//
// 본 파일은 route 표면 검증에 집중 (aggregator 는 mock).
// aggregator 내부 prisma 호출 검증은 __tests__/lib/weekly-aggregator.test.ts.
// 통합 (route + aggregator + RSC) 시나리오는 __tests__/integration/weekly-reports.test.ts.
//
// 시나리오:
//   1. CRON_SECRET 누락 → 401
//   2. CRON_SECRET 오답 → 401
//   3. 정상 Bearer + 0 user → 200 + processed=0
//   4. 1 user 정상 → upsert 1회 + successCount=1
//   5. 다중 user 정상 → upsert N회 + wAurAchievedCount 누적
//   6. aggregate null (0 row) → upsert skip + successCount=0
//   7. 일부 user 실패 → 다른 user 계속 진행 + failureCount + errors graceful
//   8. getActiveUsers 실패 → 500 INTERNAL_ERROR + DB 후속 호출 0건
//   9. failureCount ≥ 5 → sendSlackMessage 호출 (Slack URL 설정 시)
//  10. 멱등 — 동일 cron 재실행 시 동일 upsert 호출 (DB unique 키가 update path 보장)
//  11. wAurAchieved 카운트 정확성 — 충족/미충족 혼합 user 집합

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ----- Mocks -----
const verifyCronSecretMock = vi.fn();
const getActiveUsersMock = vi.fn();
const aggregateWeeklyReportMock = vi.fn();
const upsertWeeklyReportMock = vi.fn();
const sendSlackMessageMock = vi.fn();

vi.mock("@/lib/cron-auth", () => ({
  verifyCronSecret: (...args: unknown[]) => verifyCronSecretMock(...args),
}));

vi.mock("@/lib/reports/weekly-aggregator", async () => {
  // W_AUR_MIN_SESSIONS / computeMockPredictedScore 등은 실 export 가 필요할 수 있으므로
  // 일부 helper 는 실 모듈에서 가져온 뒤 핵심 3개 (getActiveUsers / aggregate / upsert) 만 mock.
  return {
    getActiveUsers: (...args: unknown[]) => getActiveUsersMock(...args),
    aggregateWeeklyReport: (...args: unknown[]) => aggregateWeeklyReportMock(...args),
    upsertWeeklyReport: (...args: unknown[]) => upsertWeeklyReportMock(...args),
    W_AUR_MIN_SESSIONS: 4,
  };
});

vi.mock("@/lib/notifications/slack", () => ({
  sendSlackMessage: (...args: unknown[]) => sendSlackMessageMock(...args),
}));

vi.mock("@/lib/weekly-report", () => ({
  // 본 route 에선 getCurrentWeekNumber 만 사용 — 실 구현 그대로 (날짜 의존 없음).
  getCurrentWeekNumber: (date: Date) => ({
    year: date.getUTCFullYear(),
    week: 20, // 결정성 — week 계산 정확성은 lib/weekly-report.test.ts 가 검증.
  }),
}));

import { GET } from "@/app/api/cron/weekly-reports/route";

function makeRequest(): Request {
  return new Request("http://localhost/api/cron/weekly-reports");
}

beforeEach(() => {
  verifyCronSecretMock.mockReset();
  getActiveUsersMock.mockReset();
  aggregateWeeklyReportMock.mockReset();
  upsertWeeklyReportMock.mockReset();
  sendSlackMessageMock.mockReset();

  // 기본: 인증 통과.
  verifyCronSecretMock.mockReturnValue({ ok: true });
  // 기본: 0 user (각 it 에서 override).
  getActiveUsersMock.mockResolvedValue([]);
  sendSlackMessageMock.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ----- 헬퍼 -----
function makeAggData(userId: string, sessionCount: number, wAurAchieved: boolean) {
  return {
    userId,
    year: 2026,
    weekNumber: 20,
    scoreTrend: [],
    articulationAvg: 80,
    linguisticAvg: 70,
    acousticAvg: 75,
    peerPercentileAvg: 60,
    sessionCount,
    wAurAchieved,
    predictedNextScore: 80,
  };
}

// ============================================================================
// 시나리오 1~2: 인증
// ============================================================================
describe("FR-C-010 cron route — 인증", () => {
  it("CRON_SECRET 검증 실패 → 401 + DB 호출 0건", async () => {
    verifyCronSecretMock.mockReturnValue({ ok: false, reason: "invalid_authorization" });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string; reason?: string };
    expect(body.error).toBe("UNAUTHORIZED");
    expect(body.reason).toBe("invalid_authorization");
    expect(getActiveUsersMock).not.toHaveBeenCalled();
  });

  it("CRON_SECRET missing in production → 401 + reason=missing_secret_in_production", async () => {
    verifyCronSecretMock.mockReturnValue({ ok: false, reason: "missing_secret_in_production" });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = (await res.json()) as { reason: string };
    expect(body.reason).toBe("missing_secret_in_production");
  });
});

// ============================================================================
// 시나리오 3~5: 처리량
// ============================================================================
describe("FR-C-010 cron route — 처리량", () => {
  it("활성 user 0명 → 200 + processedUsers=0 + upsert 0회", async () => {
    getActiveUsersMock.mockResolvedValue([]);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      processedUsers: number;
      successCount: number;
      failureCount: number;
      wAurAchievedCount: number;
    };
    expect(body.processedUsers).toBe(0);
    expect(body.successCount).toBe(0);
    expect(body.failureCount).toBe(0);
    expect(body.wAurAchievedCount).toBe(0);
    expect(aggregateWeeklyReportMock).not.toHaveBeenCalled();
    expect(upsertWeeklyReportMock).not.toHaveBeenCalled();
  });

  it("1 user 정상 → aggregate 1 + upsert 1 + successCount 1", async () => {
    getActiveUsersMock.mockResolvedValue(["user-a"]);
    aggregateWeeklyReportMock.mockResolvedValue(makeAggData("user-a", 5, true));

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(aggregateWeeklyReportMock).toHaveBeenCalledTimes(1);
    expect(upsertWeeklyReportMock).toHaveBeenCalledTimes(1);

    const body = (await res.json()) as {
      successCount: number;
      wAurAchievedCount: number;
    };
    expect(body.successCount).toBe(1);
    expect(body.wAurAchievedCount).toBe(1);
  });

  it("다중 user — 5명 모두 정상 처리 + wAur 충족 카운트 정확", async () => {
    getActiveUsersMock.mockResolvedValue(["u1", "u2", "u3", "u4", "u5"]);
    aggregateWeeklyReportMock
      .mockResolvedValueOnce(makeAggData("u1", 5, true))
      .mockResolvedValueOnce(makeAggData("u2", 4, true))
      .mockResolvedValueOnce(makeAggData("u3", 3, false))
      .mockResolvedValueOnce(makeAggData("u4", 1, false))
      .mockResolvedValueOnce(makeAggData("u5", 7, true));

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      successCount: number;
      wAurAchievedCount: number;
    };
    expect(body.successCount).toBe(5);
    // u1 / u2 / u5 만 wAur 충족.
    expect(body.wAurAchievedCount).toBe(3);
  });
});

// ============================================================================
// 시나리오 6: aggregate null skip
// ============================================================================
describe("FR-C-010 cron route — aggregate null", () => {
  it("aggregate 가 null (0 session) → upsert skip + successCount 미증가", async () => {
    getActiveUsersMock.mockResolvedValue(["user-empty"]);
    aggregateWeeklyReportMock.mockResolvedValueOnce(null);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(upsertWeeklyReportMock).not.toHaveBeenCalled();
    const body = (await res.json()) as { successCount: number; failureCount: number };
    expect(body.successCount).toBe(0);
    expect(body.failureCount).toBe(0);
  });
});

// ============================================================================
// 시나리오 7: 일부 user 실패 격리
// ============================================================================
describe("FR-C-010 cron route — 부분 실패 격리", () => {
  it("일부 user aggregate 실패 → 다른 user 계속 진행 + failureCount + 200 응답", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getActiveUsersMock.mockResolvedValue(["ok-1", "fail", "ok-2"]);
    aggregateWeeklyReportMock
      .mockResolvedValueOnce(makeAggData("ok-1", 5, true))
      .mockRejectedValueOnce(new Error("aggregate fail"))
      .mockResolvedValueOnce(makeAggData("ok-2", 2, false));

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      successCount: number;
      failureCount: number;
      wAurAchievedCount: number;
    };
    expect(body.successCount).toBe(2);
    expect(body.failureCount).toBe(1);
    expect(body.wAurAchievedCount).toBe(1);
    expect(upsertWeeklyReportMock).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("일부 user upsert 실패 → failureCount 증가 + 격리", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getActiveUsersMock.mockResolvedValue(["ok", "broken"]);
    aggregateWeeklyReportMock
      .mockResolvedValueOnce(makeAggData("ok", 5, true))
      .mockResolvedValueOnce(makeAggData("broken", 5, true));
    upsertWeeklyReportMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("upsert fail"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { successCount: number; failureCount: number };
    expect(body.successCount).toBe(1);
    expect(body.failureCount).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

// ============================================================================
// 시나리오 8: getActiveUsers 실패 → 500
// ============================================================================
describe("FR-C-010 cron route — getActiveUsers 실패", () => {
  it("getActiveUsers 실패 → 500 INTERNAL_ERROR + aggregate/upsert 호출 0건", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getActiveUsersMock.mockRejectedValueOnce(new Error("DB down"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("INTERNAL_ERROR");
    expect(aggregateWeeklyReportMock).not.toHaveBeenCalled();
    expect(upsertWeeklyReportMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

// ============================================================================
// 시나리오 9: Slack alert
// ============================================================================
describe("FR-C-010 cron route — Slack alert (≥ 5건 실패)", () => {
  it("failureCount ≥ 5 → sendSlackMessage 호출", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const users = ["u1", "u2", "u3", "u4", "u5"];
    getActiveUsersMock.mockResolvedValue(users);
    for (let i = 0; i < users.length; i++) {
      aggregateWeeklyReportMock.mockRejectedValueOnce(new Error(`fail-${i}`));
    }

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { failureCount: number };
    expect(body.failureCount).toBe(5);
    expect(sendSlackMessageMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("failureCount < 5 → Slack 호출 0건", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getActiveUsersMock.mockResolvedValue(["u1", "u2"]);
    aggregateWeeklyReportMock
      .mockRejectedValueOnce(new Error("f1"))
      .mockRejectedValueOnce(new Error("f2"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(sendSlackMessageMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

// ============================================================================
// 시나리오 10: 멱등 (수동 재실행 안전)
// ============================================================================
describe("FR-C-010 cron route — 멱등 재실행 안전", () => {
  it("동일 cron 2회 호출 → upsert payload 동일 (DB 가 update path 처리)", async () => {
    getActiveUsersMock.mockResolvedValue(["user-z"]);
    aggregateWeeklyReportMock
      .mockResolvedValueOnce(makeAggData("user-z", 5, true))
      .mockResolvedValueOnce(makeAggData("user-z", 5, true));

    await GET(makeRequest());
    await GET(makeRequest());

    expect(upsertWeeklyReportMock).toHaveBeenCalledTimes(2);
    const firstArg = upsertWeeklyReportMock.mock.calls[0][0] as { userId: string; sessionCount: number };
    const secondArg = upsertWeeklyReportMock.mock.calls[1][0] as { userId: string; sessionCount: number };
    expect(firstArg.userId).toBe("user-z");
    expect(secondArg.userId).toBe("user-z");
    expect(firstArg.sessionCount).toBe(secondArg.sessionCount);
  });
});

// TEST-010 — 주간 Cron 리포트 생성 + RSC `/reports` 통합 테스트.
//
// 검증 대상:
//   - GET /api/cron/weekly-reports (FR-C-010, REQ-FUNC-027)
//   - RSC /reports 페이지 응답 시간 (FR-Q-005, REQ-NF-004)
//
// 6 시나리오:
//   1. CRON_SECRET 인증 — 누락/오답 시 401, 정상 시 200
//   2. cron 실행 → unique user 순회 → aggregate → weeklyReport.upsert 호출
//   3. RSC /reports 단일 호출 latency 측정 (mock 환경 — 실 부하/p95 는 k6, PERF-001)
//   4. cron 처리 시간 ≤ 30s (mock 환경)
//   5. graceful — findMany 실패 시 500 + 로그
//   6. 격리 — 실 외부 fetch / 실 DB 호출 0건 (mock 으로만 동작)
//
// 참고: REQ-NF-004 의 RSC p95 ≤ 3,000ms 실 부하 검증은 본 PR 범위 외 — k6/Playwright 기반
// PERF-001 task 에서 별도 측정. 본 vitest 통합은 mock 환경에서 단일 호출 latency 만 측정.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ----- Mock infra -----
const evaluationResultFindManyMock = vi.fn();
const evaluationResultCountMock = vi.fn();
const evaluationResultFindFirstMock = vi.fn();
const weeklyReportUpsertMock = vi.fn();
const cookieGetMock = vi.fn();
const supabaseGetUserMock = vi.fn();
const predictNextScoreMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    evaluationResult: {
      findMany: (...args: unknown[]) => evaluationResultFindManyMock(...args),
      count: (...args: unknown[]) => evaluationResultCountMock(...args),
      findFirst: (...args: unknown[]) => evaluationResultFindFirstMock(...args),
    },
    weeklyReport: {
      upsert: (...args: unknown[]) => weeklyReportUpsertMock(...args),
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieGetMock(name),
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => supabaseGetUserMock(),
    },
  }),
}));

vi.mock("@/app/actions/prediction", () => ({
  predictNextScore: (...args: unknown[]) => predictNextScoreMock(...args),
}));

// next/link → 단순 <a> (RSC 렌더 비용 최소화).
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => ({
    type: "a",
    props: { href, ...rest, children },
    key: null,
    $$typeof: Symbol.for("react.element"),
  }),
}));

// Client component mocks — RSC 페이지 자체 렌더 시간을 측정하기 위해 자식 컴포넌트는 stub.
vi.mock("@/app/(public)/reports/WeeklyReportChart", () => ({
  WeeklyReportChart: () => null,
}));
vi.mock("@/app/(public)/reports/PrintButton", () => ({
  PrintButton: () => null,
}));
vi.mock("@/app/(public)/reports/PredictionCard", () => ({
  PredictionCard: () => null,
}));
vi.mock("@/app/(public)/reports/ReportEmptyState", () => ({
  ReportEmptyState: () => null,
}));

// 실 외부 호출 0건 검증을 위한 fetch spy.
const ORIGINAL_FETCH = globalThis.fetch;
const fetchSpy = vi.fn(async () => new Response(null, { status: 200 }));

// vi.mock 이 hoist 된 후에 module import.
import { GET as cronGET } from "@/app/api/cron/weekly-reports/route";
import ReportsPage from "@/app/(public)/reports/page";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/cron/weekly-reports", { headers });
}

beforeEach(() => {
  evaluationResultFindManyMock.mockReset();
  evaluationResultCountMock.mockReset();
  evaluationResultFindFirstMock.mockReset();
  weeklyReportUpsertMock.mockReset();
  cookieGetMock.mockReset();
  supabaseGetUserMock.mockReset();
  predictNextScoreMock.mockReset();
  fetchSpy.mockClear();
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
  vi.stubEnv("CRON_SECRET", "test-secret");
  vi.stubEnv("VERCEL_ENV", "production");
  // Slack 미설정 → 외부 fetch 호출 0건 보장 (sendSlackMessage 가 skipped 처리).
  vi.stubEnv("SLACK_WEBHOOK_URL", "");
  // 기본 cron 동작 — 0 user 시.
  evaluationResultFindManyMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = ORIGINAL_FETCH;
});

// ============================================================================
// 시나리오 1: CRON_SECRET 인증
// ============================================================================
describe("TEST-010 시나리오 1 — CRON_SECRET 인증", () => {
  it("Authorization 헤더 누락 → 401 UNAUTHORIZED", async () => {
    const res = await cronGET(makeRequest());
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string; reason?: string };
    expect(body.error).toBe("UNAUTHORIZED");
    expect(body.reason).toBe("invalid_authorization");
    // 인증 실패 시 DB 접근 0건.
    expect(evaluationResultFindManyMock).not.toHaveBeenCalled();
  });

  it("잘못된 Bearer 값 → 401", async () => {
    const res = await cronGET(makeRequest({ authorization: "Bearer wrong-secret" }));
    expect(res.status).toBe(401);
  });

  it("정상 Bearer + 0 user → 200 + successCount=0", async () => {
    evaluationResultFindManyMock.mockResolvedValue([]);
    const res = await cronGET(makeRequest({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      job: string;
      successCount: number;
      failureCount: number;
    };
    expect(body.job).toBe("weekly-reports");
    expect(body.successCount).toBe(0);
    expect(body.failureCount).toBe(0);
    expect(weeklyReportUpsertMock).not.toHaveBeenCalled();
  });
});

// ============================================================================
// 시나리오 2: cron 실행 → aggregate → upsert
// ============================================================================
describe("TEST-010 시나리오 2 — unique user 순회 + weeklyReport.upsert", () => {
  it("3명 unique user → 각 aggregate + upsert 3회 (멱등성 UPSERT)", async () => {
    // 1차 findMany: cron route 의 unique user 추출.
    // 2~4차 findMany: aggregateWeeklyScores 가 각 user 별 호출 (lib/weekly-report.ts).
    evaluationResultFindManyMock
      .mockResolvedValueOnce([
        { userId: "user-a" },
        { userId: "user-b" },
        { userId: "user-c" },
      ])
      // user-a — 2 row.
      .mockResolvedValueOnce([
        makeEvaluationRow("user-a", "2026-05-18", 80, 70, 75),
        makeEvaluationRow("user-a", "2026-05-19", 85, 75, 80),
      ])
      // user-b — 1 row.
      .mockResolvedValueOnce([makeEvaluationRow("user-b", "2026-05-18", 60, 55, 50)])
      // user-c — 1 row.
      .mockResolvedValueOnce([makeEvaluationRow("user-c", "2026-05-20", 90, 88, 85)]);

    weeklyReportUpsertMock.mockResolvedValue({ id: "wr-1" });

    const res = await cronGET(makeRequest({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      successCount: number;
      failureCount: number;
      durationMs: number;
    };
    expect(body.successCount).toBe(3);
    expect(body.failureCount).toBe(0);
    expect(weeklyReportUpsertMock).toHaveBeenCalledTimes(3);

    // upsert 호출 구조 검증 — UPSERT 패턴 (멱등성).
    const firstCallArg = weeklyReportUpsertMock.mock.calls[0][0] as {
      where: { userId_year_weekNumber: { userId: string } };
      create: { sessionCount: number };
      update: { sessionCount: number };
    };
    expect(firstCallArg.where.userId_year_weekNumber.userId).toBe("user-a");
    expect(firstCallArg.create.sessionCount).toBe(2);
    expect(firstCallArg.update.sessionCount).toBe(2);
  });

  it("aggregate 가 null (0 row) 인 user 는 upsert skip", async () => {
    evaluationResultFindManyMock
      .mockResolvedValueOnce([{ userId: "user-empty" }])
      .mockResolvedValueOnce([]); // aggregateWeeklyScores → null.

    const res = await cronGET(makeRequest({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { successCount: number };
    expect(body.successCount).toBe(0);
    expect(weeklyReportUpsertMock).not.toHaveBeenCalled();
  });
});

// ============================================================================
// 시나리오 3: RSC /reports 단일 호출 latency
// ============================================================================
describe("TEST-010 시나리오 3 — RSC /reports 단일 호출 latency", () => {
  // NOTE: 실 부하 (1,000명 + p95 ≤ 3,000ms, REQ-NF-004) 는 본 PR 범위 외.
  // k6/Playwright 기반 PERF-001 task 에서 별도 측정. 본 vitest 통합은 mock 환경의
  // 단일 호출 wall-clock latency 만 측정해 회귀 방지선 (single-call < 3,000ms) 만 확보.
  const SINGLE_CALL_THRESHOLD_MS = 3_000;

  it("익명 사용자 + 0건 → EmptyState 분기 단일 렌더 < 3,000ms", async () => {
    supabaseGetUserMock.mockResolvedValue({ data: { user: null } });
    cookieGetMock.mockReturnValue(undefined);

    const start = Date.now();
    const ui = await ReportsPage();
    const elapsed = Date.now() - start;

    expect(ui).toBeTruthy();
    expect(elapsed).toBeLessThan(SINGLE_CALL_THRESHOLD_MS);
  });

  it("인증 사용자 + full 데이터 → 차트 분기 단일 렌더 < 3,000ms", async () => {
    supabaseGetUserMock.mockResolvedValue({ data: { user: { id: "user-x" } } });
    cookieGetMock.mockReturnValue(undefined);

    // aggregateWeeklyScores (본 주) — 5 row.
    // aggregateWeeklyScores (직전 주) — 3 row.
    evaluationResultFindManyMock
      .mockResolvedValueOnce(
        Array.from({ length: 5 }, (_, i) =>
          makeEvaluationRow("user-x", `2026-05-${18 + i}`, 80 + i, 70 + i, 75 + i),
        ),
      )
      .mockResolvedValueOnce(
        Array.from({ length: 3 }, (_, i) =>
          makeEvaluationRow("user-x", `2026-05-${10 + i}`, 70 + i, 65 + i, 68 + i),
        ),
      );
    evaluationResultCountMock.mockResolvedValue(8);
    evaluationResultFindFirstMock.mockResolvedValue({ createdAt: new Date("2026-05-22") });
    predictNextScoreMock.mockResolvedValue(null);

    const start = Date.now();
    const ui = await ReportsPage();
    const elapsed = Date.now() - start;

    expect(ui).toBeTruthy();
    expect(elapsed).toBeLessThan(SINGLE_CALL_THRESHOLD_MS);
  });

  it("Promise.all 5회 병렬 호출 — 모두 < 3,000ms (단일 호출 회귀 방지)", async () => {
    supabaseGetUserMock.mockResolvedValue({ data: { user: null } });
    cookieGetMock.mockReturnValue(undefined);

    const start = Date.now();
    const results = await Promise.all([
      ReportsPage(),
      ReportsPage(),
      ReportsPage(),
      ReportsPage(),
      ReportsPage(),
    ]);
    const elapsed = Date.now() - start;

    expect(results).toHaveLength(5);
    // 병렬 wall-clock — 단일 호출 기준선과 동일.
    expect(elapsed).toBeLessThan(SINGLE_CALL_THRESHOLD_MS);
  });
});

// ============================================================================
// 시나리오 4: cron 처리 시간 ≤ 30s (mock 환경)
// ============================================================================
describe("TEST-010 시나리오 4 — cron durationMs 측정", () => {
  const MOCK_CRON_THRESHOLD_MS = 30_000;

  it("100명 user mock 처리 — durationMs < 30s (mock 환경 회귀 방지선)", async () => {
    const users = Array.from({ length: 100 }, (_, i) => ({ userId: `user-${i}` }));
    // 1차: unique users.
    evaluationResultFindManyMock.mockResolvedValueOnce(users);
    // 2~101차: 각 user 별 aggregateWeeklyScores — 1 row.
    for (let i = 0; i < 100; i++) {
      evaluationResultFindManyMock.mockResolvedValueOnce([
        makeEvaluationRow(`user-${i}`, "2026-05-19", 80, 70, 75),
      ]);
    }
    weeklyReportUpsertMock.mockResolvedValue({ id: "wr" });

    const res = await cronGET(makeRequest({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { successCount: number; durationMs: number };
    expect(body.successCount).toBe(100);
    expect(body.durationMs).toBeLessThan(MOCK_CRON_THRESHOLD_MS);
  });
});

// ============================================================================
// 시나리오 5: graceful error — findMany 실패 시 500
// ============================================================================
describe("TEST-010 시나리오 5 — DB 실패 시 graceful 500 + 로그", () => {
  it("user 조회 (findMany) 실패 → 500 INTERNAL_ERROR + console.error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    evaluationResultFindManyMock.mockRejectedValueOnce(new Error("DB connection refused"));

    const res = await cronGET(makeRequest({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("INTERNAL_ERROR");
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(weeklyReportUpsertMock).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("사용자별 처리 실패 → failureCount 증가 + 다른 user 계속 처리 (격리)", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    evaluationResultFindManyMock
      .mockResolvedValueOnce([{ userId: "user-ok" }, { userId: "user-fail" }])
      // user-ok aggregate.
      .mockResolvedValueOnce([makeEvaluationRow("user-ok", "2026-05-19", 80, 70, 75)])
      // user-fail aggregate throws.
      .mockRejectedValueOnce(new Error("user query failed"));

    weeklyReportUpsertMock.mockResolvedValue({ id: "wr" });

    const res = await cronGET(makeRequest({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { successCount: number; failureCount: number };
    expect(body.successCount).toBe(1);
    expect(body.failureCount).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

// ============================================================================
// 시나리오 6: 실 외부 호출 0건 — 격리
// ============================================================================
describe("TEST-010 시나리오 6 — 실 외부 호출 0건 (mock-only 격리)", () => {
  it("cron 정상 실행 후 fetch / Slack webhook 호출 0건 (Slack URL 미설정)", async () => {
    evaluationResultFindManyMock
      .mockResolvedValueOnce([{ userId: "user-x" }])
      .mockResolvedValueOnce([makeEvaluationRow("user-x", "2026-05-19", 80, 70, 75)]);
    weeklyReportUpsertMock.mockResolvedValue({ id: "wr" });

    await cronGET(makeRequest({ authorization: "Bearer test-secret" }));

    // SLACK_WEBHOOK_URL 미설정 + failureCount=0 → sendSlackMessage 호출 0회.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("RSC /reports 렌더 후 fetch 0건 (모든 외부는 mock)", async () => {
    supabaseGetUserMock.mockResolvedValue({ data: { user: null } });
    cookieGetMock.mockReturnValue(undefined);

    await ReportsPage();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("실패 ≥ 5건 + Slack URL 미설정 → fetch 0건 (sendSlackMessage 가 skipped)", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // 6명 user 모두 aggregate 실패 → failureCount=6 ≥ SLACK_ALERT_THRESHOLD(5).
    evaluationResultFindManyMock.mockResolvedValueOnce(
      Array.from({ length: 6 }, (_, i) => ({ userId: `user-${i}` })),
    );
    for (let i = 0; i < 6; i++) {
      evaluationResultFindManyMock.mockRejectedValueOnce(new Error("agg fail"));
    }

    const res = await cronGET(makeRequest({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { failureCount: number };
    expect(body.failureCount).toBe(6);
    // SLACK_WEBHOOK_URL="" → sendSlackMessage 가 skipped 반환, fetch 0건.
    expect(fetchSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

// ----- helpers -----
function makeEvaluationRow(
  userId: string,
  isoDate: string,
  articulationScore: number,
  linguisticScore: number,
  acousticScore: number,
) {
  return {
    id: `er-${userId}-${isoDate}`,
    userId,
    createdAt: new Date(`${isoDate}T12:00:00Z`),
    targetPhoneme: "ㅅ",
    articulationScore,
    linguisticScore,
    acousticScore,
    peerPercentile: 50,
  };
}

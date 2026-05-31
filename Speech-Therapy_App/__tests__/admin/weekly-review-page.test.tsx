// FR-Q-WEEKLY-REVIEW — /weekly-review Server Component 통합 테스트.
//
// 격리:
//   - @/lib/db Prisma mock (user.findUnique — childAgeMonths 조회용)
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/reports/weekly-review-loader mock (loadWeeklyReview)
//   - @/lib/weekly-report mock (getCurrentWeekNumber)
//   - next/navigation redirect mock — throw 흉내
//   - next/link mock — 단순 <a>
//   - recharts mock — happy-dom 호환 어려움, 본 테스트는 Summary/Prediction/Trend 자체보다는
//     page 분기 검증에 집중. WeeklyReviewTrend 컴포넌트도 mock.
//
// 검증 시나리오 (≥ 10):
//   [1] 정상 user + hasData=true → page + summary + waur + peerPercentile 렌더
//   [2] hasData=false (신규 user) → empty state + /diagnose CTA
//   [3] W-AUR 달성 (sessionCount=5) → achieved 카드
//   [4] W-AUR 미달성 (sessionCount=2) → 'X회 더 하면…' pending 카드
//   [5] peerPercentile null 폴백
//   [6] predictedNextScore null → 예측 카드 미렌더
//   [7] history 0건 (1주만) → trend 미렌더
//   [8] history 1건 이상 → trend 렌더
//   [9] 비로그인 → redirect("/login?next=/weekly-review")
//   [10] cross-user 차단 — loadWeeklyReview 인자는 본인 user.id 만
//   [11] CON-04 의료 금칙어 0건 (hasData=true / false / 비로그인 등 분기)
//   [12] share 버튼 + mission CTA 노출 — hasData=true 케이스

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const userFindUniqueMock = vi.fn();
const weeklyReportUpdateMock = vi.fn().mockResolvedValue({});
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
    },
    weeklyReport: {
      // FR-WEEKLY-UNREAD — page 가 latest.viewedAt===null 분기에서 호출.
      update: (...args: unknown[]) => weeklyReportUpdateMock(...args),
    },
  },
}));

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
    },
  }),
}));

const loadWeeklyReviewMock = vi.fn();
vi.mock("@/lib/reports/weekly-review-loader", () => ({
  loadWeeklyReview: (...args: unknown[]) => loadWeeklyReviewMock(...args),
}));

vi.mock("@/lib/weekly-report", () => ({
  getCurrentWeekNumber: () => ({ year: 2026, week: 21 }),
}));

const redirectMock = vi.fn((target: string) => {
  throw new Error(`NEXT_REDIRECT:${target}`);
});
vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Recharts SVG 렌더는 happy-dom 에서 비용/잡음 — TrendChart 자체는 다른 테스트로 검증.
// 본 통합 테스트는 page 분기만 — trend 컴포넌트는 가벼운 stub 으로 교체.
vi.mock("@/components/weekly-review/WeeklyReviewTrend", () => ({
  WeeklyReviewTrend: ({
    weeks,
  }: {
    weeks: Array<{ weekNumber: number }>;
  }) => (
    <div data-testid="weekly-review-trend" data-weeks={weeks.length}>
      trend stub
    </div>
  ),
}));

// Beacon 은 client effect — happy-dom 에서도 동작하나 trackEvent 호출 mock 필요.
vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

import WeeklyReviewPage from "@/app/(public)/weekly-review/page";

const USER_ME = "11111111-1111-4111-8111-111111111111";
const USER_OTHER = "99999999-9999-4999-8999-999999999999";

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function assertNoMedicalTerms(text: string) {
  for (const word of FORBIDDEN_MEDICAL_WORDS) {
    expect(text).not.toContain(word);
  }
}

function makeRow(
  overrides: Partial<{
    id: string;
    weekNumber: number;
    sessionCount: number;
    missionCompletedCount: number;
    peerPercentileAvg: number | null;
    predictedNextScore: number | null;
    predictionConfidence: number | null;
    viewedAt: Date | null;
  }> = {},
) {
  const sessionCount = overrides.sessionCount ?? 5;
  return {
    id: overrides.id ?? "wr-latest",
    userId: USER_ME,
    year: 2026,
    weekNumber: overrides.weekNumber ?? 20,
    articulationAvg: 75,
    linguisticAvg: 70,
    acousticAvg: 65,
    peerPercentileAvg:
      overrides.peerPercentileAvg === undefined ? 72 : overrides.peerPercentileAvg,
    sessionCount,
    // FR-C-WAUR-SWITCH — Summary 의 W-AUR 은 미션완료수 기반. 테스트 의도 보존 위해 sessionCount 미러.
    missionCompletedCount: overrides.missionCompletedCount ?? sessionCount,
    predictedNextScore:
      overrides.predictedNextScore === undefined ? 78 : overrides.predictedNextScore,
    predictionConfidence:
      overrides.predictionConfidence === undefined ? 0.85 : overrides.predictionConfidence,
    generatedAt: new Date("2026-05-24T00:00:00Z"),
    // FR-WEEKLY-UNREAD — 기본은 이미 viewed 로 둠 (page 의 viewedAt UPDATE 분기 진입 방지).
    // 명시적으로 null 을 주면 page 가 weeklyReport.update 를 호출.
    viewedAt: overrides.viewedAt === undefined ? new Date("2026-05-24T00:00:00Z") : overrides.viewedAt,
    scoreTrend: [],
  };
}

function setAuthUser(id: string) {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}

function setAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

beforeEach(() => {
  userFindUniqueMock.mockReset();
  getUserMock.mockReset();
  loadWeeklyReviewMock.mockReset();
  redirectMock.mockClear();
  weeklyReportUpdateMock.mockReset();
  weeklyReportUpdateMock.mockResolvedValue({});
});

describe("/weekly-review — FR-Q-WEEKLY-REVIEW 부모용 주간 리뷰 페이지", () => {
  it("[1] 정상 hasData=true → page + summary + waur + peer 렌더", async () => {
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: 48 });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: makeRow({ sessionCount: 5 }),
      history: [],
      wAurAchieved: true,
      hasData: true,
    });

    const ui = await WeeklyReviewPage();
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='weekly-review-page']")).not.toBeNull();
    expect(container.querySelector("[data-testid='weekly-review-summary']")).not.toBeNull();
    expect(container.querySelector("[data-testid='weekly-review-waur-achieved']")).not.toBeNull();
    expect(container.querySelector("[data-testid='weekly-review-peer-text']")).not.toBeNull();
    expect(container.querySelector("[data-testid='weekly-review-child-age']")?.textContent).toContain(
      "48",
    );
  });

  it("[2] hasData=false → empty state + /diagnose CTA", async () => {
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: null });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: null,
      history: [],
      wAurAchieved: false,
      hasData: false,
    });

    const ui = await WeeklyReviewPage();
    const { container } = render(ui);

    const empty = container.querySelector("[data-testid='weekly-review-empty']");
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toContain("이번 주 데이터를 모으는 중이에요");

    const cta = container.querySelector("[data-testid='weekly-review-empty-cta']");
    expect(cta).not.toBeNull();
    expect(cta?.getAttribute("href")).toBe("/diagnose");

    // 정상 컴포넌트는 미렌더.
    expect(container.querySelector("[data-testid='weekly-review-summary']")).toBeNull();
    expect(container.querySelector("[data-testid='weekly-review-trend']")).toBeNull();
  });

  it("[3] W-AUR 달성 (sessionCount=5) → achieved 카드", async () => {
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: 48 });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: makeRow({ sessionCount: 5 }),
      history: [],
      wAurAchieved: true,
      hasData: true,
    });

    const ui = await WeeklyReviewPage();
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='weekly-review-waur-achieved']")).not.toBeNull();
    expect(container.querySelector("[data-testid='weekly-review-waur-pending']")).toBeNull();
  });

  it("[4] W-AUR 미달성 (sessionCount=2) → 'X회 더 하면…' pending", async () => {
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: 48 });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: makeRow({ sessionCount: 2 }),
      history: [],
      wAurAchieved: false,
      hasData: true,
    });

    const ui = await WeeklyReviewPage();
    const { container } = render(ui);

    const pending = container.querySelector("[data-testid='weekly-review-waur-pending']");
    expect(pending).not.toBeNull();
    expect(pending?.textContent).toContain("2회 더");
  });

  it("[5] peerPercentile null → empty 폴백 카피", async () => {
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: 48 });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: makeRow({ peerPercentileAvg: null }),
      history: [],
      wAurAchieved: true,
      hasData: true,
    });

    const ui = await WeeklyReviewPage();
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='weekly-review-peer-empty']")).not.toBeNull();
    expect(container.querySelector("[data-testid='weekly-review-peer-text']")).toBeNull();
  });

  it("[6] predictedNextScore null → 예측 카드 미렌더", async () => {
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: 48 });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: makeRow({ predictedNextScore: null, predictionConfidence: null }),
      history: [],
      wAurAchieved: true,
      hasData: true,
    });

    const ui = await WeeklyReviewPage();
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='weekly-review-prediction-card']")).toBeNull();
    // summary 는 정상 렌더.
    expect(container.querySelector("[data-testid='weekly-review-summary']")).not.toBeNull();
  });

  it("[7] history 0건 (1주만) → trend 미렌더", async () => {
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: 48 });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: makeRow(),
      history: [],
      wAurAchieved: true,
      hasData: true,
    });

    const ui = await WeeklyReviewPage();
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='weekly-review-trend']")).toBeNull();
  });

  it("[8] history 1건 이상 → trend 렌더 (chartWeeks.length=2)", async () => {
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: 48 });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: makeRow({ id: "wr-l", weekNumber: 20 }),
      history: [makeRow({ id: "wr-prev", weekNumber: 19 })],
      wAurAchieved: true,
      hasData: true,
    });

    const ui = await WeeklyReviewPage();
    const { container } = render(ui);

    const trend = container.querySelector("[data-testid='weekly-review-trend']");
    expect(trend).not.toBeNull();
    expect(trend?.getAttribute("data-weeks")).toBe("2");
  });

  it("[9] 비로그인 → redirect('/login?next=/weekly-review')", async () => {
    setAnonymous();

    await expect(WeeklyReviewPage()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/weekly-review");
    expect(loadWeeklyReviewMock).not.toHaveBeenCalled();
  });

  it("[10] cross-user 차단 — loadWeeklyReview 인자는 본인 user.id 만", async () => {
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: 48 });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: makeRow(),
      history: [],
      wAurAchieved: true,
      hasData: true,
    });

    await WeeklyReviewPage();

    expect(loadWeeklyReviewMock).toHaveBeenCalledTimes(1);
    expect(loadWeeklyReviewMock).toHaveBeenCalledWith(USER_ME);
    expect(JSON.stringify(loadWeeklyReviewMock.mock.calls)).not.toContain(USER_OTHER);
  });

  it("[11] CON-04 의료 금칙어 0건 (hasData=true / hasData=false / 등 다중 분기)", async () => {
    // (a) hasData=true 정상 + W-AUR 달성 + peer 일반 + prediction
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: 48 });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: makeRow({ sessionCount: 5, peerPercentileAvg: 70 }),
      history: [makeRow({ id: "h", weekNumber: 19 })],
      wAurAchieved: true,
      hasData: true,
    });
    const { container: aC } = render(await WeeklyReviewPage());
    assertNoMedicalTerms(aC.textContent ?? "");

    // (b) hasData=true + W-AUR 미달성 + peer null + prediction null
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: null });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: makeRow({
        sessionCount: 1,
        peerPercentileAvg: null,
        predictedNextScore: null,
        predictionConfidence: null,
      }),
      history: [],
      wAurAchieved: false,
      hasData: true,
    });
    const { container: bC } = render(await WeeklyReviewPage());
    assertNoMedicalTerms(bC.textContent ?? "");

    // (c) hasData=false 빈 상태
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: null });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: null,
      history: [],
      wAurAchieved: false,
      hasData: false,
    });
    const { container: cC } = render(await WeeklyReviewPage());
    assertNoMedicalTerms(cC.textContent ?? "");
  });

  it("[12] share 버튼 + mission CTA 노출 — hasData=true", async () => {
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: 48 });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: makeRow(),
      history: [],
      wAurAchieved: true,
      hasData: true,
    });

    const ui = await WeeklyReviewPage();
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='weekly-review-share-button']")).not.toBeNull();
    const mission = container.querySelector("[data-testid='weekly-review-mission-cta']");
    expect(mission).not.toBeNull();
    expect(mission?.getAttribute("href")).toBe("/missions");
  });

  // ============================================================================
  // FR-WEEKLY-UNREAD — viewedAt UPDATE 분기 검증 (4건).
  // ============================================================================
  it("[u1] latest.viewedAt === null → weeklyReport.update 1회 호출 (id + viewedAt:Date)", async () => {
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: 48 });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: makeRow({ id: "wr-unread-1", viewedAt: null }),
      history: [],
      wAurAchieved: true,
      hasData: true,
    });

    await WeeklyReviewPage();

    expect(weeklyReportUpdateMock).toHaveBeenCalledTimes(1);
    const callArgs = weeklyReportUpdateMock.mock.calls[0]?.[0] as {
      where: { id: string };
      data: { viewedAt: Date };
    };
    expect(callArgs.where.id).toBe("wr-unread-1");
    expect(callArgs.data.viewedAt).toBeInstanceOf(Date);
  });

  it("[u2] latest.viewedAt 이미 set → weeklyReport.update 미호출 (zero-write)", async () => {
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: 48 });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: makeRow({ viewedAt: new Date("2026-05-25T10:00:00Z") }),
      history: [],
      wAurAchieved: true,
      hasData: true,
    });

    await WeeklyReviewPage();

    expect(weeklyReportUpdateMock).not.toHaveBeenCalled();
  });

  it("[u3] hasData=false (latest=null) → weeklyReport.update 미호출", async () => {
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: null });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: null,
      history: [],
      wAurAchieved: false,
      hasData: false,
    });

    await WeeklyReviewPage();

    expect(weeklyReportUpdateMock).not.toHaveBeenCalled();
  });

  it("[u4] viewedAt UPDATE 실패 → page 정상 렌더 (graceful, 차단 0)", async () => {
    setAuthUser(USER_ME);
    userFindUniqueMock.mockResolvedValueOnce({ childAgeMonths: 48 });
    loadWeeklyReviewMock.mockResolvedValueOnce({
      latest: makeRow({ id: "wr-err", viewedAt: null }),
      history: [],
      wAurAchieved: true,
      hasData: true,
    });
    weeklyReportUpdateMock.mockRejectedValueOnce(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const ui = await WeeklyReviewPage();
    const { container } = render(ui);

    // page 는 정상 렌더 — summary + waur 등 표시.
    expect(container.querySelector("[data-testid='weekly-review-page']")).not.toBeNull();
    expect(container.querySelector("[data-testid='weekly-review-summary']")).not.toBeNull();
    expect(errSpy).toHaveBeenCalled();
  });
});

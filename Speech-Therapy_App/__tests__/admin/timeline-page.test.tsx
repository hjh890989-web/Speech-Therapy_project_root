// FR-Q-013 (#54) — /admin/timeline/[userId] Server Component 통합 테스트.
//
// 격리:
//   - @/lib/db Prisma mock (user.findUnique — viewer + target 2회 호출)
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/timeline/aggregator mock (loadUserTimeline)
//   - next/link mock — 단순 <a>
//   - next/navigation notFound mock — throw 흉내
//
// 검증 시나리오 (≥ 10):
//   1. principal + 본인 institution 자녀 → 정상 렌더 + 그룹 헤더 + 4 카드
//   2. admin → cross-tenant 무시하고 통과 (다른 institution 자녀도 OK)
//   3. expert + 본인 institution 자녀 → 통과
//   4. principal + 다른 institution 자녀 → forbidden (cross-tenant)
//   5. parent role 호출 → forbidden (role 가드)
//   6. 자녀 미존재 → notFound() throw
//   7. 빈 데이터 → empty state + /diagnose CTA
//   8. diagnose only → mission section 없음, diagnose entry 노출
//   9. mission only → diagnose section 없음, mission entry 노출
//   10. CON-04 의료 금칙어 0건 (full / empty / forbidden 모든 분기)
//   11. cross-tenant 차단 — loadUserTimeline 호출 시 다른 userId/institution 미사용
//   12. 오프라인 placeholder 영역 항상 노출
//   13. 비로그인 / supabase 오류 → forbidden (unauthenticated)
//   14. R4 — viewer userId UUID 가 페이지 textContent 에 노출 0

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// ============================================================================
// Mocks
// ============================================================================
const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
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

const loadTimelineMock = vi.fn();
vi.mock("@/lib/timeline/aggregator", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/timeline/aggregator")>(
      "@/lib/timeline/aggregator",
    );
  return {
    ...actual,
    loadUserTimeline: (...args: unknown[]) => loadTimelineMock(...args),
  };
});

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
  redirect: (target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  },
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

import TimelinePage from "@/app/admin/timeline/[userId]/page";

// ============================================================================
// 상수 / helpers
// ============================================================================
const INSTITUTION_A = "11111111-1111-4111-8111-111111111111";
const INSTITUTION_B = "22222222-2222-4222-8222-222222222222";
const VIEWER_PRINCIPAL = "v-princ-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VIEWER_ADMIN = "v-admin-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const VIEWER_EXPERT = "v-exp-cccc-4ccc-8ccc-cccccccccccc";
const VIEWER_PARENT = "v-par-dddd-4ddd-8ddd-dddddddddddd";

const CHILD_A = "child-aaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CHILD_B = "child-bbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const FORBIDDEN = ["치료", "진단", "장애"];

function assertNoMedical(text: string) {
  for (const w of FORBIDDEN) expect(text).not.toContain(w);
}

function setAuth(viewerId: string | null) {
  if (viewerId === null) {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
  } else {
    getUserMock.mockResolvedValue({ data: { user: { id: viewerId } }, error: null });
  }
}

/// viewer 1회, child 1회 (page 가 loadViewerContext + loadTargetChild 호출 순서)
function mockUserFindUnique({
  viewer,
  child,
}: {
  viewer: { role: string | null; institutionId: string | null } | null;
  child:
    | { id: string; role: string | null; institutionId: string | null; childAgeMonths: number | null }
    | null;
}) {
  findUniqueMock.mockImplementationOnce(async (args: { where: { id: string } }) => {
    void args;
    return viewer;
  });
  findUniqueMock.mockImplementationOnce(async (args: { where: { id: string } }) => {
    void args;
    return child;
  });
}

function fullTimeline(userId: string) {
  return {
    userId,
    totalCount: 3,
    hasDiagnoseData: true,
    hasMissionData: true,
    hasOfflineData: false,
    entries: [
      {
        kind: "diagnose" as const,
        id: "e1",
        createdAt: new Date(),
        articulationScore: 80,
        linguisticScore: 70,
        acousticScore: 65,
        targetPhoneme: "ㅅ",
      },
      {
        kind: "mission" as const,
        id: "s1",
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
        missionId: "m1",
        durationSec: 120,
      },
      {
        kind: "diagnose" as const,
        id: "e2",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        articulationScore: 70,
        linguisticScore: 65,
        acousticScore: 60,
        targetPhoneme: "ㄱ",
      },
    ],
  };
}

function emptyTimeline(userId: string) {
  return {
    userId,
    totalCount: 0,
    hasDiagnoseData: false,
    hasMissionData: false,
    hasOfflineData: false,
    entries: [],
  };
}

function diagnoseOnly(userId: string) {
  return {
    userId,
    totalCount: 1,
    hasDiagnoseData: true,
    hasMissionData: false,
    hasOfflineData: false,
    entries: [
      {
        kind: "diagnose" as const,
        id: "e1",
        createdAt: new Date(),
        articulationScore: 80,
        linguisticScore: 70,
        acousticScore: 65,
        targetPhoneme: "ㅅ",
      },
    ],
  };
}

function missionOnly(userId: string) {
  return {
    userId,
    totalCount: 1,
    hasDiagnoseData: false,
    hasMissionData: true,
    hasOfflineData: false,
    entries: [
      {
        kind: "mission" as const,
        id: "s1",
        createdAt: new Date(),
        missionId: "m1",
        durationSec: 60,
      },
    ],
  };
}

function paramsOf(userId: string) {
  return { params: Promise.resolve({ userId }) };
}

beforeEach(() => {
  findUniqueMock.mockReset();
  getUserMock.mockReset();
  loadTimelineMock.mockReset();
  notFoundMock.mockClear();
});

describe("/admin/timeline/[userId] — FR-Q-013 통합 타임라인", () => {
  it("[1] principal + 본인 institution 자녀 → 정상 렌더 + 그룹 헤더 + entries", async () => {
    setAuth(VIEWER_PRINCIPAL);
    mockUserFindUnique({
      viewer: { role: "principal", institutionId: INSTITUTION_A },
      child: { id: CHILD_A, role: "parent", institutionId: INSTITUTION_A, childAgeMonths: 48 },
    });
    loadTimelineMock.mockResolvedValueOnce(fullTimeline(CHILD_A));

    const ui = await TimelinePage(paramsOf(CHILD_A));
    const { container } = render(ui);

    const main = container.querySelector("[data-testid='admin-timeline-page']");
    expect(main).not.toBeNull();
    expect(main?.getAttribute("data-target-user-id")).toBe(CHILD_A);

    // 그룹 헤더 — today + yesterday + thisWeek 노출 (older 없음).
    expect(container.querySelector("[data-testid='timeline-group-today']")).not.toBeNull();
    expect(container.querySelector("[data-testid='timeline-group-yesterday']")).not.toBeNull();
    expect(container.querySelector("[data-testid='timeline-group-thisWeek']")).not.toBeNull();
    expect(container.querySelector("[data-testid='timeline-group-older']")).toBeNull();

    // 3 entry 카드.
    const cards = container.querySelectorAll("article[data-kind]");
    expect(cards).toHaveLength(3);

    // 자녀 메타 노출.
    expect(
      container.querySelector("[data-testid='timeline-child-age-months']")?.textContent,
    ).toContain("48");
  });

  it("[2] admin → cross-tenant 무시 (다른 institution 자녀도 OK)", async () => {
    setAuth(VIEWER_ADMIN);
    mockUserFindUnique({
      viewer: { role: "admin", institutionId: INSTITUTION_B },
      child: { id: CHILD_A, role: "parent", institutionId: INSTITUTION_A, childAgeMonths: 36 },
    });
    loadTimelineMock.mockResolvedValueOnce(fullTimeline(CHILD_A));

    const ui = await TimelinePage(paramsOf(CHILD_A));
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='admin-timeline-page']")).not.toBeNull();
    expect(container.querySelector("[data-testid='timeline-forbidden']")).toBeNull();
  });

  it("[3] expert + 본인 institution 자녀 → 통과", async () => {
    setAuth(VIEWER_EXPERT);
    mockUserFindUnique({
      viewer: { role: "expert", institutionId: INSTITUTION_A },
      child: { id: CHILD_A, role: "parent", institutionId: INSTITUTION_A, childAgeMonths: 60 },
    });
    loadTimelineMock.mockResolvedValueOnce(fullTimeline(CHILD_A));

    const ui = await TimelinePage(paramsOf(CHILD_A));
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='admin-timeline-page']")).not.toBeNull();
  });

  it("[4] principal + 다른 institution 자녀 → forbidden (cross-tenant)", async () => {
    setAuth(VIEWER_PRINCIPAL);
    mockUserFindUnique({
      viewer: { role: "principal", institutionId: INSTITUTION_A },
      child: { id: CHILD_B, role: "parent", institutionId: INSTITUTION_B, childAgeMonths: 48 },
    });

    const ui = await TimelinePage(paramsOf(CHILD_B));
    const { container } = render(ui);

    const forbid = container.querySelector("[data-testid='timeline-forbidden']");
    expect(forbid).not.toBeNull();
    expect(forbid?.getAttribute("data-reason")).toBe("cross_tenant");
    expect(loadTimelineMock).not.toHaveBeenCalled();
  });

  it("[5] parent role 호출 → forbidden (role 가드)", async () => {
    setAuth(VIEWER_PARENT);
    // role 가드는 child 조회 전에 차단되므로 viewer 1회만 mock.
    findUniqueMock.mockResolvedValueOnce({ role: "parent", institutionId: INSTITUTION_A });

    const ui = await TimelinePage(paramsOf(CHILD_A));
    const { container } = render(ui);

    const forbid = container.querySelector("[data-testid='timeline-forbidden']");
    expect(forbid).not.toBeNull();
    expect(forbid?.getAttribute("data-reason")).toBe("role");
    expect(loadTimelineMock).not.toHaveBeenCalled();
  });

  it("[6] 자녀 미존재 → notFound() throw", async () => {
    setAuth(VIEWER_PRINCIPAL);
    mockUserFindUnique({
      viewer: { role: "principal", institutionId: INSTITUTION_A },
      child: null,
    });

    await expect(TimelinePage(paramsOf(CHILD_A))).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(loadTimelineMock).not.toHaveBeenCalled();
  });

  it("[7] 빈 데이터 → empty state + /diagnose CTA + 오프라인 placeholder", async () => {
    setAuth(VIEWER_PRINCIPAL);
    mockUserFindUnique({
      viewer: { role: "principal", institutionId: INSTITUTION_A },
      child: { id: CHILD_A, role: "parent", institutionId: INSTITUTION_A, childAgeMonths: 36 },
    });
    loadTimelineMock.mockResolvedValueOnce(emptyTimeline(CHILD_A));

    const ui = await TimelinePage(paramsOf(CHILD_A));
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='timeline-empty-state']")).not.toBeNull();
    const cta = container.querySelector("[data-testid='timeline-empty-cta']");
    expect(cta).not.toBeNull();
    expect(cta?.getAttribute("href")).toBe("/diagnose");
    // timeline-list 미렌더.
    expect(container.querySelector("[data-testid='timeline-list']")).toBeNull();
    // 오프라인 entry CTA 는 항상 노출 (FR-Q-013 후속 — placeholder → CTA 교체).
    expect(
      container.querySelector("[data-testid='timeline-offline-cta']"),
    ).not.toBeNull();
  });

  it("[8] diagnose only → mission entry 0", async () => {
    setAuth(VIEWER_PRINCIPAL);
    mockUserFindUnique({
      viewer: { role: "principal", institutionId: INSTITUTION_A },
      child: { id: CHILD_A, role: "parent", institutionId: INSTITUTION_A, childAgeMonths: 36 },
    });
    loadTimelineMock.mockResolvedValueOnce(diagnoseOnly(CHILD_A));

    const ui = await TimelinePage(paramsOf(CHILD_A));
    const { container } = render(ui);

    const cards = container.querySelectorAll("article[data-kind]");
    expect(cards).toHaveLength(1);
    expect(cards[0].getAttribute("data-kind")).toBe("diagnose");
    expect(container.querySelector("article[data-kind='mission']")).toBeNull();
  });

  it("[9] mission only → diagnose entry 0", async () => {
    setAuth(VIEWER_PRINCIPAL);
    mockUserFindUnique({
      viewer: { role: "principal", institutionId: INSTITUTION_A },
      child: { id: CHILD_A, role: "parent", institutionId: INSTITUTION_A, childAgeMonths: 36 },
    });
    loadTimelineMock.mockResolvedValueOnce(missionOnly(CHILD_A));

    const ui = await TimelinePage(paramsOf(CHILD_A));
    const { container } = render(ui);

    const cards = container.querySelectorAll("article[data-kind]");
    expect(cards).toHaveLength(1);
    expect(cards[0].getAttribute("data-kind")).toBe("mission");
    expect(container.querySelector("article[data-kind='diagnose']")).toBeNull();
  });

  it("[10] CON-04 의료 금칙어 0건 — full / empty / forbidden 분기", async () => {
    // (a) full
    setAuth(VIEWER_PRINCIPAL);
    mockUserFindUnique({
      viewer: { role: "principal", institutionId: INSTITUTION_A },
      child: { id: CHILD_A, role: "parent", institutionId: INSTITUTION_A, childAgeMonths: 48 },
    });
    loadTimelineMock.mockResolvedValueOnce(fullTimeline(CHILD_A));
    const { container: fullC } = render(await TimelinePage(paramsOf(CHILD_A)));
    assertNoMedical(fullC.textContent ?? "");

    // (b) empty
    setAuth(VIEWER_PRINCIPAL);
    mockUserFindUnique({
      viewer: { role: "principal", institutionId: INSTITUTION_A },
      child: { id: CHILD_A, role: "parent", institutionId: INSTITUTION_A, childAgeMonths: 48 },
    });
    loadTimelineMock.mockResolvedValueOnce(emptyTimeline(CHILD_A));
    const { container: emptyC } = render(await TimelinePage(paramsOf(CHILD_A)));
    assertNoMedical(emptyC.textContent ?? "");

    // (c) forbidden (parent)
    setAuth(VIEWER_PARENT);
    findUniqueMock.mockResolvedValueOnce({ role: "parent", institutionId: INSTITUTION_A });
    const { container: forbC } = render(await TimelinePage(paramsOf(CHILD_A)));
    assertNoMedical(forbC.textContent ?? "");

    // (d) cross-tenant forbidden
    setAuth(VIEWER_PRINCIPAL);
    mockUserFindUnique({
      viewer: { role: "principal", institutionId: INSTITUTION_A },
      child: { id: CHILD_B, role: "parent", institutionId: INSTITUTION_B, childAgeMonths: 48 },
    });
    const { container: ctC } = render(await TimelinePage(paramsOf(CHILD_B)));
    assertNoMedical(ctC.textContent ?? "");
  });

  it("[11] cross-tenant 차단 — loadUserTimeline 호출 시 target userId 만 (다른 ID 미사용)", async () => {
    setAuth(VIEWER_PRINCIPAL);
    mockUserFindUnique({
      viewer: { role: "principal", institutionId: INSTITUTION_A },
      child: { id: CHILD_A, role: "parent", institutionId: INSTITUTION_A, childAgeMonths: 48 },
    });
    loadTimelineMock.mockResolvedValueOnce(fullTimeline(CHILD_A));

    await TimelinePage(paramsOf(CHILD_A));

    expect(loadTimelineMock).toHaveBeenCalledTimes(1);
    expect(loadTimelineMock).toHaveBeenCalledWith(CHILD_A);
    const allCalls = JSON.stringify(loadTimelineMock.mock.calls);
    expect(allCalls).not.toContain(CHILD_B);
    expect(allCalls).not.toContain(INSTITUTION_B);
  });

  it("[12] 오프라인 entry CTA 영역 항상 노출 (앱 데이터 있을 때 + 없을 때)", async () => {
    // FR-Q-013 후속 — placeholder 가 입력 페이지로 이동 CTA 로 교체.
    // 있을 때
    setAuth(VIEWER_PRINCIPAL);
    mockUserFindUnique({
      viewer: { role: "principal", institutionId: INSTITUTION_A },
      child: { id: CHILD_A, role: "parent", institutionId: INSTITUTION_A, childAgeMonths: 48 },
    });
    loadTimelineMock.mockResolvedValueOnce(fullTimeline(CHILD_A));
    const { container: c1 } = render(await TimelinePage(paramsOf(CHILD_A)));
    expect(c1.querySelector("[data-testid='timeline-offline-cta']")).not.toBeNull();
    // 입력 페이지 링크 정합.
    const cta1 = c1.querySelector("[data-testid='timeline-offline-entry-cta']");
    expect(cta1).not.toBeNull();
    expect(cta1?.getAttribute("href")).toBe(
      `/admin/teacher/students/${CHILD_A}/offline-entry`,
    );

    // 없을 때 (empty)
    setAuth(VIEWER_PRINCIPAL);
    mockUserFindUnique({
      viewer: { role: "principal", institutionId: INSTITUTION_A },
      child: { id: CHILD_A, role: "parent", institutionId: INSTITUTION_A, childAgeMonths: 48 },
    });
    loadTimelineMock.mockResolvedValueOnce(emptyTimeline(CHILD_A));
    const { container: c2 } = render(await TimelinePage(paramsOf(CHILD_A)));
    expect(c2.querySelector("[data-testid='timeline-offline-cta']")).not.toBeNull();
  });

  it("[13] 비로그인 → forbidden(unauthenticated)", async () => {
    setAuth(null);

    const ui = await TimelinePage(paramsOf(CHILD_A));
    const { container } = render(ui);

    const forbid = container.querySelector("[data-testid='timeline-forbidden']");
    expect(forbid).not.toBeNull();
    expect(forbid?.getAttribute("data-reason")).toBe("unauthenticated");
    // viewer Prisma 호출 0 + timeline 호출 0.
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(loadTimelineMock).not.toHaveBeenCalled();
  });

  it("[14] R4 — viewer userId(UUID) 가 페이지 textContent 에 노출 0", async () => {
    setAuth(VIEWER_PRINCIPAL);
    mockUserFindUnique({
      viewer: { role: "principal", institutionId: INSTITUTION_A },
      child: { id: CHILD_A, role: "parent", institutionId: INSTITUTION_A, childAgeMonths: 48 },
    });
    loadTimelineMock.mockResolvedValueOnce(fullTimeline(CHILD_A));

    const ui = await TimelinePage(paramsOf(CHILD_A));
    const { container } = render(ui);

    const text = container.textContent ?? "";
    expect(text).not.toContain(VIEWER_PRINCIPAL);
    expect(text).not.toContain(VIEWER_ADMIN);
    expect(text).not.toContain(VIEWER_EXPERT);
    expect(text).not.toContain(VIEWER_PARENT);
  });
});

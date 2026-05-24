// FR-Q-009 (#50) — /admin/principal Server Component 통합 테스트.
//
// 격리:
//   - @/lib/db Prisma mock (user.findUnique — role + institutionId 조회용)
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/admin/principal-aggregator mock (loadPrincipalDashboard)
//   - next/link mock — 단순 <a>
//   - next/navigation redirect mock — throw 흉내
//
// 검증 시나리오 (≥ 8):
//   1. principal role + institutionId 정상 → dashboard 렌더 + 4 카드 + classroom grid
//   2. admin role + institutionId → 동일 통과
//   3. parent role → 403 안내 (principal-forbidden)
//   4. expert role → 403 안내 (페이지 L2 가드)
//   5. institutionId null → "기관 정보가 설정되지 않았어요" 안내 (principal-no-institution)
//   6. 빈 데이터 → 4 카드 0 + classrooms-empty 메시지 + import CTA 노출
//   7. cross-tenant 차단 — loadPrincipalDashboard 가 본인 institutionId 만으로 호출 (다른 ID 미사용)
//   8. CON-04 금칙어 0건 (모든 변형)
//   9. 비로그인 → redirect("/login...")

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

const loadDashMock = vi.fn();
vi.mock("@/lib/admin/principal-aggregator", () => ({
  loadPrincipalDashboard: (...args: unknown[]) => loadDashMock(...args),
}));

const redirectMock = vi.fn((target: string) => {
  // next/navigation 의 redirect 는 NEXT_REDIRECT throw.
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

import PrincipalDashboardPage from "@/app/admin/principal/page";

// ============================================================================
// 상수 / helpers
// ============================================================================
const INSTITUTION_A = "11111111-1111-4111-8111-111111111111";
const INSTITUTION_B = "22222222-2222-4222-8222-222222222222";
const USER_PRINCIPAL = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ADMIN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_PARENT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const USER_EXPERT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function assertNoMedicalTerms(text: string) {
  for (const word of FORBIDDEN_MEDICAL_WORDS) {
    expect(text).not.toContain(word);
  }
}

function setAuthUser(id: string) {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}

function setAnonymousAuth() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

function setUserRow(role: string | null, institutionId: string | null) {
  findUniqueMock.mockResolvedValue({ role, institutionId });
}

function fullDashboard(institutionId: string) {
  return {
    institutionId,
    classCount: 3,
    studentCount: 45,
    thisWeekDiagnoseCount: 120,
    articulationAvg: 72.5,
    classrooms: [
      {
        id: "class-1",
        name: "햇님반",
        studentCount: 20,
        diagnoseCount: 50,
        avgScore: 78,
        students: [],
      },
      {
        id: "class-2",
        name: "달님반",
        studentCount: 15,
        diagnoseCount: 40,
        avgScore: 70,
        students: [],
      },
      {
        id: "class-3",
        name: "별님반",
        studentCount: 10,
        diagnoseCount: 30,
        avgScore: 68,
        students: [],
      },
    ],
    classroomsEmpty: false,
  };
}

function emptyDashboard(institutionId: string) {
  return {
    institutionId,
    classCount: 0,
    studentCount: 0,
    thisWeekDiagnoseCount: 0,
    articulationAvg: null,
    classrooms: [],
    classroomsEmpty: true,
  };
}

beforeEach(() => {
  findUniqueMock.mockReset();
  getUserMock.mockReset();
  loadDashMock.mockReset();
  redirectMock.mockClear();
});

describe("/admin/principal — FR-Q-009 원장 대시보드", () => {
  it("[1] principal + institutionId → dashboard + 4 카드 + classroom grid 렌더", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(fullDashboard(INSTITUTION_A));

    const ui = await PrincipalDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    const main = container.querySelector("[data-testid='admin-principal-page']");
    expect(main).not.toBeNull();
    expect(main?.getAttribute("data-institution-id")).toBe(INSTITUTION_A);

    // 4 카드.
    expect(
      container.querySelector("[data-testid='stats-card-class-count-value']")?.textContent,
    ).toBe("3");
    expect(
      container.querySelector("[data-testid='stats-card-student-count-value']")?.textContent,
    ).toBe("45");
    expect(
      container.querySelector("[data-testid='stats-card-week-count-value']")?.textContent,
    ).toBe("120");
    expect(
      container.querySelector("[data-testid='stats-card-avg-score-value']")?.textContent,
    ).toBe("72.5");

    // 반 grid.
    const grid = container.querySelector("[data-testid='principal-classroom-grid']");
    expect(grid).not.toBeNull();
    const cards = container.querySelectorAll("[data-testid^='classroom-card-']");
    expect(cards).toHaveLength(3);
  });

  it("[2] admin role + institutionId → 동일하게 통과", async () => {
    setAuthUser(USER_ADMIN);
    setUserRow("admin", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(fullDashboard(INSTITUTION_A));

    const ui = await PrincipalDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='admin-principal-page']")).not.toBeNull();
    expect(container.querySelector("[data-testid='principal-forbidden']")).toBeNull();
  });

  it("[3] parent role → 403 안내 (principal-forbidden)", async () => {
    setAuthUser(USER_PARENT);
    setUserRow("parent", INSTITUTION_A);

    const ui = await PrincipalDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='principal-forbidden']")).not.toBeNull();
    // dashboard 미렌더 + loadDashboard 미호출.
    expect(container.querySelector("[data-testid='admin-principal-page']")).toBeNull();
    expect(loadDashMock).not.toHaveBeenCalled();
  });

  it("[4] expert role → 403 안내 (페이지 L2 가드 — proxy.ts 는 통과)", async () => {
    setAuthUser(USER_EXPERT);
    setUserRow("expert", INSTITUTION_A);

    const ui = await PrincipalDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='principal-forbidden']")).not.toBeNull();
    expect(loadDashMock).not.toHaveBeenCalled();
  });

  it("[5] principal + institutionId null → '기관 정보가 설정되지 않았어요' 안내", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", null);

    const ui = await PrincipalDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    const banner = container.querySelector("[data-testid='principal-no-institution']");
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain("기관 정보가 아직 설정되지 않았어요");
    expect(loadDashMock).not.toHaveBeenCalled();
  });

  it("[6] 빈 데이터 → 4 카드 0 + classrooms-empty + import CTA 노출", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(emptyDashboard(INSTITUTION_A));

    const ui = await PrincipalDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='stats-card-class-count-value']")?.textContent,
    ).toBe("0");
    expect(
      container.querySelector("[data-testid='stats-card-student-count-value']")?.textContent,
    ).toBe("0");
    expect(
      container.querySelector("[data-testid='stats-card-avg-score-value']")?.textContent,
    ).toBe("-");

    const emptyClassrooms = container.querySelector(
      "[data-testid='principal-classrooms-empty']",
    );
    expect(emptyClassrooms).not.toBeNull();

    const importCta = container.querySelector("[data-testid='principal-import-cta']");
    expect(importCta).not.toBeNull();
    expect(importCta?.getAttribute("href")).toBe("/admin/students/import");

    const emptyCta = container.querySelector("[data-testid='principal-empty-cta']");
    expect(emptyCta).not.toBeNull();
    expect(emptyCta?.getAttribute("href")).toBe("/admin/students/import");

    // grid 본체는 미렌더.
    expect(container.querySelector("[data-testid='principal-classroom-grid']")).toBeNull();
  });

  it("[7] cross-tenant 차단 — loadPrincipalDashboard 호출은 본인 institutionId 만 (다른 ID 미사용)", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(fullDashboard(INSTITUTION_A));

    await PrincipalDashboardPage({ searchParams: Promise.resolve({}) });

    expect(loadDashMock).toHaveBeenCalledTimes(1);
    expect(loadDashMock).toHaveBeenCalledWith(INSTITUTION_A, { studentsCursor: undefined });
    // 다른 institutionId 가 호출 인자로 들어가지 않음 (R4).
    const allCalls = JSON.stringify(loadDashMock.mock.calls);
    expect(allCalls).not.toContain(INSTITUTION_B);
  });

  it("[8] CON-04 의료 금칙어 0건 (full / empty / forbidden / no-institution 모든 분기)", async () => {
    // (a) full
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(fullDashboard(INSTITUTION_A));
    const { container: fullC } = render(await PrincipalDashboardPage({ searchParams: Promise.resolve({}) }));
    assertNoMedicalTerms(fullC.textContent ?? "");

    // (b) empty
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(emptyDashboard(INSTITUTION_A));
    const { container: emptyC } = render(await PrincipalDashboardPage({ searchParams: Promise.resolve({}) }));
    assertNoMedicalTerms(emptyC.textContent ?? "");

    // (c) forbidden
    setAuthUser(USER_PARENT);
    setUserRow("parent", INSTITUTION_A);
    const { container: forbC } = render(await PrincipalDashboardPage({ searchParams: Promise.resolve({}) }));
    assertNoMedicalTerms(forbC.textContent ?? "");

    // (d) no-institution
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", null);
    const { container: noInstC } = render(await PrincipalDashboardPage({ searchParams: Promise.resolve({}) }));
    assertNoMedicalTerms(noInstC.textContent ?? "");
  });

  it("[9] 비로그인 → redirect('/login?next=/admin/principal')", async () => {
    setAnonymousAuth();
    // findUnique 는 호출되지 않아야 함.

    await expect(PrincipalDashboardPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/admin/principal");
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(loadDashMock).not.toHaveBeenCalled();
  });

  it("[10] R4 — 페이지 전체 textContent 에 userId(UUID) 노출 0건", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(fullDashboard(INSTITUTION_A));

    const ui = await PrincipalDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    const text = container.textContent ?? "";
    expect(text).not.toContain(USER_PRINCIPAL);
    expect(text).not.toContain(USER_PARENT);
    expect(text).not.toContain(USER_ADMIN);
  });
});

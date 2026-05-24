// 9f204cd 후속 — /admin/principal cursor 페이지네이션 UI 진입 통합 테스트.
//
// 책임: searchParams.students_cursor 처리 + ClassroomGrid 의 "더 보기" / "처음으로" Link 노출.
// principal-dashboard.test.tsx 와는 독립 — cursor 전용 시나리오만 검증.
//
// 격리:
//   - @/lib/db Prisma mock (user.findUnique)
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/admin/principal-aggregator mock (loadPrincipalDashboard)
//   - next/link mock — 단순 <a> + href object 직렬화 (Next.js LinkProps href: string | UrlObject)
//
// 검증 시나리오 (≥ 6):
//   [1] 첫 페이지 (searchParams 비어 있음) → loadPrincipalDashboard 가 { studentsCursor: undefined } 호출
//                                          → "처음으로" Link 미노출 + "더 보기" 미노출 (hasMoreStudents=false)
//   [2] hasMoreStudents=true + nextStudentsCursor → "더 보기" Link 노출 (href = ?students_cursor=...)
//   [3] hasMoreStudents=false (모든 반) → "더 보기" Link 미노출
//   [4] cursor 있는 페이지 → "처음으로" Link 노출 (href=/admin/principal)
//   [5] cross-tenant 차단 — page 는 본인 institutionId 만 aggregator 에 전달 (cursor 영향 없음)
//   [6] searchParams.students_cursor 가 loadPrincipalDashboard 에 그대로 전달
//   [7] CON-04 — 금칙어 (치료/진단/장애) 0건 (cursor 분기 UI 포함)
//   [8] 빈 문자열 cursor → undefined 로 정규화 (trim 후 길이 0)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

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
  throw new Error(`NEXT_REDIRECT:${target}`);
});
vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

// next/link mock — href 가 string 또는 UrlObject. UrlObject 시 ?key=value 직렬화.
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string | { pathname?: string; query?: Record<string, string> };
    [k: string]: unknown;
  }) => {
    let hrefStr: string;
    if (typeof href === "string") {
      hrefStr = href;
    } else {
      const path = href.pathname ?? "";
      const qs = href.query
        ? "?" +
          Object.entries(href.query)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join("&")
        : "";
      hrefStr = `${path}${qs}`;
    }
    return (
      <a href={hrefStr} {...rest}>
        {children}
      </a>
    );
  },
}));

import PrincipalDashboardPage from "@/app/admin/principal/page";

const INSTITUTION_A = "11111111-1111-4111-8111-111111111111";
const INSTITUTION_B = "22222222-2222-4222-8222-222222222222";
const USER_PRINCIPAL = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STUDENT_LAST = "ffffffff-ffff-4fff-8fff-fffffffffff0";
const STUDENT_OTHER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee0";

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];
function assertNoMedicalTerms(text: string) {
  for (const word of FORBIDDEN_MEDICAL_WORDS) {
    expect(text).not.toContain(word);
  }
}

function setAuthUser(id: string) {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}

function setUserRow(role: string | null, institutionId: string | null) {
  findUniqueMock.mockResolvedValue({ role, institutionId });
}

function dashboardWithMore(
  institutionId: string,
  opts: { hasMore: boolean; nextCursor?: string } = { hasMore: false },
) {
  return {
    institutionId,
    classCount: 2,
    studentCount: 35,
    thisWeekDiagnoseCount: 100,
    articulationAvg: 72,
    classrooms: [
      {
        id: "class-1",
        name: "햇님반",
        studentCount: 30,
        diagnoseCount: 50,
        avgScore: 78,
        students: [{ id: STUDENT_OTHER }],
        hasMoreStudents: opts.hasMore,
        ...(opts.hasMore && opts.nextCursor ? { nextStudentsCursor: opts.nextCursor } : {}),
      },
      {
        id: "class-2",
        name: "달님반",
        studentCount: 5,
        diagnoseCount: 10,
        avgScore: 70,
        students: [],
        hasMoreStudents: false,
      },
    ],
    classroomsEmpty: false,
  };
}

beforeEach(() => {
  findUniqueMock.mockReset();
  getUserMock.mockReset();
  loadDashMock.mockReset();
  redirectMock.mockClear();
});

describe("/admin/principal cursor 페이지네이션 UI (9f204cd 후속)", () => {
  it("[1] 첫 페이지 (searchParams 비어 있음) → cursor undefined + '처음으로'/'더 보기' 모두 미노출", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(dashboardWithMore(INSTITUTION_A, { hasMore: false }));

    const ui = await PrincipalDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    // aggregator 호출 시 cursor = undefined.
    expect(loadDashMock).toHaveBeenCalledWith(INSTITUTION_A, { studentsCursor: undefined });

    // 첫 페이지 → "처음으로" 미노출.
    expect(
      container.querySelector("[data-testid='principal-students-cursor-reset']"),
    ).toBeNull();
    // hasMoreStudents=false → "더 보기" 미노출.
    expect(
      container.querySelector("[data-testid='principal-students-cursor-next']"),
    ).toBeNull();
  });

  it("[2] hasMoreStudents=true + nextStudentsCursor → '더 보기' Link 노출 (href 검증)", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(
      dashboardWithMore(INSTITUTION_A, { hasMore: true, nextCursor: STUDENT_LAST }),
    );

    const ui = await PrincipalDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    const more = container.querySelector(
      "[data-testid='principal-students-cursor-next']",
    );
    expect(more).not.toBeNull();
    const href = more?.getAttribute("href") ?? "";
    expect(href).toContain("/admin/principal");
    expect(href).toContain(`students_cursor=${encodeURIComponent(STUDENT_LAST)}`);
    expect(more?.textContent).toBe("더 보기");
  });

  it("[3] hasMoreStudents=false (모든 반) → '더 보기' 미노출", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(dashboardWithMore(INSTITUTION_A, { hasMore: false }));

    const ui = await PrincipalDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='principal-students-cursor-next']"),
    ).toBeNull();
  });

  it("[4] cursor 있는 페이지 → '처음으로' Link 노출 (href=/admin/principal)", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(dashboardWithMore(INSTITUTION_A, { hasMore: false }));

    const ui = await PrincipalDashboardPage({
      searchParams: Promise.resolve({ students_cursor: STUDENT_LAST }),
    });
    const { container } = render(ui);

    const reset = container.querySelector(
      "[data-testid='principal-students-cursor-reset']",
    );
    expect(reset).not.toBeNull();
    expect(reset?.getAttribute("href")).toBe("/admin/principal");
    expect(reset?.textContent).toBe("처음으로");
  });

  it("[5] cross-tenant 차단 — page 는 본인 institutionId 만 전달 (cursor 영향 없음)", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(
      dashboardWithMore(INSTITUTION_A, { hasMore: true, nextCursor: STUDENT_LAST }),
    );

    await PrincipalDashboardPage({
      searchParams: Promise.resolve({ students_cursor: STUDENT_LAST }),
    });

    expect(loadDashMock).toHaveBeenCalledTimes(1);
    // 첫 번째 인자는 본인 institutionId, 다른 기관 id 절대 미사용.
    const callArgs = loadDashMock.mock.calls[0];
    expect(callArgs[0]).toBe(INSTITUTION_A);
    const argsJson = JSON.stringify(callArgs);
    expect(argsJson).not.toContain(INSTITUTION_B);
  });

  it("[6] searchParams.students_cursor → loadPrincipalDashboard 의 studentsCursor 로 전달", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(dashboardWithMore(INSTITUTION_A, { hasMore: false }));

    await PrincipalDashboardPage({
      searchParams: Promise.resolve({ students_cursor: STUDENT_LAST }),
    });

    expect(loadDashMock).toHaveBeenCalledWith(INSTITUTION_A, {
      studentsCursor: STUDENT_LAST,
    });
  });

  it("[7] CON-04 — cursor 분기 UI (더 보기 / 처음으로 모두 노출) 금칙어 0건", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(
      dashboardWithMore(INSTITUTION_A, { hasMore: true, nextCursor: STUDENT_LAST }),
    );

    const ui = await PrincipalDashboardPage({
      searchParams: Promise.resolve({ students_cursor: STUDENT_OTHER }),
    });
    const { container } = render(ui);

    // 두 Link 모두 노출되는 페이지.
    expect(
      container.querySelector("[data-testid='principal-students-cursor-reset']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='principal-students-cursor-next']"),
    ).not.toBeNull();

    assertNoMedicalTerms(container.textContent ?? "");
  });

  it("[8] 빈 문자열 cursor → undefined 로 정규화 (trim 후 길이 0)", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(dashboardWithMore(INSTITUTION_A, { hasMore: false }));

    await PrincipalDashboardPage({
      searchParams: Promise.resolve({ students_cursor: "   " }),
    });

    expect(loadDashMock).toHaveBeenCalledWith(INSTITUTION_A, { studentsCursor: undefined });
  });
});

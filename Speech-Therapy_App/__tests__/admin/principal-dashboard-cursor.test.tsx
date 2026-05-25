// FR-DASH-CURSOR-PER-CLASSROOM — /admin/principal 반별 cursor UI 통합 테스트.
//
// 책임: searchParams 의 `students_cursor_<classroomId>` 파싱 + ClassroomGrid 의
//   반별 "더 보기" / "이 반 처음으로" + grid 상단 "전체 처음으로" Link 검증.
//
// 격리:
//   - @/lib/db Prisma mock (user.findUnique)
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/admin/principal-aggregator mock (loadPrincipalDashboard)
//   - @/components/admin/DashboardPaginationBeacon Client Component mock
//   - next/link mock — UrlObject 직렬화
//
// 검증 시나리오:
//   [1] 첫 페이지 (searchParams 비어 있음) → aggregator { studentsCursors: {} } 호출
//                                          → 어떤 reset/next Link 도 미노출
//   [2] hasMoreStudents=true + nextStudentsCursor → 반별 "더 보기" Link 노출 (href 검증)
//   [3] 반 A 에만 cursor — "이 반 처음으로" + "전체 처음으로" 노출 (반 B 는 reset 미노출)
//   [4] 반 A + 반 B 모두 cursor 있음 — "더 보기" Link href 가 OTHER 반 cursor 보존
//   [5] cross-tenant 차단 — page 는 본인 institutionId 만 aggregator 에 전달
//   [6] searchParams 의 cursor 들이 모두 studentsCursors map 으로 전달
//   [7] CON-04 — 금칙어 0건 (cursor 분기 UI 포함)
//   [8] 빈 문자열 cursor → 해당 반 cursor 제외 (parse 단계)
//   [9] DashboardPaginationBeacon 이 cursor 있는 페이지에서만 렌더

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

// DashboardPaginationBeacon 은 Client Component — server-side render 시 placeholder.
vi.mock("@/components/admin/DashboardPaginationBeacon", () => ({
  DashboardPaginationBeacon: ({
    role,
    cursors,
  }: {
    role: "principal" | "teacher";
    institutionId: string | null;
    cursors: Record<string, string>;
  }) => (
    <div
      data-testid="dashboard-pagination-beacon"
      data-role={role}
      data-cursor-keys={Object.keys(cursors).join(",")}
    />
  ),
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
const STUDENT_NEXT_A = "cccccccc-cccc-4ccc-8ccc-cccccccccc01";
const STUDENT_NEXT_B = "dddddddd-dddd-4ddd-8ddd-dddddddddd01";

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

function twoClassDashboard(
  institutionId: string,
  opts: {
    classA?: { hasMore: boolean; nextCursor?: string };
    classB?: { hasMore: boolean; nextCursor?: string };
  } = {},
) {
  const a = opts.classA ?? { hasMore: false };
  const b = opts.classB ?? { hasMore: false };
  return {
    institutionId,
    classCount: 2,
    studentCount: 35,
    thisWeekDiagnoseCount: 100,
    articulationAvg: 72,
    classrooms: [
      {
        id: "class-A",
        name: "햇님반",
        studentCount: 30,
        diagnoseCount: 50,
        avgScore: 78,
        students: [{ id: STUDENT_OTHER }],
        hasMoreStudents: a.hasMore,
        ...(a.hasMore && a.nextCursor ? { nextStudentsCursor: a.nextCursor } : {}),
      },
      {
        id: "class-B",
        name: "달님반",
        studentCount: 5,
        diagnoseCount: 10,
        avgScore: 70,
        students: [{ id: STUDENT_LAST }],
        hasMoreStudents: b.hasMore,
        ...(b.hasMore && b.nextCursor ? { nextStudentsCursor: b.nextCursor } : {}),
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

describe("/admin/principal 반별 cursor 페이지네이션 UI (FR-DASH-CURSOR-PER-CLASSROOM)", () => {
  it("[1] 첫 페이지 (searchParams 비어 있음) → studentsCursors={} + 모든 cursor Link 미노출", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(twoClassDashboard(INSTITUTION_A));

    const ui = await PrincipalDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(loadDashMock).toHaveBeenCalledWith(INSTITUTION_A, { studentsCursors: {} });

    expect(
      container.querySelector("[data-testid='principal-students-cursor-reset']"),
    ).toBeNull();
    expect(
      container.querySelector("[data-testid='principal-students-cursor-next-class-A']"),
    ).toBeNull();
    expect(
      container.querySelector("[data-testid='principal-students-cursor-next-class-B']"),
    ).toBeNull();
    expect(container.querySelector("[data-testid='dashboard-pagination-beacon']")).toBeNull();
  });

  it("[2] hasMoreStudents=true → 반별 '더 보기' Link 노출 (href = ?students_cursor_<id>=...)", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(
      twoClassDashboard(INSTITUTION_A, {
        classA: { hasMore: true, nextCursor: STUDENT_NEXT_A },
      }),
    );

    const ui = await PrincipalDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    const moreA = container.querySelector(
      "[data-testid='principal-students-cursor-next-class-A']",
    );
    expect(moreA).not.toBeNull();
    const href = moreA?.getAttribute("href") ?? "";
    expect(href).toContain("/admin/principal");
    expect(href).toContain(
      `students_cursor_class-A=${encodeURIComponent(STUDENT_NEXT_A)}`,
    );
    expect(moreA?.textContent).toBe("더 보기");
    // 반 B 는 hasMore false → 더 보기 미노출.
    expect(
      container.querySelector("[data-testid='principal-students-cursor-next-class-B']"),
    ).toBeNull();
  });

  it("[3] 반 A 에만 cursor — 'A 처음으로' + '전체 처음으로' 노출, B 는 reset 미노출", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(twoClassDashboard(INSTITUTION_A));

    const ui = await PrincipalDashboardPage({
      searchParams: Promise.resolve({ "students_cursor_class-A": STUDENT_LAST }),
    });
    const { container } = render(ui);

    // 전체 처음으로
    const allReset = container.querySelector(
      "[data-testid='principal-students-cursor-reset']",
    );
    expect(allReset).not.toBeNull();
    expect(allReset?.getAttribute("href")).toBe("/admin/principal");
    expect(allReset?.textContent).toBe("전체 처음으로");

    // 반 A 처음으로 (cursor 적용된 반).
    const aReset = container.querySelector(
      "[data-testid='principal-students-cursor-reset-class-A']",
    );
    expect(aReset).not.toBeNull();
    // 반 A 가 유일 cursor 이므로 reset 후 query empty → "/admin/principal" string.
    expect(aReset?.getAttribute("href")).toBe("/admin/principal");

    // 반 B 는 cursor 없음 → reset 미노출.
    expect(
      container.querySelector("[data-testid='principal-students-cursor-reset-class-B']"),
    ).toBeNull();
  });

  it("[4] 반 A + B 둘 다 cursor → '더 보기' href 가 OTHER 반 cursor 보존", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(
      twoClassDashboard(INSTITUTION_A, {
        classA: { hasMore: true, nextCursor: STUDENT_NEXT_A },
        classB: { hasMore: true, nextCursor: STUDENT_NEXT_B },
      }),
    );

    const ui = await PrincipalDashboardPage({
      searchParams: Promise.resolve({
        "students_cursor_class-A": STUDENT_OTHER,
        "students_cursor_class-B": STUDENT_LAST,
      }),
    });
    const { container } = render(ui);

    // 반 A "더 보기" href → A 는 nextCursor 로 갱신, B 는 기존 cursor (STUDENT_LAST) 보존.
    const moreA = container.querySelector(
      "[data-testid='principal-students-cursor-next-class-A']",
    );
    const moreAHref = moreA?.getAttribute("href") ?? "";
    expect(moreAHref).toContain(`students_cursor_class-A=${encodeURIComponent(STUDENT_NEXT_A)}`);
    expect(moreAHref).toContain(`students_cursor_class-B=${encodeURIComponent(STUDENT_LAST)}`);

    // 반 B "더 보기" href → B 는 nextCursor, A 는 기존 cursor (STUDENT_OTHER) 보존.
    const moreB = container.querySelector(
      "[data-testid='principal-students-cursor-next-class-B']",
    );
    const moreBHref = moreB?.getAttribute("href") ?? "";
    expect(moreBHref).toContain(`students_cursor_class-B=${encodeURIComponent(STUDENT_NEXT_B)}`);
    expect(moreBHref).toContain(`students_cursor_class-A=${encodeURIComponent(STUDENT_OTHER)}`);

    // 반 A "이 반 처음으로" → A 만 제거, B 보존.
    const resetA = container.querySelector(
      "[data-testid='principal-students-cursor-reset-class-A']",
    );
    const resetAHref = resetA?.getAttribute("href") ?? "";
    expect(resetAHref).toContain(`students_cursor_class-B=${encodeURIComponent(STUDENT_LAST)}`);
    expect(resetAHref).not.toContain("students_cursor_class-A=");
  });

  it("[5] cross-tenant 차단 — page 는 본인 institutionId 만 aggregator 에 전달", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(
      twoClassDashboard(INSTITUTION_A, {
        classA: { hasMore: true, nextCursor: STUDENT_NEXT_A },
      }),
    );

    await PrincipalDashboardPage({
      searchParams: Promise.resolve({ "students_cursor_class-A": STUDENT_LAST }),
    });

    expect(loadDashMock).toHaveBeenCalledTimes(1);
    const callArgs = loadDashMock.mock.calls[0];
    expect(callArgs[0]).toBe(INSTITUTION_A);
    const argsJson = JSON.stringify(callArgs);
    expect(argsJson).not.toContain(INSTITUTION_B);
  });

  it("[6] searchParams 의 cursor 들이 모두 studentsCursors map 으로 전달", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(twoClassDashboard(INSTITUTION_A));

    await PrincipalDashboardPage({
      searchParams: Promise.resolve({
        "students_cursor_class-A": STUDENT_LAST,
        "students_cursor_class-B": STUDENT_OTHER,
        // 무관한 param 은 무시.
        page: "1",
      }),
    });

    expect(loadDashMock).toHaveBeenCalledWith(INSTITUTION_A, {
      studentsCursors: {
        "class-A": STUDENT_LAST,
        "class-B": STUDENT_OTHER,
      },
    });
  });

  it("[7] CON-04 — cursor 분기 UI 포함 금칙어 0건", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(
      twoClassDashboard(INSTITUTION_A, {
        classA: { hasMore: true, nextCursor: STUDENT_NEXT_A },
      }),
    );

    const ui = await PrincipalDashboardPage({
      searchParams: Promise.resolve({ "students_cursor_class-A": STUDENT_OTHER }),
    });
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='principal-students-cursor-reset']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='principal-students-cursor-next-class-A']"),
    ).not.toBeNull();

    assertNoMedicalTerms(container.textContent ?? "");
  });

  it("[8] 빈 문자열 cursor → 해당 반 cursor 제외 (parse 단계)", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(twoClassDashboard(INSTITUTION_A));

    await PrincipalDashboardPage({
      searchParams: Promise.resolve({
        "students_cursor_class-A": "   ",
        "students_cursor_class-B": STUDENT_LAST,
      }),
    });

    // class-A 는 빈/공백이므로 제외, class-B 만 전달.
    expect(loadDashMock).toHaveBeenCalledWith(INSTITUTION_A, {
      studentsCursors: { "class-B": STUDENT_LAST },
    });
  });

  it("[9] DashboardPaginationBeacon — cursor 있는 페이지에서만 렌더 + role/cursors 전달", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal", INSTITUTION_A);
    loadDashMock.mockResolvedValueOnce(twoClassDashboard(INSTITUTION_A));

    const ui = await PrincipalDashboardPage({
      searchParams: Promise.resolve({
        "students_cursor_class-A": STUDENT_LAST,
        "students_cursor_class-B": STUDENT_OTHER,
      }),
    });
    const { container } = render(ui);

    const beacon = container.querySelector("[data-testid='dashboard-pagination-beacon']");
    expect(beacon).not.toBeNull();
    expect(beacon?.getAttribute("data-role")).toBe("principal");
    const keys = (beacon?.getAttribute("data-cursor-keys") ?? "").split(",").sort();
    expect(keys).toEqual(["class-A", "class-B"]);
  });
});

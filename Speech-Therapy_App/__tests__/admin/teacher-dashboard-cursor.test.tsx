// 9f204cd 후속 — /admin/teacher cursor 페이지네이션 UI 진입 통합 테스트.
//
// 책임: searchParams.students_cursor 처리 + TeacherClassroomGrid 의 "더 보기" / "처음으로" Link.
// teacher-dashboard.test.tsx 와는 독립 — cursor 전용 시나리오만 검증.
//
// 격리 (principal-dashboard-cursor.test.tsx 와 동일 패턴):
//   - @/lib/db Prisma mock
//   - @/lib/supabase/server mock
//   - @/lib/admin/teacher-aggregator mock
//   - @/components/admin/teacher/SendClassroomCushionButton mock (Client Component 격리)
//   - next/link mock — UrlObject 직렬화
//
// 검증 시나리오 (≥ 6):
//   [1] 첫 페이지 (searchParams 비어 있음) → loadTeacherDashboard { studentsCursor: undefined } 호출
//                                          → "처음으로"/"더 보기" 미노출
//   [2] hasMoreStudents=true + nextStudentsCursor → "더 보기" Link 노출 (href 검증)
//   [3] hasMoreStudents=false → "더 보기" 미노출
//   [4] cursor 있는 페이지 → "처음으로" Link 노출 (href=/admin/teacher)
//   [5] cross-teacher 차단 — page 는 본인 user.id 만 aggregator 에 전달
//   [6] searchParams.students_cursor → loadTeacherDashboard 의 studentsCursor 로 전달
//   [7] CON-04 — 금칙어 0건 (cursor 분기 UI 포함)
//   [8] 빈 문자열 cursor → undefined 정규화

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
vi.mock("@/lib/admin/teacher-aggregator", () => ({
  loadTeacherDashboard: (...args: unknown[]) => loadDashMock(...args),
}));

const redirectMock = vi.fn((target: string) => {
  throw new Error(`NEXT_REDIRECT:${target}`);
});
vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

// SendClassroomCushionButton 는 Client Component — server-side render 시 단순 placeholder 로 격리.
vi.mock("@/components/admin/teacher/SendClassroomCushionButton", () => ({
  SendClassroomCushionButton: ({ classId }: { classId: string; studentCount: number }) => (
    <button data-testid={`send-cushion-${classId}`} type="button">
      알림장 보내기
    </button>
  ),
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

import TeacherDashboardPage from "@/app/admin/teacher/page";

const USER_TEACHER = "11111111-1111-4111-8111-111111111111";
const USER_TEACHER_OTHER = "99999999-9999-4999-8999-999999999999";
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

function setUserRow(role: string | null) {
  findUniqueMock.mockResolvedValue({ role });
}

function dashboardWithMore(
  teacherId: string,
  opts: { hasMore: boolean; nextCursor?: string } = { hasMore: false },
) {
  return {
    teacherId,
    classCount: 1,
    studentCount: 30,
    thisWeekDiagnoseCount: 50,
    articulationAvg: 75,
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

describe("/admin/teacher cursor 페이지네이션 UI (9f204cd 후속)", () => {
  it("[1] 첫 페이지 (searchParams 비어 있음) → cursor undefined + '처음으로'/'더 보기' 모두 미노출", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(dashboardWithMore(USER_TEACHER, { hasMore: false }));

    const ui = await TeacherDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(loadDashMock).toHaveBeenCalledWith(USER_TEACHER, { studentsCursor: undefined });

    expect(
      container.querySelector("[data-testid='teacher-students-cursor-reset']"),
    ).toBeNull();
    expect(
      container.querySelector("[data-testid='teacher-students-cursor-next']"),
    ).toBeNull();
  });

  it("[2] hasMoreStudents=true + nextStudentsCursor → '더 보기' Link 노출 (href 검증)", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(
      dashboardWithMore(USER_TEACHER, { hasMore: true, nextCursor: STUDENT_LAST }),
    );

    const ui = await TeacherDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    const more = container.querySelector("[data-testid='teacher-students-cursor-next']");
    expect(more).not.toBeNull();
    const href = more?.getAttribute("href") ?? "";
    expect(href).toContain("/admin/teacher");
    expect(href).toContain(`students_cursor=${encodeURIComponent(STUDENT_LAST)}`);
    expect(more?.textContent).toBe("더 보기");
  });

  it("[3] hasMoreStudents=false → '더 보기' 미노출", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(dashboardWithMore(USER_TEACHER, { hasMore: false }));

    const ui = await TeacherDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='teacher-students-cursor-next']"),
    ).toBeNull();
  });

  it("[4] cursor 있는 페이지 → '처음으로' Link 노출 (href=/admin/teacher)", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(dashboardWithMore(USER_TEACHER, { hasMore: false }));

    const ui = await TeacherDashboardPage({
      searchParams: Promise.resolve({ students_cursor: STUDENT_LAST }),
    });
    const { container } = render(ui);

    const reset = container.querySelector("[data-testid='teacher-students-cursor-reset']");
    expect(reset).not.toBeNull();
    expect(reset?.getAttribute("href")).toBe("/admin/teacher");
    expect(reset?.textContent).toBe("처음으로");
  });

  it("[5] cross-teacher 차단 — page 는 본인 user.id 만 aggregator 에 전달", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(
      dashboardWithMore(USER_TEACHER, { hasMore: true, nextCursor: STUDENT_LAST }),
    );

    await TeacherDashboardPage({
      searchParams: Promise.resolve({ students_cursor: STUDENT_LAST }),
    });

    expect(loadDashMock).toHaveBeenCalledTimes(1);
    const callArgs = loadDashMock.mock.calls[0];
    expect(callArgs[0]).toBe(USER_TEACHER);
    const argsJson = JSON.stringify(callArgs);
    expect(argsJson).not.toContain(USER_TEACHER_OTHER);
  });

  it("[6] searchParams.students_cursor → loadTeacherDashboard 의 studentsCursor 로 전달", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(dashboardWithMore(USER_TEACHER, { hasMore: false }));

    await TeacherDashboardPage({
      searchParams: Promise.resolve({ students_cursor: STUDENT_LAST }),
    });

    expect(loadDashMock).toHaveBeenCalledWith(USER_TEACHER, {
      studentsCursor: STUDENT_LAST,
    });
  });

  it("[7] CON-04 — cursor 분기 UI (더 보기 / 처음으로 모두 노출) 금칙어 0건", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(
      dashboardWithMore(USER_TEACHER, { hasMore: true, nextCursor: STUDENT_LAST }),
    );

    const ui = await TeacherDashboardPage({
      searchParams: Promise.resolve({ students_cursor: STUDENT_OTHER }),
    });
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='teacher-students-cursor-reset']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='teacher-students-cursor-next']"),
    ).not.toBeNull();

    assertNoMedicalTerms(container.textContent ?? "");
  });

  it("[8] 빈 문자열 cursor → undefined 로 정규화", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(dashboardWithMore(USER_TEACHER, { hasMore: false }));

    await TeacherDashboardPage({
      searchParams: Promise.resolve({ students_cursor: "   " }),
    });

    expect(loadDashMock).toHaveBeenCalledWith(USER_TEACHER, { studentsCursor: undefined });
  });
});

// FR-DASH-CURSOR-PER-CLASSROOM — /admin/teacher 반별 cursor UI 통합 테스트.
//
// 격리 (principal-dashboard-cursor.test.tsx 와 동일 패턴):
//   - @/lib/db Prisma mock
//   - @/lib/supabase/server mock
//   - @/lib/admin/teacher-aggregator mock
//   - @/components/admin/teacher/SendClassroomCushionButton mock (Client Component 격리)
//   - @/components/admin/DashboardPaginationBeacon mock
//   - next/link mock — UrlObject 직렬화

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

vi.mock("@/components/admin/teacher/SendClassroomCushionButton", () => ({
  SendClassroomCushionButton: ({ classId }: { classId: string; studentCount: number }) => (
    <button data-testid={`send-cushion-${classId}`} type="button">
      알림장 보내기
    </button>
  ),
}));

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

function setUserRow(role: string | null) {
  findUniqueMock.mockResolvedValue({ role });
}

function twoClassDashboard(
  teacherId: string,
  opts: {
    classA?: { hasMore: boolean; nextCursor?: string };
    classB?: { hasMore: boolean; nextCursor?: string };
  } = {},
) {
  const a = opts.classA ?? { hasMore: false };
  const b = opts.classB ?? { hasMore: false };
  return {
    teacherId,
    classCount: 2,
    studentCount: 35,
    thisWeekDiagnoseCount: 50,
    articulationAvg: 75,
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
        avgScore: 72,
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

describe("/admin/teacher 반별 cursor 페이지네이션 UI (FR-DASH-CURSOR-PER-CLASSROOM)", () => {
  it("[1] 첫 페이지 (searchParams 비어 있음) → studentsCursors={} + 모든 cursor Link 미노출", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(twoClassDashboard(USER_TEACHER));

    const ui = await TeacherDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(loadDashMock).toHaveBeenCalledWith(USER_TEACHER, { studentsCursors: {} });

    expect(
      container.querySelector("[data-testid='teacher-students-cursor-reset']"),
    ).toBeNull();
    expect(
      container.querySelector("[data-testid='teacher-students-cursor-next-class-A']"),
    ).toBeNull();
    expect(container.querySelector("[data-testid='dashboard-pagination-beacon']")).toBeNull();
  });

  it("[2] hasMoreStudents=true → 반별 '더 보기' Link 노출 (href 검증)", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(
      twoClassDashboard(USER_TEACHER, {
        classA: { hasMore: true, nextCursor: STUDENT_NEXT_A },
      }),
    );

    const ui = await TeacherDashboardPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    const moreA = container.querySelector(
      "[data-testid='teacher-students-cursor-next-class-A']",
    );
    expect(moreA).not.toBeNull();
    const href = moreA?.getAttribute("href") ?? "";
    expect(href).toContain("/admin/teacher");
    expect(href).toContain(
      `students_cursor_class-A=${encodeURIComponent(STUDENT_NEXT_A)}`,
    );
    expect(moreA?.textContent).toBe("더 보기");
  });

  it("[3] 반 A 에만 cursor — 'A 처음으로' + '전체 처음으로' 노출, B 는 reset 미노출", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(twoClassDashboard(USER_TEACHER));

    const ui = await TeacherDashboardPage({
      searchParams: Promise.resolve({ "students_cursor_class-A": STUDENT_LAST }),
    });
    const { container } = render(ui);

    const allReset = container.querySelector(
      "[data-testid='teacher-students-cursor-reset']",
    );
    expect(allReset).not.toBeNull();
    expect(allReset?.getAttribute("href")).toBe("/admin/teacher");
    expect(allReset?.textContent).toBe("전체 처음으로");

    const aReset = container.querySelector(
      "[data-testid='teacher-students-cursor-reset-class-A']",
    );
    expect(aReset).not.toBeNull();
    expect(aReset?.getAttribute("href")).toBe("/admin/teacher");

    expect(
      container.querySelector("[data-testid='teacher-students-cursor-reset-class-B']"),
    ).toBeNull();
  });

  it("[4] 반 A + B 둘 다 cursor → '더 보기' href 가 OTHER 반 cursor 보존", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(
      twoClassDashboard(USER_TEACHER, {
        classA: { hasMore: true, nextCursor: STUDENT_NEXT_A },
        classB: { hasMore: true, nextCursor: STUDENT_NEXT_B },
      }),
    );

    const ui = await TeacherDashboardPage({
      searchParams: Promise.resolve({
        "students_cursor_class-A": STUDENT_OTHER,
        "students_cursor_class-B": STUDENT_LAST,
      }),
    });
    const { container } = render(ui);

    const moreA = container.querySelector(
      "[data-testid='teacher-students-cursor-next-class-A']",
    );
    const moreAHref = moreA?.getAttribute("href") ?? "";
    expect(moreAHref).toContain(`students_cursor_class-A=${encodeURIComponent(STUDENT_NEXT_A)}`);
    expect(moreAHref).toContain(`students_cursor_class-B=${encodeURIComponent(STUDENT_LAST)}`);

    const moreB = container.querySelector(
      "[data-testid='teacher-students-cursor-next-class-B']",
    );
    const moreBHref = moreB?.getAttribute("href") ?? "";
    expect(moreBHref).toContain(`students_cursor_class-B=${encodeURIComponent(STUDENT_NEXT_B)}`);
    expect(moreBHref).toContain(`students_cursor_class-A=${encodeURIComponent(STUDENT_OTHER)}`);

    const resetA = container.querySelector(
      "[data-testid='teacher-students-cursor-reset-class-A']",
    );
    const resetAHref = resetA?.getAttribute("href") ?? "";
    expect(resetAHref).toContain(`students_cursor_class-B=${encodeURIComponent(STUDENT_LAST)}`);
    expect(resetAHref).not.toContain("students_cursor_class-A=");
  });

  it("[5] cross-teacher 차단 — page 는 본인 user.id 만 aggregator 에 전달", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(
      twoClassDashboard(USER_TEACHER, {
        classA: { hasMore: true, nextCursor: STUDENT_NEXT_A },
      }),
    );

    await TeacherDashboardPage({
      searchParams: Promise.resolve({ "students_cursor_class-A": STUDENT_LAST }),
    });

    expect(loadDashMock).toHaveBeenCalledTimes(1);
    const callArgs = loadDashMock.mock.calls[0];
    expect(callArgs[0]).toBe(USER_TEACHER);
    const argsJson = JSON.stringify(callArgs);
    expect(argsJson).not.toContain(USER_TEACHER_OTHER);
  });

  it("[6] searchParams 의 cursor 들이 모두 studentsCursors map 으로 전달", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(twoClassDashboard(USER_TEACHER));

    await TeacherDashboardPage({
      searchParams: Promise.resolve({
        "students_cursor_class-A": STUDENT_LAST,
        "students_cursor_class-B": STUDENT_OTHER,
        unrelated: "x",
      }),
    });

    expect(loadDashMock).toHaveBeenCalledWith(USER_TEACHER, {
      studentsCursors: {
        "class-A": STUDENT_LAST,
        "class-B": STUDENT_OTHER,
      },
    });
  });

  it("[7] CON-04 — cursor 분기 UI 포함 금칙어 0건", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(
      twoClassDashboard(USER_TEACHER, {
        classA: { hasMore: true, nextCursor: STUDENT_NEXT_A },
      }),
    );

    const ui = await TeacherDashboardPage({
      searchParams: Promise.resolve({ "students_cursor_class-A": STUDENT_OTHER }),
    });
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='teacher-students-cursor-reset']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='teacher-students-cursor-next-class-A']"),
    ).not.toBeNull();

    assertNoMedicalTerms(container.textContent ?? "");
  });

  it("[8] 빈 문자열 cursor → 해당 반 cursor 제외", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(twoClassDashboard(USER_TEACHER));

    await TeacherDashboardPage({
      searchParams: Promise.resolve({
        "students_cursor_class-A": "   ",
        "students_cursor_class-B": STUDENT_LAST,
      }),
    });

    expect(loadDashMock).toHaveBeenCalledWith(USER_TEACHER, {
      studentsCursors: { "class-B": STUDENT_LAST },
    });
  });

  it("[9] DashboardPaginationBeacon — cursor 있는 페이지에서만 렌더 + role=teacher", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(twoClassDashboard(USER_TEACHER));

    const ui = await TeacherDashboardPage({
      searchParams: Promise.resolve({
        "students_cursor_class-A": STUDENT_LAST,
      }),
    });
    const { container } = render(ui);

    const beacon = container.querySelector("[data-testid='dashboard-pagination-beacon']");
    expect(beacon).not.toBeNull();
    expect(beacon?.getAttribute("data-role")).toBe("teacher");
    expect(beacon?.getAttribute("data-cursor-keys")).toBe("class-A");
  });
});

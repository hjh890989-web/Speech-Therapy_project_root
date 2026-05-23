// FR-Q-TEACHER — /admin/teacher Server Component 통합 테스트.
//
// 격리:
//   - @/lib/db Prisma mock (user.findUnique — role 조회용)
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/admin/teacher-aggregator mock (loadTeacherDashboard)
//   - next/link mock — 단순 <a>
//   - next/navigation redirect mock — throw 흉내
//
// 검증 시나리오 (≥ 8):
//   1. teacher role 정상 → dashboard 렌더 + 4 카드 + classroom grid
//   2. admin role → 통과 (본인 user.id teacherId 시점 view)
//   3. principal role → 통과
//   4. parent role → 403 안내 (teacher-forbidden)
//   5. expert role → 403 안내 (페이지 L2 가드)
//   6. 담당 반 0 → teacher-classrooms-empty 안내
//   7. cross-teacher 차단 — loadTeacherDashboard 호출은 본인 user.id 만
//   8. CON-04 의료 금칙어 0건 (모든 변형)
//   9. 비로그인 → redirect("/login?next=/admin/teacher")
//   10. R4 — 페이지 텍스트에 userId UUID 노출 0

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

import TeacherDashboardPage from "@/app/admin/teacher/page";

const USER_TEACHER = "11111111-1111-4111-8111-111111111111";
const USER_TEACHER_OTHER = "99999999-9999-4999-8999-999999999999";
const USER_ADMIN = "22222222-2222-4222-8222-222222222222";
const USER_PRINCIPAL = "33333333-3333-4333-8333-333333333333";
const USER_PARENT = "44444444-4444-4444-8444-444444444444";
const USER_EXPERT = "55555555-5555-4555-8555-555555555555";

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

function setUserRow(role: string | null) {
  findUniqueMock.mockResolvedValue({ role });
}

function fullDashboard(teacherId: string) {
  return {
    teacherId,
    classCount: 2,
    studentCount: 25,
    thisWeekDiagnoseCount: 60,
    articulationAvg: 71.3,
    classrooms: [
      {
        id: "class-1",
        name: "햇님반",
        studentCount: 15,
        diagnoseCount: 35,
        avgScore: 75,
        students: [],
      },
      {
        id: "class-2",
        name: "달님반",
        studentCount: 10,
        diagnoseCount: 25,
        avgScore: 68,
        students: [],
      },
    ],
    classroomsEmpty: false,
  };
}

function emptyDashboard(teacherId: string) {
  return {
    teacherId,
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

describe("/admin/teacher — FR-Q-TEACHER 선생님 대시보드", () => {
  it("[1] teacher role 정상 → dashboard + 4 카드 + classroom grid 렌더", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(fullDashboard(USER_TEACHER));

    const ui = await TeacherDashboardPage();
    const { container } = render(ui);

    const main = container.querySelector("[data-testid='admin-teacher-page']");
    expect(main).not.toBeNull();
    expect(main?.getAttribute("data-teacher-id")).toBe(USER_TEACHER);

    expect(
      container.querySelector("[data-testid='teacher-stats-card-class-count-value']")
        ?.textContent,
    ).toBe("2");
    expect(
      container.querySelector("[data-testid='teacher-stats-card-student-count-value']")
        ?.textContent,
    ).toBe("25");
    expect(
      container.querySelector("[data-testid='teacher-stats-card-week-count-value']")
        ?.textContent,
    ).toBe("60");
    expect(
      container.querySelector("[data-testid='teacher-stats-card-avg-score-value']")
        ?.textContent,
    ).toBe("71.3");

    const grid = container.querySelector("[data-testid='teacher-classroom-grid']");
    expect(grid).not.toBeNull();
    const cards = container.querySelectorAll("[data-testid^='teacher-classroom-card-']");
    expect(cards).toHaveLength(2);
  });

  it("[2] admin role → 통과 (본인 user.id teacherId 시점 view)", async () => {
    setAuthUser(USER_ADMIN);
    setUserRow("admin");
    loadDashMock.mockResolvedValueOnce(emptyDashboard(USER_ADMIN));

    const ui = await TeacherDashboardPage();
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='admin-teacher-page']")).not.toBeNull();
    expect(container.querySelector("[data-testid='teacher-forbidden']")).toBeNull();
    // admin 본인 user.id 가 loadTeacherDashboard 인자로 전달.
    expect(loadDashMock).toHaveBeenCalledWith(USER_ADMIN);
  });

  it("[3] principal role → 통과", async () => {
    setAuthUser(USER_PRINCIPAL);
    setUserRow("principal");
    loadDashMock.mockResolvedValueOnce(emptyDashboard(USER_PRINCIPAL));

    const ui = await TeacherDashboardPage();
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='admin-teacher-page']")).not.toBeNull();
    expect(loadDashMock).toHaveBeenCalledWith(USER_PRINCIPAL);
  });

  it("[4] parent role → 403 안내 (teacher-forbidden)", async () => {
    setAuthUser(USER_PARENT);
    setUserRow("parent");

    const ui = await TeacherDashboardPage();
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='teacher-forbidden']")).not.toBeNull();
    expect(container.querySelector("[data-testid='admin-teacher-page']")).toBeNull();
    expect(loadDashMock).not.toHaveBeenCalled();
  });

  it("[5] expert role → 403 안내 (페이지 L2 가드 — proxy.ts 는 통과)", async () => {
    setAuthUser(USER_EXPERT);
    setUserRow("expert");

    const ui = await TeacherDashboardPage();
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='teacher-forbidden']")).not.toBeNull();
    expect(loadDashMock).not.toHaveBeenCalled();
  });

  it("[6] 담당 반 0 → teacher-classrooms-empty 안내 (grid 미렌더)", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(emptyDashboard(USER_TEACHER));

    const ui = await TeacherDashboardPage();
    const { container } = render(ui);

    const empty = container.querySelector("[data-testid='teacher-classrooms-empty']");
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toContain("아직 담당으로 지정된 반이 없어요");

    expect(container.querySelector("[data-testid='teacher-classroom-grid']")).toBeNull();

    // 4 카드는 0 으로 렌더.
    expect(
      container.querySelector("[data-testid='teacher-stats-card-class-count-value']")
        ?.textContent,
    ).toBe("0");
    expect(
      container.querySelector("[data-testid='teacher-stats-card-avg-score-value']")
        ?.textContent,
    ).toBe("-");
  });

  it("[7] cross-teacher 차단 — loadTeacherDashboard 호출은 본인 user.id 만 (다른 ID 미사용)", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(fullDashboard(USER_TEACHER));

    await TeacherDashboardPage();

    expect(loadDashMock).toHaveBeenCalledTimes(1);
    expect(loadDashMock).toHaveBeenCalledWith(USER_TEACHER);

    const allCalls = JSON.stringify(loadDashMock.mock.calls);
    expect(allCalls).not.toContain(USER_TEACHER_OTHER);
  });

  it("[8] CON-04 의료 금칙어 0건 (full / empty / forbidden / unauthenticated 분기)", async () => {
    // (a) full
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(fullDashboard(USER_TEACHER));
    const { container: fullC } = render(await TeacherDashboardPage());
    assertNoMedicalTerms(fullC.textContent ?? "");

    // (b) empty
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(emptyDashboard(USER_TEACHER));
    const { container: emptyC } = render(await TeacherDashboardPage());
    assertNoMedicalTerms(emptyC.textContent ?? "");

    // (c) forbidden — parent
    setAuthUser(USER_PARENT);
    setUserRow("parent");
    const { container: forbC } = render(await TeacherDashboardPage());
    assertNoMedicalTerms(forbC.textContent ?? "");

    // (d) forbidden — expert
    setAuthUser(USER_EXPERT);
    setUserRow("expert");
    const { container: expC } = render(await TeacherDashboardPage());
    assertNoMedicalTerms(expC.textContent ?? "");
  });

  it("[9] 비로그인 → redirect('/login?next=/admin/teacher')", async () => {
    setAnonymousAuth();

    await expect(TeacherDashboardPage()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/admin/teacher");
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(loadDashMock).not.toHaveBeenCalled();
  });

  it("[10] R4 — 페이지 textContent 에 다른 user.id 노출 0건 (본인 외)", async () => {
    setAuthUser(USER_TEACHER);
    setUserRow("teacher");
    loadDashMock.mockResolvedValueOnce(fullDashboard(USER_TEACHER));

    const ui = await TeacherDashboardPage();
    const { container } = render(ui);

    const text = container.textContent ?? "";
    expect(text).not.toContain(USER_TEACHER_OTHER);
    expect(text).not.toContain(USER_PARENT);
    expect(text).not.toContain(USER_EXPERT);
    expect(text).not.toContain(USER_ADMIN);
  });
});

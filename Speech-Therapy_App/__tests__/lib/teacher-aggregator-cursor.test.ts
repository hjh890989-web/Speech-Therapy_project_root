// FR-DASH-CURSOR-PER-CLASSROOM — loadTeacherDashboard 반별 cursor 페이지네이션 단위 테스트.
//
// API 변경 (기존 단일 studentsCursor → studentsCursors map):
//   - options.studentsCursor (string) ❌ 제거
//   - options.studentsCursors (Record<classroomId, string>) ✅ 신규
//
// 검증 시나리오:
//   [C1] 30명 이하 → hasMoreStudents: false
//   [C2] 30명 초과 (31 fetch) → hasMoreStudents: true + nextStudentsCursor=30번째 id
//   [C3] studentsCursors[classroomId] 사용 → user.findMany.where.id.gt = cursor 전달
//   [C4] 빈 cursors / undefined → 첫 페이지 fetch
//   [C5] cross-teacher 차단 — teacherId where 절 유지
//   [C6] take+1 trick — 30 vs 31 fetch hasMore 판정
//   [C7] visible 학생 기반 전체 evaluation 집계 — 31번째 id 미포함
//   [C8] 반별 독립 cursor — classA cursor=X, classB cursor=Y → 두 반 윈도우 독립

import { describe, it, expect, vi, beforeEach } from "vitest";

const classFindManyMock = vi.fn();
const userFindManyMock = vi.fn();
const evalCountMock = vi.fn();
const evalAggregateMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    class: {
      findMany: (...args: unknown[]) => classFindManyMock(...args),
    },
    user: {
      findMany: (...args: unknown[]) => userFindManyMock(...args),
    },
    evaluationResult: {
      count: (...args: unknown[]) => evalCountMock(...args),
      aggregate: (...args: unknown[]) => evalAggregateMock(...args),
    },
  },
}));

import {
  loadTeacherDashboard,
  TEACHER_STUDENTS_PER_CLASS,
} from "@/lib/admin/teacher-aggregator";

const TEACHER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TEACHER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function resetAll() {
  classFindManyMock.mockReset();
  userFindManyMock.mockReset();
  evalCountMock.mockReset();
  evalAggregateMock.mockReset();
}

function makeUsers(count: number, prefix = "u-"): Array<{ id: string }> {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${String(i + 1).padStart(4, "0")}`,
  }));
}

/** 전체 + 반별 N 회 분 mock prime (count=0, avg=null). */
function primeEvalRounds(rounds: number) {
  for (let i = 0; i < rounds; i++) {
    evalCountMock.mockResolvedValueOnce(0);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: null } });
  }
}

describe("loadTeacherDashboard — 반별 cursor 페이지네이션 (FR-DASH-CURSOR-PER-CLASSROOM)", () => {
  beforeEach(() => {
    resetAll();
  });

  it("[C1] 30명 이하 — hasMoreStudents=false, nextStudentsCursor 없음", async () => {
    classFindManyMock.mockResolvedValueOnce([{ id: "class-1", name: "햇님반" }]);
    userFindManyMock.mockResolvedValueOnce(makeUsers(20));
    primeEvalRounds(2);

    const data = await loadTeacherDashboard(TEACHER_A);

    expect(data.classrooms).toHaveLength(1);
    expect(data.classrooms[0].students).toHaveLength(20);
    expect(data.classrooms[0].hasMoreStudents).toBe(false);
    expect(data.classrooms[0].nextStudentsCursor).toBeUndefined();
  });

  it("[C2] 30명 초과 (31 fetch) — hasMoreStudents=true + nextStudentsCursor=30번째 id", async () => {
    classFindManyMock.mockResolvedValueOnce([{ id: "class-big", name: "큰반" }]);
    const users31 = makeUsers(TEACHER_STUDENTS_PER_CLASS + 1);
    userFindManyMock.mockResolvedValueOnce(users31);
    primeEvalRounds(2);

    const data = await loadTeacherDashboard(TEACHER_A);

    expect(data.classrooms[0].students).toHaveLength(TEACHER_STUDENTS_PER_CLASS);
    expect(data.classrooms[0].hasMoreStudents).toBe(true);
    expect(data.classrooms[0].nextStudentsCursor).toBe(
      users31[TEACHER_STUDENTS_PER_CLASS - 1].id,
    );
  });

  it("[C3] studentsCursors[classroomId] 사용 — Prisma user.findMany.where.id.gt = cursor", async () => {
    classFindManyMock.mockResolvedValueOnce([{ id: "class-1", name: "햇님반" }]);
    userFindManyMock.mockResolvedValueOnce([]);
    // 전체 + 반별 (반별은 visible 0 이므로 실제 prisma 호출 안 됨 — 1 라운드만).
    primeEvalRounds(1);

    const cursor = "u-0030";
    await loadTeacherDashboard(TEACHER_A, {
      studentsCursors: { "class-1": cursor },
    });

    const arg = userFindManyMock.mock.calls[0][0];
    expect(arg.where).toEqual({
      role: "parent",
      classId: "class-1",
      id: { gt: cursor },
    });
    expect(arg.take).toBe(TEACHER_STUDENTS_PER_CLASS + 1);
  });

  it("[C4] 빈 cursors {} / undefined — 첫 페이지 fetch (where.id 미설정)", async () => {
    classFindManyMock.mockResolvedValueOnce([{ id: "class-1", name: "햇님반" }]);
    userFindManyMock.mockResolvedValueOnce([]);
    primeEvalRounds(1);
    await loadTeacherDashboard(TEACHER_A, { studentsCursors: {} });
    const arg = userFindManyMock.mock.calls[0][0];
    expect(arg.where).toEqual({ role: "parent", classId: "class-1" });

    resetAll();
    classFindManyMock.mockResolvedValueOnce([{ id: "class-1", name: "햇님반" }]);
    userFindManyMock.mockResolvedValueOnce([]);
    primeEvalRounds(1);
    await loadTeacherDashboard(TEACHER_A, {});
    const arg2 = userFindManyMock.mock.calls[0][0];
    expect(arg2.where).toEqual({ role: "parent", classId: "class-1" });
  });

  it("[C5] cross-teacher 차단 — cursor 입력해도 teacherId where 절 유지 (R4)", async () => {
    classFindManyMock.mockResolvedValueOnce([{ id: "class-1", name: "햇님반" }]);
    userFindManyMock.mockResolvedValueOnce([]);
    primeEvalRounds(1);

    await loadTeacherDashboard(TEACHER_A, {
      studentsCursors: { "class-1": "u-9999" },
    });

    const findArg = classFindManyMock.mock.calls[0][0];
    expect(findArg.where.teacherId).toBe(TEACHER_A);

    const allCalls = [
      ...classFindManyMock.mock.calls,
      ...userFindManyMock.mock.calls,
      ...evalCountMock.mock.calls,
      ...evalAggregateMock.mock.calls,
    ];
    const serialized = JSON.stringify(allCalls);
    expect(serialized).not.toContain(TEACHER_B);
  });

  it("[C6] take+1 trick 경계 — 30 fetch=hasMore false, 31 fetch=hasMore true", async () => {
    classFindManyMock.mockResolvedValueOnce([{ id: "class-exact", name: "딱30" }]);
    const users30 = makeUsers(TEACHER_STUDENTS_PER_CLASS);
    userFindManyMock.mockResolvedValueOnce(users30);
    primeEvalRounds(2);
    let data = await loadTeacherDashboard(TEACHER_A);
    expect(data.classrooms[0].students).toHaveLength(TEACHER_STUDENTS_PER_CLASS);
    expect(data.classrooms[0].hasMoreStudents).toBe(false);

    resetAll();
    classFindManyMock.mockResolvedValueOnce([{ id: "class-over", name: "넘침" }]);
    const users31 = makeUsers(TEACHER_STUDENTS_PER_CLASS + 1);
    userFindManyMock.mockResolvedValueOnce(users31);
    primeEvalRounds(2);
    data = await loadTeacherDashboard(TEACHER_A);
    expect(data.classrooms[0].students).toHaveLength(TEACHER_STUDENTS_PER_CLASS);
    expect(data.classrooms[0].hasMoreStudents).toBe(true);
    expect(data.classrooms[0].nextStudentsCursor).toBe(
      users31[TEACHER_STUDENTS_PER_CLASS - 1].id,
    );
  });

  it("[C7] 전체 evaluation 집계는 visible 학생만 대상 — 31번째 id 는 in: 절 미포함", async () => {
    classFindManyMock.mockResolvedValueOnce([{ id: "class-big", name: "큰반" }]);
    const users31 = makeUsers(TEACHER_STUDENTS_PER_CLASS + 1);
    userFindManyMock.mockResolvedValueOnce(users31);
    primeEvalRounds(2);

    await loadTeacherDashboard(TEACHER_A);

    const lastDeficient = users31[TEACHER_STUDENTS_PER_CLASS].id;
    const overallCountArg = evalCountMock.mock.calls[0][0];
    const overallIds: string[] = overallCountArg.where.userId.in;
    expect(overallIds).toHaveLength(TEACHER_STUDENTS_PER_CLASS);
    expect(overallIds).not.toContain(lastDeficient);
  });

  it("[C8] 반별 독립 cursor — classA cursor=X, classB cursor=Y → 두 반 윈도우 독립", async () => {
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-A", name: "A반" },
      { id: "class-B", name: "B반" },
    ]);
    const usersA = Array.from({ length: TEACHER_STUDENTS_PER_CLASS + 1 }, (_, i) => ({
      id: `u-A${String(i + 1).padStart(3, "0")}`,
    }));
    const usersB = Array.from({ length: 7 }, (_, i) => ({
      id: `u-B${String(i + 1).padStart(3, "0")}`,
    }));
    userFindManyMock.mockImplementation(async (arg: { where: { classId: string } }) => {
      if (arg.where.classId === "class-A") return usersA;
      if (arg.where.classId === "class-B") return usersB;
      return [];
    });
    // 전체 + 반별 2 = 3 라운드
    primeEvalRounds(3);

    const cursorA = "u-A050";
    const cursorB = "u-B999";
    const data = await loadTeacherDashboard(TEACHER_A, {
      studentsCursors: { "class-A": cursorA, "class-B": cursorB },
    });

    const callsByClassId = new Map<string, { where: { id?: { gt: string } } }>();
    for (const c of userFindManyMock.mock.calls) {
      const a = c[0] as { where: { classId: string; id?: { gt: string } } };
      callsByClassId.set(a.where.classId, a);
    }
    expect(callsByClassId.get("class-A")?.where.id).toEqual({ gt: cursorA });
    expect(callsByClassId.get("class-B")?.where.id).toEqual({ gt: cursorB });

    const aClass = data.classrooms.find((c) => c.id === "class-A");
    const bClass = data.classrooms.find((c) => c.id === "class-B");
    expect(aClass?.students).toHaveLength(TEACHER_STUDENTS_PER_CLASS);
    expect(aClass?.hasMoreStudents).toBe(true);
    expect(aClass?.nextStudentsCursor).toBe(usersA[TEACHER_STUDENTS_PER_CLASS - 1].id);
    expect(bClass?.students).toHaveLength(7);
    expect(bClass?.hasMoreStudents).toBe(false);
    expect(bClass?.nextStudentsCursor).toBeUndefined();
  });
});

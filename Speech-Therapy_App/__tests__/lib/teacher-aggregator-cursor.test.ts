// FR-Q-TEACHER 후속 — loadTeacherDashboard students cursor 페이지네이션 단위 테스트.
//
// 검증 시나리오 (≥ 6):
//   [C1] 30명 이하 → hasMoreStudents: false, nextStudentsCursor 없음
//   [C2] 30명 초과 (31 fetch) → hasMoreStudents: true + nextStudentsCursor=30번째 id
//   [C3] studentsCursor 사용 → users.where.id.gt = cursor 전달
//   [C4] 빈 cursor / undefined → 첫 페이지 fetch (where.id 미설정)
//   [C5] cross-teacher 차단 — teacherId where 절 유지
//   [C6] take+1 trick — 30 fetch vs 31 fetch hasMore 판정 정확성
//   [C7] visible 학생 기반 전체/반별 evaluation 집계 — 31번째 id 는 in: 절 미포함

import { describe, it, expect, vi, beforeEach } from "vitest";

const classFindManyMock = vi.fn();
const evalCountMock = vi.fn();
const evalAggregateMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    class: {
      findMany: (...args: unknown[]) => classFindManyMock(...args),
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

describe("loadTeacherDashboard — students cursor 페이지네이션", () => {
  beforeEach(() => {
    resetAll();
  });

  it("[C1] 30명 이하 — hasMoreStudents=false, nextStudentsCursor 없음", async () => {
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-1", name: "햇님반", users: makeUsers(20) },
    ]);
    // 전체 + 반별 1 회.
    primeEvalRounds(2);

    const data = await loadTeacherDashboard(TEACHER_A);

    expect(data.classrooms).toHaveLength(1);
    expect(data.classrooms[0].students).toHaveLength(20);
    expect(data.classrooms[0].hasMoreStudents).toBe(false);
    expect(data.classrooms[0].nextStudentsCursor).toBeUndefined();
  });

  it("[C2] 30명 초과 (31 fetch) — hasMoreStudents=true + nextStudentsCursor=30번째 id", async () => {
    const users31 = makeUsers(TEACHER_STUDENTS_PER_CLASS + 1);
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-big", name: "큰반", users: users31 },
    ]);
    primeEvalRounds(2);

    const data = await loadTeacherDashboard(TEACHER_A);

    expect(data.classrooms[0].students).toHaveLength(TEACHER_STUDENTS_PER_CLASS);
    expect(data.classrooms[0].hasMoreStudents).toBe(true);
    expect(data.classrooms[0].nextStudentsCursor).toBe(
      users31[TEACHER_STUDENTS_PER_CLASS - 1].id,
    );
  });

  it("[C3] studentsCursor 사용 — Prisma users.where.id.gt = cursor 전달", async () => {
    classFindManyMock.mockResolvedValueOnce([]);

    const cursor = "u-0030";
    await loadTeacherDashboard(TEACHER_A, { studentsCursor: cursor });

    const arg = classFindManyMock.mock.calls[0][0];
    expect(arg.select.users.where).toEqual({ role: "parent", id: { gt: cursor } });
    expect(arg.select.users.take).toBe(TEACHER_STUDENTS_PER_CLASS + 1);
  });

  it("[C4] 빈 cursor / undefined — 첫 페이지 fetch (where.id 미설정)", async () => {
    classFindManyMock.mockResolvedValueOnce([]);
    await loadTeacherDashboard(TEACHER_A, { studentsCursor: "" });
    const arg = classFindManyMock.mock.calls[0][0];
    expect(arg.select.users.where).toEqual({ role: "parent" });

    resetAll();
    classFindManyMock.mockResolvedValueOnce([]);
    await loadTeacherDashboard(TEACHER_A, {});
    const arg2 = classFindManyMock.mock.calls[0][0];
    expect(arg2.select.users.where).toEqual({ role: "parent" });
  });

  it("[C5] cross-teacher 차단 — cursor 입력해도 teacherId where 절 유지 (R4)", async () => {
    classFindManyMock.mockResolvedValueOnce([]);

    await loadTeacherDashboard(TEACHER_A, { studentsCursor: "u-9999" });

    const findArg = classFindManyMock.mock.calls[0][0];
    expect(findArg.where.teacherId).toBe(TEACHER_A);

    const allCalls = [
      ...classFindManyMock.mock.calls,
      ...evalCountMock.mock.calls,
      ...evalAggregateMock.mock.calls,
    ];
    const serialized = JSON.stringify(allCalls);
    expect(serialized).not.toContain(TEACHER_B);
  });

  it("[C6] take+1 trick 경계 — 30 fetch=hasMore false, 31 fetch=hasMore true", async () => {
    // (a) 정확히 30 명 fetch — hasMore false.
    const users30 = makeUsers(TEACHER_STUDENTS_PER_CLASS);
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-exact", name: "딱30", users: users30 },
    ]);
    primeEvalRounds(2);
    let data = await loadTeacherDashboard(TEACHER_A);
    expect(data.classrooms[0].students).toHaveLength(TEACHER_STUDENTS_PER_CLASS);
    expect(data.classrooms[0].hasMoreStudents).toBe(false);

    // (b) 31 fetch — hasMore true + cursor 설정.
    resetAll();
    const users31 = makeUsers(TEACHER_STUDENTS_PER_CLASS + 1);
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-over", name: "넘침", users: users31 },
    ]);
    primeEvalRounds(2);
    data = await loadTeacherDashboard(TEACHER_A);
    expect(data.classrooms[0].students).toHaveLength(TEACHER_STUDENTS_PER_CLASS);
    expect(data.classrooms[0].hasMoreStudents).toBe(true);
    expect(data.classrooms[0].nextStudentsCursor).toBe(
      users31[TEACHER_STUDENTS_PER_CLASS - 1].id,
    );
  });

  it("[C7] 반별 evaluation 집계는 visible 학생만 대상 — 31번째 id 는 in: 절 미포함", async () => {
    const users31 = makeUsers(TEACHER_STUDENTS_PER_CLASS + 1);
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-big", name: "큰반", users: users31 },
    ]);
    // 전체 + 반별 = 2 라운드.
    primeEvalRounds(2);

    await loadTeacherDashboard(TEACHER_A);

    const lastDeficient = users31[TEACHER_STUDENTS_PER_CLASS].id; // 31번째
    // 전체 evaluationResult.count 호출 (allUserIds = visible 30 명).
    const overallCountArg = evalCountMock.mock.calls[0][0];
    const overallIds: string[] = overallCountArg.where.userId.in;
    expect(overallIds).toHaveLength(TEACHER_STUDENTS_PER_CLASS);
    expect(overallIds).not.toContain(lastDeficient);
  });
});

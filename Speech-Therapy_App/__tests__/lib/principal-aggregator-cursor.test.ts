// FR-DASH-CURSOR-PER-CLASSROOM — loadPrincipalDashboard 반별 cursor 페이지네이션 단위 테스트.
//
// API 변경 (기존 단일 studentsCursor → studentsCursors map):
//   - options.studentsCursor (string) ❌ 제거
//   - options.studentsCursors (Record<classroomId, string>) ✅ 신규
//   - 응답 nextStudentsCursor 는 반별 (per-classroom) 만, top-level 중복 제거
//
// 검증 시나리오:
//   [C1] 30명 이하 → hasMoreStudents: false, nextStudentsCursor 없음
//   [C2] 30명 초과 (31 fetch) → hasMoreStudents: true + nextStudentsCursor=30번째 id
//   [C3] studentsCursors[classroomId] 사용 → user.findMany.where.id.gt = cursor 전달
//   [C4] 빈 cursors {} / undefined → 모든 반 첫 페이지 fetch (where.id 미설정)
//   [C5] cross-tenant 차단 (cursor 우회 검증) — classId where 절은 cursor 와 무관하게 유지
//   [C6] take+1 trick — fetched.length=31 시 visible=30 + hasMore=true,
//        fetched.length=30 시 visible=30 + hasMore=false
//   [C7] visible 학생 기반 반별 evaluation 집계 — 31번째 id 는 in: 절 미포함
//   [C8] FR-DASH-CURSOR-PER-CLASSROOM 핵심 — classA cursor=X, classB cursor=Y →
//        독립 윈도우 (각 반의 cursor 가 다른 반에 영향 X, 각각의 nextStudentsCursor 산출)

import { describe, it, expect, vi, beforeEach } from "vitest";

const classCountMock = vi.fn();
const userCountMock = vi.fn();
const userFindManyMock = vi.fn();
const evalCountMock = vi.fn();
const evalAggregateMock = vi.fn();
const classFindManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    class: {
      count: (...args: unknown[]) => classCountMock(...args),
      findMany: (...args: unknown[]) => classFindManyMock(...args),
    },
    user: {
      count: (...args: unknown[]) => userCountMock(...args),
      findMany: (...args: unknown[]) => userFindManyMock(...args),
    },
    evaluationResult: {
      count: (...args: unknown[]) => evalCountMock(...args),
      aggregate: (...args: unknown[]) => evalAggregateMock(...args),
    },
  },
}));

import {
  loadPrincipalDashboard,
  PRINCIPAL_STUDENTS_PER_CLASS,
} from "@/lib/admin/principal-aggregator";

const INSTITUTION_A = "11111111-1111-4111-8111-111111111111";
const INSTITUTION_B = "22222222-2222-4222-8222-222222222222";

function resetAll() {
  classCountMock.mockReset();
  userCountMock.mockReset();
  userFindManyMock.mockReset();
  evalCountMock.mockReset();
  evalAggregateMock.mockReset();
  classFindManyMock.mockReset();
}

/** id-0001 ~ id-NNNN 형태 부모 user fixture. */
function makeUsers(count: number, prefix = "u-"): Array<{ id: string }> {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${String(i + 1).padStart(4, "0")}`,
  }));
}

/** 공통 fan-out top-level mock 채우기. */
function primeTopLevel(opts: { classCount?: number; studentCount?: number } = {}) {
  classCountMock.mockResolvedValueOnce(opts.classCount ?? 1);
  userCountMock.mockResolvedValueOnce(opts.studentCount ?? 100);
  evalCountMock.mockResolvedValueOnce(0); // top-level evaluationResult.count
  evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: null } });
}

/** 반별 fan-out mock 채우기 — diagnoseCount=0, avg=null. */
function primePerClass(n: number) {
  for (let i = 0; i < n; i++) {
    evalCountMock.mockResolvedValueOnce(0);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: null } });
  }
}

describe("loadPrincipalDashboard — 반별 cursor 페이지네이션 (FR-DASH-CURSOR-PER-CLASSROOM)", () => {
  beforeEach(() => {
    resetAll();
  });

  it("[C1] 30명 이하 — hasMoreStudents=false, nextStudentsCursor 없음", async () => {
    primeTopLevel();
    classFindManyMock.mockResolvedValueOnce([{ id: "class-1", name: "햇님반" }]);
    userFindManyMock.mockResolvedValueOnce(makeUsers(15));
    primePerClass(1);

    const data = await loadPrincipalDashboard(INSTITUTION_A);

    expect(data.classrooms).toHaveLength(1);
    expect(data.classrooms[0].students).toHaveLength(15);
    expect(data.classrooms[0].hasMoreStudents).toBe(false);
    expect(data.classrooms[0].nextStudentsCursor).toBeUndefined();
  });

  it("[C2] 30명 초과 (31 fetch) — hasMoreStudents=true + nextStudentsCursor=30번째 id", async () => {
    primeTopLevel();
    classFindManyMock.mockResolvedValueOnce([{ id: "class-big", name: "큰반" }]);
    const users31 = makeUsers(PRINCIPAL_STUDENTS_PER_CLASS + 1);
    userFindManyMock.mockResolvedValueOnce(users31);
    primePerClass(1);

    const data = await loadPrincipalDashboard(INSTITUTION_A);

    expect(data.classrooms[0].students).toHaveLength(PRINCIPAL_STUDENTS_PER_CLASS);
    expect(data.classrooms[0].hasMoreStudents).toBe(true);
    expect(data.classrooms[0].nextStudentsCursor).toBe(
      users31[PRINCIPAL_STUDENTS_PER_CLASS - 1].id,
    );
  });

  it("[C3] studentsCursors[classroomId] 사용 — Prisma user.findMany.where.id.gt = cursor 전달", async () => {
    primeTopLevel();
    classFindManyMock.mockResolvedValueOnce([{ id: "class-1", name: "햇님반" }]);
    userFindManyMock.mockResolvedValueOnce([]);
    primePerClass(1);

    const cursor = "u-0030";
    await loadPrincipalDashboard(INSTITUTION_A, {
      studentsCursors: { "class-1": cursor },
    });

    const arg = userFindManyMock.mock.calls[0][0];
    expect(arg.where).toEqual({
      role: "parent",
      classId: "class-1",
      id: { gt: cursor },
    });
    expect(arg.take).toBe(PRINCIPAL_STUDENTS_PER_CLASS + 1);
  });

  it("[C4] 빈 cursors {} / undefined — 모든 반 첫 페이지 (where.id 미설정)", async () => {
    primeTopLevel();
    classFindManyMock.mockResolvedValueOnce([{ id: "class-1", name: "햇님반" }]);
    userFindManyMock.mockResolvedValueOnce([]);
    primePerClass(1);

    await loadPrincipalDashboard(INSTITUTION_A, { studentsCursors: {} });
    const arg = userFindManyMock.mock.calls[0][0];
    expect(arg.where).toEqual({ role: "parent", classId: "class-1" });
    expect(arg.where.id).toBeUndefined();

    // undefined options 케이스
    resetAll();
    primeTopLevel();
    classFindManyMock.mockResolvedValueOnce([{ id: "class-1", name: "햇님반" }]);
    userFindManyMock.mockResolvedValueOnce([]);
    primePerClass(1);
    await loadPrincipalDashboard(INSTITUTION_A, {});
    const arg2 = userFindManyMock.mock.calls[0][0];
    expect(arg2.where).toEqual({ role: "parent", classId: "class-1" });
  });

  it("[C5] cross-tenant 차단 — cursor 입력해도 institutionId where 절 유지 (R4)", async () => {
    primeTopLevel();
    classFindManyMock.mockResolvedValueOnce([{ id: "class-1", name: "햇님반" }]);
    userFindManyMock.mockResolvedValueOnce([]);
    primePerClass(1);

    await loadPrincipalDashboard(INSTITUTION_A, {
      studentsCursors: { "class-1": "u-9999" },
    });

    // class.findMany 의 institutionId scope 유지.
    const classFindArg = classFindManyMock.mock.calls[0][0];
    expect(classFindArg.where.institutionId).toBe(INSTITUTION_A);

    // 다른 institutionId 가 어떤 호출에도 등장하지 않음.
    const allCalls = [
      ...classCountMock.mock.calls,
      ...userCountMock.mock.calls,
      ...userFindManyMock.mock.calls,
      ...evalCountMock.mock.calls,
      ...evalAggregateMock.mock.calls,
      ...classFindManyMock.mock.calls,
    ];
    const serialized = JSON.stringify(allCalls);
    expect(serialized).not.toContain(INSTITUTION_B);
  });

  it("[C6] take+1 trick 경계 — 30 fetch=hasMore false, 31 fetch=hasMore true", async () => {
    // (a) 정확히 30 명 fetch
    primeTopLevel();
    classFindManyMock.mockResolvedValueOnce([{ id: "class-exact", name: "딱30" }]);
    const users30 = makeUsers(PRINCIPAL_STUDENTS_PER_CLASS);
    userFindManyMock.mockResolvedValueOnce(users30);
    primePerClass(1);
    let data = await loadPrincipalDashboard(INSTITUTION_A);
    expect(data.classrooms[0].students).toHaveLength(PRINCIPAL_STUDENTS_PER_CLASS);
    expect(data.classrooms[0].hasMoreStudents).toBe(false);
    expect(data.classrooms[0].nextStudentsCursor).toBeUndefined();

    // (b) 31 명 fetch
    resetAll();
    primeTopLevel();
    classFindManyMock.mockResolvedValueOnce([{ id: "class-over", name: "넘침" }]);
    const users31 = makeUsers(PRINCIPAL_STUDENTS_PER_CLASS + 1);
    userFindManyMock.mockResolvedValueOnce(users31);
    primePerClass(1);
    data = await loadPrincipalDashboard(INSTITUTION_A);
    expect(data.classrooms[0].students).toHaveLength(PRINCIPAL_STUDENTS_PER_CLASS);
    expect(data.classrooms[0].hasMoreStudents).toBe(true);
    expect(data.classrooms[0].nextStudentsCursor).toBe(
      users31[PRINCIPAL_STUDENTS_PER_CLASS - 1].id,
    );
  });

  it("[C7] 반별 evaluation 집계는 visible 학생들만 대상 — 31번째 id 는 in: 절에 미포함", async () => {
    primeTopLevel();
    classFindManyMock.mockResolvedValueOnce([{ id: "class-big", name: "큰반" }]);
    const users31 = makeUsers(PRINCIPAL_STUDENTS_PER_CLASS + 1);
    userFindManyMock.mockResolvedValueOnce(users31);
    primePerClass(1);

    await loadPrincipalDashboard(INSTITUTION_A);

    const lastDeficient = users31[PRINCIPAL_STUDENTS_PER_CLASS].id;
    // primeTopLevel 의 top-level eval.count 가 첫 호출 → 반별은 두 번째 호출.
    const perClassCountArg = evalCountMock.mock.calls[1][0];
    const ids: string[] = perClassCountArg.where.userId.in;
    expect(ids).toHaveLength(PRINCIPAL_STUDENTS_PER_CLASS);
    expect(ids).not.toContain(lastDeficient);
  });

  it("[C8] 반별 독립 cursor — classA cursor=X, classB cursor=Y → 두 반 윈도우 서로 영향 X", async () => {
    primeTopLevel({ classCount: 2 });
    // 두 반 fetch.
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-A", name: "A반" },
      { id: "class-B", name: "B반" },
    ]);
    // A반: u-A001~A031 (31 fetch → hasMore true, cursor=A030)
    const usersA = Array.from({ length: PRINCIPAL_STUDENTS_PER_CLASS + 1 }, (_, i) => ({
      id: `u-A${String(i + 1).padStart(3, "0")}`,
    }));
    // B반: u-B001~B011 (11 fetch → hasMore false)
    const usersB = Array.from({ length: 11 }, (_, i) => ({
      id: `u-B${String(i + 1).padStart(3, "0")}`,
    }));
    // 순서 보장: A반 user.findMany → B반 user.findMany.
    userFindManyMock.mockImplementation(async (arg: { where: { classId: string } }) => {
      if (arg.where.classId === "class-A") return usersA;
      if (arg.where.classId === "class-B") return usersB;
      return [];
    });
    primePerClass(2);

    const cursorA = "u-A050";
    const cursorB = "u-B999";
    const data = await loadPrincipalDashboard(INSTITUTION_A, {
      studentsCursors: { "class-A": cursorA, "class-B": cursorB },
    });

    // A반: cursor=A050 적용된 user.findMany 호출 + hasMore=true + nextStudentsCursor 산출.
    const callsByClassId = new Map<string, { where: { id?: { gt: string } } }>();
    for (const c of userFindManyMock.mock.calls) {
      const a = c[0] as { where: { classId: string; id?: { gt: string } } };
      callsByClassId.set(a.where.classId, a);
    }
    expect(callsByClassId.get("class-A")?.where.id).toEqual({ gt: cursorA });
    expect(callsByClassId.get("class-B")?.where.id).toEqual({ gt: cursorB });

    // 응답: A반 visible 30 + hasMore=true (B반 cursor 와 무관),
    //       B반 visible 11 + hasMore=false (A반 cursor 와 무관).
    const aClass = data.classrooms.find((c) => c.id === "class-A");
    const bClass = data.classrooms.find((c) => c.id === "class-B");
    expect(aClass?.students).toHaveLength(PRINCIPAL_STUDENTS_PER_CLASS);
    expect(aClass?.hasMoreStudents).toBe(true);
    expect(aClass?.nextStudentsCursor).toBe(usersA[PRINCIPAL_STUDENTS_PER_CLASS - 1].id);
    expect(bClass?.students).toHaveLength(11);
    expect(bClass?.hasMoreStudents).toBe(false);
    expect(bClass?.nextStudentsCursor).toBeUndefined();
  });
});

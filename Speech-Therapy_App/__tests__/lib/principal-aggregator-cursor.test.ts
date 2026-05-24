// FR-Q-009 후속 — loadPrincipalDashboard students cursor 페이지네이션 단위 테스트.
//
// 검증 시나리오 (≥ 6):
//   [C1] 30명 이하 → hasMoreStudents: false, nextStudentsCursor 없음
//   [C2] 30명 초과 (31 fetch) → hasMoreStudents: true + nextStudentsCursor=30번째 id
//   [C3] studentsCursor 사용 → users.where.id.gt = cursor 전달 (다음 페이지 fetch)
//   [C4] 빈 cursor ("" / undefined) → 첫 페이지 fetch (where.id 미설정)
//   [C5] cross-tenant 차단 (cursor 우회 검증) — institutionId where 절은 cursor 와 무관하게 유지
//   [C6] take+1 trick — fetched.length=31 시 visible.length=30 + hasMore=true,
//        fetched.length=30 시 visible.length=30 + hasMore=false
//
// take+1 trick 정확성: hasMore 판정은 fetched.length > PRINCIPAL_STUDENTS_PER_CLASS 로만.

import { describe, it, expect, vi, beforeEach } from "vitest";

const classCountMock = vi.fn();
const userCountMock = vi.fn();
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

/** 공통 fan-out top-level mock 채우기 (반별 count/aggregate 도 default 채움). */
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

describe("loadPrincipalDashboard — students cursor 페이지네이션", () => {
  beforeEach(() => {
    resetAll();
  });

  it("[C1] 30명 이하 — hasMoreStudents=false, nextStudentsCursor 없음", async () => {
    primeTopLevel();
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-1", name: "햇님반", users: makeUsers(15) },
    ]);
    primePerClass(1);

    const data = await loadPrincipalDashboard(INSTITUTION_A);

    expect(data.classrooms).toHaveLength(1);
    expect(data.classrooms[0].students).toHaveLength(15);
    expect(data.classrooms[0].hasMoreStudents).toBe(false);
    expect(data.classrooms[0].nextStudentsCursor).toBeUndefined();
  });

  it("[C2] 30명 초과 (31 fetch) — hasMoreStudents=true + nextStudentsCursor=30번째 id", async () => {
    primeTopLevel();
    // 31 명 fetch (take+1 trick) — 마지막 1 개는 다음 페이지 존재 신호용.
    const users31 = makeUsers(PRINCIPAL_STUDENTS_PER_CLASS + 1);
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-big", name: "큰반", users: users31 },
    ]);
    primePerClass(1);

    const data = await loadPrincipalDashboard(INSTITUTION_A);

    expect(data.classrooms[0].students).toHaveLength(PRINCIPAL_STUDENTS_PER_CLASS); // 30
    expect(data.classrooms[0].hasMoreStudents).toBe(true);
    // nextStudentsCursor = 30번째 (즉 visible[29].id), 31번째 fetched 직전.
    expect(data.classrooms[0].nextStudentsCursor).toBe(
      users31[PRINCIPAL_STUDENTS_PER_CLASS - 1].id,
    );
  });

  it("[C3] studentsCursor 사용 — Prisma users.where.id.gt = cursor 전달", async () => {
    primeTopLevel();
    classFindManyMock.mockResolvedValueOnce([]);

    const cursor = "u-0030";
    await loadPrincipalDashboard(INSTITUTION_A, { studentsCursor: cursor });

    const arg = classFindManyMock.mock.calls[0][0];
    expect(arg.select.users.where).toEqual({ role: "parent", id: { gt: cursor } });
    // take+1 trick 유지
    expect(arg.select.users.take).toBe(PRINCIPAL_STUDENTS_PER_CLASS + 1);
  });

  it("[C4] 빈 cursor / undefined — 첫 페이지 fetch (where.id 미설정)", async () => {
    primeTopLevel();
    classFindManyMock.mockResolvedValueOnce([]);

    await loadPrincipalDashboard(INSTITUTION_A, { studentsCursor: "" });

    const arg = classFindManyMock.mock.calls[0][0];
    expect(arg.select.users.where).toEqual({ role: "parent" });
    expect(arg.select.users.where.id).toBeUndefined();

    // undefined 케이스
    resetAll();
    primeTopLevel();
    classFindManyMock.mockResolvedValueOnce([]);
    await loadPrincipalDashboard(INSTITUTION_A, {});
    const arg2 = classFindManyMock.mock.calls[0][0];
    expect(arg2.select.users.where).toEqual({ role: "parent" });
  });

  it("[C5] cross-tenant 차단 — cursor 입력해도 institutionId where 절 유지 (R4)", async () => {
    primeTopLevel();
    classFindManyMock.mockResolvedValueOnce([]);

    await loadPrincipalDashboard(INSTITUTION_A, { studentsCursor: "u-9999" });

    const findArg = classFindManyMock.mock.calls[0][0];
    expect(findArg.where.institutionId).toBe(INSTITUTION_A);

    // 다른 institutionId 가 cursor 와 함께 등장하지 않음.
    const allCalls = [
      ...classCountMock.mock.calls,
      ...userCountMock.mock.calls,
      ...evalCountMock.mock.calls,
      ...evalAggregateMock.mock.calls,
      ...classFindManyMock.mock.calls,
    ];
    const serialized = JSON.stringify(allCalls);
    expect(serialized).not.toContain(INSTITUTION_B);
  });

  it("[C6] take+1 trick 경계 — 30 fetch=hasMore false, 31 fetch=hasMore true", async () => {
    // (a) 정확히 30 명 fetch — take+1 시 31 fetch 했는데 30 만 있는 경우.
    primeTopLevel();
    const users30 = makeUsers(PRINCIPAL_STUDENTS_PER_CLASS);
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-exact", name: "딱30", users: users30 },
    ]);
    primePerClass(1);
    let data = await loadPrincipalDashboard(INSTITUTION_A);
    expect(data.classrooms[0].students).toHaveLength(PRINCIPAL_STUDENTS_PER_CLASS);
    expect(data.classrooms[0].hasMoreStudents).toBe(false);
    expect(data.classrooms[0].nextStudentsCursor).toBeUndefined();

    // (b) 31 명 fetch — hasMore true + cursor 설정.
    resetAll();
    primeTopLevel();
    const users31 = makeUsers(PRINCIPAL_STUDENTS_PER_CLASS + 1);
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-over", name: "넘침", users: users31 },
    ]);
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
    const users31 = makeUsers(PRINCIPAL_STUDENTS_PER_CLASS + 1);
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-big", name: "큰반", users: users31 },
    ]);
    primePerClass(1);

    await loadPrincipalDashboard(INSTITUTION_A);

    // 반별 evaluationResult.count where.userId.in 은 visible 30 명만 (31번째 미포함).
    const lastDeficient = users31[PRINCIPAL_STUDENTS_PER_CLASS].id; // index 30 → 31번째
    // primeTopLevel 의 top-level eval.count 가 첫 호출 → 반별은 두 번째 호출.
    const perClassCountArg = evalCountMock.mock.calls[1][0];
    const ids: string[] = perClassCountArg.where.userId.in;
    expect(ids).toHaveLength(PRINCIPAL_STUDENTS_PER_CLASS);
    expect(ids).not.toContain(lastDeficient);
  });
});

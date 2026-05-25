// FR-Q-TEACHER — loadTeacherDashboard 단위 테스트 (Prisma mock).
//
// FR-DASH-CURSOR-PER-CLASSROOM 후속 — 반별 cursor 적용을 위해 user.findMany 가 반 단위로 호출됨.
//   기존: class.findMany 의 select.users 안에서 한 번에 fetch.
//   변경: class.findMany 는 id/name 만 → 반별 prisma.user.findMany 로 fan-out.
//
// 검증 시나리오:
//   1. 정상 — 본인 teacherId 의 Class + 원아 + 진단 집계 정합
//   2. 빈 teacherId → emptyPayload (Prisma 미호출)
//   3. 담당 반 0 → classroomsEmpty=true + 카운트 0 + Prisma 추가 호출 없음
//   4. 반 안 원아 0명 — 추가 evaluationResult 쿼리 skip + 0/null 채움
//   5. articulationAvg null — 데이터 0건 처리
//   6. cross-teacher 차단 — where.teacherId 가 입력값으로만 전달
//   7. user.findMany 가 반당 1회 호출 + where.classId/role=parent + take=N+1 + orderBy id asc
//   8. 최근 N일 since 윈도우 (createdAt.gte)
//   9. 동일 원아가 여러 반에 속하지 않는다고 가정 — flat 중복 제거 검증

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
  TEACHER_RECENT_DAYS,
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

describe("loadTeacherDashboard — FR-Q-TEACHER 집계 helper", () => {
  beforeEach(() => {
    resetAll();
  });

  it("[1] 정상 — 본인 teacherId 의 Class + 원아 + 진단 집계 정합", async () => {
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-1", name: "햇님반" },
      { id: "class-2", name: "달님반" },
    ]);
    userFindManyMock.mockImplementation(async (arg: { where: { classId: string } }) => {
      if (arg.where.classId === "class-1") return [{ id: "u-1" }, { id: "u-2" }];
      if (arg.where.classId === "class-2") return [{ id: "u-3" }];
      return [];
    });
    // 전체 집계 (allUserIds = [u-1, u-2, u-3])
    evalCountMock.mockResolvedValueOnce(50); // 전체 thisWeek
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: 72.5 } }); // 전체 avg
    // 반별 (class-1)
    evalCountMock.mockResolvedValueOnce(40);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: 75 } });
    // 반별 (class-2)
    evalCountMock.mockResolvedValueOnce(10);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: 60 } });

    const data = await loadTeacherDashboard(TEACHER_A);

    expect(data.teacherId).toBe(TEACHER_A);
    expect(data.classCount).toBe(2);
    expect(data.studentCount).toBe(3); // 2 + 1
    expect(data.thisWeekDiagnoseCount).toBe(50);
    expect(data.articulationAvg).toBe(72.5);
    expect(data.classroomsEmpty).toBe(false);
    expect(data.classrooms).toHaveLength(2);
    expect(data.classrooms[0]).toEqual({
      id: "class-1",
      name: "햇님반",
      studentCount: 2,
      diagnoseCount: 40,
      avgScore: 75,
      students: [{ id: "u-1" }, { id: "u-2" }],
      hasMoreStudents: false,
    });
    expect(data.classrooms[1]).toEqual({
      id: "class-2",
      name: "달님반",
      studentCount: 1,
      diagnoseCount: 10,
      avgScore: 60,
      students: [{ id: "u-3" }],
      hasMoreStudents: false,
    });
  });

  it("[2] 빈 teacherId → Prisma 호출 0 + zero state", async () => {
    const data = await loadTeacherDashboard("");

    expect(classFindManyMock).not.toHaveBeenCalled();
    expect(userFindManyMock).not.toHaveBeenCalled();
    expect(evalCountMock).not.toHaveBeenCalled();
    expect(evalAggregateMock).not.toHaveBeenCalled();

    expect(data.teacherId).toBe("");
    expect(data.classCount).toBe(0);
    expect(data.studentCount).toBe(0);
    expect(data.thisWeekDiagnoseCount).toBe(0);
    expect(data.articulationAvg).toBeNull();
    expect(data.classrooms).toEqual([]);
    expect(data.classroomsEmpty).toBe(true);
  });

  it("[3] 담당 반 0 → classroomsEmpty true + Prisma evaluationResult skip", async () => {
    classFindManyMock.mockResolvedValueOnce([]);
    // allUserIds=[] → evaluationResult.count/aggregate 는 Promise.resolve 폴백 — Prisma 미호출.

    const data = await loadTeacherDashboard(TEACHER_A);

    expect(classFindManyMock).toHaveBeenCalledTimes(1);
    // 반 0건 → user.findMany 호출 0.
    expect(userFindManyMock).not.toHaveBeenCalled();
    // allUserIds 빈 분기 — eval count/aggregate Prisma 직접 호출 0.
    expect(evalCountMock).not.toHaveBeenCalled();
    expect(evalAggregateMock).not.toHaveBeenCalled();

    expect(data.classCount).toBe(0);
    expect(data.studentCount).toBe(0);
    expect(data.thisWeekDiagnoseCount).toBe(0);
    expect(data.articulationAvg).toBeNull();
    expect(data.classrooms).toEqual([]);
    expect(data.classroomsEmpty).toBe(true);
  });

  it("[4] 반 안 원아 0명 — 반별 추가 evaluationResult 쿼리 skip", async () => {
    classFindManyMock.mockResolvedValueOnce([{ id: "class-empty", name: "신설반" }]);
    userFindManyMock.mockResolvedValueOnce([]);
    // allUserIds=[] → 전체 집계도 Prisma 호출 0.

    const data = await loadTeacherDashboard(TEACHER_A);

    expect(evalCountMock).not.toHaveBeenCalled();
    expect(evalAggregateMock).not.toHaveBeenCalled();

    expect(data.classCount).toBe(1);
    expect(data.studentCount).toBe(0);
    expect(data.thisWeekDiagnoseCount).toBe(0);
    expect(data.articulationAvg).toBeNull();
    expect(data.classrooms).toHaveLength(1);
    expect(data.classrooms[0]).toEqual({
      id: "class-empty",
      name: "신설반",
      studentCount: 0,
      diagnoseCount: 0,
      avgScore: null,
      students: [],
      hasMoreStudents: false,
    });
    expect(data.classroomsEmpty).toBe(false);
  });

  it("[5] articulationAvg null (집계 결과 _avg null) → 그대로 null 반환", async () => {
    classFindManyMock.mockResolvedValueOnce([{ id: "class-1", name: "햇님반" }]);
    userFindManyMock.mockResolvedValueOnce([{ id: "u-1" }]);
    evalCountMock.mockResolvedValueOnce(0);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: null } });
    // class-1 별:
    evalCountMock.mockResolvedValueOnce(0);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: null } });

    const data = await loadTeacherDashboard(TEACHER_A);

    expect(data.articulationAvg).toBeNull();
    expect(data.classrooms[0].avgScore).toBeNull();
  });

  it("[6] cross-teacher 차단 — where.teacherId 가 입력값만 전달 (R4)", async () => {
    classFindManyMock.mockResolvedValueOnce([]);

    await loadTeacherDashboard(TEACHER_A);

    expect(classFindManyMock).toHaveBeenCalledTimes(1);
    const findArg = classFindManyMock.mock.calls[0][0];
    expect(findArg.where.teacherId).toBe(TEACHER_A);

    // 다른 teacherId (B) 가 어떤 호출 인자에도 등장하지 않음.
    const allCalls = [
      ...classFindManyMock.mock.calls,
      ...userFindManyMock.mock.calls,
      ...evalCountMock.mock.calls,
      ...evalAggregateMock.mock.calls,
    ];
    const serialized = JSON.stringify(allCalls);
    expect(serialized).not.toContain(TEACHER_B);
  });

  it("[7] user.findMany 가 반별 1회 + where.classId/role=parent + take=N+1 + orderBy id asc", async () => {
    classFindManyMock.mockResolvedValueOnce([{ id: "class-1", name: "햇님반" }]);
    userFindManyMock.mockResolvedValueOnce([]);

    await loadTeacherDashboard(TEACHER_A);

    expect(userFindManyMock).toHaveBeenCalledTimes(1);
    const arg = userFindManyMock.mock.calls[0][0];
    expect(arg.take).toBe(TEACHER_STUDENTS_PER_CLASS + 1);
    expect(arg.orderBy).toEqual({ id: "asc" });
    expect(arg.where).toEqual({ role: "parent", classId: "class-1" });
    expect(arg.select).toEqual({ id: true });

    const classArg = classFindManyMock.mock.calls[0][0];
    expect(classArg.select).toEqual({ id: true, name: true });
    expect(classArg.orderBy).toEqual({ createdAt: "asc" });
  });

  it("[8] 최근 N일 since 윈도우 — KST 자정 정렬 (TZ 통일 PR 후)", async () => {
    classFindManyMock.mockResolvedValueOnce([{ id: "class-1", name: "햇님반" }]);
    userFindManyMock.mockResolvedValueOnce([{ id: "u-1" }]);
    evalCountMock.mockResolvedValueOnce(0);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: null } });
    evalCountMock.mockResolvedValueOnce(0);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: null } });

    const beforeCall = Date.now();
    await loadTeacherDashboard(TEACHER_A);

    const evalCountArg = evalCountMock.mock.calls[0][0];
    const since: Date = evalCountArg.where.createdAt.gte;
    expect(since).toBeInstanceOf(Date);
    const sevenDaysMs = TEACHER_RECENT_DAYS * 24 * 60 * 60 * 1000;
    const dayMs = 24 * 60 * 60 * 1000;
    expect(since.getTime()).toBeGreaterThanOrEqual(beforeCall - sevenDaysMs - dayMs);
    expect(since.getTime()).toBeLessThanOrEqual(beforeCall - sevenDaysMs + 1000);
    expect(since.getUTCHours()).toBe(15);
    expect(since.getUTCMinutes()).toBe(0);
  });

  it("[9] 동일 원아가 여러 반에 속하지 않는다고 가정 — flat 중복 제거 검증 (Set)", async () => {
    // 운영상 한 부모(원아)는 1개 반만 — 그러나 방어적으로 동일 id 중복 입력 시 dedupe 보장.
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-1", name: "햇님반" },
      { id: "class-2", name: "달님반" },
    ]);
    userFindManyMock.mockImplementation(async (arg: { where: { classId: string } }) => {
      if (arg.where.classId === "class-1") return [{ id: "u-1" }, { id: "u-2" }];
      if (arg.where.classId === "class-2") return [{ id: "u-2" }, { id: "u-3" }]; // u-2 중복
      return [];
    });
    // 전체 집계
    evalCountMock.mockResolvedValueOnce(10);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: 80 } });
    // 반별 (class-1)
    evalCountMock.mockResolvedValueOnce(5);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: 80 } });
    // 반별 (class-2)
    evalCountMock.mockResolvedValueOnce(5);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: 80 } });

    await loadTeacherDashboard(TEACHER_A);

    // 전체 집계 where.userId.in 은 dedupe 된 set (Set 처리) — u-2 1회만.
    const overallCountArg = evalCountMock.mock.calls[0][0];
    const ids: string[] = overallCountArg.where.userId.in;
    expect(new Set(ids).size).toBe(ids.length); // 중복 없음
    expect(ids).toContain("u-1");
    expect(ids).toContain("u-2");
    expect(ids).toContain("u-3");
  });
});

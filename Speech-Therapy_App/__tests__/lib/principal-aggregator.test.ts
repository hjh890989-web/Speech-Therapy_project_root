// FR-Q-009 (#50) — loadPrincipalDashboard 단위 테스트 (Prisma mock).
//
// 검증 시나리오 (≥ 5):
//   1. 정상 — class/user/evaluation 모두 존재 → 4종 카운트 + classrooms 채워짐 + students[] 포함
//   2. 빈 institutionId → emptyPayload (Prisma 미호출)
//   3. 빈 데이터 — 모든 카운트 0 + classrooms=[], classroomsEmpty=true
//   4. cross-tenant 보호 — where 절에 institutionId 가 정확히 입력값으로만 전달
//   5. articulationAvg null → 데이터 0건 처리
//   6. 반 안 원아 0명 — diagnoseCount/avgScore 추가 쿼리 skip + 0/null + students=[]
//   7. 최근 7일 since 윈도우 검증 (gte filter)
//   8. (확장) class.findMany select.users 가 take=PRINCIPAL_STUDENTS_PER_CLASS + orderBy id asc 전달

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks (vi.mock 은 import 호이스팅됨)
// ============================================================================
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
  PRINCIPAL_RECENT_DAYS,
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

describe("loadPrincipalDashboard — FR-Q-009 집계 helper", () => {
  beforeEach(() => {
    resetAll();
  });

  it("[1] 정상 — 4종 카운트 + classrooms 채워진 정합 payload", async () => {
    classCountMock.mockResolvedValueOnce(3);
    userCountMock.mockResolvedValueOnce(45);
    evalCountMock.mockResolvedValueOnce(120); // 기관 전체 카운트
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: 72.5 } });
    classFindManyMock.mockResolvedValueOnce([
      {
        id: "class-1",
        name: "햇님반",
        users: [{ id: "u-1" }, { id: "u-2" }],
      },
      {
        id: "class-2",
        name: "달님반",
        users: [{ id: "u-3" }],
      },
    ]);
    // 반별 추가 호출 — 각 반 별 count + aggregate.
    // class-1: count=40, avg=75
    evalCountMock.mockResolvedValueOnce(40);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: 75 } });
    // class-2: count=10, avg=60
    evalCountMock.mockResolvedValueOnce(10);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: 60 } });

    const data = await loadPrincipalDashboard(INSTITUTION_A);

    expect(data.institutionId).toBe(INSTITUTION_A);
    expect(data.classCount).toBe(3);
    expect(data.studentCount).toBe(45);
    expect(data.thisWeekDiagnoseCount).toBe(120);
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
    });
    expect(data.classrooms[1]).toEqual({
      id: "class-2",
      name: "달님반",
      studentCount: 1,
      diagnoseCount: 10,
      avgScore: 60,
      students: [{ id: "u-3" }],
    });
  });

  it("[2] 빈 institutionId → Prisma 호출 0 + zero state", async () => {
    const data = await loadPrincipalDashboard("");

    expect(classCountMock).not.toHaveBeenCalled();
    expect(userCountMock).not.toHaveBeenCalled();
    expect(evalCountMock).not.toHaveBeenCalled();
    expect(evalAggregateMock).not.toHaveBeenCalled();
    expect(classFindManyMock).not.toHaveBeenCalled();

    expect(data.classCount).toBe(0);
    expect(data.studentCount).toBe(0);
    expect(data.thisWeekDiagnoseCount).toBe(0);
    expect(data.articulationAvg).toBeNull();
    expect(data.classrooms).toEqual([]);
    expect(data.classroomsEmpty).toBe(true);
  });

  it("[3] 빈 데이터 — 모든 카운트 0 + classroomsEmpty true", async () => {
    classCountMock.mockResolvedValueOnce(0);
    userCountMock.mockResolvedValueOnce(0);
    evalCountMock.mockResolvedValueOnce(0);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: null } });
    classFindManyMock.mockResolvedValueOnce([]);

    const data = await loadPrincipalDashboard(INSTITUTION_A);

    expect(data.classCount).toBe(0);
    expect(data.studentCount).toBe(0);
    expect(data.thisWeekDiagnoseCount).toBe(0);
    expect(data.articulationAvg).toBeNull();
    expect(data.classrooms).toEqual([]);
    expect(data.classroomsEmpty).toBe(true);
  });

  it("[4] cross-tenant 보호 — where institutionId 가 정확히 입력값만 전달 (R4)", async () => {
    classCountMock.mockResolvedValueOnce(1);
    userCountMock.mockResolvedValueOnce(5);
    evalCountMock.mockResolvedValueOnce(0);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: null } });
    classFindManyMock.mockResolvedValueOnce([]);

    await loadPrincipalDashboard(INSTITUTION_A);

    // class.count 의 where.institutionId = A
    expect(classCountMock).toHaveBeenCalledWith({
      where: { institutionId: INSTITUTION_A },
    });
    // user.count 의 where.institutionId = A + role=parent
    expect(userCountMock).toHaveBeenCalledWith({
      where: { institutionId: INSTITUTION_A, role: "parent" },
    });
    // evaluationResult.count — nested user.institutionId = A
    const evalCountArg = evalCountMock.mock.calls[0][0];
    expect(evalCountArg.where.user.institutionId).toBe(INSTITUTION_A);
    // evaluationResult.aggregate — nested user.institutionId = A
    const aggArg = evalAggregateMock.mock.calls[0][0];
    expect(aggArg.where.user.institutionId).toBe(INSTITUTION_A);
    // class.findMany — institutionId = A
    const findArg = classFindManyMock.mock.calls[0][0];
    expect(findArg.where.institutionId).toBe(INSTITUTION_A);
    // 다른 institutionId (B) 가 어떤 where 에도 등장하지 않음 (cross-tenant 차단 검증).
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

  it("[5] articulationAvg 평균 null (집계 결과 _avg null) → 그대로 null 반환", async () => {
    classCountMock.mockResolvedValueOnce(2);
    userCountMock.mockResolvedValueOnce(10);
    evalCountMock.mockResolvedValueOnce(0);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: null } });
    classFindManyMock.mockResolvedValueOnce([]);

    const data = await loadPrincipalDashboard(INSTITUTION_A);

    expect(data.articulationAvg).toBeNull();
  });

  it("[6] 반 안 원아 0명 — 추가 evaluationResult 쿼리 skip + 0/null 채움", async () => {
    classCountMock.mockResolvedValueOnce(1);
    userCountMock.mockResolvedValueOnce(0);
    evalCountMock.mockResolvedValueOnce(0);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: null } });
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-empty", name: "신설반", users: [] },
    ]);

    const data = await loadPrincipalDashboard(INSTITUTION_A);

    // 추가 호출 (반별) 없음 — top-level eval.count + eval.aggregate 각 1회만 호출됐어야 함.
    expect(evalCountMock).toHaveBeenCalledTimes(1);
    expect(evalAggregateMock).toHaveBeenCalledTimes(1);
    expect(data.classrooms).toHaveLength(1);
    expect(data.classrooms[0]).toEqual({
      id: "class-empty",
      name: "신설반",
      studentCount: 0,
      diagnoseCount: 0,
      avgScore: null,
      students: [],
    });
    expect(data.classroomsEmpty).toBe(false);
  });

  it("[7b] class.findMany.users select — take=PRINCIPAL_STUDENTS_PER_CLASS + orderBy id asc (navigation list)", async () => {
    classCountMock.mockResolvedValueOnce(0);
    userCountMock.mockResolvedValueOnce(0);
    evalCountMock.mockResolvedValueOnce(0);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: null } });
    classFindManyMock.mockResolvedValueOnce([]);

    await loadPrincipalDashboard(INSTITUTION_A);

    const arg = classFindManyMock.mock.calls[0][0];
    expect(arg.select.users.take).toBe(PRINCIPAL_STUDENTS_PER_CLASS);
    expect(arg.select.users.orderBy).toEqual({ id: "asc" });
    expect(arg.select.users.where).toEqual({ role: "parent" });
    expect(arg.select.users.select).toEqual({ id: true });
  });

  it("[7] 최근 N일 since 윈도우 — createdAt.gte 가 (now - PRINCIPAL_RECENT_DAYS) 이내", async () => {
    classCountMock.mockResolvedValueOnce(0);
    userCountMock.mockResolvedValueOnce(0);
    evalCountMock.mockResolvedValueOnce(0);
    evalAggregateMock.mockResolvedValueOnce({ _avg: { articulationScore: null } });
    classFindManyMock.mockResolvedValueOnce([]);

    const beforeCall = Date.now();
    await loadPrincipalDashboard(INSTITUTION_A);

    const evalCountArg = evalCountMock.mock.calls[0][0];
    const since: Date = evalCountArg.where.createdAt.gte;
    expect(since).toBeInstanceOf(Date);
    const expected = beforeCall - PRINCIPAL_RECENT_DAYS * 24 * 60 * 60 * 1000;
    // 함수 진입 시각과 본 시각 사이의 오차 (수십 ms) 허용.
    expect(since.getTime()).toBeGreaterThanOrEqual(expected - 1000);
    expect(since.getTime()).toBeLessThanOrEqual(expected + 1000);
  });
});

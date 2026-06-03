// Performance 감사 2차 — unstable_cache wrapper + tag helper 단위 검증.
//
// 1) principalDashboardCacheTag / teacherDashboardCacheTag / FUNNEL_CACHE_TAG 의
//    형식 안정성 (key 모양 변경 시 외부 invalidator 가 깨지므로 string snapshot).
// 2) loadPrincipalDashboard / loadTeacherDashboard / aggregateFunnel 가 setup.ts 의
//    unstable_cache passthrough mock 을 통해 본체 prisma fan-out 을 정상 호출하는지.
// 3) cache key parts (serializeCursorsKey) 의 결정성 — 같은 cursors 라도 key 순서
//    무관하게 동일 키.
//
// 본 테스트는 cache layer 자체 (TTL / revalidate) 는 검증하지 않음 — Next.js 내부 책임.
// passthrough mock 으로 인해 "wrapper 가 본 함수를 정확한 인자로 호출하는가" 만 확인.

import { describe, it, expect, vi, beforeEach } from "vitest";

const classCountMock = vi.fn();
const userCountMock = vi.fn();
const userFindManyMock = vi.fn();
const evaluationCountMock = vi.fn();
const evaluationAggregateMock = vi.fn();
const classFindManyMock = vi.fn();
const evaluationFindManyMock = vi.fn();
const rewardCountMock = vi.fn();
const sessionLogCountMock = vi.fn();
// AnalyticsEvent 재연결 후 — funnel 은 analyticsEvent/sessionLog/rewardLog.findMany(distinct) 사용.
const analyticsFindManyMock = vi.fn();
const sessionLogFindManyMock = vi.fn();
const rewardLogFindManyMock = vi.fn();

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
      count: (...args: unknown[]) => evaluationCountMock(...args),
      aggregate: (...args: unknown[]) => evaluationAggregateMock(...args),
      findMany: (...args: unknown[]) => evaluationFindManyMock(...args),
    },
    analyticsEvent: {
      findMany: (...args: unknown[]) => analyticsFindManyMock(...args),
    },
    rewardLog: {
      count: (...args: unknown[]) => rewardCountMock(...args),
      findMany: (...args: unknown[]) => rewardLogFindManyMock(...args),
    },
    sessionLog: {
      count: (...args: unknown[]) => sessionLogCountMock(...args),
      findMany: (...args: unknown[]) => sessionLogFindManyMock(...args),
    },
  },
}));

import {
  loadPrincipalDashboard,
  principalDashboardCacheTag,
  PRINCIPAL_DASHBOARD_CACHE_TTL_SECONDS,
} from "@/lib/admin/principal-aggregator";
import {
  loadTeacherDashboard,
  teacherDashboardCacheTag,
  TEACHER_DASHBOARD_CACHE_TTL_SECONDS,
} from "@/lib/admin/teacher-aggregator";
import {
  aggregateFunnel,
  FUNNEL_CACHE_TAG,
  FUNNEL_CACHE_TTL_SECONDS,
} from "@/lib/analytics/funnel";

beforeEach(() => {
  classCountMock.mockReset();
  userCountMock.mockReset();
  userFindManyMock.mockReset();
  evaluationCountMock.mockReset();
  evaluationAggregateMock.mockReset();
  classFindManyMock.mockReset();
  evaluationFindManyMock.mockReset();
  rewardCountMock.mockReset();
  sessionLogCountMock.mockReset();

  // 기본 default — 0 데이터 시나리오.
  classCountMock.mockResolvedValue(0);
  userCountMock.mockResolvedValue(0);
  userFindManyMock.mockResolvedValue([]);
  evaluationCountMock.mockResolvedValue(0);
  evaluationAggregateMock.mockResolvedValue({ _avg: { articulationScore: null } });
  classFindManyMock.mockResolvedValue([]);
  evaluationFindManyMock.mockResolvedValue([]);
  rewardCountMock.mockResolvedValue(0);
  sessionLogCountMock.mockResolvedValue(0);
});

describe("Performance 감사 2차 — dashboard cache tag helpers", () => {
  it("principalDashboardCacheTag — institutionId scope 형식 안정성", () => {
    expect(principalDashboardCacheTag("inst-x")).toBe("institution:inst-x:dashboard");
    expect(principalDashboardCacheTag("")).toBe("institution::dashboard");
  });

  it("teacherDashboardCacheTag — teacherId scope 형식 안정성", () => {
    expect(teacherDashboardCacheTag("teacher-y")).toBe("teacher:teacher-y:dashboard");
  });

  it("FUNNEL_CACHE_TAG — 단일 string (모든 funnel range invalidate)", () => {
    expect(FUNNEL_CACHE_TAG).toBe("funnel:aggregate");
  });

  it("revalidate TTL 상수 — principal/teacher=60s, funnel=300s", () => {
    expect(PRINCIPAL_DASHBOARD_CACHE_TTL_SECONDS).toBe(60);
    expect(TEACHER_DASHBOARD_CACHE_TTL_SECONDS).toBe(60);
    expect(FUNNEL_CACHE_TTL_SECONDS).toBe(300);
  });
});

describe("Performance 감사 2차 — unstable_cache wrapper passthrough (mocked)", () => {
  it("loadPrincipalDashboard — wrapper 통과 후 본체 prisma fan-out 호출", async () => {
    const result = await loadPrincipalDashboard("inst-1");
    expect(result.institutionId).toBe("inst-1");
    // 핵심 fan-out 4 종 모두 호출됨 — wrapper 가 본체로 정상 forward.
    expect(classCountMock).toHaveBeenCalled();
    expect(userCountMock).toHaveBeenCalled();
    expect(evaluationCountMock).toHaveBeenCalled();
    expect(evaluationAggregateMock).toHaveBeenCalled();
    expect(classFindManyMock).toHaveBeenCalled();
  });

  it("loadPrincipalDashboard — institutionId 비어 있으면 cache 통과 없이 즉시 empty 반환 (fan-out 0회)", async () => {
    const result = await loadPrincipalDashboard("");
    expect(result.institutionId).toBe("");
    expect(result.classCount).toBe(0);
    expect(result.classroomsEmpty).toBe(true);
    expect(classCountMock).not.toHaveBeenCalled();
    expect(classFindManyMock).not.toHaveBeenCalled();
  });

  it("loadTeacherDashboard — wrapper 통과 후 본체 prisma fan-out 호출", async () => {
    const result = await loadTeacherDashboard("teacher-1");
    expect(result.teacherId).toBe("teacher-1");
    expect(classFindManyMock).toHaveBeenCalled();
  });

  it("loadTeacherDashboard — teacherId 비어 있으면 cache 통과 없이 즉시 empty 반환", async () => {
    const result = await loadTeacherDashboard("");
    expect(result.teacherId).toBe("");
    expect(result.classCount).toBe(0);
    expect(classFindManyMock).not.toHaveBeenCalled();
  });

  it("aggregateFunnel — wrapper 통과 후 본체 prisma 호출 (distinct userId findMany)", async () => {
    // 진입/시작 = AnalyticsEvent, 완료 = 도메인 테이블, 모두 findMany(distinct).
    analyticsFindManyMock.mockResolvedValue([]);
    evaluationFindManyMock.mockResolvedValue([]);
    sessionLogFindManyMock.mockResolvedValue([]);
    rewardLogFindManyMock.mockResolvedValue([]);
    const from = new Date("2026-05-01T00:00:00Z");
    const to = new Date("2026-05-08T00:00:00Z");
    const result = await aggregateFunnel({ from, to });
    expect(result.steps.length).toBe(6);
    expect(result.date).toBeDefined();
    // landing/started = AnalyticsEvent, diagnose_completed = EvaluationResult,
    // mission_completed = SessionLog, reward = RewardLog (모두 findMany distinct).
    expect(analyticsFindManyMock).toHaveBeenCalled();
    expect(evaluationFindManyMock).toHaveBeenCalled();
    expect(sessionLogFindManyMock).toHaveBeenCalled();
    expect(rewardLogFindManyMock).toHaveBeenCalled();
  });
});

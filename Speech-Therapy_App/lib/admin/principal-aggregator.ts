// FR-Q-009 (#50) — 원장 대시보드 (반/원아 단위 스크리닝) 집계 helper.
//
// 책임 (Server-side only):
//   1) 본인 institutionId 범위로 한정 (R4 / cross-tenant 차단) — 호출 측이
//      page.tsx 에서 Supabase auth → User.institutionId 확보 후 본 함수에 전달.
//   2) Class / User / EvaluationResult 를 1회 fan-out 으로 집계.
//      - classCount       = prisma.class.count({ institutionId })
//      - studentCount     = prisma.user.count({ institutionId, role: parent })
//      - thisWeekDiagnose = prisma.evaluationResult.count({ user.institutionId, createdAt ≥ 7일 전 })
//      - articulationAvg  = prisma.evaluationResult.aggregate({ _avg })
//      - classrooms       = prisma.class.findMany({ include: users }) + 반별 평균
//
// 부모(parent) = 본 dashboard 의 "원아" 카운트 단위:
//   현재 schema 에 별도 Student 모델이 없으므로 (FR-C-016 후속 PR) Role='parent' 사용자를
//   "원아 1명" 으로 간주 (실 운영상 부모 1명 = 자녀 1명 매핑이 가장 흔함).
//   향후 Student / ChildProfile 모델 도입 시 본 함수만 갱신 — page.tsx / Component 변경 없음.
//
// R4 (자녀 식별 정보 노출 금지):
//   - 반환에 userId / email / 이름 절대 미포함 — 집계 카운트 + 반 이름만.
//   - 반 이름은 원장이 입력한 비식별 라벨 ("햇님반" 등) — R4 위반 아님.
//
// CON-04 (의료 금칙어): 본 모듈은 UI 카피 미생성 — DB 데이터 그대로 반환. UI 측에서 sanitize.
//
// Empty data graceful: institutionId 가 비어 있거나 데이터 0건이면 모든 카운트 0 + classrooms=[].

import { prisma } from "@/lib/db";

/**
 * 1주 = 7일 (UTC 기준 now - 7d). FR-Q-009 §AC Scenario 4 의 "최근 1주" 정의.
 * 변경 시 본 상수만 갱신 — cron / 다른 리포트와는 독립.
 */
export const PRINCIPAL_RECENT_DAYS = 7;

/** 1개 반 단위 집계 결과. R4 — userId 노출 0. */
export interface ClassroomSummary {
  /// Class.id (Class detail page 라우팅용 — 본 PR 은 표시 없음, 후속 PR 에서 사용).
  id: string;
  /// Class.name (원장 입력 라벨, 비식별).
  name: string;
  /// 해당 반에 속한 User(role=parent) 수.
  studentCount: number;
  /// 최근 PRINCIPAL_RECENT_DAYS 일 내 evaluationResult 수.
  diagnoseCount: number;
  /// 최근 PRINCIPAL_RECENT_DAYS 일 내 articulationScore 평균 (0~100). 데이터 0건이면 null.
  avgScore: number | null;
}

/** 원장 대시보드 단일 집계 결과. */
export interface PrincipalDashboardData {
  institutionId: string;
  classCount: number;
  studentCount: number;
  thisWeekDiagnoseCount: number;
  /// 기관 전체 평균 articulationScore (최근 1주). 데이터 0건이면 null.
  articulationAvg: number | null;
  classrooms: ClassroomSummary[];
  /// schema 에 Class 모델이 없거나 0건인 경우 UI 가이드 노출용 플래그.
  /// 본 PR 기준: Class 모델은 schema 에 존재하므로 0건일 때만 true (즉 신규 기관 초기 상태).
  classroomsEmpty: boolean;
}

/**
 * 빈 dashboard payload (institutionId 만 채워진 zero state).
 * page.tsx 가 "기관 미설정" 분기에서 직접 호출하진 않고, 본 함수 내부에서만 사용.
 */
function emptyPayload(institutionId: string): PrincipalDashboardData {
  return {
    institutionId,
    classCount: 0,
    studentCount: 0,
    thisWeekDiagnoseCount: 0,
    articulationAvg: null,
    classrooms: [],
    classroomsEmpty: true,
  };
}

/**
 * 원장 대시보드 핵심 집계 — Server-side only.
 *
 * 입력 institutionId 는 호출 측 (page.tsx) 이 Supabase auth 통해 검증한 본인 institutionId 만
 * 전달해야 함. 본 함수는 추가 권한 검사 없이 입력 institutionId 만 신뢰 → cross-tenant 차단은
 * 호출 측 책임 (단일 책임 원칙).
 *
 * 빈 institutionId 입력 시 emptyPayload 반환 (호출 측이 분기 전에 호출해도 안전).
 */
export async function loadPrincipalDashboard(
  institutionId: string,
): Promise<PrincipalDashboardData> {
  if (!institutionId) return emptyPayload("");

  const since = new Date(Date.now() - PRINCIPAL_RECENT_DAYS * 24 * 60 * 60 * 1000);

  // 병렬 fan-out — RSC LCP < 3,000ms (REQ-NF-004) 보장.
  const [classCount, studentCount, thisWeekDiagnoseCount, avgAgg, classrooms] =
    await Promise.all([
      prisma.class.count({ where: { institutionId } }),
      prisma.user.count({ where: { institutionId, role: "parent" } }),
      prisma.evaluationResult.count({
        where: {
          createdAt: { gte: since },
          user: { institutionId },
        },
      }),
      prisma.evaluationResult.aggregate({
        where: {
          createdAt: { gte: since },
          user: { institutionId },
        },
        _avg: { articulationScore: true },
      }),
      prisma.class.findMany({
        where: { institutionId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          users: {
            where: { role: "parent" },
            select: { id: true },
          },
        },
      }),
    ]);

  // 반별 evaluationResult 집계 — 각 반의 parent userId 집합으로 1회씩 조회.
  // N+1 우려: 반 N개 → N 회 쿼리. 단일 기관당 반 수 ≤ 30 가정 (어린이집/유치원 상한)
  // → 운영상 N = 5~15 이므로 단일 RSC 내 acceptable. 추후 Class 모델에 집계 컬럼 캐시 시 단순화.
  const classroomSummaries: ClassroomSummary[] = await Promise.all(
    classrooms.map(async (cls) => {
      const userIds = cls.users.map((u) => u.id);
      if (userIds.length === 0) {
        return {
          id: cls.id,
          name: cls.name,
          studentCount: 0,
          diagnoseCount: 0,
          avgScore: null,
        };
      }
      const [diagnoseCount, classAvg] = await Promise.all([
        prisma.evaluationResult.count({
          where: {
            userId: { in: userIds },
            createdAt: { gte: since },
          },
        }),
        prisma.evaluationResult.aggregate({
          where: {
            userId: { in: userIds },
            createdAt: { gte: since },
          },
          _avg: { articulationScore: true },
        }),
      ]);
      return {
        id: cls.id,
        name: cls.name,
        studentCount: userIds.length,
        diagnoseCount,
        avgScore: classAvg._avg.articulationScore ?? null,
      };
    }),
  );

  return {
    institutionId,
    classCount,
    studentCount,
    thisWeekDiagnoseCount,
    articulationAvg: avgAgg._avg.articulationScore ?? null,
    classrooms: classroomSummaries,
    classroomsEmpty: classroomSummaries.length === 0,
  };
}

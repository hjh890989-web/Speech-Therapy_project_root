// FR-Q-TEACHER — /admin/teacher 선생님 대시보드 집계 helper.
//
// 책임 (Server-side only):
//   1) teacherId (User.id, role='teacher') 기준 본인 담당 Class.teacherId 만 fetch
//      → cross-teacher 차단 (다른 선생님 담당 반 절대 조회 금지, R4)
//   2) 반별 + 전체 집계 (반 수 / 원아 수 / 최근 7일 진단 수 / 평균 articulationScore)
//   3) 반당 학생(보호자) 목록 — UI 측 StudentRow 가 timeline/PDF 진입 링크 노출
//
// principal/admin 우회 (별도 경로):
//   본 함수는 "본인 담당 teacherId 만" 으로 단순화. principal 은 별도 페이지
//   (/admin/principal) 사용 — 본 페이지의 admin/principal 진입은 page.tsx 가
//   "관리자/원장 도구로 이동" 안내 CTA 만 표시. principal-aggregator 와 분리.
//
// 부모(parent) = "원아" 카운트 단위:
//   현재 schema 에 별도 Student 모델이 없으므로 (FR-C-016 후속 PR) Role='parent'
//   사용자를 "원아 1명" 으로 간주. principal-aggregator 와 동일 정책.
//
// R4 (자녀 식별 정보 노출 금지):
//   - 반환에 email / 이름 절대 미포함 — 집계 카운트 + 반 이름만.
//   - students[].id (User.id UUID) 는 navigation 용으로 노출 — UI 측은 truncate.
//
// CON-04 (의료 금칙어): 본 모듈은 UI 카피 미생성 — DB 데이터 그대로 반환.
//
// 빈 데이터 graceful: teacherId 가 비어 있거나 담당 반 0건이면 모든 카운트 0 + classrooms=[].
//
// 성능: 단일 teacher 당 담당 반 수는 운영상 1~5 → N+1 회 추가 쿼리도 acceptable.

import { prisma } from "@/lib/db";

/** 최근 N일 윈도우 — principal 과 동일 정책 (7일). */
export const TEACHER_RECENT_DAYS = 7;

/** 반당 노출 학생(원아) 최대 수 — principal 과 동일 (30). */
export const TEACHER_STUDENTS_PER_CLASS = 30;

/**
 * 1명 원아(보호자 계정) 단위 navigation 메타. R4:
 *  - email / 이름 / role 등 자녀 식별 정보 일체 미포함.
 *  - displayName 산출은 UI 측 (StudentRow) 책임.
 */
export interface TeacherClassroomStudent {
  /// User.id (UUID) — /admin/timeline/[userId] + /admin/centers/pdf/[userId] navigation 용.
  id: string;
}

/** 1개 반 단위 집계 결과. */
export interface TeacherClassroomSummary {
  /// Class.id (후속 PR 에서 detail page 라우팅에 사용).
  id: string;
  /// Class.name (선생님/원장이 입력한 비식별 라벨).
  name: string;
  /// 해당 반 소속 User(role=parent) 수.
  studentCount: number;
  /// 최근 TEACHER_RECENT_DAYS 일 내 evaluationResult 수.
  diagnoseCount: number;
  /// 최근 TEACHER_RECENT_DAYS 일 내 articulationScore 평균. 0건이면 null.
  avgScore: number | null;
  /// 본 반에 속한 원아(보호자) 목록 — 최대 TEACHER_STUDENTS_PER_CLASS 명.
  /// 정렬: User.id 오름차순 (Prisma select order 안정성).
  students: TeacherClassroomStudent[];
}

/** 선생님 대시보드 단일 집계 결과. */
export interface TeacherDashboardData {
  /// 호출 측 teacherId 그대로 반환 (검증/디버깅 용).
  teacherId: string;
  /// 본인 담당 반 수.
  classCount: number;
  /// 본인 담당 반 소속 원아 수 합계 (반별 studentCount 합).
  studentCount: number;
  /// 본인 담당 반의 원아들의 최근 7일 진단 수.
  thisWeekDiagnoseCount: number;
  /// 본인 담당 반의 원아들의 최근 7일 articulationScore 평균. 0건이면 null.
  articulationAvg: number | null;
  classrooms: TeacherClassroomSummary[];
  /// 담당 반 0건 시 UI 안내 노출용.
  classroomsEmpty: boolean;
}

function emptyPayload(teacherId: string): TeacherDashboardData {
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

/**
 * 선생님 대시보드 핵심 집계 — Server-side only.
 *
 * 입력 teacherId 는 호출 측 (page.tsx) 이 Supabase auth 통해 검증한 본인 user.id 만
 * 전달해야 함. 본 함수는 추가 권한 검사 없이 입력 teacherId 만 신뢰 → cross-teacher
 * 차단은 호출 측 책임 (단일 책임 원칙). 단, where: { teacherId } scope 제한으로
 * 다른 teacher 의 Class 가 결과에 섞일 가능성은 SQL 레벨에서 차단.
 *
 * 빈 teacherId 입력 시 emptyPayload 반환.
 */
export async function loadTeacherDashboard(
  teacherId: string,
): Promise<TeacherDashboardData> {
  if (!teacherId) return emptyPayload("");

  const since = new Date(Date.now() - TEACHER_RECENT_DAYS * 24 * 60 * 60 * 1000);

  // 1단계: 본인 담당 Class 와 소속 parent users 1회 fetch.
  // where: { teacherId } 가 cross-teacher 차단의 핵심 — 다른 teacherId 의 Class 는 절대 포함 X.
  const classrooms = await prisma.class.findMany({
    where: { teacherId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      users: {
        where: { role: "parent" },
        select: { id: true },
        orderBy: { id: "asc" },
        take: TEACHER_STUDENTS_PER_CLASS,
      },
    },
  });

  type ClassRow = { id: string; name: string; users: Array<{ id: string }> };
  const rows = classrooms as ClassRow[];

  // 본인 담당 반의 모든 parent userId 집합 (전체 집계 용).
  const allUserIds = Array.from(new Set(rows.flatMap((r) => r.users.map((u) => u.id))));

  // 2단계: 전체 집계 + 반별 집계 fan-out (반 N 회 추가 쿼리, N ≤ 5 운영 가정).
  const [thisWeekDiagnoseCount, avgAgg, perClassSummaries] = await Promise.all([
    allUserIds.length === 0
      ? Promise.resolve(0)
      : prisma.evaluationResult.count({
          where: {
            userId: { in: allUserIds },
            createdAt: { gte: since },
          },
        }),
    allUserIds.length === 0
      ? Promise.resolve({ _avg: { articulationScore: null as number | null } })
      : prisma.evaluationResult.aggregate({
          where: {
            userId: { in: allUserIds },
            createdAt: { gte: since },
          },
          _avg: { articulationScore: true },
        }),
    Promise.all(
      rows.map(async (cls): Promise<TeacherClassroomSummary> => {
        const userIds = cls.users.map((u) => u.id);
        const students: TeacherClassroomStudent[] = cls.users.map((u) => ({ id: u.id }));
        if (userIds.length === 0) {
          return {
            id: cls.id,
            name: cls.name,
            studentCount: 0,
            diagnoseCount: 0,
            avgScore: null,
            students,
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
          students,
        };
      }),
    ),
  ]);

  const studentCount = perClassSummaries.reduce((sum, c) => sum + c.studentCount, 0);

  return {
    teacherId,
    classCount: rows.length,
    studentCount,
    thisWeekDiagnoseCount,
    articulationAvg: avgAgg._avg.articulationScore ?? null,
    classrooms: perClassSummaries,
    classroomsEmpty: perClassSummaries.length === 0,
  };
}

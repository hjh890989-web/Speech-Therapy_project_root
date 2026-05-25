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

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { kstDaysAgoStart } from "@/lib/timeline/tz";

// Performance 감사 2차 — unstable_cache + revalidateTag wiring (principal 과 동일 정책).
//
// loadTeacherDashboard 도 fan-out + 반별 fan-out 으로 5~10 회 prisma query 가 발생한다.
// 같은 선생님이 짧은 간격으로 페이지 새로고침 시 동일 데이터 반복 fetch → 60초 stale 허용
// + tag 기반 invalidate 로 절감.
//
// 캐시 tag:
//   `teacher:<teacherId>:dashboard` (개별 선생님 단위) +
//   `institution:<institutionId>:dashboard` (기관 단위 — 학생 등록 등 broader invalidation 대응)
//
//   기관 단위 tag 는 본 함수에서는 teacher.institutionId 조회 비용을 피하기 위해 미부착.
//   대신 student-bulk-import 등이 principal/teacher 양쪽 cache 를 다 invalidate 하도록
//   호출자가 책임 (helper 노출).

/** unstable_cache 의 cache key 결정성을 위해 cursors record 를 정렬된 JSON 으로 직렬화. */
function serializeCursorsKey(cursors: Record<string, string>): string {
  const keys = Object.keys(cursors).sort();
  if (keys.length === 0) return "";
  return keys.map((k) => `${k}:${cursors[k]}`).join("|");
}

/** 특정 teacher 의 dashboard cache invalidation 용 tag. */
export function teacherDashboardCacheTag(teacherId: string): string {
  return `teacher:${teacherId}:dashboard`;
}

/** unstable_cache revalidate 주기 (초) — 1분. principal 과 동일 정책. */
export const TEACHER_DASHBOARD_CACHE_TTL_SECONDS = 60;

/**
 * 최근 N일 윈도우 — principal 과 동일 정책 (7일).
 *
 * TZ 통일 (9f204cd 후속): since 시각은 `kstDaysAgoStart(7)` 로 KST 자정 정렬.
 *   principal-aggregator 와 동일 정책으로 dashboard 카운트 정합성 보장.
 */
export const TEACHER_RECENT_DAYS = 7;

/**
 * 반당 1 페이지 노출 학생(원아) 수 (cursor 페이지 사이즈) — principal 과 동일 정책.
 * 초과 시 hasMoreStudents=true + nextStudentsCursor 반환.
 */
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
  /// 정렬: User.id 오름차순 (Prisma select order 안정성, cursor 호환).
  students: TeacherClassroomStudent[];
  /// 본 반 students 페이지 이후 더 많은 학생이 존재? (take+1 trick).
  hasMoreStudents: boolean;
  /// 다음 페이지 cursor (다음 fetch 시 `studentsCursors[<classroomId>]` 로 전달).
  /// 반별로 독립적으로 산출됨 (FR-DASH-CURSOR-PER-CLASSROOM).
  nextStudentsCursor?: string;
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

/** loadTeacherDashboard 옵션 — students cursor 페이지네이션. */
export interface LoadTeacherDashboardOptions {
  /**
   * 반(classroom)별 students cursor 맵 — key=Class.id (UUID), value=User.id (UUID).
   * 본 값보다 큰 id 부터 fetch ({ id: { gt: cursors[classroom.id] } }).
   *
   * FR-DASH-CURSOR-PER-CLASSROOM (본 PR 신규 — 기존 단일 `studentsCursor` 교체):
   *   - 반별 독립 cursor → 한 반의 페이지네이션이 다른 반에 영향 0건.
   *   - 미지정 / 빈 문자열 → 해당 반은 첫 페이지 (where.id 미설정).
   *   - cross-teacher 우회 차단: where: { teacherId } scope 가 상위에서 적용되어
   *     다른 teacher 의 반에는 절대 도달 못함 (안전).
   */
  studentsCursors?: Record<string, string>;
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
 *
 * Cursor 페이지네이션 (FR-DASH-CURSOR-PER-CLASSROOM, 반별 독립):
 *   - options.studentsCursors[classroom.id] 가 있으면 해당 반 users 만 { id: { gt: cursor } } 로 필터.
 *   - take+1 trick — TEACHER_STUDENTS_PER_CLASS+1 fetch 후 마지막 절단.
 *   - 1차 class.findMany 는 id/name 만 fetch → 2차에서 반별 user.findMany 를 Promise.all 로 fan-out.
 */
/**
 * 캐시되지 않은 본체 — 실 prisma fan-out. unstable_cache wrapper 가 본 함수를 호출.
 * 단위 테스트는 본 함수를 직접 호출하면 cache layer 통과 없이 결정성 있게 동작.
 */
async function loadTeacherDashboardUncached(
  teacherId: string,
  options: LoadTeacherDashboardOptions = {},
): Promise<TeacherDashboardData> {
  if (!teacherId) return emptyPayload("");

  // TZ 통일: since = "오늘 KST 자정으로부터 7일 전 KST 자정" instant.
  // principal-aggregator 와 동일 정책 (9f204cd 후속).
  const since = kstDaysAgoStart(TEACHER_RECENT_DAYS);
  const cursors = options.studentsCursors ?? {};
  const studentsTake = TEACHER_STUDENTS_PER_CLASS + 1;

  // 1단계: 본인 담당 Class id/name 만 fetch — users 는 2단계에서 반별 cursor 와 함께 fetch.
  // where: { teacherId } 가 cross-teacher 차단의 핵심 — 다른 teacherId 의 Class 는 절대 포함 X.
  const classrooms = await prisma.class.findMany({
    where: { teacherId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  type ClassRow = { id: string; name: string };
  const rows = classrooms as ClassRow[];

  // 2단계: 반별 user.findMany — 반별 cursor 독립 적용 (FR-DASH-CURSOR-PER-CLASSROOM).
  // R4: where.classId=cls.id 로 본인 담당 반의 parent 만 fetch (cls 는 teacherId 로 이미 scope 됨).
  type ClassPaged = {
    id: string;
    name: string;
    visible: Array<{ id: string }>;
    hasMoreStudents: boolean;
    nextStudentsCursor?: string;
  };
  const paged: ClassPaged[] = await Promise.all(
    rows.map(async (r): Promise<ClassPaged> => {
      const cursor = typeof cursors[r.id] === "string" && cursors[r.id].length > 0
        ? cursors[r.id]
        : undefined;
      const studentsWhere: { role: "parent"; classId: string; id?: { gt: string } } = {
        role: "parent",
        classId: r.id,
      };
      if (cursor) studentsWhere.id = { gt: cursor };

      const fetched = (await prisma.user.findMany({
        where: studentsWhere,
        select: { id: true },
        orderBy: { id: "asc" },
        take: studentsTake,
      })) as Array<{ id: string }>;
      const hasMoreStudents = fetched.length > TEACHER_STUDENTS_PER_CLASS;
      const visible = hasMoreStudents
        ? fetched.slice(0, TEACHER_STUDENTS_PER_CLASS)
        : fetched;
      return {
        id: r.id,
        name: r.name,
        visible,
        hasMoreStudents,
        nextStudentsCursor: hasMoreStudents ? visible[visible.length - 1]?.id : undefined,
      };
    }),
  );

  // 본인 담당 반의 모든 visible parent userId 집합 (전체 집계 용).
  const allUserIds = Array.from(new Set(paged.flatMap((p) => p.visible.map((u) => u.id))));

  // 3단계: 전체 집계 + 반별 집계 fan-out (반 N 회 추가 쿼리, N ≤ 5 운영 가정).
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
      paged.map(async (cls): Promise<TeacherClassroomSummary> => {
        const userIds = cls.visible.map((u) => u.id);
        const students: TeacherClassroomStudent[] = cls.visible.map((u) => ({ id: u.id }));
        if (userIds.length === 0) {
          return {
            id: cls.id,
            name: cls.name,
            studentCount: 0,
            diagnoseCount: 0,
            avgScore: null,
            students,
            hasMoreStudents: cls.hasMoreStudents,
            ...(cls.nextStudentsCursor ? { nextStudentsCursor: cls.nextStudentsCursor } : {}),
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
          hasMoreStudents: cls.hasMoreStudents,
          ...(cls.nextStudentsCursor ? { nextStudentsCursor: cls.nextStudentsCursor } : {}),
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

/**
 * Public export — unstable_cache wrapped 버전 (principal 과 동일 정책).
 *
 * Performance 감사 2차:
 *   1) keyParts: ["teacher-dashboard", teacherId, cursorsKey]
 *   2) tags: [teacher:<teacherId>:dashboard]
 *   3) revalidate: 60 — tag invalidate 가 누락된 경로에 대한 안전망.
 *
 * 빈 teacherId 는 cache 통과 없이 즉시 empty 반환.
 */
export async function loadTeacherDashboard(
  teacherId: string,
  options: LoadTeacherDashboardOptions = {},
): Promise<TeacherDashboardData> {
  if (!teacherId) return emptyPayload("");
  const cursors = options.studentsCursors ?? {};
  const cursorsKey = serializeCursorsKey(cursors);
  const cached = unstable_cache(
    async () => loadTeacherDashboardUncached(teacherId, { studentsCursors: cursors }),
    ["teacher-dashboard", teacherId, cursorsKey],
    {
      tags: [teacherDashboardCacheTag(teacherId)],
      revalidate: TEACHER_DASHBOARD_CACHE_TTL_SECONDS,
    },
  );
  return cached();
}

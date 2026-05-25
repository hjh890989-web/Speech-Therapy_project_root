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
//   - 반환에 email / 이름 절대 미포함 — 집계 카운트 + 반 이름만.
//   - 반 이름은 원장이 입력한 비식별 라벨 ("햇님반" 등) — R4 위반 아님.
//   - students[].id (User.id UUID) 는 timeline/PDF navigation 용으로 노출 — UI 측 (StudentRow)
//     은 4자리 truncate 표기 + tooltip 으로만 풀길이 노출. 본 모듈은 raw id 그대로 반환.
//
// CON-04 (의료 금칙어): 본 모듈은 UI 카피 미생성 — DB 데이터 그대로 반환. UI 측에서 sanitize.
//
// Empty data graceful: institutionId 가 비어 있거나 데이터 0건이면 모든 카운트 0 + classrooms=[].

import { prisma } from "@/lib/db";
import { kstDaysAgoStart } from "@/lib/timeline/tz";

/**
 * 1주 = 7일 (KST 자정 기준 now - 7d). FR-Q-009 §AC Scenario 4 의 "최근 1주" 정의.
 * 변경 시 본 상수만 갱신 — cron / 다른 리포트와는 독립.
 *
 * TZ 통일 (9f204cd 후속): since 시각은 `kstDaysAgoStart(7)` 로 KST 자정 정렬.
 *   - UTC 어떤 시각에 RSC 가 호출되든 동일 결과 (KST 일자 boundary 안정성).
 *   - 기존 `Date.now() - 7d` 는 instant 기반으로, KST 하루 안에서 호출 시점에 따라
 *     포함되는 evaluationResult row 가 미세하게 달라짐.
 */
export const PRINCIPAL_RECENT_DAYS = 7;

/**
 * 반당 1 페이지 노출 학생(원아) 수 (cursor 페이지 사이즈).
 * 30 명 = 어린이집/유치원 평균 학급 정원 상한.
 * 초과 시 hasMoreStudents=true + nextStudentsCursor 반환 (FR-Q-009 후속 페이지네이션 PR).
 */
export const PRINCIPAL_STUDENTS_PER_CLASS = 30;

/**
 * 1명 원아(보호자 계정) 단위 navigation 메타. R4:
 *  - displayName 은 UI 측 (StudentRow) 에서 id 4자리 truncate 로 산출 — 본 타입에는 raw id 만.
 *  - email / 이름 / role 등 자녀 식별 정보 일체 미포함.
 */
export interface ClassroomStudent {
  /// User.id (UUID) — /admin/timeline/[userId] + /admin/centers/pdf/[userId] navigation 용.
  id: string;
}

/** 1개 반 단위 집계 결과. R4 — userId 는 students[] 안에만 (UI 측 truncate 책임). */
export interface ClassroomSummary {
  /// Class.id (Class detail page 라우팅용 — 본 PR 은 표시 없음, 후속 PR 에서 사용).
  id: string;
  /// Class.name (원장 입력 라벨, 비식별).
  name: string;
  /// 해당 반에 속한 User(role=parent) 수 (반 전체, 노출 students[] 길이와 다를 수 있음).
  studentCount: number;
  /// 최근 PRINCIPAL_RECENT_DAYS 일 내 evaluationResult 수.
  diagnoseCount: number;
  /// 최근 PRINCIPAL_RECENT_DAYS 일 내 articulationScore 평균 (0~100). 데이터 0건이면 null.
  avgScore: number | null;
  /// 본 반에 속한 원아(보호자) 목록 — 최대 PRINCIPAL_STUDENTS_PER_CLASS 명.
  /// 정렬: User.id 오름차순 (Prisma select order 안정성, cursor 호환).
  students: ClassroomStudent[];
  /// 본 반 students 페이지 이후 더 많은 학생이 존재? (take+1 trick — 31 번째 fetch 시 true).
  hasMoreStudents: boolean;
  /// 다음 페이지 cursor (다음 fetch 시 `studentsCursors[<classroomId>]` 로 전달).
  /// hasMoreStudents=true 일 때만 set. 반별로 독립적으로 산출됨 (FR-DASH-CURSOR-PER-CLASSROOM).
  nextStudentsCursor?: string;
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

/** loadPrincipalDashboard 옵션 — students cursor 페이지네이션 등. */
export interface LoadPrincipalDashboardOptions {
  /**
   * 반(classroom)별 students cursor 맵 — key=Class.id (UUID), value=User.id (UUID).
   * 본 값보다 큰 id 부터 fetch ({ id: { gt: cursors[classroom.id] } }).
   *
   * FR-DASH-CURSOR-PER-CLASSROOM (본 PR 신규 — 기존 단일 `studentsCursor` 교체):
   *   - 반별 독립 cursor → 한 반의 페이지네이션이 다른 반에 영향 0건.
   *   - 특정 반의 entry 가 없거나 빈 문자열이면 해당 반은 첫 페이지 (where.id 미설정).
   *   - cross-tenant 우회 차단: cursor 는 id 비교만 — institutionId where 조건은 그대로 유지되어
   *     다른 기관 id 를 입력해도 본 기관 users 안에서만 매칭됨 (안전).
   *   - 미지정 반은 그냥 첫 페이지로 처리 (호출 측은 모든 반 cursor 를 채울 필요 없음).
   */
  studentsCursors?: Record<string, string>;
}

/**
 * 원장 대시보드 핵심 집계 — Server-side only.
 *
 * 입력 institutionId 는 호출 측 (page.tsx) 이 Supabase auth 통해 검증한 본인 institutionId 만
 * 전달해야 함. 본 함수는 추가 권한 검사 없이 입력 institutionId 만 신뢰 → cross-tenant 차단은
 * 호출 측 책임 (단일 책임 원칙).
 *
 * 빈 institutionId 입력 시 emptyPayload 반환 (호출 측이 분기 전에 호출해도 안전).
 *
 * Cursor 페이지네이션 (FR-DASH-CURSOR-PER-CLASSROOM, 반별 독립):
 *   - options.studentsCursors[classroom.id] 가 있으면 해당 반 users 만 { id: { gt: cursor } } 로 필터.
 *   - take+1 trick: PRINCIPAL_STUDENTS_PER_CLASS+1 개 fetch → 마지막 1 개를 잘라내고
 *     반별 hasMoreStudents=true + nextStudentsCursor=마지막 노출 학생 id 로 설정.
 *   - 반마다 cursor 가 다를 수 있으므로 1차 class.findMany 는 id/name 만 fetch 한 뒤
 *     2차에서 반별로 user.findMany 를 Promise.all 로 fan-out.
 */
export async function loadPrincipalDashboard(
  institutionId: string,
  options: LoadPrincipalDashboardOptions = {},
): Promise<PrincipalDashboardData> {
  if (!institutionId) return emptyPayload("");

  // TZ 통일: since = "오늘 KST 자정으로부터 7일 전 KST 자정" instant.
  // 기존 `Date.now() - 7d` 의 KST 일자 boundary 불안정성 해소 (9f204cd 후속).
  const since = kstDaysAgoStart(PRINCIPAL_RECENT_DAYS);
  const cursors = options.studentsCursors ?? {};
  // hasMore 판정용 take+1 — 31 개 fetch 시 31 번째 존재 = 다음 페이지 존재.
  const studentsTake = PRINCIPAL_STUDENTS_PER_CLASS + 1;

  // 1단계: 반별 cursor 분리를 위해 class.findMany 는 id/name 만 — users 는 2단계에서 반별 fan-out.
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
        select: { id: true, name: true },
      }),
    ]);

  type ClassRow = { id: string; name: string };
  const classRows = classrooms as ClassRow[];

  // 2단계: 반별 users + 반별 evaluationResult 집계 fan-out — 반별 cursor 독립 적용.
  // N+1 우려: 반 N개 → N 회 user.findMany + N 회 evaluationResult 쿼리. 단일 기관당 반 수 ≤ 30 가정
  // (어린이집/유치원 상한) → 운영상 N = 5~15 이므로 단일 RSC 내 acceptable.
  const classroomSummaries: ClassroomSummary[] = await Promise.all(
    classRows.map(async (cls): Promise<ClassroomSummary> => {
      const cursor = typeof cursors[cls.id] === "string" && cursors[cls.id].length > 0
        ? cursors[cls.id]
        : undefined;
      const studentsWhere: { role: "parent"; classId: string; id?: { gt: string } } = {
        role: "parent",
        classId: cls.id,
      };
      if (cursor) studentsWhere.id = { gt: cursor };

      const fetched = await prisma.user.findMany({
        where: studentsWhere,
        select: { id: true },
        orderBy: { id: "asc" },
        take: studentsTake,
      });
      const rows = fetched as Array<{ id: string }>;
      const hasMoreStudents = rows.length > PRINCIPAL_STUDENTS_PER_CLASS;
      const visible = hasMoreStudents
        ? rows.slice(0, PRINCIPAL_STUDENTS_PER_CLASS)
        : rows;
      const userIds = visible.map((u) => u.id);
      const students: ClassroomStudent[] = visible.map((u) => ({ id: u.id }));
      const nextStudentsCursor = hasMoreStudents
        ? visible[visible.length - 1]?.id
        : undefined;

      if (userIds.length === 0) {
        return {
          id: cls.id,
          name: cls.name,
          studentCount: 0,
          diagnoseCount: 0,
          avgScore: null,
          students,
          hasMoreStudents,
          ...(nextStudentsCursor ? { nextStudentsCursor } : {}),
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
        hasMoreStudents,
        ...(nextStudentsCursor ? { nextStudentsCursor } : {}),
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

// FR-NAV-SEARCH — 글로벌 검색 logic (admin / principal / teacher 운영자 전용).
//
// 책임:
//   1) viewer (Supabase 인증 + DB role + institutionId) 기반으로 scope 분기
//   2) Prisma 단건 fetch (User / Class / Institution) — contains (case-insensitive)
//   3) 결과를 통합 SearchResult[] 로 매핑 + take 20 (각 kind 별 max)
//
// scope 매트릭스 (R4 cross-tenant 차단):
//   admin     : 전 institution / 전 class / 전 user (parent) 검색
//   principal : 본인 institutionId 의 class + 본인 institutionId 의 parent user 만
//   teacher   : 본인 user.id 가 담당 teacherId 인 Class 의 parent 만 (반/기관 비활성)
//   expert    : 검색 비활성 (HITL 큐 전용 — 자녀 직접 검색 불필요, R4 보호)
//   parent    : 검색 비활성 (본인 자녀만 보이므로 글로벌 검색 무의미)
//
// query 검증 정책:
//   - trim 후 길이 < 2 → 빈 배열
//   - trim 후 길이 > 50 → 빈 배열 (서버 부하 보호)
//   - 빈 string / null / undefined → 빈 배열
//
// Prisma 쿼리 패턴:
//   - User.name 컬럼 부재 (schema 상 email 만 unique) → email contains 만.
//     (자녀 이름은 schema 미저장 — R4, name 검색 불가)
//   - Class.name : contains query (case-insensitive)
//   - Institution.name : contains query (case-insensitive)
//
// 인덱스 영향:
//   - email/name LIKE %query% 는 btree 인덱스 미활용 (sequential scan) — 본 PR 은 MVP 단순화.
//     운영 데이터 ≥ 10k row 도달 시 pg_trgm GIN 인덱스 도입 별도 PR.
//
// 회귀 0건:
//   - 기존 timeline / teacher / principal 페이지의 fetch 로직 미수정 — 본 helper 만 신규 추가.
//   - parent / expert role 호출 시 즉시 빈 배열 — DB 호출 0 (성능 + R4 보호).

import { prisma } from "@/lib/db";

/** 검색 결과 단위 — kind 별 그룹 표시용 + 클릭 시 href 이동. */
export interface SearchResult {
  kind: "child" | "class" | "institution";
  /** DB row id (UUID). */
  id: string;
  /** 1차 표시 라벨 (예: 이메일 마스킹된 자녀, 반 이름, 기관 이름). */
  label: string;
  /** 보조 라벨 (예: 자녀가 속한 반 이름 / 기관 이름). */
  subtitle?: string;
  /** 클릭 시 이동할 라우트. */
  href: string;
}

/** 검색 호출자 컨텍스트 — Supabase auth + DB role 단건 조회 후 주입. */
export interface SearchViewer {
  userId: string;
  role: string;
  institutionId: string | null;
}

/** kind 별 최대 결과 수 — 합쳐서 최대 60건 (drop-down UI 가독성). */
export const SEARCH_RESULTS_PER_KIND = 20;

/** query 길이 정책 — 최소 2자 (한국어 일반 1자 검색은 노이즈), 최대 50자 (서버 보호). */
export const SEARCH_QUERY_MIN_LENGTH = 2;
export const SEARCH_QUERY_MAX_LENGTH = 50;

/** 검색이 활성화된 role — admin/principal/teacher 만. */
const SEARCH_ENABLED_ROLES = new Set(["admin", "principal", "teacher"]);

/**
 * R4 보호: 이메일은 부분 마스킹 (운영자 화면에서도 raw 노출 최소화).
 *   - "alice@example.com" → "ali***@example.com"
 *   - 짧은 local-part (≤3) → 첫 1자만 + ***
 */
function maskEmail(email: string): string {
  const atIdx = email.indexOf("@");
  if (atIdx <= 0) return email;
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx);
  if (local.length <= 3) {
    return `${local[0] ?? ""}***${domain}`;
  }
  return `${local.slice(0, 3)}***${domain}`;
}

/** query 정규화 + 검증. 통과 시 trim 된 query, 그 외 null. */
function normalizeQuery(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length < SEARCH_QUERY_MIN_LENGTH) return null;
  if (trimmed.length > SEARCH_QUERY_MAX_LENGTH) return null;
  return trimmed;
}

/**
 * 글로벌 검색 — 자녀 / 반 / 기관 통합 검색.
 *
 * 반환은 ordering 안정성을 위해 kind 순서 (child → class → institution) 로 concat.
 * 빈 결과 / 비활성 role / 짧은 query 모두 빈 배열 (예외 throw 안 함).
 */
export async function searchGlobal(
  rawQuery: string | null | undefined,
  viewer: SearchViewer,
): Promise<SearchResult[]> {
  // 1) role 가드 — 비-운영자는 즉시 빈 배열 (DB 호출 0).
  if (!SEARCH_ENABLED_ROLES.has(viewer.role)) {
    return [];
  }

  // 2) query 검증.
  const query = normalizeQuery(rawQuery);
  if (!query) return [];

  // 3) role 별 scope 분기 후 Prisma fan-out.
  if (viewer.role === "admin") {
    return searchForAdmin(query);
  }
  if (viewer.role === "principal") {
    // institutionId 부재한 principal 은 cross-tenant 차단 (운영상 비정상) — 빈 배열.
    if (!viewer.institutionId) return [];
    return searchForPrincipal(query, viewer.institutionId);
  }
  if (viewer.role === "teacher") {
    return searchForTeacher(query, viewer.userId);
  }
  // SEARCH_ENABLED_ROLES guard 후 도달 불가.
  return [];
}

/** admin — 모든 institution / class / user 검색. */
async function searchForAdmin(query: string): Promise<SearchResult[]> {
  const [users, classes, institutions] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "parent",
        email: { contains: query, mode: "insensitive" },
      },
      select: {
        id: true,
        email: true,
        class: { select: { id: true, name: true } },
        institution: { select: { id: true, name: true } },
      },
      take: SEARCH_RESULTS_PER_KIND,
      orderBy: { createdAt: "desc" },
    }),
    prisma.class.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      select: {
        id: true,
        name: true,
        institution: { select: { id: true, name: true } },
      },
      take: SEARCH_RESULTS_PER_KIND,
      orderBy: { createdAt: "desc" },
    }),
    prisma.institution.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      select: { id: true, name: true },
      take: SEARCH_RESULTS_PER_KIND,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return [
    ...users.map(mapUserToResult),
    ...classes.map(mapClassToResult),
    ...institutions.map(mapInstitutionToResult),
  ];
}

/** principal — 본인 institutionId 의 class + parent user 만. 기관 검색은 본인 1건 한정 (참고용). */
async function searchForPrincipal(
  query: string,
  institutionId: string,
): Promise<SearchResult[]> {
  const [users, classes] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "parent",
        institutionId,
        email: { contains: query, mode: "insensitive" },
      },
      select: {
        id: true,
        email: true,
        class: { select: { id: true, name: true } },
        institution: { select: { id: true, name: true } },
      },
      take: SEARCH_RESULTS_PER_KIND,
      orderBy: { createdAt: "desc" },
    }),
    prisma.class.findMany({
      where: {
        institutionId,
        name: { contains: query, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        institution: { select: { id: true, name: true } },
      },
      take: SEARCH_RESULTS_PER_KIND,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return [
    ...users.map(mapUserToResult),
    ...classes.map(mapClassToResult),
  ];
}

/**
 * teacher — 본인 user.id 가 담당 teacherId 인 Class 의 parent 만.
 *   1) 본인 담당 Class id 목록 fetch (소수 — 보통 1~3 반)
 *   2) classId in (...) + role=parent 로 User 검색
 *   3) 반/기관 검색은 본 PR 비활성 — UI 에서 자녀 검색에 집중.
 */
async function searchForTeacher(
  query: string,
  teacherId: string,
): Promise<SearchResult[]> {
  const ownClasses = await prisma.class.findMany({
    where: { teacherId },
    select: { id: true },
  });
  const classIds = ownClasses.map((c: { id: string }) => c.id);
  if (classIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      role: "parent",
      classId: { in: classIds },
      email: { contains: query, mode: "insensitive" },
    },
    select: {
      id: true,
      email: true,
      class: { select: { id: true, name: true } },
      institution: { select: { id: true, name: true } },
    },
    take: SEARCH_RESULTS_PER_KIND,
    orderBy: { createdAt: "desc" },
  });

  return users.map(mapUserToResult);
}

// ----- 매핑 helpers -----

interface UserRow {
  id: string;
  email: string | null;
  class: { id: string; name: string } | null;
  institution: { id: string; name: string } | null;
}

function mapUserToResult(row: UserRow): SearchResult {
  const label = row.email ? maskEmail(row.email) : "이메일 없음";
  const subtitleParts: string[] = [];
  if (row.class?.name) subtitleParts.push(row.class.name);
  if (row.institution?.name) subtitleParts.push(row.institution.name);
  return {
    kind: "child",
    id: row.id,
    label,
    subtitle: subtitleParts.length > 0 ? subtitleParts.join(" · ") : undefined,
    href: `/admin/timeline/${row.id}`,
  };
}

interface ClassRow {
  id: string;
  name: string;
  institution: { id: string; name: string } | null;
}

function mapClassToResult(row: ClassRow): SearchResult {
  return {
    kind: "class",
    id: row.id,
    label: row.name,
    subtitle: row.institution?.name ?? undefined,
    // /admin/principal 페이지에 anchor 로 이동 — 반 상세는 향후 별도 페이지로 분리.
    href: `/admin/principal#class-${row.id}`,
  };
}

interface InstitutionRow {
  id: string;
  name: string;
}

function mapInstitutionToResult(row: InstitutionRow): SearchResult {
  return {
    kind: "institution",
    id: row.id,
    label: row.name,
    href: `/admin/principal?institution=${row.id}`,
  };
}

/** UI / API 호출 측에서 query 검증을 사전에 분기할 때 사용. */
export function isSearchQueryValid(raw: string | null | undefined): boolean {
  return normalizeQuery(raw) !== null;
}

/** UI / API 호출 측에서 role 분기에 사용. */
export function isSearchEnabledRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return SEARCH_ENABLED_ROLES.has(role);
}

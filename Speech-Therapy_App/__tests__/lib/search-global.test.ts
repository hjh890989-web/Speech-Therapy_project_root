// FR-NAV-SEARCH — searchGlobal 단위 테스트 (Prisma mock).
//
// 검증 시나리오 (≥ 8):
//   1. admin — query 결과 자녀 / 반 / 기관 합치기 + 매핑 검증
//   2. admin — 모든 institution / class / user 검색 (cross-tenant 가능)
//   3. principal — 본인 institutionId scope (Prisma where 검증)
//   4. principal — institutionId 부재 → 빈 배열 + Prisma 미호출
//   5. teacher — 본인 담당 Class 의 parent 만 (반/기관 검색 비활성)
//   6. teacher — 담당 Class 0건 → 빈 배열 + User Prisma 미호출
//   7. parent — 검색 비활성 (빈 배열, Prisma 미호출)
//   8. expert — 검색 비활성 (빈 배열, Prisma 미호출)
//   9. 짧은 query (1자) → 빈 배열 + Prisma 미호출
//  10. 긴 query (51자) → 빈 배열 + Prisma 미호출
//  11. 빈 / null / whitespace query → 빈 배열 + Prisma 미호출
//  12. cross-tenant 차단 — principal 의 institutionId 가 항상 Prisma where 에 포함됨

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const userFindManyMock = vi.fn();
const classFindManyMock = vi.fn();
const institutionFindManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => userFindManyMock(...args),
    },
    class: {
      findMany: (...args: unknown[]) => classFindManyMock(...args),
    },
    institution: {
      findMany: (...args: unknown[]) => institutionFindManyMock(...args),
    },
  },
}));

import {
  searchGlobal,
  isSearchEnabledRole,
  isSearchQueryValid,
  SEARCH_RESULTS_PER_KIND,
  SEARCH_QUERY_MIN_LENGTH,
  SEARCH_QUERY_MAX_LENGTH,
  type SearchViewer,
} from "@/lib/search/global";

// ----- Helpers -----
function adminViewer(): SearchViewer {
  return {
    userId: "admin-user-id",
    role: "admin",
    institutionId: null,
  };
}

function principalViewer(institutionId: string | null = "inst-A"): SearchViewer {
  return {
    userId: "principal-user-id",
    role: "principal",
    institutionId,
  };
}

function teacherViewer(): SearchViewer {
  return {
    userId: "teacher-user-id",
    role: "teacher",
    institutionId: "inst-A",
  };
}

function parentViewer(): SearchViewer {
  return {
    userId: "parent-user-id",
    role: "parent",
    institutionId: null,
  };
}

function expertViewer(): SearchViewer {
  return {
    userId: "expert-user-id",
    role: "expert",
    institutionId: null,
  };
}

beforeEach(() => {
  userFindManyMock.mockReset();
  classFindManyMock.mockReset();
  institutionFindManyMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// 시나리오 1: admin — 자녀/반/기관 합치기 + 매핑 검증
// ============================================================================
describe("searchGlobal — admin role", () => {
  it("[1] admin → 자녀/반/기관 결과 합치기 + 매핑 (label/subtitle/href)", async () => {
    userFindManyMock.mockResolvedValueOnce([
      {
        id: "user-1",
        email: "alice@example.com",
        class: { id: "class-1", name: "햇님반" },
        institution: { id: "inst-A", name: "푸른 어린이집" },
      },
    ]);
    classFindManyMock.mockResolvedValueOnce([
      {
        id: "class-7",
        name: "햇님반",
        institution: { id: "inst-A", name: "푸른 어린이집" },
      },
    ]);
    institutionFindManyMock.mockResolvedValueOnce([
      { id: "inst-99", name: "햇님 유치원" },
    ]);

    const results = await searchGlobal("햇님", adminViewer());

    // 합산 — 자녀 → 반 → 기관 순.
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      kind: "child",
      id: "user-1",
      label: "ali***@example.com", // 마스킹 적용
      subtitle: "햇님반 · 푸른 어린이집",
      href: "/admin/timeline/user-1",
    });
    expect(results[1]).toEqual({
      kind: "class",
      id: "class-7",
      label: "햇님반",
      subtitle: "푸른 어린이집",
      href: "/admin/principal#class-class-7",
    });
    expect(results[2]).toEqual({
      kind: "institution",
      id: "inst-99",
      label: "햇님 유치원",
      href: "/admin/principal?institution=inst-99",
    });
  });

  it("[2] admin → Prisma where 에 institutionId scope 미포함 (전 기관 검색 가능)", async () => {
    userFindManyMock.mockResolvedValueOnce([]);
    classFindManyMock.mockResolvedValueOnce([]);
    institutionFindManyMock.mockResolvedValueOnce([]);

    await searchGlobal("검색어", adminViewer());

    expect(userFindManyMock).toHaveBeenCalledTimes(1);
    expect(classFindManyMock).toHaveBeenCalledTimes(1);
    expect(institutionFindManyMock).toHaveBeenCalledTimes(1);

    const userCall = userFindManyMock.mock.calls[0][0];
    expect(userCall.where).not.toHaveProperty("institutionId");
    expect(userCall.where.role).toBe("parent");
    expect(userCall.where.email.contains).toBe("검색어");
    expect(userCall.take).toBe(SEARCH_RESULTS_PER_KIND);

    const classCall = classFindManyMock.mock.calls[0][0];
    expect(classCall.where).not.toHaveProperty("institutionId");

    const instCall = institutionFindManyMock.mock.calls[0][0];
    expect(instCall.where.name.contains).toBe("검색어");
  });

  it("[1b] admin — User.email null 시 '이메일 없음' 라벨 + subtitle 부분 정보 처리", async () => {
    userFindManyMock.mockResolvedValueOnce([
      {
        id: "user-2",
        email: null,
        class: null,
        institution: { id: "inst-B", name: "달님 기관" },
      },
    ]);
    classFindManyMock.mockResolvedValueOnce([]);
    institutionFindManyMock.mockResolvedValueOnce([]);

    const results = await searchGlobal("test", adminViewer());

    expect(results[0]).toEqual({
      kind: "child",
      id: "user-2",
      label: "이메일 없음",
      subtitle: "달님 기관",
      href: "/admin/timeline/user-2",
    });
  });
});

// ============================================================================
// 시나리오 3, 4: principal scope
// ============================================================================
describe("searchGlobal — principal role", () => {
  it("[3] principal → 본인 institutionId scope 강제 (Prisma where 검증)", async () => {
    userFindManyMock.mockResolvedValueOnce([]);
    classFindManyMock.mockResolvedValueOnce([]);

    await searchGlobal("검색", principalViewer("inst-A"));

    // Institution 검색은 principal 미실행 (institution Prisma 호출 없음).
    expect(institutionFindManyMock).not.toHaveBeenCalled();

    const userCall = userFindManyMock.mock.calls[0][0];
    expect(userCall.where.institutionId).toBe("inst-A");
    expect(userCall.where.role).toBe("parent");

    const classCall = classFindManyMock.mock.calls[0][0];
    expect(classCall.where.institutionId).toBe("inst-A");
  });

  it("[4] principal — institutionId 부재 → 빈 배열 + Prisma 0회", async () => {
    const results = await searchGlobal("검색", principalViewer(null));

    expect(results).toEqual([]);
    expect(userFindManyMock).not.toHaveBeenCalled();
    expect(classFindManyMock).not.toHaveBeenCalled();
    expect(institutionFindManyMock).not.toHaveBeenCalled();
  });

  it("[12] principal — cross-tenant 차단: 다른 institutionId 결과 0", async () => {
    // 본 mock 은 Prisma 가 institutionId scope 를 강제한 결과 — 다른 기관 데이터 노출 0.
    userFindManyMock.mockResolvedValueOnce([]);
    classFindManyMock.mockResolvedValueOnce([]);

    const results = await searchGlobal("타기관", principalViewer("inst-A"));

    expect(results).toEqual([]);
    // 호출된 모든 Prisma 인자에 "inst-B" 등 다른 institutionId 미포함 보장.
    const serialized = JSON.stringify([
      ...userFindManyMock.mock.calls,
      ...classFindManyMock.mock.calls,
    ]);
    expect(serialized).not.toContain("inst-B");
    expect(serialized).toContain("inst-A");
  });
});

// ============================================================================
// 시나리오 5, 6: teacher scope
// ============================================================================
describe("searchGlobal — teacher role", () => {
  it("[5] teacher → 본인 담당 Class 의 parent 만 (반/기관 검색 비활성)", async () => {
    // 1) Class 목록 (담당 반 식별용) — 본인 담당 Class id 만.
    classFindManyMock.mockResolvedValueOnce([
      { id: "class-1" },
      { id: "class-2" },
    ]);
    // 2) User 검색 — classId in [class-1, class-2] + role=parent.
    userFindManyMock.mockResolvedValueOnce([
      {
        id: "user-9",
        email: "bob@example.com",
        class: { id: "class-1", name: "햇님반" },
        institution: { id: "inst-A", name: "푸른 어린이집" },
      },
    ]);

    const results = await searchGlobal("bob", teacherViewer());

    // 1차 호출 = 본인 Class 목록 fetch.
    const classListCall = classFindManyMock.mock.calls[0][0];
    expect(classListCall.where.teacherId).toBe("teacher-user-id");
    expect(classListCall.select).toEqual({ id: true });

    // 2차 호출 = User 검색 — classId in [class-1, class-2].
    const userCall = userFindManyMock.mock.calls[0][0];
    expect(userCall.where.role).toBe("parent");
    expect(userCall.where.classId).toEqual({ in: ["class-1", "class-2"] });
    expect(userCall.where.email.contains).toBe("bob");

    // institution 검색은 teacher 비활성.
    expect(institutionFindManyMock).not.toHaveBeenCalled();

    // 결과는 자녀 (child) 만.
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("child");
    expect(results[0].id).toBe("user-9");
  });

  it("[6] teacher — 담당 Class 0건 → User Prisma 미호출 + 빈 배열", async () => {
    classFindManyMock.mockResolvedValueOnce([]);

    const results = await searchGlobal("query", teacherViewer());

    expect(results).toEqual([]);
    // Class id 목록 fetch 만 발생, User Prisma 검색은 skip.
    expect(classFindManyMock).toHaveBeenCalledTimes(1);
    expect(userFindManyMock).not.toHaveBeenCalled();
    expect(institutionFindManyMock).not.toHaveBeenCalled();
  });
});

// ============================================================================
// 시나리오 7, 8: parent / expert 비활성
// ============================================================================
describe("searchGlobal — 비활성 role", () => {
  it("[7] parent → 빈 배열 + Prisma 0회 (검색 비활성)", async () => {
    const results = await searchGlobal("query", parentViewer());

    expect(results).toEqual([]);
    expect(userFindManyMock).not.toHaveBeenCalled();
    expect(classFindManyMock).not.toHaveBeenCalled();
    expect(institutionFindManyMock).not.toHaveBeenCalled();
  });

  it("[8] expert → 빈 배열 + Prisma 0회 (검색 비활성, HITL 전용)", async () => {
    const results = await searchGlobal("query", expertViewer());

    expect(results).toEqual([]);
    expect(userFindManyMock).not.toHaveBeenCalled();
    expect(classFindManyMock).not.toHaveBeenCalled();
    expect(institutionFindManyMock).not.toHaveBeenCalled();
  });
});

// ============================================================================
// 시나리오 9, 10, 11: query 검증
// ============================================================================
describe("searchGlobal — query 검증", () => {
  it("[9] 짧은 query (1자) → 빈 배열 + Prisma 미호출", async () => {
    const results = await searchGlobal("a", adminViewer());
    expect(results).toEqual([]);
    expect(userFindManyMock).not.toHaveBeenCalled();
  });

  it("[10] 긴 query (51자) → 빈 배열 + Prisma 미호출", async () => {
    const longQuery = "x".repeat(SEARCH_QUERY_MAX_LENGTH + 1);
    const results = await searchGlobal(longQuery, adminViewer());
    expect(results).toEqual([]);
    expect(userFindManyMock).not.toHaveBeenCalled();
  });

  it("[11] 빈 string → 빈 배열", async () => {
    const results = await searchGlobal("", adminViewer());
    expect(results).toEqual([]);
    expect(userFindManyMock).not.toHaveBeenCalled();
  });

  it("[11b] whitespace only → 빈 배열", async () => {
    const results = await searchGlobal("   ", adminViewer());
    expect(results).toEqual([]);
    expect(userFindManyMock).not.toHaveBeenCalled();
  });

  it("[11c] null query → 빈 배열", async () => {
    const results = await searchGlobal(null, adminViewer());
    expect(results).toEqual([]);
  });

  it("[11d] 정확히 2자 → Prisma 호출 (경계 검증)", async () => {
    userFindManyMock.mockResolvedValueOnce([]);
    classFindManyMock.mockResolvedValueOnce([]);
    institutionFindManyMock.mockResolvedValueOnce([]);

    await searchGlobal("ab", adminViewer());
    expect(userFindManyMock).toHaveBeenCalledTimes(1);
  });

  it("[11e] 정확히 50자 → Prisma 호출 (경계 검증)", async () => {
    const exact = "x".repeat(SEARCH_QUERY_MAX_LENGTH);
    userFindManyMock.mockResolvedValueOnce([]);
    classFindManyMock.mockResolvedValueOnce([]);
    institutionFindManyMock.mockResolvedValueOnce([]);

    await searchGlobal(exact, adminViewer());
    expect(userFindManyMock).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// pure helpers
// ============================================================================
describe("isSearchEnabledRole", () => {
  it("admin/principal/teacher → true", () => {
    expect(isSearchEnabledRole("admin")).toBe(true);
    expect(isSearchEnabledRole("principal")).toBe(true);
    expect(isSearchEnabledRole("teacher")).toBe(true);
  });

  it("parent/expert/null/undefined → false", () => {
    expect(isSearchEnabledRole("parent")).toBe(false);
    expect(isSearchEnabledRole("expert")).toBe(false);
    expect(isSearchEnabledRole(null)).toBe(false);
    expect(isSearchEnabledRole(undefined)).toBe(false);
    expect(isSearchEnabledRole("")).toBe(false);
  });
});

describe("isSearchQueryValid", () => {
  it("2자 이상 50자 이하 → true", () => {
    expect(isSearchQueryValid("ab")).toBe(true);
    expect(isSearchQueryValid("x".repeat(SEARCH_QUERY_MAX_LENGTH))).toBe(true);
  });
  it("min 미만 / max 초과 → false", () => {
    expect(isSearchQueryValid("")).toBe(false);
    expect(isSearchQueryValid("a")).toBe(false);
    expect(isSearchQueryValid("x".repeat(SEARCH_QUERY_MAX_LENGTH + 1))).toBe(false);
  });
  it("whitespace 만 → false (trim 후 비어 있음)", () => {
    expect(isSearchQueryValid("   ")).toBe(false);
    expect(isSearchQueryValid(" a ")).toBe(false); // trim 후 1자
  });
  it("null/undefined → false", () => {
    expect(isSearchQueryValid(null)).toBe(false);
    expect(isSearchQueryValid(undefined)).toBe(false);
  });
  it("type guard — min/max 상수 export", () => {
    expect(SEARCH_QUERY_MIN_LENGTH).toBe(2);
    expect(SEARCH_QUERY_MAX_LENGTH).toBe(50);
  });
});

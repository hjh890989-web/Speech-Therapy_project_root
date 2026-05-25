// FR-NAV-SEARCH — GET /api/search?q=... Route Handler 단위 테스트.
//
// 검증 시나리오 (≥ 4):
//   1. 인증 + admin role + 정상 query → 200 + results
//   2. 인증 + parent role → 403 + Prisma 검색 미호출
//   3. 인증 + admin + 짧은 query (1자) → 400
//   4. 인증 + admin + 6번째 호출 (1초 내) → 429
//   5. 비인증 (user null) → 401
//   6. 인증 + expert role → 403
//   7. 인증 + admin + 긴 query (51자) → 400
//   8. 인증 + admin + q 미지정 → 400

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const userFindUniqueMock = vi.fn();
const userFindManyMock = vi.fn();
const classFindManyMock = vi.fn();
const institutionFindManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
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

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));

import { GET, __resetSearchRateLimitForTest } from "@/app/api/search/route";

// ----- Helpers -----
const ADMIN_USER_ID = "11111111-1111-4111-8111-111111111111";
const PARENT_USER_ID = "22222222-2222-4222-8222-222222222222";
const EXPERT_USER_ID = "33333333-3333-4333-8333-333333333333";

function makeRequest(query: string | null = "Alice") {
  const url =
    query === null
      ? "http://localhost/api/search"
      : `http://localhost/api/search?q=${encodeURIComponent(query)}`;
  return new Request(url, { method: "GET" });
}

function mockAuthedAs(opts: { id: string; role: string | null; institutionId?: string | null }) {
  getUserMock.mockResolvedValue({
    data: { user: { id: opts.id } },
    error: null,
  });
  userFindUniqueMock.mockResolvedValue({
    role: opts.role,
    institutionId: opts.institutionId ?? null,
  });
}

function mockAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

beforeEach(() => {
  userFindUniqueMock.mockReset();
  userFindManyMock.mockReset();
  classFindManyMock.mockReset();
  institutionFindManyMock.mockReset();
  getUserMock.mockReset();
  __resetSearchRateLimitForTest();

  // 기본 mock — 빈 결과.
  userFindManyMock.mockResolvedValue([]);
  classFindManyMock.mockResolvedValue([]);
  institutionFindManyMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
describe("GET /api/search — 정상 흐름", () => {
  it("[1] admin + 정상 query → 200 + results 배열", async () => {
    mockAuthedAs({ id: ADMIN_USER_ID, role: "admin" });
    userFindManyMock.mockResolvedValueOnce([
      {
        id: "u-1",
        email: "alice@example.com",
        class: null,
        institution: null,
      },
    ]);
    classFindManyMock.mockResolvedValueOnce([]);
    institutionFindManyMock.mockResolvedValueOnce([]);

    const res = await GET(makeRequest("Alice"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toMatchObject({
      kind: "child",
      id: "u-1",
      href: "/admin/timeline/u-1",
    });
  });
});

// ============================================================================
describe("GET /api/search — RBAC", () => {
  it("[2] parent role → 403 + 검색 Prisma 미호출", async () => {
    mockAuthedAs({ id: PARENT_USER_ID, role: "parent" });

    const res = await GET(makeRequest("query"));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("FORBIDDEN");
    // 검색 Prisma 미호출.
    expect(userFindManyMock).not.toHaveBeenCalled();
    expect(classFindManyMock).not.toHaveBeenCalled();
    expect(institutionFindManyMock).not.toHaveBeenCalled();
  });

  it("[6] expert role → 403", async () => {
    mockAuthedAs({ id: EXPERT_USER_ID, role: "expert" });

    const res = await GET(makeRequest("query"));

    expect(res.status).toBe(403);
  });

  it("role null (DB row 부재) → 403", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "anon-user-id" } },
      error: null,
    });
    userFindUniqueMock.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("query"));

    expect(res.status).toBe(403);
  });
});

// ============================================================================
describe("GET /api/search — 인증 (401)", () => {
  it("[5] 비로그인 → 401 UNAUTHORIZED", async () => {
    mockAnonymous();

    const res = await GET(makeRequest("query"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("UNAUTHORIZED");
  });
});

// ============================================================================
describe("GET /api/search — query 검증 (400)", () => {
  it("[3] 짧은 query (1자) → 400 INVALID_INPUT", async () => {
    mockAuthedAs({ id: ADMIN_USER_ID, role: "admin" });

    const res = await GET(makeRequest("a"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("INVALID_INPUT");
    // 검색 Prisma 미호출.
    expect(userFindManyMock).not.toHaveBeenCalled();
  });

  it("[7] 긴 query (51자) → 400", async () => {
    mockAuthedAs({ id: ADMIN_USER_ID, role: "admin" });
    const longQuery = "x".repeat(51);

    const res = await GET(makeRequest(longQuery));

    expect(res.status).toBe(400);
  });

  it("[8] q 미지정 → 400", async () => {
    mockAuthedAs({ id: ADMIN_USER_ID, role: "admin" });

    const res = await GET(makeRequest(null));

    expect(res.status).toBe(400);
  });
});

// ============================================================================
describe("GET /api/search — Rate Limit (429)", () => {
  it("[4] 1초 내 6번째 호출 → 429 + Retry-After 헤더", async () => {
    mockAuthedAs({ id: ADMIN_USER_ID, role: "admin" });

    // 5번 호출 → 모두 200.
    for (let i = 0; i < 5; i++) {
      const res = await GET(makeRequest("Alice"));
      expect(res.status).toBe(200);
    }

    // 6번째 호출 → 429.
    const res6 = await GET(makeRequest("Alice"));
    expect(res6.status).toBe(429);
    const body = await res6.json();
    expect(body.error).toBe("RATE_LIMITED");
    expect(body.retryAfterSec).toBeGreaterThanOrEqual(1);
    expect(res6.headers.get("Retry-After")).toBeTruthy();
  });

  it("rate limit — 다른 user 는 독립 카운터 (격리)", async () => {
    // user A — 5번 호출 후 차단.
    mockAuthedAs({ id: ADMIN_USER_ID, role: "admin" });
    for (let i = 0; i < 5; i++) {
      await GET(makeRequest("Alice"));
    }
    const blocked = await GET(makeRequest("Alice"));
    expect(blocked.status).toBe(429);

    // user B — 새 인증, 1번 호출 → 200.
    mockAuthedAs({ id: "other-admin-id", role: "admin" });
    const res = await GET(makeRequest("Alice"));
    expect(res.status).toBe(200);
  });
});

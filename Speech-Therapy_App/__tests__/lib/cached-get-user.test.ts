// Performance 감사 1차 — lib/auth/cached-get-user.ts 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server.getSupabaseServerClient mock (auth.getUser)
//   - @/lib/db.prisma.user.findUnique mock
//
// 검증 시나리오:
//   getCachedUser:
//    1) auth 성공 → { id, email }
//    2) auth data.user null → null
//    3) auth error 반환 → null
//    4) getSupabaseServerClient throw → null (graceful)
//    5) email 없음 → { id, email: null }
//
//   getCachedUserRoleResult:
//    6) 비인증 → status="anonymous", findUnique 미호출
//    7) 인증 + DB row 있음 (role="parent") → status="ok"
//    8) 인증 + DB row 없음 → status="ok", role=null
//    9) 인증 + DB throw → status="error"
//
// 비고: React `cache()` 의 dedup 동작은 RSC 렌더 컨텍스트에서만 활성 — 본 단위
//   테스트는 단순 함수 호출 단위로 정확성만 검증. dedup 자체는 React 표준 API
//   동작에 위임 (production 효과: layout 의 AuthHeader/MainNav/page 가 동일
//   request 안에서 같은 호출 시 Supabase 왕복 1회 + Prisma 1회로 통합).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const getSupabaseServerClientMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => getSupabaseServerClientMock(),
}));

const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

import {
  getCachedUser,
  getCachedUserRoleResult,
} from "@/lib/auth/cached-get-user";

const USER_ID = "user-uuid-cached-1";
const USER_EMAIL = "cached@example.com";

beforeEach(() => {
  getUserMock.mockReset();
  getSupabaseServerClientMock.mockReset();
  findUniqueMock.mockReset();
  getSupabaseServerClientMock.mockImplementation(async () => ({
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getCachedUser — Performance 감사 1차", () => {
  it("[1] auth 성공 → { id, email }", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: USER_ID, email: USER_EMAIL } },
      error: null,
    });
    const out = await getCachedUser();
    expect(out).toEqual({ id: USER_ID, email: USER_EMAIL });
  });

  it("[2] auth data.user null → null", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const out = await getCachedUser();
    expect(out).toBeNull();
  });

  it("[3] auth error 반환 → null", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "no session" },
    });
    const out = await getCachedUser();
    expect(out).toBeNull();
  });

  it("[4] getSupabaseServerClient throw → null (graceful, env 미설정 등)", async () => {
    getSupabaseServerClientMock.mockImplementationOnce(async () => {
      throw new Error("env missing");
    });
    const out = await getCachedUser();
    expect(out).toBeNull();
  });

  it("[5] email 누락 → { id, email: null }", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: USER_ID } },
      error: null,
    });
    const out = await getCachedUser();
    expect(out).toEqual({ id: USER_ID, email: null });
  });
});

describe("getCachedUserRoleResult — Performance 감사 1차", () => {
  it("[6] 비인증 → status='anonymous' + findUnique 미호출", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const out = await getCachedUserRoleResult();
    expect(out).toEqual({ status: "anonymous" });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("[7] 인증 + DB row 있음 (role='parent') → status='ok' + role 노출", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: USER_ID, email: USER_EMAIL } },
      error: null,
    });
    findUniqueMock.mockResolvedValueOnce({ role: "parent" });

    const out = await getCachedUserRoleResult();
    expect(out).toEqual({
      status: "ok",
      userId: USER_ID,
      email: USER_EMAIL,
      role: "parent",
    });
    // select 는 role 만.
    const args = findUniqueMock.mock.calls[0]![0] as {
      where: { id: string };
      select: { role: boolean };
    };
    expect(args.where).toEqual({ id: USER_ID });
    expect(args.select).toEqual({ role: true });
  });

  it("[8] 인증 + DB row 없음 → status='ok' + role=null (가입 직전 등)", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: USER_ID, email: USER_EMAIL } },
      error: null,
    });
    findUniqueMock.mockResolvedValueOnce(null);

    const out = await getCachedUserRoleResult();
    expect(out).toEqual({
      status: "ok",
      userId: USER_ID,
      email: USER_EMAIL,
      role: null,
    });
  });

  it("[9] 인증 + Prisma throw → status='error' (호출 측이 보수적 fallback)", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: USER_ID, email: USER_EMAIL } },
      error: null,
    });
    findUniqueMock.mockRejectedValueOnce(new Error("db down"));

    const out = await getCachedUserRoleResult();
    expect(out).toEqual({ status: "error" });
  });
});

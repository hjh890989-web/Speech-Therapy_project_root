// FR-Q-TEACHER — proxy.ts /admin/teacher path 의 teacher 추가 통과 검증.
//
// 기존 admin-rbac.test.ts 는 /admin/* allow-list = admin/principal/expert 만 검증.
// 본 테스트는 추가 시나리오:
//   1) teacher role + /admin/teacher → next() 통과
//   2) teacher role + /admin/principal → / redirect (기존 RBAC 유지, 회귀 0건)
//   3) teacher role + /admin/teacher/sub → next() 통과 (subpath)
//   4) admin/principal/expert + /admin/teacher → next() 통과 (관리자도 볼 수 있음)
//   5) parent + /admin/teacher → / redirect (parent 차단)
//   6) teacher role + /admin (정확) → / redirect (기존 RBAC, teacher 차단)
//
// 추가 단위:
//   7) isTeacherPathAllowed helper — 다양한 path/role 조합

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const lookupUserRoleMock = vi.fn();

vi.mock("@/lib/auth-role", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-role")>(
    "@/lib/auth-role",
  );
  return {
    ...actual,
    lookupUserRole: (...args: Parameters<typeof actual.lookupUserRole>) =>
      lookupUserRoleMock(...args),
  };
});

async function getProxy() {
  const mod = await import("@/proxy");
  return mod.proxy;
}

function makeRequest(pathname: string, opts: { cookies?: Record<string, string> } = {}) {
  const url = `http://localhost${pathname}`;
  const headers = new Headers();
  if (opts.cookies) {
    const cookieStr = Object.entries(opts.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    headers.set("cookie", cookieStr);
  }
  return new NextRequest(url, { headers });
}

describe("FR-Q-TEACHER — proxy.ts /admin/teacher RBAC", () => {
  beforeEach(() => {
    lookupUserRoleMock.mockReset();
  });

  it("[1] teacher role + /admin/teacher → next() 통과", async () => {
    lookupUserRoleMock.mockResolvedValueOnce({
      status: "ok",
      userId: "user-teacher-uuid",
      role: "teacher",
    });
    const proxy = await getProxy();
    const req = makeRequest("/admin/teacher", {
      cookies: { anonymous_user_id: "anon-1" },
    });

    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("[2] teacher role + /admin/principal → / redirect (기존 RBAC 유지)", async () => {
    lookupUserRoleMock.mockResolvedValueOnce({
      status: "ok",
      userId: "user-teacher-uuid",
      role: "teacher",
    });
    const proxy = await getProxy();
    const req = makeRequest("/admin/principal", {
      cookies: { anonymous_user_id: "anon-1" },
    });

    const res = await proxy(req);

    expect(res.status).toBe(303);
    const target = new URL(res.headers.get("location")!);
    expect(target.pathname).toBe("/");
    expect(target.searchParams.get("forbidden")).toBe("admin");
  });

  it("[3] teacher role + /admin/teacher/sub → next() 통과 (subpath)", async () => {
    lookupUserRoleMock.mockResolvedValueOnce({
      status: "ok",
      userId: "user-teacher-uuid",
      role: "teacher",
    });
    const proxy = await getProxy();
    const req = makeRequest("/admin/teacher/some/sub/path", {
      cookies: { anonymous_user_id: "anon-1" },
    });

    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("[4a] admin + /admin/teacher → 통과", async () => {
    lookupUserRoleMock.mockResolvedValueOnce({
      status: "ok",
      userId: "user-admin",
      role: "admin",
    });
    const proxy = await getProxy();
    const req = makeRequest("/admin/teacher", {
      cookies: { anonymous_user_id: "anon-1" },
    });

    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("[4b] principal + /admin/teacher → 통과", async () => {
    lookupUserRoleMock.mockResolvedValueOnce({
      status: "ok",
      userId: "user-principal",
      role: "principal",
    });
    const proxy = await getProxy();
    const req = makeRequest("/admin/teacher", {
      cookies: { anonymous_user_id: "anon-1" },
    });

    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("[4c] expert + /admin/teacher → 통과 (proxy 레벨, L2 페이지는 별도 차단)", async () => {
    lookupUserRoleMock.mockResolvedValueOnce({
      status: "ok",
      userId: "user-expert",
      role: "expert",
    });
    const proxy = await getProxy();
    const req = makeRequest("/admin/teacher", {
      cookies: { anonymous_user_id: "anon-1" },
    });

    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("[5] parent + /admin/teacher → / redirect (parent 차단)", async () => {
    lookupUserRoleMock.mockResolvedValueOnce({
      status: "ok",
      userId: "user-parent",
      role: "parent",
    });
    const proxy = await getProxy();
    const req = makeRequest("/admin/teacher", {
      cookies: { anonymous_user_id: "anon-1" },
    });

    const res = await proxy(req);

    expect(res.status).toBe(303);
    const target = new URL(res.headers.get("location")!);
    expect(target.pathname).toBe("/");
    expect(target.searchParams.get("forbidden")).toBe("admin");
  });

  it("[6] teacher role + /admin (정확) → / redirect (teacher 차단, 회귀 0건)", async () => {
    lookupUserRoleMock.mockResolvedValueOnce({
      status: "ok",
      userId: "user-teacher",
      role: "teacher",
    });
    const proxy = await getProxy();
    const req = makeRequest("/admin", {
      cookies: { anonymous_user_id: "anon-1" },
    });

    const res = await proxy(req);

    expect(res.status).toBe(303);
    expect(new URL(res.headers.get("location")!).searchParams.get("forbidden")).toBe(
      "admin",
    );
  });

  it("[6b] teacher role + /admin/teacherX (prefix 유사하지만 다른 path) → / redirect", async () => {
    // /admin/teacher 의 정확/슬래시 매칭이어야 함. /admin/teacherX 는 /admin/teacher 의 subpath 가 아님.
    lookupUserRoleMock.mockResolvedValueOnce({
      status: "ok",
      userId: "user-teacher",
      role: "teacher",
    });
    const proxy = await getProxy();
    const req = makeRequest("/admin/teacherX", {
      cookies: { anonymous_user_id: "anon-1" },
    });

    const res = await proxy(req);

    expect(res.status).toBe(303);
  });
});

describe("FR-Q-TEACHER — isTeacherPathAllowed helper 단위", () => {
  it("teacher role 만 true (정확 또는 subpath)", async () => {
    const { isTeacherPathAllowed } = await vi.importActual<
      typeof import("@/lib/auth-role")
    >("@/lib/auth-role");

    expect(isTeacherPathAllowed("/admin/teacher", "teacher")).toBe(true);
    expect(isTeacherPathAllowed("/admin/teacher/", "teacher")).toBe(true);
    expect(isTeacherPathAllowed("/admin/teacher/sub", "teacher")).toBe(true);
    expect(isTeacherPathAllowed("/admin/teacher/sub/nested", "teacher")).toBe(true);

    // teacher 아닌 role 은 모두 false (별도 helper 의 의미 — admin/principal/expert 은
    // 이미 isAdminAllowed 에서 통과).
    expect(isTeacherPathAllowed("/admin/teacher", "admin")).toBe(false);
    expect(isTeacherPathAllowed("/admin/teacher", "principal")).toBe(false);
    expect(isTeacherPathAllowed("/admin/teacher", "expert")).toBe(false);
    expect(isTeacherPathAllowed("/admin/teacher", "parent")).toBe(false);
    expect(isTeacherPathAllowed("/admin/teacher", null)).toBe(false);
    expect(isTeacherPathAllowed("/admin/teacher", undefined)).toBe(false);

    // path 매칭 — /admin/teacher 가 아닌 path 는 false (teacher 라도).
    expect(isTeacherPathAllowed("/admin", "teacher")).toBe(false);
    expect(isTeacherPathAllowed("/admin/principal", "teacher")).toBe(false);
    expect(isTeacherPathAllowed("/admin/teacherX", "teacher")).toBe(false);
    expect(isTeacherPathAllowed("/", "teacher")).toBe(false);
  });

  it("isAdminAllowed 회귀 — teacher 는 여전히 false (기존 RBAC 유지)", async () => {
    const { isAdminAllowed, ADMIN_ALLOWED_ROLES } = await vi.importActual<
      typeof import("@/lib/auth-role")
    >("@/lib/auth-role");

    // 핵심 회귀 가드 — teacher 가 ADMIN_ALLOWED_ROLES 에 추가되면 admin-rbac.test.ts 가 깨짐.
    expect(isAdminAllowed("teacher")).toBe(false);
    expect(ADMIN_ALLOWED_ROLES).toEqual(["admin", "principal", "expert"]);
  });
});

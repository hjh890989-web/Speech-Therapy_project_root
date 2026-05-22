// SEC-002 INFO #4 — Middleware (proxy.ts) /admin 경로 RBAC 검증.
//
// Refs: GitHub Issue #72 (SEC-002), REQ-NF-019, API-010 §2.
//
// 본 테스트는 proxy.ts 의 /admin 분기 6 시나리오를 검증한다.
//   1) /admin 무로그인 → /login redirect (next= 보존)
//   2) /admin parent role → / redirect (?forbidden=admin)
//   3) /admin admin role → next() 통과
//   4) /admin principal role → next() 통과
//   5) /admin/dashboard subpath → 동일 RBAC 적용
//   6) /diagnose (비-admin) → role lookup 미호출 (회귀 가드)
//
// 추가 케이스:
//   - /admin expert role → next() 통과 (ADMIN_ALLOWED_ROLES 명세)
//   - /admin teacher role → / redirect (403 효과)
//   - lookup error → / redirect (안전 기본값)
//   - 기존 cookie 부재 시 anonymous_user_id 자동 발급 회귀 보존
//
// 전략: lib/auth-role 을 모듈 mock 으로 교체하여 role 결과를 결정적으로 제어.
// proxy 는 NextRequest 를 받아 NextResponse 반환 — Web Request 로 충분히 시뮬 가능.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// 모듈 mock — lookupUserRole 만 제어. helper (isAdminAllowed/isAdminPath) 는 실 구현 유지.
const lookupUserRoleMock = vi.fn();

vi.mock("@/lib/auth-role", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-role")>("@/lib/auth-role");
  return {
    ...actual,
    lookupUserRole: (...args: Parameters<typeof actual.lookupUserRole>) =>
      lookupUserRoleMock(...args),
  };
});

// proxy 는 mock 셋업 후 동적 import.
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

describe("SEC-002 INFO #4 — proxy.ts /admin RBAC", () => {
  beforeEach(() => {
    lookupUserRoleMock.mockReset();
  });

  // ===== 시나리오 1: /admin 무로그인 → /login redirect =====
  describe("시나리오 1 — 무로그인 사용자", () => {
    it("/admin 진입 시 /login?next=/admin 으로 302 redirect", async () => {
      lookupUserRoleMock.mockResolvedValueOnce({ status: "anonymous" });
      const proxy = await getProxy();
      const req = makeRequest("/admin");

      const res = await proxy(req);

      expect(res.status).toBe(302);
      const loc = res.headers.get("location");
      expect(loc).toBeTruthy();
      const target = new URL(loc!);
      expect(target.pathname).toBe("/login");
      expect(target.searchParams.get("next")).toBe("/admin");
      expect(lookupUserRoleMock).toHaveBeenCalledTimes(1);
    });

    it("/admin?tab=users 처럼 query 가 있어도 next 에 보존", async () => {
      lookupUserRoleMock.mockResolvedValueOnce({ status: "anonymous" });
      const proxy = await getProxy();
      const req = makeRequest("/admin?tab=users");

      const res = await proxy(req);

      const target = new URL(res.headers.get("location")!);
      expect(target.pathname).toBe("/login");
      expect(target.searchParams.get("next")).toBe("/admin?tab=users");
    });
  });

  // ===== 시나리오 2: /admin parent role → 403 (/ redirect) =====
  describe("시나리오 2 — parent role (권한 없음)", () => {
    it("/admin 진입 시 /?forbidden=admin 으로 303 redirect", async () => {
      lookupUserRoleMock.mockResolvedValueOnce({
        status: "ok",
        userId: "user-parent-uuid",
        role: "parent",
      });
      const proxy = await getProxy();
      const req = makeRequest("/admin");

      const res = await proxy(req);

      expect(res.status).toBe(303);
      const target = new URL(res.headers.get("location")!);
      expect(target.pathname).toBe("/");
      expect(target.searchParams.get("forbidden")).toBe("admin");
    });

    it("teacher role 도 동일 차단 (admin 허용 목록 외)", async () => {
      lookupUserRoleMock.mockResolvedValueOnce({
        status: "ok",
        userId: "user-teacher-uuid",
        role: "teacher",
      });
      const proxy = await getProxy();
      const req = makeRequest("/admin");

      const res = await proxy(req);

      expect(res.status).toBe(303);
      expect(new URL(res.headers.get("location")!).searchParams.get("forbidden")).toBe("admin");
    });

    it("role=null (User row 미존재) 도 차단", async () => {
      lookupUserRoleMock.mockResolvedValueOnce({
        status: "ok",
        userId: "user-no-row-uuid",
        role: null,
      });
      const proxy = await getProxy();
      const req = makeRequest("/admin");

      const res = await proxy(req);

      expect(res.status).toBe(303);
    });
  });

  // ===== 시나리오 3: /admin admin role → next() 통과 =====
  describe("시나리오 3 — admin role", () => {
    it("/admin 진입 통과 (redirect 없음)", async () => {
      lookupUserRoleMock.mockResolvedValueOnce({
        status: "ok",
        userId: "user-admin-uuid",
        role: "admin",
      });
      const proxy = await getProxy();
      const req = makeRequest("/admin", { cookies: { anonymous_user_id: "anon-1" } });

      const res = await proxy(req);

      // NextResponse.next() 는 status 200 + redirect 없음.
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });
  });

  // ===== 시나리오 4: /admin principal role → next() 통과 =====
  describe("시나리오 4 — principal role", () => {
    it("/admin 진입 통과", async () => {
      lookupUserRoleMock.mockResolvedValueOnce({
        status: "ok",
        userId: "user-principal-uuid",
        role: "principal",
      });
      const proxy = await getProxy();
      const req = makeRequest("/admin", { cookies: { anonymous_user_id: "anon-1" } });

      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("expert role 도 통과 (ADMIN_ALLOWED_ROLES 명세)", async () => {
      lookupUserRoleMock.mockResolvedValueOnce({
        status: "ok",
        userId: "user-expert-uuid",
        role: "expert",
      });
      const proxy = await getProxy();
      const req = makeRequest("/admin", { cookies: { anonymous_user_id: "anon-1" } });

      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });
  });

  // ===== 시나리오 5: /admin/dashboard (subpath) → 동일 RBAC =====
  describe("시나리오 5 — /admin/* subpath", () => {
    it("/admin/dashboard 무로그인 → /login?next=/admin/dashboard", async () => {
      lookupUserRoleMock.mockResolvedValueOnce({ status: "anonymous" });
      const proxy = await getProxy();
      const req = makeRequest("/admin/dashboard");

      const res = await proxy(req);

      expect(res.status).toBe(302);
      const target = new URL(res.headers.get("location")!);
      expect(target.pathname).toBe("/login");
      expect(target.searchParams.get("next")).toBe("/admin/dashboard");
    });

    it("/admin/users parent role → 403 (/ redirect)", async () => {
      lookupUserRoleMock.mockResolvedValueOnce({
        status: "ok",
        userId: "user-parent",
        role: "parent",
      });
      const proxy = await getProxy();
      const req = makeRequest("/admin/users");

      const res = await proxy(req);

      expect(res.status).toBe(303);
      expect(new URL(res.headers.get("location")!).searchParams.get("forbidden")).toBe("admin");
    });

    it("/admin/deep/nested admin role → 통과", async () => {
      lookupUserRoleMock.mockResolvedValueOnce({
        status: "ok",
        userId: "user-admin",
        role: "admin",
      });
      const proxy = await getProxy();
      const req = makeRequest("/admin/deep/nested", {
        cookies: { anonymous_user_id: "anon-1" },
      });

      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });
  });

  // ===== 시나리오 6: /diagnose (비-admin) → role lookup 미호출 (회귀 가드) =====
  describe("시나리오 6 — 비-admin 경로 (회귀 가드)", () => {
    it("/diagnose 진입 시 lookupUserRole 호출 0회 + 정상 통과", async () => {
      const proxy = await getProxy();
      const req = makeRequest("/diagnose", { cookies: { anonymous_user_id: "anon-1" } });

      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(lookupUserRoleMock).not.toHaveBeenCalled();
    });

    it("/rewards 진입 시에도 lookupUserRole 호출 0회", async () => {
      const proxy = await getProxy();
      const req = makeRequest("/rewards", { cookies: { anonymous_user_id: "anon-1" } });

      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(lookupUserRoleMock).not.toHaveBeenCalled();
    });

    it("/administrators (admin 으로 시작하지만 다른 경로) 통과 — 정확 매칭 보장", async () => {
      const proxy = await getProxy();
      const req = makeRequest("/administrators", { cookies: { anonymous_user_id: "anon-1" } });

      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(lookupUserRoleMock).not.toHaveBeenCalled();
    });

    it("/ 루트 진입 시 RBAC 미적용", async () => {
      const proxy = await getProxy();
      const req = makeRequest("/", { cookies: { anonymous_user_id: "anon-1" } });

      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(lookupUserRoleMock).not.toHaveBeenCalled();
    });
  });

  // ===== 추가 — error 분기 (안전 기본값) =====
  describe("error 분기 (Supabase 미설정 / 일시 장애)", () => {
    it("lookup error → / redirect (403 효과, 안전 기본값)", async () => {
      lookupUserRoleMock.mockResolvedValueOnce({
        status: "error",
        reason: "supabase_env_missing",
      });
      const proxy = await getProxy();
      const req = makeRequest("/admin");

      const res = await proxy(req);

      expect(res.status).toBe(303);
      const target = new URL(res.headers.get("location")!);
      expect(target.pathname).toBe("/");
      expect(target.searchParams.get("forbidden")).toBe("admin");
    });
  });

  // ===== 회귀 — 기존 anonymous cookie 자동 발급 보존 =====
  describe("회귀 — anonymous_user_id cookie 발급 (Sprint 2 §3)", () => {
    it("/diagnose 진입 시 cookie 부재면 Set-Cookie 발급", async () => {
      const proxy = await getProxy();
      const req = makeRequest("/diagnose"); // cookie 없음.

      const res = await proxy(req);

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toMatch(/anonymous_user_id=/);
      expect(setCookie?.toLowerCase()).toContain("samesite=lax");
    });

    it("/admin admin role 통과 시에도 cookie 자동 발급 동작", async () => {
      lookupUserRoleMock.mockResolvedValueOnce({
        status: "ok",
        userId: "user-admin",
        role: "admin",
      });
      const proxy = await getProxy();
      const req = makeRequest("/admin"); // cookie 없음.

      const res = await proxy(req);

      expect(res.status).toBe(200);
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toMatch(/anonymous_user_id=/);
    });
  });
});

// ===== auth-role helper 직접 검증 (단위) =====
describe("SEC-002 — lib/auth-role helper 단위", () => {
  it("isAdminPath — /admin / /admin/* 만 true", async () => {
    const { isAdminPath } = await vi.importActual<typeof import("@/lib/auth-role")>(
      "@/lib/auth-role",
    );
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/")).toBe(true);
    expect(isAdminPath("/admin/users")).toBe(true);
    expect(isAdminPath("/admin/deep/nested/path")).toBe(true);
    expect(isAdminPath("/administrators")).toBe(false);
    expect(isAdminPath("/diagnose")).toBe(false);
    expect(isAdminPath("/")).toBe(false);
    expect(isAdminPath("/admin-tools")).toBe(false);
  });

  it("isAdminAllowed — admin / principal / expert 만 true", async () => {
    const { isAdminAllowed } = await vi.importActual<typeof import("@/lib/auth-role")>(
      "@/lib/auth-role",
    );
    expect(isAdminAllowed("admin")).toBe(true);
    expect(isAdminAllowed("principal")).toBe(true);
    expect(isAdminAllowed("expert")).toBe(true);
    expect(isAdminAllowed("parent")).toBe(false);
    expect(isAdminAllowed("teacher")).toBe(false);
    expect(isAdminAllowed(null)).toBe(false);
    expect(isAdminAllowed(undefined)).toBe(false);
    expect(isAdminAllowed("")).toBe(false);
  });

  it("ADMIN_ALLOWED_ROLES 명세 (admin / principal / expert)", async () => {
    const { ADMIN_ALLOWED_ROLES } = await vi.importActual<typeof import("@/lib/auth-role")>(
      "@/lib/auth-role",
    );
    expect(ADMIN_ALLOWED_ROLES).toEqual(["admin", "principal", "expert"]);
  });
});

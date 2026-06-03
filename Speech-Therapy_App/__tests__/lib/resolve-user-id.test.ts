// 공유 resolveUserId — 인증 uid 우선, 익명 쿠키 폴백, 둘 다 없으면 undefined.

import { describe, it, expect, vi, beforeEach } from "vitest";

const getCachedUserMock = vi.fn();
vi.mock("@/lib/auth/cached-get-user", () => ({
  getCachedUser: () => getCachedUserMock(),
}));

const cookieGetMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => cookieGetMock(name) }),
}));

import { resolveUserId } from "@/lib/auth/resolve-user-id";

beforeEach(() => {
  getCachedUserMock.mockReset();
  cookieGetMock.mockReset();
});

describe("resolveUserId", () => {
  it("인증 사용자 → auth uid 우선(쿠키 무시)", async () => {
    getCachedUserMock.mockResolvedValue({ id: "auth-1", email: null });
    cookieGetMock.mockReturnValue({ value: "anon-x" });
    expect(await resolveUserId()).toBe("auth-1");
  });

  it("비인증 → 익명 쿠키 폴백", async () => {
    getCachedUserMock.mockResolvedValue(null);
    cookieGetMock.mockReturnValue({ value: "anon-x" });
    expect(await resolveUserId()).toBe("anon-x");
  });

  it("인증·쿠키 둘 다 없음 → undefined", async () => {
    getCachedUserMock.mockResolvedValue(null);
    cookieGetMock.mockReturnValue(undefined);
    expect(await resolveUserId()).toBeUndefined();
  });
});

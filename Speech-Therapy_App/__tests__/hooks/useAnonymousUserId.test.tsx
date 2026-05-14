// Sprint 2 — useAnonymousUserId localStorage + cookie 동기화 검증.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import {
  useAnonymousUserId,
  ANONYMOUS_USER_COOKIE,
  __resetAnonymousIdForTest,
} from "@/lib/hooks/useAnonymousUserId";

const VALID_UUID = "00000000-0000-4000-8000-000000000000";

beforeEach(() => {
  localStorage.clear();
  __resetAnonymousIdForTest();
  // document.cookie 초기화 (모든 cookie 만료).
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useAnonymousUserId", () => {
  it("최초 mount — localStorage 비어 있으면 신규 UUID 생성 + 저장 + cookie 동기화", async () => {
    const { result } = renderHook(() => useAnonymousUserId());

    // useSyncExternalStore 는 CSR 환경에선 getSnapshot 즉시 반환.
    // (SSR 안전성은 getServerSnapshot 분리로 보장 — Next.js 서버에선 null).
    await waitFor(() => expect(result.current).not.toBeNull());

    const id = result.current as string;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(localStorage.getItem("anonymousUserId")).toBe(id);
    expect(document.cookie).toContain(`${ANONYMOUS_USER_COOKIE}=${id}`);
  });

  it("localStorage 에 기존 UUID 가 있으면 그대로 사용 (영구 식별자)", async () => {
    localStorage.setItem("anonymousUserId", VALID_UUID);

    const { result } = renderHook(() => useAnonymousUserId());
    await waitFor(() => expect(result.current).toBe(VALID_UUID));

    // 신규 생성 안 일어남 — localStorage 값 보존.
    expect(localStorage.getItem("anonymousUserId")).toBe(VALID_UUID);
    expect(document.cookie).toContain(`${ANONYMOUS_USER_COOKIE}=${VALID_UUID}`);
  });

  it("두 번 mount 해도 동일 ID (영속성)", async () => {
    const first = renderHook(() => useAnonymousUserId());
    await waitFor(() => expect(first.result.current).not.toBeNull());
    const firstId = first.result.current;

    first.unmount();

    // 모듈 캐시 초기화 후에도 localStorage 값 그대로 → 동일 ID 반환.
    __resetAnonymousIdForTest();
    const second = renderHook(() => useAnonymousUserId());
    await waitFor(() => expect(second.result.current).toBe(firstId));
  });
});

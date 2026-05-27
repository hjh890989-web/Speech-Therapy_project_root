// SEC-COMP-PIPA (Grill #3A) — useAnonymousConsent hook 단위 테스트.

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAnonymousConsent } from "@/lib/hooks/useAnonymousConsent";

beforeEach(() => {
  window.localStorage.clear();
});

describe("useAnonymousConsent", () => {
  it("마커 부재 → 초기 상태 둘 다 false", () => {
    const { result } = renderHook(() => useAnonymousConsent());
    expect(result.current.pipaConsented).toBe(false);
    expect(result.current.overseasConsented).toBe(false);
    expect(result.current.bothConsented).toBe(false);
  });

  it("기존 마커 있으면 mount 후 prefill (true)", () => {
    window.localStorage.setItem("pipa_consented_at", new Date().toISOString());
    window.localStorage.setItem(
      "overseas_consented_at",
      new Date().toISOString(),
    );
    const { result } = renderHook(() => useAnonymousConsent());
    expect(result.current.pipaConsented).toBe(true);
    expect(result.current.overseasConsented).toBe(true);
    expect(result.current.bothConsented).toBe(true);
  });

  it("markConsented() 호출 → 두 마커 저장 + state true", () => {
    const { result } = renderHook(() => useAnonymousConsent());
    expect(result.current.bothConsented).toBe(false);
    act(() => result.current.markConsented());
    expect(result.current.pipaConsented).toBe(true);
    expect(result.current.overseasConsented).toBe(true);
    expect(window.localStorage.getItem("pipa_consented_at")).not.toBeNull();
    expect(window.localStorage.getItem("overseas_consented_at")).not.toBeNull();
  });

  it("한쪽 마커만 있으면 bothConsented = false", () => {
    window.localStorage.setItem("pipa_consented_at", new Date().toISOString());
    // overseas 미설정
    const { result } = renderHook(() => useAnonymousConsent());
    expect(result.current.pipaConsented).toBe(true);
    expect(result.current.overseasConsented).toBe(false);
    expect(result.current.bothConsented).toBe(false);
  });
});

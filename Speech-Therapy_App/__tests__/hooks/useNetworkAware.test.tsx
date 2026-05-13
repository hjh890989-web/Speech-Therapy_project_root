// FR-C-007 — useNetworkAware 단위 테스트.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useNetworkAware } from "@/lib/hooks/useNetworkAware";

let onLine: boolean;

beforeEach(() => {
  onLine = true;
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => onLine,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useNetworkAware", () => {
  it("초기 마운트 시 navigator.onLine 반영", () => {
    const { result } = renderHook(() => useNetworkAware());
    expect(result.current.isOnline).toBe(true);
  });

  it("offline 이벤트 시 isOnline=false", () => {
    const { result } = renderHook(() => useNetworkAware());
    act(() => {
      onLine = false;
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.isOnline).toBe(false);
  });

  it("online 이벤트 시 isOnline=true 복귀", () => {
    onLine = false;
    const { result } = renderHook(() => useNetworkAware());
    expect(result.current.isOnline).toBe(false);

    act(() => {
      onLine = true;
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.isOnline).toBe(true);
  });
});

describe("runWithRetry", () => {
  it("성공 시 fn 1회만 호출", async () => {
    const { result } = renderHook(() => useNetworkAware());
    const fn = vi.fn().mockResolvedValue("ok");
    const out = await result.current.runWithRetry(fn);
    expect(out).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("네트워크 오류 발생 시 1회 재시도", async () => {
    const { result } = renderHook(() => useNetworkAware());
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValueOnce("recovered");
    const out = await result.current.runWithRetry(fn);
    expect(out).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("네트워크 외 오류는 재시도 안 함", async () => {
    const { result } = renderHook(() => useNetworkAware());
    const fn = vi.fn().mockRejectedValue(new Error("INVALID_INPUT"));
    await expect(result.current.runWithRetry(fn)).rejects.toThrow("INVALID_INPUT");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

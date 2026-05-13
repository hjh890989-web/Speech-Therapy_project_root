"use client";

// FR-C-007 (D5 적용) — navigator.onLine 구독.
// IndexedDB / Background Sync 미사용. 단순 에러 토스트 + 재시도 정책 정보만 제공.
//
// SSR Hydration 안전성:
// - serverSnapshot 은 항상 true (낙관) → 서버/CSR 첫 렌더 일치.
// - mount 후 navigator.onLine 실측치로 reconcile.

import { useCallback, useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

export interface UseNetworkAwareReturn {
  isOnline: boolean;
  /// Server Action 실패 시 1회 자동 재시도용 헬퍼 (네트워크 오류만 재시도).
  runWithRetry: <T>(fn: () => Promise<T>) => Promise<T>;
}

export function useNetworkAware(): UseNetworkAwareReturn {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const runWithRetry = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      await new Promise((r) => setTimeout(r, 1000));
      return fn();
    }
  }, []);

  return { isOnline, runWithRetry };
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return (
    message.includes("network") ||
    message.includes("failed to fetch") ||
    message.includes("offline")
  );
}

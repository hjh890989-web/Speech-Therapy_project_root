"use client";

// Sprint 2 — 무로그인 사용자 식별. localStorage 영구 저장 + cookie 동기화로
// RSC 에서도 sessionId 없이 reward_progress 조회 가능.
//
// 패턴: useSyncExternalStore (useNetworkAware 와 동일).
//  - SSR 안전: getServerSnapshot 항상 null
//  - 모듈 캐시로 getSnapshot 안정성 확보 (동일 reference 반환)
//  - 첫 클라이언트 호출 시 localStorage read or create + cookie 동기화

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "anonymousUserId";
export const ANONYMOUS_USER_COOKIE = "anonymous_user_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1년

// 모듈 캐시 — useSyncExternalStore 의 stable reference 보장 + 단일 init.
let cachedAnonymousId: string | null = null;

function syncCookie(id: string) {
  document.cookie = `${ANONYMOUS_USER_COOKIE}=${id}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function ensureAnonymousId(): string {
  if (cachedAnonymousId) return cachedAnonymousId;
  let existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    existing = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, existing);
  }
  syncCookie(existing);
  cachedAnonymousId = existing;
  return existing;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  // 다른 탭의 localStorage 변경 발생 시 재동기화 (선택적).
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return ensureAnonymousId();
}

function getServerSnapshot(): null {
  return null;
}

/**
 * 무로그인 사용자의 영구 식별자.
 * - 동일 브라우저에서 항상 같은 UUID 반환 (localStorage 보존 한)
 * - cookie 동기화로 server component 도 동일 ID 인식
 * - SSR 시점엔 null → hydration 안전
 */
export function useAnonymousUserId(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** 테스트 hook — 모듈 캐시 초기화. */
export function __resetAnonymousIdForTest(): void {
  cachedAnonymousId = null;
}

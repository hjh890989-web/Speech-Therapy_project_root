"use client";

// Sprint 2 §1 — 무로그인 사용자 식별 (Sprint 2 §3 재설계).
//
// 우선순위 변경:
//  1. 서버 cookie 우선 (proxy.ts 가 Set-Cookie 로 발급, iOS ITP 회피 가능 TTL)
//  2. cookie 부재 시 localStorage fallback (iOS ITP 가 cookie 클리어한 경우 복구)
//  3. 양쪽 다 없으면 fresh UUID 생성
//
// 클라이언트는 cookie 와 localStorage 양쪽을 항상 동기화 — 어느 쪽이 클리어돼도 자가 복구.
//
// 패턴: useSyncExternalStore (useNetworkAware 와 동일).

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "anonymousUserId";
export const ANONYMOUS_USER_COOKIE = "anonymous_user_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1년

// 모듈 캐시 — useSyncExternalStore 의 stable reference 보장.
let cachedAnonymousId: string | null = null;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function syncCookie(id: string) {
  document.cookie = `${ANONYMOUS_USER_COOKIE}=${id}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function ensureAnonymousId(): string {
  if (cachedAnonymousId) return cachedAnonymousId;

  // 1순위: 서버 측 발급된 cookie (proxy.ts) — iOS ITP 회피 + RSC 가 읽는 것과 동일 보장.
  const cookieValue = readCookie(ANONYMOUS_USER_COOKIE);
  if (cookieValue) {
    // localStorage 도 cookie 와 동기화 (이전 세션과 다른 경우 cookie 가 권위).
    if (localStorage.getItem(STORAGE_KEY) !== cookieValue) {
      localStorage.setItem(STORAGE_KEY, cookieValue);
    }
    cachedAnonymousId = cookieValue;
    return cookieValue;
  }

  // 2순위: localStorage (cookie 가 ITP 로 클리어된 경우 복구).
  const localValue = localStorage.getItem(STORAGE_KEY);
  if (localValue) {
    syncCookie(localValue);
    cachedAnonymousId = localValue;
    return localValue;
  }

  // 3순위: 양쪽 다 없음 — fresh UUID.
  const newId = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, newId);
  syncCookie(newId);
  cachedAnonymousId = newId;
  return newId;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
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
 * - 서버 cookie 우선 (proxy.ts 발급) → /rewards RSC 가 읽는 것과 동일 보장
 * - cookie 클리어 시 localStorage 로 자가 복구
 * - 양쪽 다 없으면 fresh UUID 생성
 */
export function useAnonymousUserId(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** 테스트 hook — 모듈 캐시 초기화. */
export function __resetAnonymousIdForTest(): void {
  cachedAnonymousId = null;
}

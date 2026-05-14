"use client";

// Sprint 2 §1 — 무로그인 사용자 식별 (Sprint 2 §4 재재설계).
//
// **권위 방향: localStorage > cookie** (이전 §3 의 cookie 권위 폐기).
//
// 폐기 사유 (별 누적 1개 고착 root cause):
// - cookie 는 iOS Safari ITP 가 클리어할 수 있음
// - proxy.ts 가 cookie 부재 시 매번 새 UUID 를 자동 발급
// - 이전 §3 의 "cookie 권위" 로직은 클리어 후 새 cookie 가 localStorage 의 원본을 덮어씀
// - 결과: 같은 사용자가 진단할 때마다 다른 userId 로 별이 분산 저장됨
//
// 새 우선순위:
//  1. localStorage 우선 (강한 영속성, ITP 가 안 건드림)
//  2. localStorage 비어있고 cookie 만 있으면 cookie 값 채택 (초기 발급 케이스)
//  3. 양쪽 다 없으면 fresh UUID 생성
//
// cookie 와 localStorage 가 다르면 항상 localStorage 값으로 cookie 를 덮어씀 (자가 복구).
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

  const localValue = localStorage.getItem(STORAGE_KEY);
  const cookieValue = readCookie(ANONYMOUS_USER_COOKIE);

  // 1순위: localStorage 권위 (영속성 강함, ITP 가 안 건드림).
  if (localValue) {
    // cookie 가 다르면 localStorage 값으로 덮어씀 — proxy.ts 가 발급한 stale cookie 정정.
    if (cookieValue !== localValue) syncCookie(localValue);
    cachedAnonymousId = localValue;
    return localValue;
  }

  // 2순위: localStorage 비어있고 cookie 만 있음 (초기 발급 케이스 — proxy.ts 가 cookie 만 만든 직후).
  if (cookieValue) {
    localStorage.setItem(STORAGE_KEY, cookieValue);
    cachedAnonymousId = cookieValue;
    return cookieValue;
  }

  // 3순위: 양쪽 다 없음 — fresh UUID 생성 + 양쪽 모두 동기화.
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

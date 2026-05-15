// API-010 §1 — Supabase 브라우저 클라이언트 (Client Component 용).
// document.cookie 기반 자동 세션 동기화.
//
// 핫픽스 2026-05-15 — PKCE code verifier 가 localStorage 로 빠져
// server callback (exchangeCodeForSession) 에서 검출 못 하던 문제 해결:
// 명시적 cookies (getAll/setAll) 어댑터 추가. server.ts 와 동일 패턴.
// 이로써 verifier + session 모두 cookie 에 통일 저장.

"use client";

import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

interface BrowserCookieOptions {
  maxAge?: number;
  expires?: number | Date;
  path?: string;
  sameSite?: "lax" | "strict" | "none" | boolean;
  secure?: boolean;
  domain?: string;
}

function readAllCookies(): { name: string; value: string }[] {
  if (typeof document === "undefined") return [];
  return document.cookie
    .split("; ")
    .filter(Boolean)
    .map((pair) => {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) return { name: pair, value: "" };
      const name = pair.slice(0, eqIdx);
      const value = decodeURIComponent(pair.slice(eqIdx + 1));
      return { name, value };
    });
}

function writeCookie(name: string, value: string, options: BrowserCookieOptions = {}) {
  if (typeof document === "undefined") return;
  let cookie = `${name}=${encodeURIComponent(value)}`;
  cookie += `; path=${options.path ?? "/"}`;
  if (options.maxAge !== undefined) cookie += `; max-age=${options.maxAge}`;
  if (options.expires !== undefined) {
    const d =
      options.expires instanceof Date ? options.expires : new Date(options.expires * 1000);
    cookie += `; expires=${d.toUTCString()}`;
  }
  if (options.sameSite) {
    const ss = typeof options.sameSite === "boolean" ? "lax" : options.sameSite;
    cookie += `; samesite=${ss}`;
  } else {
    cookie += `; samesite=lax`;
  }
  if (options.secure ?? location.protocol === "https:") cookie += `; secure`;
  if (options.domain) cookie += `; domain=${options.domain}`;
  document.cookie = cookie;
}

export function getSupabaseBrowserClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).");
  }

  cached = createBrowserClient(url, anonKey, {
    cookies: {
      getAll: readAllCookies,
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          writeCookie(name, value, options as BrowserCookieOptions);
        }
      },
    },
  });
  return cached;
}

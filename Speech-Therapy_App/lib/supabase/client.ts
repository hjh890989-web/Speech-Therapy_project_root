// API-010 §1 — Supabase 브라우저 클라이언트 (Client Component 용).
// document.cookie 기반 자동 세션 동기화.

"use client";

import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).");
  }

  cached = createBrowserClient(url, anonKey);
  return cached;
}

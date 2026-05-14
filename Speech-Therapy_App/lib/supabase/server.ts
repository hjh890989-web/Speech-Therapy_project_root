// API-010 §1 — Supabase SSR 클라이언트 (Server Component / Route Handler 용).
//
// @supabase/ssr 의 cookies 어댑터 패턴: Next.js 의 cookies() API 와 통합.
// session 갱신 (token refresh) 시 cookie set/remove 가 자동으로 동작.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase env vars missing (URL or ANON_KEY).");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component 에서 호출 시 cookie 변경 불가 — 무시 (Route Handler 에서만 의미).
        }
      },
    },
  });
}

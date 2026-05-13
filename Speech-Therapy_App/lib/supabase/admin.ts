// FR-C-004 — Supabase service-role 클라이언트 (server-only).
//
// RLS 우회가 필요한 server-side 작업 (Cron, Auth trigger, seed 등) 전용.
// service_role 키는 절대 client bundle 에 노출되지 않아야 함 (NEXT_PUBLIC_ 접두 금지).
//
// 호출 전제: SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL 환경변수 설정.
// Sprint 1 audio-cleanup cron 이 유일한 사용처 — 그 외 호출 시 RLS 정책 회피 위험 검토 필수.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    // Sprint 1 dev/preview 에선 미설정도 허용 → 호출부가 graceful skip.
    return null;
  }

  cached = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}

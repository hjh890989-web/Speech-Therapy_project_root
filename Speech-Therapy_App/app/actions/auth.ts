"use server";

// API-010 §1 — 로그아웃 Server Action.
// Supabase 세션 cookie 제거 + 클라이언트는 / 로 리다이렉트.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  // 인증 상태 변경 → 모든 RSC 페이지 (홈, /rewards 등) 의 user-aware 렌더 캐시 무효화.
  revalidatePath("/", "layout");
  redirect("/");
}

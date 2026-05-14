"use server";

// API-010 §1 — 로그아웃 Server Action.
// Supabase 세션 cookie 제거 + 클라이언트는 / 로 리다이렉트.

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

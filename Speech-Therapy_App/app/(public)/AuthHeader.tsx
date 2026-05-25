// API-010 §1 — 모든 공개 페이지 상단 인증 상태 표시 (Server Component).
//
// 익명: "로그인 / 가입" 링크 + 안내 "별을 영구 보존하려면 가입하세요"
// 인증: 사용자 이메일 + "로그아웃" 버튼

import Link from "next/link";
import { getCachedUser } from "@/lib/auth/cached-get-user";
import { signOut } from "@/app/actions/auth";

export async function AuthHeader() {
  // Performance 감사 1차 — `getCachedUser` 는 React `cache()` 기반 request-scope
  // 캐시. 동일 request 안에서 MainNav / OnboardingRedirectShim / page 가 동일하게
  // 호출해도 Supabase 왕복은 1회만 발생.
  const user = await getCachedUser();
  const userEmail = user?.email ?? null;

  return (
    <div className="border-b border-gray-200 bg-white/70 backdrop-blur dark:border-gray-800 dark:bg-gray-950/60">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2 text-xs">
        <Link href="/" className="font-semibold text-emerald-700 dark:text-emerald-300">
          Speech-Therapy
        </Link>
        {userEmail ? (
          <form action={signOut} className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">{userEmail}</span>
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
            >
              로그아웃
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="rounded-md border border-emerald-500 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            로그인 / 가입
          </Link>
        )}
      </div>
    </div>
  );
}

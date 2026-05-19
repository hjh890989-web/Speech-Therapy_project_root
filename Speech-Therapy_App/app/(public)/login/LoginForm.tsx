"use client";

// API-010 §1 — Magic Link 이메일 입력 폼.
// API-010 §2 — Google OAuth 버튼 추가 (이메일 rate limit 우회 경로).
//
// 두 경로 모두 동일 콜백 (/auth/callback) 으로 귀결 — Supabase
// exchangeCodeForSession 이 Magic Link 와 OAuth code 둘 다 처리.

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";

type Status = "idle" | "magic_sending" | "magic_sent" | "oauth_redirecting" | "error";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleMagicLinkSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;
    setStatus("magic_sending");
    setErrorMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }
      setStatus("magic_sent");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleGoogleSignIn = async () => {
    setStatus("oauth_redirecting");
    setErrorMessage(null);
    trackEvent("auth_signin_started", { provider: "google" });
    try {
      const supabase = getSupabaseBrowserClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });
      // 정상 시 브라우저는 Google 로 redirect → 본 핸들러는 더 이상 실행 안 됨.
      // 여기 도달한다면 error 케이스.
      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  if (status === "magic_sent") {
    return (
      <div className="rounded-md bg-emerald-50 px-4 py-4 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <p className="font-medium">{email} 으로 인증 링크를 보냈어요.</p>
        <p className="mt-2">
          메일을 열어 링크를 한 번 눌러 주세요. 같은 기기에서 자동으로 로그인됩니다.
        </p>
      </div>
    );
  }

  const isBusy = status === "magic_sending" || status === "oauth_redirecting";

  return (
    <div className="space-y-6">
      {/* API-010 §2 — Google OAuth 우선 노출 (이메일 rate limit 우회) */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isBusy}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
      >
        <GoogleIcon />
        {status === "oauth_redirecting" ? "이동하는 중..." : "Google 로 계속하기"}
      </button>

      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" aria-hidden />
        <span>또는</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" aria-hidden />
      </div>

      <form className="space-y-4" onSubmit={handleMagicLinkSubmit}>
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            이메일
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="parent@example.com"
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
          />
        </div>

        <button
          type="submit"
          disabled={isBusy}
          className="w-full rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {status === "magic_sending" ? "보내는 중..." : "인증 링크 받기"}
        </button>
      </form>

      {errorMessage && (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          로그인 실패: {errorMessage}
        </p>
      )}
    </div>
  );
}

/// 단순 SVG 로 google.com favicon 라이센스 회피 (로고 미사용 — "G" 글자만).
function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

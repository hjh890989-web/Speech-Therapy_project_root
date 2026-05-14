"use client";

// API-010 §1 — Magic Link 이메일 입력 폼.
// signInWithOtp({ email, emailRedirectTo: <SITE>/auth/callback }) 호출.
// 익명 식별자는 callback 후 anonymous_user_id cookie 로 조회되어 마이그레이션.

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;
    setStatus("sending");
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
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-md bg-emerald-50 px-4 py-4 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <p className="font-medium">{email} 으로 인증 링크를 보냈어요.</p>
        <p className="mt-2">
          메일을 열어 링크를 한 번 눌러 주세요. 같은 기기에서 자동으로 로그인됩니다.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
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
        disabled={status === "sending"}
        className="w-full rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === "sending" ? "보내는 중..." : "인증 링크 받기"}
      </button>

      {errorMessage && (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          전송에 실패했어요: {errorMessage}
        </p>
      )}
    </form>
  );
}

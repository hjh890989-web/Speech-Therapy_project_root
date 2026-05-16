// API-010 §1 — Magic Link 로그인 페이지.
// 이메일 1개 입력 → Supabase Auth 가 OTP 이메일 발송 → /auth/callback 으로 리다이렉트.

import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "로그인 — Speech-Therapy",
  description: "이메일 한 번에 가입하고 누적된 별을 영구 보존하세요.",
};

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-8 sm:py-12">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">로그인 / 가입</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          이메일을 입력하면 인증 링크를 보내드려요. 별도의 비밀번호는 필요 없어요.
        </p>
      </header>

      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        가입 시 무로그인 발음 확인으로 모은 별과 결과가 새 계정에 그대로 옮겨집니다.
      </p>

      <LoginForm />
    </main>
  );
}

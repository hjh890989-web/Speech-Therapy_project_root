// FR-C-ACCOUNT — 비밀번호 재설정 진입 페이지 (Server Component shell + Client Form).
//
// 흐름:
//   - 사용자가 메일에 도착한 Supabase recovery 링크 클릭
//     → /auth/reset-password#access_token=...&type=recovery 로 진입.
//   - Supabase 의 브라우저 클라이언트가 URL fragment 를 자동 파싱 후 PASSWORD_RECOVERY
//     세션을 부여한다. 본 페이지의 NewPasswordForm 가 mount 되어 새 비밀번호 입력 받음.
//   - "비밀번호 설정" → supabase.auth.updateUser({ password }) → redirect to /settings/account.
//
// 페이지는 Server Component shell — 본문 텍스트 + Client Form 만 렌더. auth 사전 검증 불필요
// (Supabase recovery 세션은 URL fragment 만으로 부여되며, server side cookie 동기화는 form
// 제출 시점에 supabase.auth.updateUser 가 처리).
//
// CON-04: 본 페이지의 모든 카피 / metadata 에 "치료/진단/장애" 금칙어 0건.

import { NewPasswordForm } from "@/components/auth/NewPasswordForm";

export const metadata = {
  title: "비밀번호 재설정 — Speech-Therapy",
  description:
    "메일로 받은 비밀번호 재설정 링크를 통해 새 비밀번호를 설정하세요.",
};

// recovery 세션은 매 요청 fresh — 정적 캐시 차단.
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main
      data-testid="reset-password-page"
      className="mx-auto max-w-md px-4 py-10 sm:py-14"
    >
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
          비밀번호 재설정
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          새 비밀번호를 두 번 입력해 주세요. 변경 후 자동으로 계정 정보 페이지로 이동합니다.
        </p>
      </header>

      <section
        className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        aria-labelledby="reset-password-form-heading"
      >
        <h2 id="reset-password-form-heading" className="sr-only">
          새 비밀번호 입력
        </h2>
        <NewPasswordForm redirectAfter="/settings/account" />
      </section>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        링크가 만료되었거나 작동하지 않으면 다시{" "}
        <a
          href="/settings/account"
          className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
        >
          계정 정보 페이지
        </a>{" "}
        에서 재설정 메일을 다시 받아 주세요.
      </p>
    </main>
  );
}

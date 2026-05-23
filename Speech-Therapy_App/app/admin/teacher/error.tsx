"use client";

// FR-Q-TEACHER — /admin/teacher error boundary (Next.js 16 App Router error.tsx).
// Server Component fetch (Prisma / Supabase) 실패 시 본 boundary 가 catch.
// reset() 으로 단순 재시도.

import { useEffect } from "react";

export default function TeacherDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Vercel Logs / Drains 가 수집 — R4: 본문엔 자녀 식별자 미포함 (집계 카운트만 다룸).
    console.error(
      JSON.stringify({
        level: "error",
        event: "admin_teacher_render_error",
        message: error.message,
        digest: error.digest ?? null,
      }),
    );
  }, [error]);

  return (
    <main
      data-testid="admin-teacher-error"
      className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6"
      role="alert"
      aria-live="assertive"
    >
      <div className="rounded-lg border border-rose-300 bg-rose-50 p-6 text-rose-900">
        <h1 className="text-xl font-semibold">대시보드를 불러오지 못했어요</h1>
        <p className="mt-2 text-sm">
          데이터베이스 연결 또는 일시적인 오류로 담당 반 요약을 표시하지 못했어요.
          잠시 후 다시 시도해 주세요.
        </p>
        {error.digest ? (
          <p
            className="mt-3 break-all rounded bg-white/70 p-2 font-mono text-xs"
            data-testid="error-digest"
          >
            오류 ID: {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}

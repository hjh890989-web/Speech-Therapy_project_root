// FR-Q-TEACHER — /admin/teacher 로딩 skeleton (Next.js 16 App Router loading.tsx).
// 단순 placeholder — 첫 paint 동안 빈 화면 차단 + LCP 측정 신호 (REQ-NF-004).

export default function TeacherDashboardLoading() {
  return (
    <main
      data-testid="admin-teacher-loading"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
      aria-busy="true"
      aria-label="선생님 대시보드 불러오는 중"
    >
      <div className="mb-6 space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 w-full animate-pulse rounded-lg bg-slate-100"
            aria-hidden="true"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-32 w-full animate-pulse rounded-lg bg-slate-100"
            aria-hidden="true"
          />
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">
        담당 반 요약을 불러오는 중이에요…
      </p>
    </main>
  );
}

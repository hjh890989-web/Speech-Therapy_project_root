// FR-Q-008 — /admin/hitl 로딩 skeleton (Next.js 16 App Router loading.tsx).
// 단순 placeholder — 첫 paint 동안 빈 화면 차단.

export default function HitlAdminLoading() {
  return (
    <main
      data-testid="admin-hitl-loading"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
      aria-busy="true"
      aria-label="HITL 큐 불러오는 중"
    >
      <div className="mb-6 space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-full animate-pulse rounded bg-slate-100"
            aria-hidden="true"
          />
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">
        검토 대기 목록을 불러오는 중이에요…
      </p>
    </main>
  );
}

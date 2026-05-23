// FR-Q-013 (#54) — /admin/timeline/[userId] loading skeleton.
// 단순 placeholder — 첫 paint 동안 빈 화면 차단 + LCP 측정 신호 (REQ-NF-004).

export default function TimelineLoading() {
  return (
    <main
      data-testid="admin-timeline-loading"
      className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10"
      aria-busy="true"
      aria-label="자녀 활동 타임라인 불러오는 중"
    >
      <div className="mb-6 space-y-2">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-80 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 w-full animate-pulse rounded-lg bg-slate-100"
            aria-hidden="true"
          />
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">활동 기록을 불러오는 중이에요…</p>
    </main>
  );
}

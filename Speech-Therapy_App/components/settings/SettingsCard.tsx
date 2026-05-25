// FR-C-SETTINGS-INDEX — /settings 인덱스 카드 컴포넌트 (재사용 가능한 Link 카드).
//
// 책임:
//   - `<Link href={href}>` 래핑된 카드 — 클릭 시 destination 으로 이동.
//   - icon (큰 emoji) + title + description + chevron (>).
//   - hover 시 배경 강조, 키보드 focus 시 ring 표시 (focus-visible).
//   - aria-label 로 접근성 보강 (스크린리더 사용자 위해 title + description 결합).
//
// CON-04: "치료/진단/장애" 등 의료 금칙어 사용 금지 — 인덱스에서 호출하는 카피만 받음.
//
// Server Component — 단순 Link 래핑이라 client 분기 불필요.

import Link from "next/link";

export interface SettingsCardProps {
  href: string;
  icon: string;
  title: string;
  description: string;
  testId?: string;
}

export function SettingsCard({
  href,
  icon,
  title,
  description,
  testId,
}: SettingsCardProps) {
  return (
    <Link
      href={href}
      data-testid={testId}
      aria-label={`${title} — ${description}`}
      className={[
        // layout — 큰 터치 영역 (모바일 48px 이상).
        "group flex min-h-[88px] items-center gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4",
        "dark:border-slate-800 dark:bg-slate-900",
        // interaction.
        "transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        "dark:focus-visible:ring-offset-slate-950",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-2xl dark:bg-slate-800"
      >
        {icon}
      </span>

      <span className="flex flex-1 flex-col gap-1">
        <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </span>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {description}
        </span>
      </span>

      <span
        aria-hidden="true"
        className="text-xl text-slate-400 transition-transform group-hover:translate-x-0.5 dark:text-slate-500"
      >
        &rsaquo;
      </span>
    </Link>
  );
}

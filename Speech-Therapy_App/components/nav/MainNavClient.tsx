"use client";

// FR-NAV — MainNavClient (Client Component).
//
// 역할:
//   MainNav (Server Component) 가 산출한 메뉴 목록 + role + 사용자 이메일을 받아
//   - 데스크탑: 가로 메뉴 (md 이상)
//   - 모바일: <details> disclosure 기반 hamburger 메뉴 (default 닫힘)
//   - 활성 path 강조 (usePathname() 기반 — aria-current="page" + 색상)
//   - 로그아웃 form (Server Action signOut 사용)
//   - 분석 이벤트 (nav_clicked) 발송
//
// 분리 이유:
//   - usePathname() / details toggle 은 client-only.
//   - DB / Supabase 호출은 server 측에서 1회만 — 본 컴포넌트는 props 만 받음 → client 번들 경량화.
//
// 모바일 hamburger 패턴:
//   - <details><summary>…</summary>{menu}</details> 의 native disclosure 사용 — JS 없이도 동작.
//   - "use client" 인 사유는 usePathname / trackEvent (브라우저 SDK) 사용.
//
// 접근성:
//   - <nav aria-label="주요 메뉴">
//   - 활성 링크 aria-current="page"
//   - hamburger summary 에 aria-label, tap target ≥ 44px (h-11)
//   - Tab 키로 모든 링크 순회 가능 (button/a default focus order)
//
// CON-04: 메뉴 라벨 / aria-label / 주석에 의료 단정 금칙어 0건.

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { trackEvent } from "@/lib/analytics";

/** Supabase Role enum 매핑 + 익명 분기. */
export type MainNavRole =
  | "anonymous"
  | "parent"
  | "teacher"
  | "principal"
  | "expert"
  | "admin";

export interface MainNavItem {
  href: string;
  label: string;
  /** 자녀 친화 표현 — 부모 메뉴에만 emoji 부착. 운영자 메뉴도 시각적 단서로 활용. */
  emoji?: string;
}

export interface MainNavClientProps {
  items: MainNavItem[];
  role: MainNavRole;
  userEmail: string | null;
}

/** 현재 path 와 href 매치 — 정확 매치 + prefix (예: /admin/teacher/students). */
export function isPathActive(currentPath: string | null, href: string): boolean {
  if (!currentPath) return false;
  if (currentPath === href) return true;
  // /missions/123 같은 sub-route 도 /missions 활성화.
  return currentPath.startsWith(`${href}/`);
}

export function MainNavClient({ items, role, userEmail }: MainNavClientProps) {
  const pathname = usePathname();

  const handleClick = (href: string) => {
    // nav_clicked 이벤트 — destination + role.
    trackEvent("nav_clicked", { destination: href, role });
  };

  return (
    <nav
      aria-label="주요 메뉴"
      data-testid="main-nav"
      data-role={role}
      className="border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/70"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">
        {/* 데스크탑: 가로 메뉴 (md 이상) */}
        <ul
          className="hidden items-center gap-1 md:flex"
          data-testid="main-nav-desktop"
        >
          {items.map((item) => {
            const active = isPathActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  onClick={() => handleClick(item.href)}
                  aria-current={active ? "page" : undefined}
                  data-active={active ? "true" : "false"}
                  className={[
                    "inline-flex h-11 items-center gap-1 rounded-md px-3 text-sm font-medium",
                    active
                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800",
                  ].join(" ")}
                >
                  {item.emoji ? <span aria-hidden="true">{item.emoji}</span> : null}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* 모바일: hamburger disclosure */}
        <details
          className="relative md:hidden"
          data-testid="main-nav-mobile"
        >
          <summary
            aria-label="메뉴 열기"
            className="inline-flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 [&::-webkit-details-marker]:hidden"
          >
            <span aria-hidden="true">☰</span>
          </summary>
          <ul
            className="absolute left-0 z-40 mt-1 flex w-64 flex-col gap-1 rounded-md border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900"
            data-testid="main-nav-mobile-list"
          >
            {items.map((item) => {
              const active = isPathActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    onClick={() => handleClick(item.href)}
                    aria-current={active ? "page" : undefined}
                    data-active={active ? "true" : "false"}
                    className={[
                      "flex h-11 items-center gap-2 rounded-md px-3 text-base",
                      active
                        ? "bg-emerald-100 font-semibold text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                        : "text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800",
                    ].join(" ")}
                  >
                    {item.emoji ? <span aria-hidden="true">{item.emoji}</span> : null}
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
            {/* 모바일에서도 로그인 / 로그아웃 노출 (프로필 영역 별도 분기) */}
            {role === "anonymous" ? (
              <li>
                <Link
                  href="/login"
                  prefetch={false}
                  onClick={() => handleClick("/login")}
                  className="flex h-11 items-center gap-2 rounded-md border border-emerald-500 px-3 text-base text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                >
                  로그인
                </Link>
              </li>
            ) : (
              <li>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex h-11 w-full items-center gap-2 rounded-md border border-gray-300 px-3 text-base text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    로그아웃
                  </button>
                </form>
              </li>
            )}
          </ul>
        </details>

        {/* 우측 프로필 영역 — 데스크탑만 */}
        <div className="hidden items-center gap-2 md:flex" data-testid="main-nav-profile">
          {role === "anonymous" ? (
            <Link
              href="/login"
              prefetch={false}
              onClick={() => handleClick("/login")}
              className="inline-flex h-11 items-center rounded-md border border-emerald-500 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            >
              로그인
            </Link>
          ) : (
            <form action={signOut} className="flex items-center gap-2">
              {userEmail ? (
                <span
                  className="hidden text-xs text-gray-600 dark:text-gray-300 lg:inline"
                  data-testid="main-nav-email"
                >
                  {userEmail}
                </span>
              ) : null}
              <button
                type="submit"
                className="inline-flex h-11 items-center rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                로그아웃
              </button>
            </form>
          )}
        </div>
      </div>
    </nav>
  );
}

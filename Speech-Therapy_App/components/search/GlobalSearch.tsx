"use client";

// FR-NAV-SEARCH — 글로벌 검색 box Client Component.
//
// 책임:
//   - input box (debounce 300ms → /api/search GET fetch)
//   - 결과 dropdown — kind 별 그룹 (자녀 / 반 / 기관) 라벨 + 항목 list
//   - 키보드 navigation (↑↓ 화살표 + Enter, Esc 닫기)
//   - 단축키 "/" 로 input focus 점프 (단, input/textarea 안에 있을 땐 무시)
//   - 빈 query / 결과 없음 메시지
//   - trackEvent("global_search_executed") — debounce fetch 응답 직후 1회
//
// 분리 이유:
//   - useState / useEffect / debounce 타이머 / fetch 는 client-only.
//   - 본 컴포넌트는 RSC 안의 layout 에서 mount — Suspense 불필요 (단순 input UI).
//
// 접근성:
//   - role="combobox" + aria-expanded + aria-controls
//   - 결과 list 는 role="listbox", 항목은 role="option" + aria-selected
//   - input aria-label="자녀, 반, 기관 검색"
//
// CON-04: placeholder / 라벨 / 빈 상태 텍스트에 의료 단정 금칙어 0건.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { trackEvent } from "@/lib/analytics";
import type { SearchResult } from "@/lib/search/global";

import { ShareResultButton } from "./ShareResultButton";

export interface GlobalSearchProps {
  /** 검색 호출자 role — 분석 이벤트 발송 시 라벨. anonymous / parent / expert 면 input 미렌더. */
  role: "admin" | "principal" | "teacher";
}

/** 검색 debounce — 300ms (REQ-NF-PERF 트래픽 보호 + UX). */
const SEARCH_DEBOUNCE_MS = 300;

/** kind 별 그룹 헤더 라벨. CON-04 금칙어 0건. */
const KIND_LABELS: Record<SearchResult["kind"], string> = {
  child: "자녀",
  class: "반",
  institution: "기관",
};

/** kind 별 표시 순서 (display sort key). */
const KIND_ORDER: Record<SearchResult["kind"], number> = {
  child: 0,
  class: 1,
  institution: 2,
};

function groupByKind(results: SearchResult[]): Array<{
  kind: SearchResult["kind"];
  items: SearchResult[];
}> {
  const map = new Map<SearchResult["kind"], SearchResult[]>();
  for (const r of results) {
    const arr = map.get(r.kind);
    if (arr) {
      arr.push(r);
    } else {
      map.set(r.kind, [r]);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => KIND_ORDER[a] - KIND_ORDER[b])
    .map(([kind, items]) => ({ kind, items }));
}

export function GlobalSearch({ role }: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState<number>(-1);

  // ----- debounce fetch -----
  const fetchResults = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        setError(null);
        setActiveIdx(-1);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          method: "GET",
        });
        if (res.status === 429) {
          setError("잠시 후 다시 시도해 주세요.");
          setResults([]);
          return;
        }
        if (!res.ok) {
          setError("검색 중 오류가 발생했어요.");
          setResults([]);
          return;
        }
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results);
        setActiveIdx(-1);
        // 분석 이벤트 — debounce fetch 응답 직후 1회.
        trackEvent("global_search_executed", {
          queryLength: q.trim().length,
          resultCount: data.results.length,
          role,
        });
      } catch {
        setError("네트워크 오류가 발생했어요.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [role],
  );

  // query 변경 시 debounce timer reset.
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (!isOpen) return;
    debounceTimerRef.current = setTimeout(() => {
      void fetchResults(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, isOpen, fetchResults]);

  // ----- 단축키 "/" → input focus -----
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
      setIsOpen(true);
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  // ----- 바깥 클릭 시 close -----
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("mousedown", handleClickOutside);
      return () => window.removeEventListener("mousedown", handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  // ----- 키보드 navigation -----
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((idx) => Math.min(results.length - 1, idx + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((idx) => Math.max(0, idx - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const selected = activeIdx >= 0 ? results[activeIdx] : results[0];
      if (selected) {
        navigateTo(selected.href);
      }
    }
  };

  function navigateTo(href: string) {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  }

  const grouped = groupByKind(results);
  const showDropdown =
    isOpen && (query.trim().length >= 2 || isLoading || error !== null);
  const trimmedQuery = query.trim();
  const isShortQuery = trimmedQuery.length > 0 && trimmedQuery.length < 2;

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-md"
      data-testid="global-search"
      data-role={role}
    >
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="자녀, 반, 기관 검색"
        aria-expanded={showDropdown}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        placeholder="자녀 · 반 · 기관 검색 (/ 누르면 빠르게 이동)"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        data-testid="global-search-input"
        className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />

      {showDropdown ? (
        <div
          id="global-search-results"
          role="listbox"
          aria-label="검색 결과"
          data-testid="global-search-dropdown"
          className="absolute left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {isShortQuery ? (
            <p
              data-testid="global-search-empty"
              className="p-3 text-xs text-gray-500"
            >
              검색어를 2자 이상 입력해 주세요.
            </p>
          ) : isLoading ? (
            <p
              data-testid="global-search-loading"
              className="p-3 text-xs text-gray-500"
            >
              검색 중...
            </p>
          ) : error ? (
            <p
              data-testid="global-search-error"
              role="alert"
              className="p-3 text-xs text-amber-700"
            >
              {error}
            </p>
          ) : results.length === 0 ? (
            <p
              data-testid="global-search-no-results"
              className="p-3 text-xs text-gray-500"
            >
              결과 없음
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {grouped.map((group) => (
                <li key={group.kind}>
                  <div
                    className="bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-300"
                    data-testid={`global-search-group-${group.kind}`}
                  >
                    {KIND_LABELS[group.kind]} ({group.items.length})
                  </div>
                  <ul>
                    {group.items.map((item) => {
                      const flatIdx = results.indexOf(item);
                      const isActive = flatIdx === activeIdx;
                      return (
                        <li
                          key={`${item.kind}:${item.id}`}
                          role="option"
                          aria-selected={isActive}
                          data-active={isActive ? "true" : "false"}
                          data-testid={`global-search-result-row-${item.kind}-${item.id}`}
                          onMouseEnter={() => setActiveIdx(flatIdx)}
                          className={[
                            "flex w-full items-center gap-1 pr-1 text-sm",
                            isActive
                              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                              : "text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800",
                          ].join(" ")}
                        >
                          <button
                            type="button"
                            data-testid={`global-search-result-${item.kind}-${item.id}`}
                            onClick={() => navigateTo(item.href)}
                            className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2 text-left"
                          >
                            <span className="truncate font-medium">{item.label}</span>
                            {item.subtitle ? (
                              <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {item.subtitle}
                              </span>
                            ) : null}
                          </button>
                          <ShareResultButton result={item} />
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

"use client";

// FR-NAV-SEARCH — GlobalSearch 결과 row 의 share/copy 액션 버튼.
//
// 배경:
//   - admin 운영자가 자녀 timeline / 반 / 기관 URL 을 다른 운영자(메신저)에게 빠르게 전달하기 위함.
//   - 결과 row 자체 클릭은 navigation — 본 버튼은 그와 분리된 share/copy 만 담당.
//
// 책임:
//   - lib/share.ts::shareOrCopy 호출 (surface='search_result')
//   - sharing / shared / copied / canceled / unsupported 상태 관리 + 토스트(visual feedback)
//   - 결과 row 클릭(navigation) 과 분리 — onClick / pointer event 모두 stopPropagation
//
// 텔레메트리:
//   - share_clicked 이벤트는 shareOrCopy 가 단일 책임으로 발송 (surface='search_result' 라벨)
//   - 본 컴포넌트는 trackEvent 직접 호출 없음 (lib/share.ts contract 준수)
//
// CON-04: 모든 라벨/토스트 카피에 의료 금칙어 0건.
// R4: result.label / subtitle 은 호출 측(GlobalSearch)이 이미 maskEmail 적용된 값을 전달.
//     본 컴포넌트는 그대로 사용하며 추가 sanitize 책임 없음.

import { useCallback, useState } from "react";

import { shareOrCopy, type ShareMethod } from "@/lib/share";
import type { SearchResult } from "@/lib/search/global";

export interface ShareResultButtonProps {
  /** GlobalSearch 결과 row 한 건 — label/subtitle/href 사용. */
  result: SearchResult;
}

type ShareStatus =
  | { state: "idle" }
  | { state: "sharing" }
  | { state: "shared"; method: Extract<ShareMethod, "web_share"> }
  | { state: "copied" }
  | { state: "canceled" }
  | { state: "unsupported"; message?: string };

/**
 * 절대 URL 생성 — `result.href` 는 사이트 내부 경로 (예: "/admin/timeline/abc").
 *   - window.location.origin 가용 시 prefix 적용
 *   - SSR / 비-브라우저 환경 폴백: href 그대로 (text 만 공유될 수도 있음)
 */
function buildAbsoluteUrl(href: string): string {
  if (typeof window === "undefined" || !window.location?.origin) {
    return href;
  }
  // href 가 이미 절대 URL 이면 그대로 (e.g., http(s)://...).
  if (/^https?:\/\//i.test(href)) return href;
  return `${window.location.origin}${href}`;
}

export function ShareResultButton({ result }: ShareResultButtonProps) {
  const [status, setStatus] = useState<ShareStatus>({ state: "idle" });

  const handleShare = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      // 결과 row 자체 클릭 (navigation) 과 분리.
      e.stopPropagation();
      e.preventDefault();

      setStatus({ state: "sharing" });

      const absoluteUrl = buildAbsoluteUrl(result.href);
      const title = result.label;
      const text = result.subtitle
        ? `${result.label} — ${result.subtitle}`
        : result.label;

      const out = await shareOrCopy({
        title,
        text,
        url: absoluteUrl,
        surface: "search_result",
      });

      if (out.method === "web_share" && out.succeeded) {
        setStatus({ state: "shared", method: "web_share" });
        return;
      }
      if (out.method === "web_share" && !out.succeeded) {
        // AbortError (user cancel) — graceful, 토스트 미노출.
        setStatus({ state: "canceled" });
        return;
      }
      if (out.method === "clipboard" && out.succeeded) {
        setStatus({ state: "copied" });
        return;
      }
      setStatus({ state: "unsupported", message: out.message });
    },
    [result.href, result.label, result.subtitle],
  );

  // 키보드 활성화 시에도 row 클릭과 분리되도록 stopPropagation.
  const handleKeyDownStop = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      // 결과 row 의 키보드 핸들러가 input 에서 동작하므로 본 버튼은 단순 stop 만으로 충분.
      e.stopPropagation();
    },
    [],
  );

  const isSharing = status.state === "sharing";
  const ariaLabel = `검색 결과 공유 — ${result.label}`;

  return (
    <span
      data-testid={`share-result-button-wrapper-${result.kind}-${result.id}`}
      className="relative inline-flex items-center"
      // 클릭/포인터 이벤트가 부모 row(button)로 버블링되지 않도록 wrapper 단에서도 차단.
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        data-testid={`share-result-button-${result.kind}-${result.id}`}
        onClick={handleShare}
        onKeyDown={handleKeyDownStop}
        disabled={isSharing}
        aria-label={ariaLabel}
        title="링크 공유 또는 복사"
        className="inline-flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-200 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-wait disabled:opacity-60 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-emerald-300 sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0"
      >
        {isSharing ? (
          <span aria-hidden="true" className="text-xs">…</span>
        ) : (
          <ShareIcon />
        )}
      </button>

      {status.state === "shared" && (
        <span
          data-testid={`share-result-toast-shared-${result.kind}-${result.id}`}
          role="status"
          className="pointer-events-none absolute right-0 top-full mt-1 whitespace-nowrap rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow"
        >
          공유 완료
        </span>
      )}
      {status.state === "copied" && (
        <span
          data-testid={`share-result-toast-copied-${result.kind}-${result.id}`}
          role="status"
          className="pointer-events-none absolute right-0 top-full mt-1 whitespace-nowrap rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow"
        >
          복사됨
        </span>
      )}
      {status.state === "unsupported" && (
        <span
          data-testid={`share-result-toast-unsupported-${result.kind}-${result.id}`}
          role="alert"
          className="pointer-events-none absolute right-0 top-full mt-1 max-w-[220px] whitespace-normal rounded bg-amber-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow"
        >
          {status.message ?? "공유가 지원되지 않아요"}
        </span>
      )}
      {/* canceled 상태는 의도적으로 토스트 미노출 — graceful UX. */}
    </span>
  );
}

/**
 * 단순 인라인 SVG share/link 아이콘 — 외부 의존성 0.
 *   접근성: aria-hidden, 인접 button 의 aria-label 이 의미 전달.
 */
function ShareIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

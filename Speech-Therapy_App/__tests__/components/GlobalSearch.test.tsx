// FR-NAV-SEARCH — GlobalSearch (Client Component) 단위 테스트.
//
// 검증 시나리오 (≥ 4):
//   1. input 변경 → debounce 300ms 후 fetch /api/search 1회 + analytics 이벤트 발송
//   2. 결과 dropdown 그룹 (자녀/반/기관) 노출 + 항목 클릭 시 router.push
//   3. 빈 결과 → "결과 없음" 메시지
//   4. CON-04 — 모든 라벨/메시지에 의료 금칙어 0건
//   5. 짧은 query (1자) → fetch 미호출
//   6. rate limit 429 → 잠시 후 메시지 표시
//   7. 키보드 navigation ↓ + Enter → 결과 이동

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const routerPushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

import { GlobalSearch } from "@/components/search/GlobalSearch";
import { containsBannedTerms } from "@/lib/text-safety";

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetchOnce(body: unknown, status = 200) {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  ) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  routerPushMock.mockReset();
  trackMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = ORIGINAL_FETCH;
  cleanup();
});

// ============================================================================
describe("GlobalSearch — debounce + fetch + analytics", () => {
  it("[1] input 변경 → debounce 300ms 후 fetch + analytics 이벤트 1회", async () => {
    mockFetchOnce({
      results: [
        {
          kind: "child",
          id: "u-1",
          label: "ali***@example.com",
          subtitle: "햇님반",
          href: "/admin/timeline/u-1",
        },
      ],
    });

    render(<GlobalSearch role="admin" />);
    const input = screen.getByTestId("global-search-input");
    fireEvent.change(input, { target: { value: "alice" } });

    // 300ms 직전 — fetch 미호출.
    await act(async () => {
      vi.advanceTimersByTime(299);
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();

    // 300ms 경과 — fetch 1회.
    await act(async () => {
      vi.advanceTimersByTime(2);
    });
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain("/api/search?q=alice");

    // analytics 이벤트 1회.
    await waitFor(() => {
      expect(trackMock).toHaveBeenCalledWith("global_search_executed", {
        queryLength: 5,
        resultCount: 1,
        role: "admin",
      });
    });
  });

  it("[5] 짧은 query (1자) → fetch 미호출", async () => {
    mockFetchOnce({ results: [] });

    render(<GlobalSearch role="admin" />);
    const input = screen.getByTestId("global-search-input");
    fireEvent.change(input, { target: { value: "a" } });

    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// ============================================================================
describe("GlobalSearch — dropdown 결과", () => {
  it("[2] 결과 dropdown 그룹 (자녀/반/기관) + 항목 클릭 시 router.push 이동", async () => {
    mockFetchOnce({
      results: [
        {
          kind: "child",
          id: "u-1",
          label: "ali***@example.com",
          subtitle: "햇님반",
          href: "/admin/timeline/u-1",
        },
        {
          kind: "class",
          id: "c-1",
          label: "햇님반",
          subtitle: "푸른 어린이집",
          href: "/admin/principal#class-c-1",
        },
        {
          kind: "institution",
          id: "i-1",
          label: "푸른 어린이집",
          href: "/admin/principal?institution=i-1",
        },
      ],
    });

    render(<GlobalSearch role="admin" />);
    fireEvent.change(screen.getByTestId("global-search-input"), {
      target: { value: "푸른" },
    });
    await act(async () => {
      vi.advanceTimersByTime(310);
    });

    await waitFor(() => {
      expect(screen.getByTestId("global-search-dropdown")).toBeInTheDocument();
    });

    // 그룹 헤더 3개 노출.
    expect(screen.getByTestId("global-search-group-child")).toBeInTheDocument();
    expect(screen.getByTestId("global-search-group-class")).toBeInTheDocument();
    expect(screen.getByTestId("global-search-group-institution")).toBeInTheDocument();

    // 자녀 결과 클릭 → router.push.
    const childResult = screen.getByTestId("global-search-result-child-u-1");
    fireEvent.click(childResult);
    expect(routerPushMock).toHaveBeenCalledWith("/admin/timeline/u-1");
  });

  it("[3] 빈 결과 → '결과 없음' 메시지", async () => {
    mockFetchOnce({ results: [] });

    render(<GlobalSearch role="principal" />);
    fireEvent.change(screen.getByTestId("global-search-input"), {
      target: { value: "nomatch" },
    });
    await act(async () => {
      vi.advanceTimersByTime(310);
    });

    await waitFor(() => {
      expect(screen.getByTestId("global-search-no-results")).toBeInTheDocument();
    });
    expect(screen.getByTestId("global-search-no-results").textContent).toContain(
      "결과 없음",
    );
  });

  it("[6] 429 rate limit → 안내 메시지", async () => {
    mockFetchOnce({ error: "RATE_LIMITED", retryAfterSec: 1 }, 429);

    render(<GlobalSearch role="teacher" />);
    fireEvent.change(screen.getByTestId("global-search-input"), {
      target: { value: "abuse" },
    });
    await act(async () => {
      vi.advanceTimersByTime(310);
    });

    await waitFor(() => {
      expect(screen.getByTestId("global-search-error")).toBeInTheDocument();
    });
    const errorText = screen.getByTestId("global-search-error").textContent ?? "";
    expect(errorText).toContain("잠시 후");
  });
});

// ============================================================================
describe("GlobalSearch — 키보드 navigation", () => {
  it("[7] ↓ + Enter → 두 번째 결과 이동", async () => {
    mockFetchOnce({
      results: [
        { kind: "child", id: "u-1", label: "a", href: "/admin/timeline/u-1" },
        { kind: "child", id: "u-2", label: "b", href: "/admin/timeline/u-2" },
      ],
    });

    render(<GlobalSearch role="admin" />);
    const input = screen.getByTestId("global-search-input");
    fireEvent.change(input, { target: { value: "ab" } });
    await act(async () => {
      vi.advanceTimersByTime(310);
    });

    await waitFor(() => {
      expect(screen.getByTestId("global-search-dropdown")).toBeInTheDocument();
    });

    // ArrowDown 2번 → activeIdx=1 (두 번째 결과).
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(routerPushMock).toHaveBeenCalledWith("/admin/timeline/u-2");
  });
});

// ============================================================================
describe("GlobalSearch — CON-04 금칙어 0건", () => {
  it("[4] placeholder / 빈 결과 메시지 / 그룹 라벨에 금칙어 0건", async () => {
    mockFetchOnce({ results: [] });

    render(<GlobalSearch role="admin" />);
    const input = screen.getByTestId("global-search-input");
    expect(containsBannedTerms(input.getAttribute("placeholder") ?? "")).toBe(false);
    expect(
      containsBannedTerms(input.getAttribute("aria-label") ?? ""),
    ).toBe(false);

    fireEvent.change(input, { target: { value: "nomatch" } });
    await act(async () => {
      vi.advanceTimersByTime(310);
    });

    await waitFor(() => {
      expect(screen.getByTestId("global-search-no-results")).toBeInTheDocument();
    });
    const dropdown = screen.getByTestId("global-search-dropdown");
    expect(containsBannedTerms(dropdown.textContent ?? "")).toBe(false);
  });
});

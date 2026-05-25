// FR-NAV-SEARCH — GlobalSearch 와 ShareResultButton 통합 검증.
//
// 검증 시나리오 (≥ 2):
//   1. 결과 row 마다 ShareResultButton 노출 (자녀/반/기관 그룹 모두)
//   2. ShareResultButton 클릭 → navigation 발생하지 않음 (router.push 미호출)
//   3. (보너스) row navigation 클릭은 기존대로 router.push (회귀 0)
//
// 회귀 보호: __tests__/components/GlobalSearch.test.tsx (기존 7건) 와 별도 — 본 파일은 share 액션
// 통합 행동만 책임. 기존 debounce / dropdown / 키보드 nav 회귀는 그쪽이 책임.

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

const shareMock = vi.fn();
vi.mock("@/lib/share", () => ({
  shareOrCopy: (...args: unknown[]) => shareMock(...args),
}));

import { GlobalSearch } from "@/components/search/GlobalSearch";

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetchOnce(body: unknown, status = 200) {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  ) as unknown as typeof fetch;
}

const SAMPLE_RESULTS = {
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
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  routerPushMock.mockReset();
  trackMock.mockReset();
  shareMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = ORIGINAL_FETCH;
  cleanup();
});

// ============================================================================
describe("GlobalSearch + ShareResultButton 통합", () => {
  it("[1] 각 결과 row (자녀/반/기관) 마다 ShareResultButton 노출", async () => {
    mockFetchOnce(SAMPLE_RESULTS);

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

    expect(
      screen.getByTestId("share-result-button-child-u-1"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("share-result-button-class-c-1"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("share-result-button-institution-i-1"),
    ).toBeInTheDocument();
  });

  it("[2] ShareResultButton 클릭 → shareOrCopy 호출 + navigation(router.push) 미발생", async () => {
    mockFetchOnce(SAMPLE_RESULTS);
    shareMock.mockResolvedValueOnce({ method: "clipboard", succeeded: true });

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

    // share 버튼 클릭.
    fireEvent.click(screen.getByTestId("share-result-button-child-u-1"));

    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    const [arg] = shareMock.mock.calls[0] as [
      { surface: string; title: string; url: string },
    ];
    expect(arg.surface).toBe("search_result");
    expect(arg.url.endsWith("/admin/timeline/u-1")).toBe(true);

    // 결과 row navigation 은 발생하지 않아야 함 (stopPropagation).
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("[3] (회귀 0) row navigation 영역 클릭은 기존대로 router.push 호출", async () => {
    mockFetchOnce(SAMPLE_RESULTS);

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

    // 결과 row 의 navigation 영역 (separate button) 클릭.
    fireEvent.click(screen.getByTestId("global-search-result-child-u-1"));

    expect(routerPushMock).toHaveBeenCalledWith("/admin/timeline/u-1");
    expect(shareMock).not.toHaveBeenCalled();
  });
});

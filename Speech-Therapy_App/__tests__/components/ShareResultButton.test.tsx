// FR-NAV-SEARCH — ShareResultButton 단위 테스트.
//
// 검증 시나리오 (≥ 4):
//   1. 클릭 → shareOrCopy 호출 (surface='search_result' + 절대 URL + label/subtitle 기반 text)
//   2. Web Share 성공 → "공유 완료" 토스트
//   3. clipboard 폴백 → "복사됨" 토스트
//   4. unsupported → alert 토스트 (helper 메시지 fallback 포함)
//   5. AbortError(web_share succeeded=false) → 토스트 미노출 (graceful)
//   6. e.stopPropagation — 결과 row(navigation) 와 분리 (parent onClick 미호출)
//   7. accessibility — aria-label="검색 결과 공유 — XXX" + 키보드 활성(button focus)
//   8. CON-04 — 모든 분기 카피에 의료 금칙어 0건
//
// 회귀 0: 본 컴포넌트는 신규 — 기존 회귀 대상은 GlobalSearch 자체 test 가 별도 검증.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const shareMock = vi.fn();
vi.mock("@/lib/share", () => ({
  shareOrCopy: (...args: unknown[]) => shareMock(...args),
}));

import { ShareResultButton } from "@/components/search/ShareResultButton";
import type { SearchResult } from "@/lib/search/global";
import { containsBannedTerms } from "@/lib/text-safety";

const SAMPLE_RESULT: SearchResult = {
  kind: "child",
  id: "u-1",
  label: "ali***@example.com",
  subtitle: "햇님반 · 푸른 어린이집",
  href: "/admin/timeline/u-1",
};

beforeEach(() => {
  shareMock.mockReset();
});

// ============================================================================
describe("ShareResultButton — shareOrCopy 호출 + 분기 토스트", () => {
  it("[1] 클릭 → shareOrCopy 호출 (surface=search_result, 절대 URL prefix, title/text)", async () => {
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: true });

    render(<ShareResultButton result={SAMPLE_RESULT} />);
    fireEvent.click(
      screen.getByTestId("share-result-button-child-u-1"),
    );

    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    const [arg] = shareMock.mock.calls[0] as [
      { title: string; text: string; url: string; surface: string },
    ];
    expect(arg.surface).toBe("search_result");
    expect(arg.title).toBe("ali***@example.com");
    expect(arg.text).toContain("ali***@example.com");
    expect(arg.text).toContain("햇님반");
    // happy-dom location.origin 이 있으면 절대 URL prefix, 아니면 href 그대로.
    expect(typeof arg.url).toBe("string");
    expect(arg.url.endsWith("/admin/timeline/u-1")).toBe(true);
  });

  it("[1-b] subtitle 부재 시 text 는 label 만 사용", async () => {
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: true });

    const noSubtitle: SearchResult = {
      kind: "institution",
      id: "i-9",
      label: "푸른 어린이집",
      href: "/admin/principal?institution=i-9",
    };
    render(<ShareResultButton result={noSubtitle} />);
    fireEvent.click(screen.getByTestId("share-result-button-institution-i-9"));

    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    const [arg] = shareMock.mock.calls[0] as [{ text: string; title: string }];
    expect(arg.title).toBe("푸른 어린이집");
    expect(arg.text).toBe("푸른 어린이집");
    expect(arg.text).not.toContain("—");
  });

  it("[2] Web Share 성공 → '공유 완료' 토스트", async () => {
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: true });

    render(<ShareResultButton result={SAMPLE_RESULT} />);
    fireEvent.click(screen.getByTestId("share-result-button-child-u-1"));

    await waitFor(() => {
      expect(
        screen.getByTestId("share-result-toast-shared-child-u-1"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId("share-result-toast-shared-child-u-1").textContent,
    ).toContain("공유 완료");
  });

  it("[3] clipboard 폴백 → '복사됨' 토스트", async () => {
    shareMock.mockResolvedValueOnce({
      method: "clipboard",
      succeeded: true,
      message: "링크를 복사했어요.",
    });

    render(<ShareResultButton result={SAMPLE_RESULT} />);
    fireEvent.click(screen.getByTestId("share-result-button-child-u-1"));

    await waitFor(() => {
      expect(
        screen.getByTestId("share-result-toast-copied-child-u-1"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId("share-result-toast-copied-child-u-1").textContent,
    ).toContain("복사됨");
    expect(
      screen.queryByTestId("share-result-toast-shared-child-u-1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("share-result-toast-unsupported-child-u-1"),
    ).not.toBeInTheDocument();
  });

  it("[4] unsupported → alert 토스트 (message 전달 우선, 미전달 시 fallback)", async () => {
    shareMock.mockResolvedValueOnce({
      method: "unsupported",
      succeeded: false,
      message: "이 기기에서는 자동 공유가 지원되지 않아요.",
    });

    render(<ShareResultButton result={SAMPLE_RESULT} />);
    fireEvent.click(screen.getByTestId("share-result-button-child-u-1"));

    await waitFor(() => {
      expect(
        screen.getByTestId("share-result-toast-unsupported-child-u-1"),
      ).toBeInTheDocument();
    });
    const toast = screen.getByTestId(
      "share-result-toast-unsupported-child-u-1",
    );
    expect(toast.getAttribute("role")).toBe("alert");
    expect(toast.textContent).toContain("자동 공유");
  });

  it("[5] AbortError (web_share succeeded=false) → 토스트 미노출 (graceful)", async () => {
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: false });

    render(<ShareResultButton result={SAMPLE_RESULT} />);
    fireEvent.click(screen.getByTestId("share-result-button-child-u-1"));

    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByTestId("share-result-toast-shared-child-u-1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("share-result-toast-copied-child-u-1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("share-result-toast-unsupported-child-u-1"),
    ).not.toBeInTheDocument();
  });
});

// ============================================================================
describe("ShareResultButton — e.stopPropagation (결과 row navigation 분리)", () => {
  it("[6] 버튼 클릭 시 부모 onClick (row navigation) 미호출", async () => {
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: true });
    const parentClick = vi.fn();

    render(
      <div data-testid="parent-row" onClick={parentClick}>
        <ShareResultButton result={SAMPLE_RESULT} />
      </div>,
    );

    fireEvent.click(screen.getByTestId("share-result-button-child-u-1"));

    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("[6-b] wrapper 단의 click 도 stopPropagation — 빈 클릭에도 부모 미호출", () => {
    const parentClick = vi.fn();

    render(
      <div data-testid="parent-row" onClick={parentClick}>
        <ShareResultButton result={SAMPLE_RESULT} />
      </div>,
    );

    fireEvent.click(
      screen.getByTestId("share-result-button-wrapper-child-u-1"),
    );

    expect(parentClick).not.toHaveBeenCalled();
  });
});

// ============================================================================
describe("ShareResultButton — accessibility", () => {
  it("[7] aria-label='검색 결과 공유 — <label>' + title 속성 + 키보드 focus", () => {
    render(<ShareResultButton result={SAMPLE_RESULT} />);
    const btn = screen.getByTestId("share-result-button-child-u-1");
    expect(btn.getAttribute("aria-label")).toBe(
      "검색 결과 공유 — ali***@example.com",
    );
    expect(btn.getAttribute("title")).toContain("공유");
    // type=button — submit 회피.
    expect(btn.getAttribute("type")).toBe("button");
  });

  it("[7-b] 모바일 터치 영역 — min-h-[44px] / min-w-[44px] 클래스 포함", () => {
    render(<ShareResultButton result={SAMPLE_RESULT} />);
    const btn = screen.getByTestId("share-result-button-child-u-1");
    expect(btn.className).toContain("min-h-[44px]");
    expect(btn.className).toContain("min-w-[44px]");
  });
});

// ============================================================================
describe("ShareResultButton — CON-04 금칙어 0건", () => {
  it("[8] 정상 / clipboard / unsupported 모든 분기 카피에 금칙어 0건", async () => {
    // (a) web_share
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: true });
    const { container: c1, unmount: u1 } = render(
      <ShareResultButton result={SAMPLE_RESULT} />,
    );
    fireEvent.click(
      c1.querySelector("[data-testid='share-result-button-child-u-1']")!,
    );
    await waitFor(() =>
      expect(
        c1.querySelector("[data-testid='share-result-toast-shared-child-u-1']"),
      ).not.toBeNull(),
    );
    expect(containsBannedTerms(c1.textContent ?? "")).toBe(false);
    u1();

    // (b) clipboard
    shareMock.mockResolvedValueOnce({ method: "clipboard", succeeded: true });
    const { container: c2, unmount: u2 } = render(
      <ShareResultButton result={SAMPLE_RESULT} />,
    );
    fireEvent.click(
      c2.querySelector("[data-testid='share-result-button-child-u-1']")!,
    );
    await waitFor(() =>
      expect(
        c2.querySelector("[data-testid='share-result-toast-copied-child-u-1']"),
      ).not.toBeNull(),
    );
    expect(containsBannedTerms(c2.textContent ?? "")).toBe(false);
    u2();

    // (c) unsupported (fallback message — undefined)
    shareMock.mockResolvedValueOnce({
      method: "unsupported",
      succeeded: false,
    });
    const { container: c3 } = render(
      <ShareResultButton result={SAMPLE_RESULT} />,
    );
    fireEvent.click(
      c3.querySelector("[data-testid='share-result-button-child-u-1']")!,
    );
    await waitFor(() =>
      expect(
        c3.querySelector(
          "[data-testid='share-result-toast-unsupported-child-u-1']",
        ),
      ).not.toBeNull(),
    );
    expect(containsBannedTerms(c3.textContent ?? "")).toBe(false);
  });
});

// FR-C-012 (#35 Replace 67-D1) — RewardShareButton 단위 테스트.
//
// 검증 시나리오:
//   1. 정상 클릭 → shareOrCopy 호출 (title/text/url/surface=reward + 집계 카운트만)
//   2. Web Share 성공 → "친구에게 자랑해 봐요!" 토스트 노출
//   3. clipboard 폴백 → "주소를 복사했어요" 토스트 노출
//   4. unsupported → 안내 메시지 노출 (alert role)
//   5. AbortError (user cancel) → 토스트 미노출 (graceful)
//   6. CON-04 금칙어 0건 검증 — 정상/사용자취소/미지원 분기 모두
//   7. R4 — shareText 에 userId / 자녀 식별 정보 노출 0건
//   8. (page.tsx 통합) 빈 상태 (모두 0) → share 버튼 자체 미노출
//   9. (page.tsx 통합) 보상 보유 (stars>0) → share 버튼 노출 + 기존 RewardCardGrid 보존
//
// mock 패턴 — CushionNoteGenerator.test.tsx 와 동일.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const shareMock = vi.fn();
vi.mock("@/lib/share", () => ({
  shareOrCopy: (...args: unknown[]) => shareMock(...args),
}));

// trackEvent 는 본 컴포넌트 자체는 호출하지 않지만 (shareOrCopy 가 단일 책임),
// page.tsx 통합 시 RewardCollectionViewedBeacon 가 effect 안에서 호출하므로 mock 필요.
vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: (...a: unknown[]) => getUserMock(...a) },
  }),
}));

const cookieGetMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => cookieGetMock(name) }),
}));

const loadCollectionMock = vi.fn();
vi.mock("@/lib/rewards/aggregator", () => ({
  loadRewardCollection: (...a: unknown[]) => loadCollectionMock(...a),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { RewardShareButton } from "@/components/rewards/RewardShareButton";
import RewardCollectionPage from "@/app/(public)/rewards/collection/page";

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function assertNoMedicalTerms(text: string) {
  for (const word of FORBIDDEN_MEDICAL_WORDS) {
    expect(text).not.toContain(word);
  }
}

beforeEach(() => {
  shareMock.mockReset();
  getUserMock.mockReset();
  cookieGetMock.mockReset();
  loadCollectionMock.mockReset();
});

// ============================================================================
// 단위 — RewardShareButton 자체
// ============================================================================
describe("RewardShareButton — 자녀 친화 공유 버튼 (FR-C-012)", () => {
  it("[1] 정상 클릭 → shareOrCopy 가 surface=reward + 집계 카운트만 포함한 텍스트로 호출", async () => {
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: true });

    render(<RewardShareButton stars={7} trees={3} aiArtsCount={2} />);
    fireEvent.click(screen.getByTestId("reward-share-button"));

    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    const [arg] = shareMock.mock.calls[0] as [
      { title: string; text: string; url: string; surface: string },
    ];
    expect(arg.surface).toBe("reward");
    expect(arg.title).toBe("내 보상 도감");
    // 집계 카운트만 — 자녀 식별 정보 0.
    expect(arg.text).toContain("별 7개");
    expect(arg.text).toContain("나무 3그루");
    expect(arg.text).toContain("그림 2개");
    // url 은 happy-dom location.href 폴백.
    expect(typeof arg.url).toBe("string");
  });

  it("[1-b] aiArtsCount=0 일 때 그림 카피 미포함 (자녀 친화 카피 단순화)", async () => {
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: true });

    render(<RewardShareButton stars={5} trees={1} aiArtsCount={0} />);
    fireEvent.click(screen.getByTestId("reward-share-button"));

    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    const [arg] = shareMock.mock.calls[0] as [{ text: string }];
    expect(arg.text).toContain("별 5개");
    expect(arg.text).toContain("나무 1그루");
    expect(arg.text).not.toContain("그림");
  });

  it("[2] Web Share 성공 → '친구에게 자랑해 봐요!' 토스트 노출", async () => {
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: true });

    render(<RewardShareButton stars={2} trees={1} aiArtsCount={0} />);
    fireEvent.click(screen.getByTestId("reward-share-button"));

    await waitFor(() => {
      expect(screen.getByTestId("reward-share-toast-shared")).toBeInTheDocument();
    });
    expect(screen.getByTestId("reward-share-toast-shared").textContent).toContain(
      "친구에게 자랑해 봐요",
    );
  });

  it("[3] clipboard 폴백 → '주소를 복사했어요' 토스트 노출", async () => {
    shareMock.mockResolvedValueOnce({
      method: "clipboard",
      succeeded: true,
      message: "링크를 복사했어요.",
    });

    render(<RewardShareButton stars={2} trees={1} aiArtsCount={0} />);
    fireEvent.click(screen.getByTestId("reward-share-button"));

    await waitFor(() => {
      expect(screen.getByTestId("reward-share-toast-copied")).toBeInTheDocument();
    });
    expect(screen.getByTestId("reward-share-toast-copied").textContent).toContain(
      "복사",
    );
    // 다른 분기 토스트는 미노출.
    expect(screen.queryByTestId("reward-share-toast-shared")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reward-share-toast-unsupported")).not.toBeInTheDocument();
  });

  it("[4] unsupported → alert role + helper message 노출", async () => {
    shareMock.mockResolvedValueOnce({
      method: "unsupported",
      succeeded: false,
      message: "이 기기에서는 자동 공유가 지원되지 않아요.",
    });

    render(<RewardShareButton stars={3} trees={2} aiArtsCount={1} />);
    fireEvent.click(screen.getByTestId("reward-share-button"));

    await waitFor(() => {
      expect(screen.getByTestId("reward-share-toast-unsupported")).toBeInTheDocument();
    });
    const toast = screen.getByTestId("reward-share-toast-unsupported");
    expect(toast.getAttribute("role")).toBe("alert");
    expect(toast.textContent).toContain("자동 공유");
  });

  it("[5] AbortError (web_share succeeded=false) → 토스트 미노출 (graceful)", async () => {
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: false });

    render(<RewardShareButton stars={1} trees={1} aiArtsCount={0} />);
    fireEvent.click(screen.getByTestId("reward-share-button"));

    // shareOrCopy 가 resolve 한 뒤에도 토스트가 나타나지 않아야 함.
    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("reward-share-toast-shared")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reward-share-toast-copied")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reward-share-toast-unsupported")).not.toBeInTheDocument();
  });

  it("[6] CON-04 — 정상/취소/미지원 모든 분기 카피에서 금칙어 0건", async () => {
    // (a) 정상 web_share
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: true });
    const { container: c1, unmount: u1 } = render(
      <RewardShareButton stars={3} trees={3} aiArtsCount={1} />,
    );
    fireEvent.click(c1.querySelector("[data-testid='reward-share-button']")!);
    await waitFor(() =>
      expect(c1.querySelector("[data-testid='reward-share-toast-shared']")).not.toBeNull(),
    );
    assertNoMedicalTerms(c1.textContent ?? "");
    u1();

    // (b) clipboard
    shareMock.mockResolvedValueOnce({ method: "clipboard", succeeded: true });
    const { container: c2, unmount: u2 } = render(
      <RewardShareButton stars={3} trees={3} aiArtsCount={1} />,
    );
    fireEvent.click(c2.querySelector("[data-testid='reward-share-button']")!);
    await waitFor(() =>
      expect(c2.querySelector("[data-testid='reward-share-toast-copied']")).not.toBeNull(),
    );
    assertNoMedicalTerms(c2.textContent ?? "");
    u2();

    // (c) unsupported — fallback 카피 (message 미전달)
    shareMock.mockResolvedValueOnce({ method: "unsupported", succeeded: false });
    const { container: c3, unmount: u3 } = render(
      <RewardShareButton stars={3} trees={3} aiArtsCount={1} />,
    );
    fireEvent.click(c3.querySelector("[data-testid='reward-share-button']")!);
    await waitFor(() =>
      expect(c3.querySelector("[data-testid='reward-share-toast-unsupported']")).not.toBeNull(),
    );
    assertNoMedicalTerms(c3.textContent ?? "");
    u3();

    // (d) cancel — 토스트 없음, 버튼 라벨만
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: false });
    const { container: c4 } = render(
      <RewardShareButton stars={3} trees={3} aiArtsCount={1} />,
    );
    fireEvent.click(c4.querySelector("[data-testid='reward-share-button']")!);
    await waitFor(() => expect(shareMock).toHaveBeenLastCalledWith(expect.any(Object)));
    assertNoMedicalTerms(c4.textContent ?? "");
  });

  it("[7] R4 — shareText 에 userId 모양 (UUID) / 이메일 / 이름 미포함", async () => {
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: true });
    render(<RewardShareButton stars={4} trees={2} aiArtsCount={1} />);
    fireEvent.click(screen.getByTestId("reward-share-button"));
    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    const [arg] = shareMock.mock.calls[0] as [{ text: string; title: string }];
    expect(arg.text).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    expect(arg.text).not.toContain("@");
    expect(arg.title).not.toContain("@");
  });

  it("[7-b] 버튼 자녀 친화 — aria-label 명시 + tap target ≥ 44px", () => {
    render(<RewardShareButton stars={1} trees={1} aiArtsCount={0} />);
    const btn = screen.getByTestId("reward-share-button");
    expect(btn.getAttribute("aria-label")).toBe("내 보상 공유하기");
    expect(btn.className).toContain("min-h-[56px]");
    expect(btn.className).toContain("text-xl");
  });
});

// ============================================================================
// 통합 — /rewards/collection 빈 상태 / 보유 상태에서 share 버튼 노출 분기
// ============================================================================
describe("/rewards/collection 통합 — share 버튼 빈 상태 처리 (FR-C-012)", () => {
  const USER_AUTH = "11111111-1111-4111-8111-111111111111";

  function setAuthUser(id: string) {
    getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
  }

  it("[8] 빈 상태 (모두 0) → share 버튼 자체 미노출 (공유할 게 없음)", async () => {
    setAuthUser(USER_AUTH);
    loadCollectionMock.mockResolvedValueOnce({
      stars: 0,
      trees: 0,
      aiArtsCount: 0,
      aiArts: [],
    });

    const ui = await RewardCollectionPage();
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='reward-share-button']")).toBeNull();
    // 회귀 0 — 빈 상태는 기존 RewardCardGrid empty UI 가 그대로 노출되어야 함.
    expect(container.querySelector("[data-testid='reward-collection-empty']")).not.toBeNull();
  });

  it("[9] 보상 보유 (stars>0) → share 버튼 노출 + 기존 RewardCardGrid 회귀 0", async () => {
    setAuthUser(USER_AUTH);
    loadCollectionMock.mockResolvedValueOnce({
      stars: 9,
      trees: 4,
      aiArtsCount: 0,
      aiArts: [],
    });

    const ui = await RewardCollectionPage();
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='reward-share-button']")).not.toBeNull();
    expect(container.querySelector("[data-testid='reward-share-button-section']"))
      .not.toBeNull();
    // 기존 RewardCardGrid + mission CTA + viewed beacon 보존 검증.
    expect(container.querySelector("[data-testid='reward-card-grid']")).not.toBeNull();
    expect(
      container.querySelector("[data-testid='reward-card-star-count']")?.textContent,
    ).toBe("9");
    expect(
      container.querySelector("[data-testid='reward-collection-mission-link']"),
    ).not.toBeNull();
  });
});

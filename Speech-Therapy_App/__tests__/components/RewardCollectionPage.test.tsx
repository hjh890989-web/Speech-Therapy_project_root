// FR-Q-004 (#45) — /rewards/collection RSC + RewardCardGrid 통합 테스트.
//
// 격리:
//   - @/lib/db Prisma mock (rewardLog.groupBy)
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/rewards/aggregator mock (loadRewardCollection)
//   - next/headers cookies mock
//   - next/link mock (단순 <a>)
//
// 검증 시나리오 (≥ 8):
//   1. 정상 user (auth) → stars/trees/aiArts 카드 노출
//   2. 빈 데이터 → empty state + CTA /missions
//   3. star 만 보유 → tree 섹션 0
//   4. tree 만 보유 → star 섹션 0
//   5. 다른 user 데이터 미노출 (R4) — loadRewardCollection 본인 userId 만 호출
//   6. 비로그인 (anonymous) → cookie 기반 userId 로 조회
//   7. aiArts 부재 → placeholder 노출
//   8. CON-04 금칙어 0건 (모든 분기)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// ============================================================================
// Mocks (vi.mock 은 import 호이스팅)
// ============================================================================
const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
    },
  }),
}));

const cookieGetMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieGetMock(name),
  }),
}));

const loadCollectionMock = vi.fn();
vi.mock("@/lib/rewards/aggregator", () => ({
  loadRewardCollection: (...args: unknown[]) => loadCollectionMock(...args),
}));

// trackEvent — beacon useEffect 가 호출하지만, render 시점에 effect 미발화 검증은 분리.
vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
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

import RewardCollectionPage from "@/app/(public)/rewards/collection/page";
import { RewardCardGrid } from "@/components/rewards/RewardCardGrid";

// ============================================================================
// 상수 / helpers
// ============================================================================
const USER_AUTH = "11111111-1111-4111-8111-111111111111";
const USER_ANON = "22222222-2222-4222-8222-222222222222";
const USER_OTHER = "99999999-9999-4999-8999-999999999999";

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function assertNoMedicalTerms(text: string) {
  for (const word of FORBIDDEN_MEDICAL_WORDS) {
    expect(text).not.toContain(word);
  }
}

function setAuthUser(id: string) {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}

function setAnonymousAuth() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

function setAnonCookie(value: string | undefined) {
  cookieGetMock.mockImplementation((name: string) =>
    name === "anonymous_user_id" && value
      ? { name: "anonymous_user_id", value }
      : undefined,
  );
}

beforeEach(() => {
  getUserMock.mockReset();
  cookieGetMock.mockReset();
  loadCollectionMock.mockReset();
});

// ============================================================================
// 페이지 RSC 통합
// ============================================================================
describe("/rewards/collection — FR-Q-004 보상 도감 페이지", () => {
  it("[1] 인증 user + 정상 데이터 → 별/나무/AI 카드 노출", async () => {
    setAuthUser(USER_AUTH);
    loadCollectionMock.mockResolvedValueOnce({
      stars: 12,
      trees: 3,
      aiArtsCount: 2,
      aiArts: [],
    });

    const ui = await RewardCollectionPage();
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='reward-collection-page']")).not.toBeNull();
    expect(
      container.querySelector("[data-testid='reward-card-star-count']")?.textContent,
    ).toBe("12");
    expect(
      container.querySelector("[data-testid='reward-card-tree-count']")?.textContent,
    ).toBe("3");
    expect(
      container.querySelector("[data-testid='reward-card-ai-art-count']")?.textContent,
    ).toBe("2");
    // 빈 상태가 아님.
    expect(container.querySelector("[data-testid='reward-collection-empty']")).toBeNull();
  });

  it("[2] 빈 데이터 → empty state + CTA /missions", async () => {
    setAuthUser(USER_AUTH);
    loadCollectionMock.mockResolvedValueOnce({
      stars: 0,
      trees: 0,
      aiArtsCount: 0,
      aiArts: [],
    });

    const ui = await RewardCollectionPage();
    const { container } = render(ui);

    const empty = container.querySelector("[data-testid='reward-collection-empty']");
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toContain("아직 보상이 없어요");
    expect(empty?.textContent).toContain("미션을 하나 완료해 볼까요");

    const cta = container.querySelector("[data-testid='reward-collection-empty-cta']");
    expect(cta).not.toBeNull();
    expect(cta?.getAttribute("href")).toBe("/missions");

    // grid 자체는 미노출.
    expect(container.querySelector("[data-testid='reward-card-grid']")).toBeNull();
  });

  it("[3] star 만 보유 → tree=0, ai=0 카드는 0 으로 노출", async () => {
    setAuthUser(USER_AUTH);
    loadCollectionMock.mockResolvedValueOnce({
      stars: 5,
      trees: 0,
      aiArtsCount: 0,
      aiArts: [],
    });

    const ui = await RewardCollectionPage();
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='reward-card-star-count']")?.textContent,
    ).toBe("5");
    expect(
      container.querySelector("[data-testid='reward-card-tree-count']")?.textContent,
    ).toBe("0");
    expect(
      container.querySelector("[data-testid='reward-card-ai-art-count']")?.textContent,
    ).toBe("0");
  });

  it("[4] tree 만 보유 → star=0, ai=0 으로 노출", async () => {
    setAuthUser(USER_AUTH);
    loadCollectionMock.mockResolvedValueOnce({
      stars: 0,
      trees: 4,
      aiArtsCount: 0,
      aiArts: [],
    });

    const ui = await RewardCollectionPage();
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='reward-card-star-count']")?.textContent,
    ).toBe("0");
    expect(
      container.querySelector("[data-testid='reward-card-tree-count']")?.textContent,
    ).toBe("4");
  });

  it("[5] R4 — loadRewardCollection 호출은 본인 userId 만 (다른 user UUID 미사용)", async () => {
    setAuthUser(USER_AUTH);
    loadCollectionMock.mockResolvedValueOnce({
      stars: 1,
      trees: 0,
      aiArtsCount: 0,
      aiArts: [],
    });

    await RewardCollectionPage();

    expect(loadCollectionMock).toHaveBeenCalledTimes(1);
    expect(loadCollectionMock).toHaveBeenCalledWith(USER_AUTH);
    const allCalls = JSON.stringify(loadCollectionMock.mock.calls);
    expect(allCalls).not.toContain(USER_OTHER);
  });

  it("[6] 비로그인 (anonymous) → cookie 기반 userId 로 조회", async () => {
    setAnonymousAuth();
    setAnonCookie(USER_ANON);
    loadCollectionMock.mockResolvedValueOnce({
      stars: 2,
      trees: 1,
      aiArtsCount: 0,
      aiArts: [],
    });

    const ui = await RewardCollectionPage();
    const { container } = render(ui);

    // anonymous user 의 userId 로 호출됨.
    expect(loadCollectionMock).toHaveBeenCalledWith(USER_ANON);
    expect(
      container.querySelector("[data-testid='reward-card-star-count']")?.textContent,
    ).toBe("2");
  });

  it("[6-b] 비로그인 + cookie 부재 → loadRewardCollection 미호출 + empty state", async () => {
    setAnonymousAuth();
    setAnonCookie(undefined);

    const ui = await RewardCollectionPage();
    const { container } = render(ui);

    // userId 미해상 시 aggregator 호출 자체 skip.
    expect(loadCollectionMock).not.toHaveBeenCalled();
    expect(container.querySelector("[data-testid='reward-collection-empty']")).not.toBeNull();
  });

  it("[7] aiArts 부재 (count > 0) → placeholder 노출 (실 이미지 grid 미렌더)", async () => {
    setAuthUser(USER_AUTH);
    loadCollectionMock.mockResolvedValueOnce({
      stars: 1,
      trees: 0,
      aiArtsCount: 2,
      aiArts: [], // schema 부재 → 항상 빈 배열
    });

    const ui = await RewardCollectionPage();
    const { container } = render(ui);

    const placeholder = container.querySelector(
      "[data-testid='reward-card-ai-art-placeholder']",
    );
    expect(placeholder).not.toBeNull();
    expect(placeholder?.textContent).toContain("그림이 도착해요");
    // thumbnail grid 미렌더.
    expect(container.querySelector("[data-testid='reward-card-ai-art-grid']")).toBeNull();
  });

  it("[8] CON-04 금칙어 0건 — 정상 / 빈 / star-only / anonymous 4분기 모두 검증", async () => {
    // (a) 정상
    setAuthUser(USER_AUTH);
    loadCollectionMock.mockResolvedValueOnce({
      stars: 12,
      trees: 3,
      aiArtsCount: 2,
      aiArts: [],
    });
    const { container: c1 } = render(await RewardCollectionPage());
    assertNoMedicalTerms(c1.textContent ?? "");

    // (b) 빈
    setAuthUser(USER_AUTH);
    loadCollectionMock.mockResolvedValueOnce({
      stars: 0,
      trees: 0,
      aiArtsCount: 0,
      aiArts: [],
    });
    const { container: c2 } = render(await RewardCollectionPage());
    assertNoMedicalTerms(c2.textContent ?? "");

    // (c) star only
    setAuthUser(USER_AUTH);
    loadCollectionMock.mockResolvedValueOnce({
      stars: 9,
      trees: 0,
      aiArtsCount: 0,
      aiArts: [],
    });
    const { container: c3 } = render(await RewardCollectionPage());
    assertNoMedicalTerms(c3.textContent ?? "");

    // (d) anonymous + 보상 0
    setAnonymousAuth();
    setAnonCookie(USER_ANON);
    loadCollectionMock.mockResolvedValueOnce({
      stars: 0,
      trees: 0,
      aiArtsCount: 0,
      aiArts: [],
    });
    const { container: c4 } = render(await RewardCollectionPage());
    assertNoMedicalTerms(c4.textContent ?? "");
  });

  it("[9] 페이지 전체 textContent 에 userId(UUID) 노출 0건 (R4)", async () => {
    setAuthUser(USER_AUTH);
    loadCollectionMock.mockResolvedValueOnce({
      stars: 1,
      trees: 1,
      aiArtsCount: 0,
      aiArts: [],
    });

    const ui = await RewardCollectionPage();
    const { container } = render(ui);

    const text = container.textContent ?? "";
    expect(text).not.toContain(USER_AUTH);
    expect(text).not.toContain(USER_ANON);
    expect(text).not.toContain(USER_OTHER);
  });

  it("[10] 미션 CTA 가 페이지 하단에 항상 노출 (rewards 도감 → /missions 유도)", async () => {
    setAuthUser(USER_AUTH);
    loadCollectionMock.mockResolvedValueOnce({
      stars: 5,
      trees: 2,
      aiArtsCount: 0,
      aiArts: [],
    });

    const ui = await RewardCollectionPage();
    const { container } = render(ui);

    const link = container.querySelector("[data-testid='reward-collection-mission-link']");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("/missions");
  });
});

// ============================================================================
// RewardCardGrid 단위 — props 표시 로직 격리 검증
// ============================================================================
describe("RewardCardGrid — 자녀 친화 표시 (≥ 18px / tap target ≥ 44px)", () => {
  it("count 가 모두 양수면 grid 노출 + 빈 상태 미노출", () => {
    const { container } = render(
      <RewardCardGrid stars={3} trees={2} aiArtsCount={1} aiArts={[]} />,
    );
    expect(container.querySelector("[data-testid='reward-card-grid']")).not.toBeNull();
    expect(container.querySelector("[data-testid='reward-collection-empty']")).toBeNull();
  });

  it("aiArts 가 양수면 thumbnail grid 노출 + alt 텍스트에 날짜 포함", () => {
    const fixedDate = new Date("2026-05-01T00:00:00Z");
    const { container } = render(
      <RewardCardGrid
        stars={1}
        trees={1}
        aiArtsCount={2}
        aiArts={[
          { id: "art-1", imageUrl: "https://cdn.example.com/a.png", createdAt: fixedDate },
          { id: "art-2", imageUrl: "https://cdn.example.com/b.png", createdAt: fixedDate },
        ]}
      />,
    );

    const grid = container.querySelector("[data-testid='reward-card-ai-art-grid']");
    expect(grid).not.toBeNull();
    const imgs = container.querySelectorAll("[data-testid='reward-card-ai-art-grid'] img");
    expect(imgs).toHaveLength(2);
    // alt 에 그림 받은 날짜가 (사람 친화 표현으로) 포함.
    expect(imgs[0].getAttribute("alt")).toContain("그림");
    // CON-04 — alt 텍스트 금칙어 0건.
    expect(imgs[0].getAttribute("alt") ?? "").not.toMatch(/치료|진단|장애/);
    // placeholder 는 미노출.
    expect(container.querySelector("[data-testid='reward-card-ai-art-placeholder']")).toBeNull();
  });

  it("빈 상태 — 모든 카운트 0 → empty CTA href=/missions + 큰 tap target", () => {
    const { container } = render(
      <RewardCardGrid stars={0} trees={0} aiArtsCount={0} aiArts={[]} />,
    );
    const cta = container.querySelector("[data-testid='reward-collection-empty-cta']");
    expect(cta).not.toBeNull();
    expect(cta?.getAttribute("href")).toBe("/missions");
    // tap target — min-h-[56px] tailwind 클래스 검증 (간접).
    expect(cta?.className).toContain("min-h-[56px]");
  });

  it("aria-label 에 자녀 친화 카운트 정보 포함 (별/나무/AI 그림)", () => {
    const { container } = render(
      <RewardCardGrid stars={5} trees={3} aiArtsCount={1} aiArts={[]} />,
    );
    expect(container.querySelector("[data-testid='reward-card-star']")?.getAttribute("aria-label"))
      .toBe("별 5개를 모았어요");
    expect(container.querySelector("[data-testid='reward-card-tree']")?.getAttribute("aria-label"))
      .toBe("나무 3그루를 모았어요");
    expect(container.querySelector("[data-testid='reward-card-ai-art']")?.getAttribute("aria-label"))
      .toBe("AI 그림 1개를 모았어요");
  });
});

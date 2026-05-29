// FR-C-003 — /missions (목록) Server Component 통합 테스트.
//
// DB 쿼리 전환(fixtures → getMissionCards) 후 렌더 회귀 가드.
// anonymous 경로(supabase throw + cookie 없음 → userId undefined → fallback 추천,
// prisma 미호출)로 단순화. 콘텐츠 컴포넌트는 실제 렌더(MissionRunner 만 mock).

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => {
    throw new Error("no supabase env");
  },
}));

// prisma 직접 호출은 anonymous 경로라 미발생하나, import 해소를 위해 stub.
vi.mock("@/lib/db", () => ({
  prisma: { sessionLog: { findMany: vi.fn(async () => []) } },
}));

// FR-C-003 — 카드는 card-repo 에서 조회. DB 없이 fixtures(30개)로 응답.
vi.mock("@/lib/missions/card-repo", async () => {
  const { dailyMissionFixtures } = await import("@/lib/mocks/missions");
  return {
    getMissionCards: vi.fn(async () => dailyMissionFixtures),
    getMissionCardById: vi.fn(),
  };
});

// MicStreamProvider(navigator.mediaDevices) 의존 회피 — children passthrough.
vi.mock("@/app/(public)/missions/MissionRunner", () => ({
  MissionRunner: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-runner">{children}</div>
  ),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import MissionsPage from "@/app/(public)/missions/page";

describe("/missions (목록) — FR-C-003 DB 카드 렌더", () => {
  it("카드 그리드 30개(5음소×6단계) + 추천/전체 섹션 렌더 (anonymous fallback)", async () => {
    const ui = await MissionsPage();
    const { container } = render(ui);

    expect(container.querySelectorAll("article")).toHaveLength(30);
    expect(container.textContent).toContain("전체 미션 둘러보기");
    expect(container.textContent).toContain("오늘의 미션");
  });

  it("CON-04 금칙어 0건 (페이지 전체 textContent)", async () => {
    const ui = await MissionsPage();
    const { container } = render(ui);
    const text = container.textContent ?? "";
    for (const w of ["치료", "진단", "장애"]) {
      expect(text).not.toContain(w);
    }
  });
});

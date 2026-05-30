// REQ-FUNC-CL-06 — missions/page ABA 정확도 nudge "live 경로" 통합 테스트.
//
// 감사(w07imwxde)가 지적한 갭: decideRecommendation accuracy nudge 는 단위 테스트되나,
// missions/page 가 최근 평가 평균 articulationScore 를 meanAccuracy 로 전달하는 _배선_ 은
// 통합 미커버. 본 테스트는 인증 유저 + SessionLog mock → 추천 카피에 nudge 반영을 검증.
//
// continue streak(3연속 실패 X / 5연속 성공 X) 일 때만 nudge 적용 →
//   meanAccuracy ≥80 → level_up("더 멋진 발음에 도전해볼까요?"),
//   meanAccuracy <50 → level_down("조금 익숙한 발음부터 시작해볼까요?").

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

// 인증 유저 (resolveUserId 가 supabase user.id 우선).
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u-test" } } }) },
  }),
}));

const findManyMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: { sessionLog: { findMany: (...a: unknown[]) => findManyMock(...a) } },
}));

vi.mock("@/lib/missions/card-repo", async () => {
  const { dailyMissionFixtures } = await import("@/lib/mocks/missions");
  return {
    getMissionCards: vi.fn(async () => dailyMissionFixtures),
    getMissionCardById: vi.fn(),
  };
});

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

/// 평가 세션 1건 — articulationScore + 음소 ㅅ. (continue streak 유지용 소량.)
function session(id: string, articulationScore: number, minsAgo: number) {
  return {
    id,
    missionId: null,
    startTime: new Date(Date.now() - minsAgo * 60_000),
    evaluationResult: { articulationScore, targetPhoneme: "ㅅ" },
  };
}

beforeEach(() => {
  findManyMock.mockReset();
});

describe("/missions 추천 — ABA 정확도 nudge live 경로 (REQ-FUNC-CL-06)", () => {
  it("고정확도(≥80) + continue streak → level_up 카피", async () => {
    // 2 성공(85) — trailingSuccesses=2(<5), rest(5+) 미발동 → streak continue.
    findManyMock.mockResolvedValue([session("s1", 85, 30), session("s2", 85, 60)]);

    const ui = await MissionsPage();
    const { container } = render(ui);

    expect(container.textContent).toContain("더 멋진 발음에 도전해볼까요?");
    expect(container.textContent).not.toContain("조금 익숙한 발음부터");
  });

  it("저정확도(<50) + continue streak → level_down 카피", async () => {
    // 2 실패(40<70) — trailingFailures=2(<3) → streak continue, meanAccuracy 40 → reduce.
    findManyMock.mockResolvedValue([session("s1", 40, 30), session("s2", 40, 60)]);

    const ui = await MissionsPage();
    const { container } = render(ui);

    expect(container.textContent).toContain("조금 익숙한 발음부터 시작해볼까요?");
    expect(container.textContent).not.toContain("더 멋진 발음에 도전해볼까요?");
  });

  it("평가 세션 없음 → fallback(오늘의 추천), nudge 미적용", async () => {
    findManyMock.mockResolvedValue([]);

    const ui = await MissionsPage();
    const { container } = render(ui);

    expect(container.textContent).toContain("오늘의 추천");
  });
});

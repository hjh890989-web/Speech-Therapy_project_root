// FR-C-REENGAGE-BANNER — pickReengageBanner 순수 helper 단위 테스트.
//
// 검증: 우선순위(resume > streak > weekly_goal), 게이트(streak≥2 / weekly remaining∈[1,2] /
//   미달성 / activeToday), 익명 no-op, resume 딥링크 인코딩, CON-04 카피 클린.

import { describe, it, expect } from "vitest";
import {
  pickReengageBanner,
  type ReengageBannerInput,
} from "@/lib/missions/reengage-banner";

/// 기본 입력 — 모든 신호 "조용함"(배너 없음 상태). 각 테스트가 필요한 필드만 override.
function input(over: Partial<ReengageBannerInput> = {}): ReengageBannerInput {
  return {
    streak: { current: 0, activeToday: true },
    weeklyGoal: { completed: 4, goal: 4, remaining: 0, achieved: true },
    resumableMissionId: undefined,
    hasUser: true,
    ...over,
  };
}

describe("pickReengageBanner — 익명/신규 no-op", () => {
  it("hasUser=false → 다른 신호가 있어도 null", () => {
    const b = pickReengageBanner(
      input({
        hasUser: false,
        resumableMissionId: "m-1",
        streak: { current: 5, activeToday: false },
        weeklyGoal: { completed: 3, goal: 4, remaining: 1, achieved: false },
      }),
    );
    expect(b).toBeNull();
  });

  it("모든 신호 조용 + hasUser=true → null (기존 게이지/affirmation 담당)", () => {
    expect(pickReengageBanner(input())).toBeNull();
  });
});

describe("pickReengageBanner — 우선순위 1) resume", () => {
  it("resumableMissionId 있으면 variant=resume + 딥링크 href", () => {
    const b = pickReengageBanner(input({ resumableMissionId: "mock-ㅅ-2" }));
    expect(b?.variant).toBe("resume");
    expect(b?.href).toBe(`/missions/${encodeURIComponent("mock-ㅅ-2")}/play`);
    expect(b?.cta).toBeTruthy();
  });

  it("resume 이 streak + weekly_goal 보다 우선", () => {
    const b = pickReengageBanner(
      input({
        resumableMissionId: "m-A",
        streak: { current: 9, activeToday: false },
        weeklyGoal: { completed: 3, goal: 4, remaining: 1, achieved: false },
      }),
    );
    expect(b?.variant).toBe("resume");
  });

  it("resume href 는 특수문자 missionId 를 encodeURIComponent 처리", () => {
    const b = pickReengageBanner(input({ resumableMissionId: "a/b c" }));
    expect(b?.href).toBe("/missions/a%2Fb%20c/play");
  });
});

describe("pickReengageBanner — 우선순위 2) streak (끊김 방지)", () => {
  it("!activeToday && current>=2 → variant=streak", () => {
    const b = pickReengageBanner(
      input({ streak: { current: 3, activeToday: false } }),
    );
    expect(b?.variant).toBe("streak");
    expect(b?.message).toContain("3일");
    expect(b?.href).toBeUndefined(); // 딥링크 없음 → in-page 앵커 폴백
  });

  it("current===1 && !activeToday → streak 미발동(≥2 게이트)", () => {
    const b = pickReengageBanner(
      input({
        streak: { current: 1, activeToday: false },
        weeklyGoal: { completed: 4, goal: 4, remaining: 0, achieved: true },
      }),
    );
    expect(b).toBeNull();
  });

  it("activeToday=true 면 streak 미발동(오늘 이미 활동)", () => {
    const b = pickReengageBanner(
      input({
        streak: { current: 5, activeToday: true },
        weeklyGoal: { completed: 4, goal: 4, remaining: 0, achieved: true },
      }),
    );
    expect(b).toBeNull();
  });

  it("streak 이 weekly_goal 보다 우선", () => {
    const b = pickReengageBanner(
      input({
        streak: { current: 4, activeToday: false },
        weeklyGoal: { completed: 3, goal: 4, remaining: 1, achieved: false },
      }),
    );
    expect(b?.variant).toBe("streak");
  });
});

describe("pickReengageBanner — 우선순위 3) weekly_goal (목표 임박)", () => {
  it("remaining=1 + 미달성 → variant=weekly_goal", () => {
    const b = pickReengageBanner(
      input({
        streak: { current: 0, activeToday: true },
        weeklyGoal: { completed: 3, goal: 4, remaining: 1, achieved: false },
      }),
    );
    expect(b?.variant).toBe("weekly_goal");
    expect(b?.message).toContain("1회");
  });

  it("remaining=2 + 미달성 → weekly_goal", () => {
    const b = pickReengageBanner(
      input({
        weeklyGoal: { completed: 2, goal: 4, remaining: 2, achieved: false },
      }),
    );
    expect(b?.variant).toBe("weekly_goal");
  });

  it("remaining=3 → null (임박 윈도우 [1,2] 밖)", () => {
    const b = pickReengageBanner(
      input({
        weeklyGoal: { completed: 1, goal: 4, remaining: 3, achieved: false },
      }),
    );
    expect(b).toBeNull();
  });

  it("achieved=true → null (목표 달성)", () => {
    const b = pickReengageBanner(
      input({
        weeklyGoal: { completed: 4, goal: 4, remaining: 0, achieved: true },
      }),
    );
    expect(b).toBeNull();
  });
});

describe("pickReengageBanner — CON-04 카피 클린", () => {
  it("모든 variant 메시지/CTA 에 금칙어(치료/진단/장애) 0건", () => {
    const banners = [
      pickReengageBanner(input({ resumableMissionId: "m-1" })),
      pickReengageBanner(input({ streak: { current: 3, activeToday: false } })),
      pickReengageBanner(
        input({
          weeklyGoal: { completed: 3, goal: 4, remaining: 1, achieved: false },
        }),
      ),
    ];
    for (const b of banners) {
      expect(b).not.toBeNull();
      const text = `${b!.message} ${b!.cta}`;
      for (const w of ["치료", "진단", "장애"]) {
        expect(text).not.toContain(w);
      }
    }
  });
});

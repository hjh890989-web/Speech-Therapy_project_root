// FR-C-PARENT-ONBOARDING (follow-up) — OnboardingRedirectGate 단위 + 통합 테스트.
//
// 격리:
//   - next/navigation usePathname / useRouter mock (replace 캡처)
//
// 시나리오 (총 8건):
//   pure 함수:
//     1) isOnboardingRedirectExcluded("/onboarding")    → true
//     2) isOnboardingRedirectExcluded("/onboarding/")   → true (prefix 매칭)
//     3) isOnboardingRedirectExcluded("/login")          → true
//     4) isOnboardingRedirectExcluded("/login/parent")  → true (prefix)
//     5) isOnboardingRedirectExcluded("/auth/callback") → true
//     6) isOnboardingRedirectExcluded("/signup/parent") → true
//     7) isOnboardingRedirectExcluded("/diagnose")      → false
//     8) isOnboardingRedirectExcluded("/missions")      → false
//   gate 컴포넌트:
//     9)  dbCompleted=false + path=/diagnose → router.replace("/onboarding")
//    10)  dbCompleted=false + path=/onboarding → redirect 없음 (제외)
//    11)  dbCompleted=false + path=/login → redirect 없음 (제외)
//    12)  dbCompleted=true → redirect 없음
//    13)  dbCompleted=null → redirect 없음

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const routerReplaceMock = vi.fn();
let currentPathname = "/diagnose";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock }),
  usePathname: () => currentPathname,
}));

import {
  OnboardingRedirectGate,
  isOnboardingRedirectExcluded,
  ONBOARDING_REDIRECT_EXCLUDED_PREFIXES,
} from "@/components/onboarding/OnboardingRedirectGate";

beforeEach(() => {
  routerReplaceMock.mockReset();
  currentPathname = "/diagnose";
});

afterEach(() => {
  cleanup();
});

describe("isOnboardingRedirectExcluded — 경로 제외 정책", () => {
  it.each([
    ["/onboarding", true],
    ["/onboarding/step2", true],
    ["/login", true],
    ["/login/parent", true],
    ["/auth/callback", true],
    ["/signup", true],
    ["/signup/parent", true],
    ["/diagnose", false],
    ["/missions", false],
    ["/rewards", false],
    ["/predictions", false],
    ["/settings", false],
    ["", true], // 빈 경로 안전 기본값 — redirect 안 함.
  ] as const)("isOnboardingRedirectExcluded(%s) → %s", (input, expected) => {
    expect(isOnboardingRedirectExcluded(input)).toBe(expected);
  });

  it("제외 prefix 목록은 4개", () => {
    expect(ONBOARDING_REDIRECT_EXCLUDED_PREFIXES).toEqual([
      "/onboarding",
      "/login",
      "/signup",
      "/auth",
    ]);
  });
});

describe("OnboardingRedirectGate — redirect 분기", () => {
  it("dbCompleted=false + 일반 경로 (/diagnose) → /onboarding 으로 router.replace", () => {
    currentPathname = "/diagnose";
    render(<OnboardingRedirectGate dbCompleted={false} />);
    expect(routerReplaceMock).toHaveBeenCalledWith("/onboarding");
  });

  it("dbCompleted=false + 제외 경로 (/onboarding) → redirect 안 함", () => {
    currentPathname = "/onboarding";
    render(<OnboardingRedirectGate dbCompleted={false} />);
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("dbCompleted=false + 제외 경로 (/login) → redirect 안 함", () => {
    currentPathname = "/login";
    render(<OnboardingRedirectGate dbCompleted={false} />);
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("dbCompleted=false + /auth/callback → redirect 안 함", () => {
    currentPathname = "/auth/callback";
    render(<OnboardingRedirectGate dbCompleted={false} />);
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("dbCompleted=true → 어떤 경로든 redirect 안 함", () => {
    currentPathname = "/diagnose";
    render(<OnboardingRedirectGate dbCompleted={true} />);
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("dbCompleted=null (비인증/미확정) → redirect 안 함", () => {
    currentPathname = "/missions";
    render(<OnboardingRedirectGate dbCompleted={null} />);
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("재렌더에도 중복 redirect 없음 (mount-once guard)", () => {
    currentPathname = "/diagnose";
    const { rerender } = render(<OnboardingRedirectGate dbCompleted={false} />);
    expect(routerReplaceMock).toHaveBeenCalledTimes(1);
    rerender(<OnboardingRedirectGate dbCompleted={false} />);
    expect(routerReplaceMock).toHaveBeenCalledTimes(1);
  });
});

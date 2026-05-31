// SEC-COMP-PIPA (Grill #3A A1+A2) — ConsentRedirectGate 단위 테스트.
//
// 검증:
//   1) hasConsented === false + 진단 등 일반 path → /settings/privacy-consent redirect.
//   2) hasConsented === false + 제외 path (/settings/privacy-consent, /onboarding, /auth/*, /privacy 등) → redirect 안 함.
//   3) hasConsented === true (완료) → redirect 안 함.
//   4) hasConsented === null (비인증) → redirect 안 함.
//   5) 동일 mount 내 다중 effect → redirect 1회만.
//   6) isConsentRedirectExcluded() prefix 매칭 정확성.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import {
  ConsentRedirectGate,
  isConsentRedirectExcluded,
  CONSENT_REDIRECT_EXCLUDED_PREFIXES,
} from "@/components/consent/ConsentRedirectGate";

const routerReplaceMock = vi.fn();
const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock }),
  usePathname: () => usePathnameMock(),
}));

beforeEach(() => {
  routerReplaceMock.mockReset();
  usePathnameMock.mockReset();
});

describe("ConsentRedirectGate", () => {
  it("미동의 + 일반 path → /settings/privacy-consent redirect (+ ?next 보존)", () => {
    usePathnameMock.mockReturnValue("/diagnose");
    render(<ConsentRedirectGate hasConsented={false} />);
    // FR-Q-022 — 진입 전 경로를 ?next 로 보존 (동의 후 복귀).
    expect(routerReplaceMock).toHaveBeenCalledExactlyOnceWith(
      "/settings/privacy-consent?next=%2Fdiagnose",
    );
  });

  it("미동의 + /chat → ?next=%2Fchat 인코딩 보존", () => {
    usePathnameMock.mockReturnValue("/chat");
    render(<ConsentRedirectGate hasConsented={false} />);
    expect(routerReplaceMock).toHaveBeenCalledExactlyOnceWith(
      "/settings/privacy-consent?next=%2Fchat",
    );
  });

  it("미동의 + /settings/privacy-consent (자체 path) → redirect 안 함", () => {
    usePathnameMock.mockReturnValue("/settings/privacy-consent");
    render(<ConsentRedirectGate hasConsented={false} />);
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("미동의 + /onboarding → redirect 안 함 (wizard 가 동의 받는 흐름)", () => {
    usePathnameMock.mockReturnValue("/onboarding");
    render(<ConsentRedirectGate hasConsented={false} />);
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("미동의 + /auth/callback → redirect 안 함 (인증 흐름 중간)", () => {
    usePathnameMock.mockReturnValue("/auth/callback");
    render(<ConsentRedirectGate hasConsented={false} />);
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("미동의 + /privacy → redirect 안 함 (정책 검토용)", () => {
    usePathnameMock.mockReturnValue("/privacy");
    render(<ConsentRedirectGate hasConsented={false} />);
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("미동의 + /terms → redirect 안 함", () => {
    usePathnameMock.mockReturnValue("/terms");
    render(<ConsentRedirectGate hasConsented={false} />);
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("미동의 + /settings/account → redirect 안 함 (계정 삭제 보장)", () => {
    usePathnameMock.mockReturnValue("/settings/account");
    render(<ConsentRedirectGate hasConsented={false} />);
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("동의 완료 (true) → redirect 안 함", () => {
    usePathnameMock.mockReturnValue("/diagnose");
    render(<ConsentRedirectGate hasConsented={true} />);
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("비인증 (null) → redirect 안 함", () => {
    usePathnameMock.mockReturnValue("/diagnose");
    render(<ConsentRedirectGate hasConsented={null} />);
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("pathname null/빈 문자열 → redirect 안 함 (안전 기본값)", () => {
    usePathnameMock.mockReturnValue("");
    render(<ConsentRedirectGate hasConsented={false} />);
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("미동의 + / (홈, exact) → redirect 안 함 (둘러보기 출구)", () => {
    usePathnameMock.mockReturnValue("/");
    render(<ConsentRedirectGate hasConsented={false} />);
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });
});

describe("isConsentRedirectExcluded", () => {
  it("정확 매칭 — 각 prefix 자체", () => {
    for (const prefix of CONSENT_REDIRECT_EXCLUDED_PREFIXES) {
      expect(isConsentRedirectExcluded(prefix)).toBe(true);
    }
  });

  it("prefix 매칭 — 하위 path", () => {
    expect(isConsentRedirectExcluded("/login/parent")).toBe(true);
    expect(isConsentRedirectExcluded("/auth/callback")).toBe(true);
    expect(isConsentRedirectExcluded("/settings/privacy-consent/sub")).toBe(true);
  });

  it("제외 아닌 path — false", () => {
    expect(isConsentRedirectExcluded("/diagnose")).toBe(false);
    expect(isConsentRedirectExcluded("/missions")).toBe(false);
    expect(isConsentRedirectExcluded("/rewards")).toBe(false);
    expect(isConsentRedirectExcluded("/settings")).toBe(false);
    expect(isConsentRedirectExcluded("/settings/child")).toBe(false);
  });

  it("빈 문자열 / null → true (안전 기본값)", () => {
    expect(isConsentRedirectExcluded("")).toBe(true);
  });

  it("/login 으로 시작하지만 prefix 가 아닌 path → 안전 매칭", () => {
    // /loginextra 같은 케이스 — prefix + "/" 가드로 차단.
    expect(isConsentRedirectExcluded("/loginextra")).toBe(false);
  });

  it("/ (홈) exact match → true / 다른 path 는 영향 없음", () => {
    expect(isConsentRedirectExcluded("/")).toBe(true);
    // "/" 단순 prefix 매칭 충돌 방지 검증.
    expect(isConsentRedirectExcluded("/missions")).toBe(false);
    expect(isConsentRedirectExcluded("/diagnose")).toBe(false);
  });
});

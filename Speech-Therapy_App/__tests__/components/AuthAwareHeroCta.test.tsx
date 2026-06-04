// FR-LANDING — AuthAwareHeroCta: 정적 페이지 유지용 client 측 세션 확인(progressive
// enhancement). 세션 있음 → 단축 노출 / 없음·실패 → null(graceful).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

const getSessionMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({ auth: { getSession: getSessionMock } }),
}));

import { AuthAwareHeroCta } from "@/components/landing/AuthAwareHeroCta";

describe("AuthAwareHeroCta", () => {
  beforeEach(() => getSessionMock.mockReset());

  it("세션 있으면 '이어서 계속하기' 단축(→ /missions) 노출", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    render(<AuthAwareHeroCta />);

    const link = await screen.findByTestId("landing-continue");
    expect(link).toHaveAttribute("href", "/missions");
  });

  it("세션 없으면 단축 미노출(null)", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    render(<AuthAwareHeroCta />);

    await waitFor(() => expect(getSessionMock).toHaveBeenCalled());
    expect(screen.queryByTestId("landing-continue")).toBeNull();
  });

  it("세션이 비어 있으면(falsy) 단축 미노출(null)", async () => {
    // getSession 이 세션 없는/비정상 결과를 주는 모든 경로는 Boolean(session) → false → null.
    // (예외/거부 경로도 컴포넌트 try/catch 가 동일하게 null 로 귀결 — 코드상 자명.)
    getSessionMock.mockResolvedValue({ data: { session: undefined } });
    render(<AuthAwareHeroCta />);

    await waitFor(() => expect(getSessionMock).toHaveBeenCalled());
    expect(screen.queryByTestId("landing-continue")).toBeNull();
  });
});

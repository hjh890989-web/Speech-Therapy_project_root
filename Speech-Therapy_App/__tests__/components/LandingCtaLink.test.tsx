// FR-LANDING — LandingCtaLink: cta→href 매핑 + 클릭 시 landing_cta_clicked 발송.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

import { LandingCtaLink } from "@/components/landing/LandingCtaLink";

describe("LandingCtaLink", () => {
  beforeEach(() => trackMock.mockClear());

  it("diagnose → /diagnose + 클릭 시 placement 포함 발송", () => {
    render(
      <LandingCtaLink cta="diagnose" placement="hero" testId="cta">
        시작
      </LandingCtaLink>,
    );
    const link = screen.getByTestId("cta");
    expect(link).toHaveAttribute("href", "/diagnose");

    fireEvent.click(link);
    expect(trackMock).toHaveBeenCalledWith("landing_cta_clicked", {
      cta: "diagnose",
      placement: "hero",
    });
  });

  it("cta 라벨 → 라우트 매핑 (signup/continue/missions/rewards/reports)", () => {
    const cases: Array<[
      "missions" | "rewards" | "reports" | "signup" | "continue",
      string,
    ]> = [
      ["missions", "/missions"],
      ["rewards", "/rewards"],
      ["reports", "/reports"],
      ["signup", "/login"],
      ["continue", "/missions"],
    ];
    for (const [cta, href] of cases) {
      const { unmount } = render(
        <LandingCtaLink cta={cta} placement="final" testId="c">
          link
        </LandingCtaLink>,
      );
      expect(screen.getByTestId("c")).toHaveAttribute("href", href);
      unmount();
    }
  });
});

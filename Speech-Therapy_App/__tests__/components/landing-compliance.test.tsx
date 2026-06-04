// FR-LANDING / CON-04 — 랜딩 섹션 전체 금칙어(치료/진단/장애 등) 0건 검증.
// 권위 스캐너 lib/forbidden-words.findBannedTerms 를 그대로 사용(proxy.ts 와 동일 소스).
// 의료 아이콘(🩺⚕️🏥) 미사용도 함께 검증.

import type { ReactElement } from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { findBannedTerms } from "@/lib/forbidden-words";
import { LandingHero } from "@/components/landing/LandingHero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { UrgencyBlock } from "@/components/landing/UrgencyBlock";
import { ValueProps } from "@/components/landing/ValueProps";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { FinalCta } from "@/components/landing/FinalCta";

// LandingCtaLink onClick 의존성 — 발송 자체는 본 테스트 무관, import 안정화용.
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
// AuthAwareHeroCta(LandingHero 내부)의 lazy supabase import — 세션 없음으로 고정(단축 미노출).
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

const SECTIONS: Array<[string, ReactElement]> = [
  ["LandingHero", <LandingHero key="hero" />],
  ["HowItWorks", <HowItWorks key="how" />],
  ["UrgencyBlock", <UrgencyBlock key="urgency" />],
  ["ValueProps", <ValueProps key="value" />],
  ["TrustStrip", <TrustStrip key="trust" />],
  ["LandingFaq", <LandingFaq key="faq" />],
  ["FinalCta", <FinalCta key="final" />],
];

describe("랜딩 — CON-04 금칙어 0건", () => {
  it.each(SECTIONS)("%s 텍스트에 금칙어 미포함", (_name, node) => {
    const { container } = render(node);
    const text = container.textContent ?? "";
    expect(findBannedTerms(text)).toEqual([]);
  });

  it("모든 섹션에 의료 아이콘(🩺 ⚕️ 🏥) 미사용", () => {
    const medical = ["🩺", "⚕️", "🏥"];
    for (const [, node] of SECTIONS) {
      const { container, unmount } = render(node);
      const text = container.textContent ?? "";
      for (const emoji of medical) expect(text).not.toContain(emoji);
      unmount();
    }
  });
});

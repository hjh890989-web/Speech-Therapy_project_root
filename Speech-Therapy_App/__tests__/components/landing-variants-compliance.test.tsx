// FR-LANDING / CON-04 — 시안 B/C 페이지 전체 금칙어(치료/진단/장애 등) 0건 검증.
// 공유 content.ts 를 쓰지만 각 페이지 인라인 문자열까지 포함해 렌더 후 스캔(권위 스캐너 동일).

import type { ReactElement } from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { findBannedTerms } from "@/lib/forbidden-words";
import LandingPreviewB from "@/app/landing-prototype/b/page";
import LandingPreviewC from "@/app/landing-prototype/c/page";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

const VARIANTS: Array<[string, () => ReactElement]> = [
  ["B (editorial)", LandingPreviewB],
  ["C (bold)", LandingPreviewC],
];

describe("랜딩 시안 B/C — CON-04 금칙어 0건", () => {
  it.each(VARIANTS)("시안 %s 텍스트에 금칙어 미포함", (_name, Page) => {
    const { container } = render(<Page />);
    expect(findBannedTerms(container.textContent ?? "")).toEqual([]);
  });

  it.each(VARIANTS)("시안 %s 의료 아이콘(🩺 ⚕️ 🏥) 미사용", (_name, Page) => {
    const { container } = render(<Page />);
    const text = container.textContent ?? "";
    for (const emoji of ["🩺", "⚕️", "🏥"]) expect(text).not.toContain(emoji);
  });
});

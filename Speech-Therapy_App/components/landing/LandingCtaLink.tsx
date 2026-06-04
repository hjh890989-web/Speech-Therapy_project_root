"use client";

// FR-LANDING — 랜딩 CTA Link 래퍼 (next/link + 클릭 텔레메트리).
// app/(public)/diagnose/result/[sessionId]/ResultAnalytics.tsx 의 TrackedCTALink 패턴 복제.
//
// cta → 목적지 라우트는 본 모듈 단일 매핑(CTA_HREF). 호출 측은 cta + placement 만 지정.
// 경로는 모두 기존 영문 슬러그 — proxy.ts 금칙어(치료/진단/장애) URL 필터에 안전.
//
// trackEvent 는 fire-and-forget (Vercel Analytics 브라우저 SDK). 페이지 이동 전 동기 완료
// 보장은 없으나 MVP 허용(정합성 ≪ 단순성) — ResultAnalytics 와 동일 한계.

import Link from "next/link";

import { trackEvent } from "@/lib/analytics";

export type LandingCta =
  | "diagnose"
  | "missions"
  | "rewards"
  | "reports"
  | "signup"
  | "continue";

export type LandingPlacement =
  | "hero"
  | "how_it_works"
  | "urgency"
  | "value_props"
  | "faq"
  | "final";

/// cta 라벨 → 목적지 라우트 (단일 소스).
const CTA_HREF: Record<LandingCta, string> = {
  diagnose: "/diagnose",
  missions: "/missions",
  rewards: "/rewards",
  reports: "/reports",
  signup: "/login",
  continue: "/missions",
};

export function LandingCtaLink({
  cta,
  placement,
  className,
  children,
  testId,
}: {
  cta: LandingCta;
  placement: LandingPlacement;
  className?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <Link
      href={CTA_HREF[cta]}
      data-testid={testId}
      className={className}
      onClick={() => {
        trackEvent("landing_cta_clicked", { cta, placement });
      }}
    >
      {children}
    </Link>
  );
}

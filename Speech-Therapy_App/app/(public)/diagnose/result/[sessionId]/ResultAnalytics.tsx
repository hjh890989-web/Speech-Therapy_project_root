"use client";

// INFRA-005-FU (#104) — 결과 페이지 trackEvent client 어댑터.
// Server Component 페이지에서 import 해 사용.
//
// 두 컴포넌트:
//  1. ResultViewedBeacon — mount 시 result_viewed 1회 발송.
//  2. TrackedCTALink — Link 래퍼, onClick 으로 cta_clicked 발송 (페이지 이동 보존).
//
// Vercel Analytics 의 track() 은 fire-and-forget — 페이지 이동 전에 동기적으로 완료 보장 없음.
// 페이지 이동 후 발송 손실 가능성 있으나, 본 MVP 기준 허용 (정합성 ≪ 단순성).

import Link from "next/link";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

export function ResultViewedBeacon({
  peerPercentile,
  hasHITL,
}: {
  peerPercentile: number;
  hasHITL: boolean;
}) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    trackEvent("result_viewed", {
      peerPercentile: Math.round(peerPercentile),
      hasHITL,
    });
  }, [peerPercentile, hasHITL]);
  return null;
}

export function TrackedCTALink({
  href,
  cta,
  className,
  children,
}: {
  href: string;
  cta: "weekly_mission" | "rewards" | "auth_signin";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        trackEvent("cta_clicked", { cta });
      }}
    >
      {children}
    </Link>
  );
}

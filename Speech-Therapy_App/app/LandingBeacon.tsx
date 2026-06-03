"use client";

// MON-001 후속 (AnalyticsEvent 재연결) — 홈(`/`) 진입 1회 funnel 'landing' 영속.
//
// PWA start_url='/' 의 canonical 진입 신호. RSC 렌더가 아닌 *browser mount* 에서 발사해
// 봇/prefetch 인플레를 피한다. React 19 Strict Mode 더블 mount 가드(useRef) —
// RewardCollectionViewedBeacon 패턴 동일. recordFunnelStep 은 fire-and-forget(await X).
//
// 한계: 광고 등으로 /diagnose 직진입 시 landing 미발사(landing < diagnose_started 가능) —
// MVP 수용. userId 는 서버 액션이 해소(proxy.ts 가 익명 쿠키 보장).

import { useEffect, useRef } from "react";

import { recordFunnelStep } from "@/app/actions/track-funnel";

export function LandingBeacon() {
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    void recordFunnelStep("landing");
  }, []);
  return null;
}

"use client";

// FR-C-REENGAGE-BANNER — 적응형 재유도 배너 노출 1회 reengage_banner_shown 발송.
//
// React 19 Strict Mode 더블 mount 가드 — useRef fired flag 로 2번째 호출 차단.
// (RewardCollectionViewedBeacon 패턴 동일.) 배너가 렌더될 때만 mount 되므로
// "노출 카운트 = 발송 수" → 간접 레버(노출→완료 전환) 측정 분모.

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import type { ReengageBannerVariant } from "@/lib/missions/reengage-banner";

export function ReengageBannerBeacon({
  variant,
}: {
  variant: ReengageBannerVariant;
}) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    trackEvent("reengage_banner_shown", { variant });
  }, [variant]);
  return null;
}

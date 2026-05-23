"use client";

// FR-Q-004 (#45) — 보상 도감 페이지 mount 1회 reward_collection_viewed 발송.
//
// React 19 Strict Mode 더블 mount 가드 — useRef fired flag 로 2번째 호출 차단.
// 동일 페이지 새로고침 시 다시 발송 (이 후 KPI 가 도감 진입 빈도 = 발송 수).

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

export interface RewardCollectionViewedBeaconProps {
  stars: number;
  trees: number;
  aiArtsCount: number;
}

export function RewardCollectionViewedBeacon({
  stars,
  trees,
  aiArtsCount,
}: RewardCollectionViewedBeaconProps) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    trackEvent("reward_collection_viewed", {
      stars,
      trees,
      aiArtsCount,
    });
  }, [stars, trees, aiArtsCount]);
  return null;
}

"use client";

// FR-Q-WEEKLY-REVIEW — 페이지 mount 1회 weekly_review_viewed 이벤트 발송 beacon.
//
// Strict Mode 더블 마운트 가드 (sentMountRef 패턴 — PredictionDetailView 와 동일).
// R4 보호: userId 는 분석 백엔드에서 자동 해시 — 본 컴포넌트는 raw 그대로 전달.

import { useEffect, useRef } from "react";

import { trackEvent } from "@/lib/analytics";

export interface WeeklyReviewBeaconProps {
  userId: string;
  hasData: boolean;
  wAurAchieved: boolean;
  /// hasData=false 시 현재 주차 (loader 가 latest.weekNumber 없을 때 page 측이 getCurrentWeekNumber 로 폴백).
  weekNumber: number;
}

export function WeeklyReviewBeacon({
  userId,
  hasData,
  wAurAchieved,
  weekNumber,
}: WeeklyReviewBeaconProps) {
  const sentMountRef = useRef(false);

  useEffect(() => {
    if (sentMountRef.current) return;
    sentMountRef.current = true;
    trackEvent("weekly_review_viewed", {
      userId,
      hasData,
      wAurAchieved,
      weekNumber,
    });
  }, [userId, hasData, wAurAchieved, weekNumber]);

  return null;
}

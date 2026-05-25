"use client";

// FR-DASH-CURSOR-PER-CLASSROOM — 반별 cursor 진입 시 dashboard_students_paginated 이벤트 발송 beacon.
//
// 책임: 페이지 mount 시 cursors 맵의 각 entry 마다 1회씩 trackEvent 발송.
//   - principal / teacher 두 페이지 모두에서 사용 — role prop 으로 분기.
//   - Strict Mode 더블 마운트 가드 (sentMountRef — WeeklyReviewBeacon 패턴).
//   - cursors 가 빈 객체일 경우 호출 측에서 본 컴포넌트 자체를 미렌더 (방어적 가드만 본 컴포넌트).
//
// R4 보호: classroomId / cursor 만 노출 — 자녀 식별 정보 (이름/이메일) 0건.
//   cursor (User.id UUID) 는 분석 백엔드 자동 해시 가정.

import { useEffect, useRef } from "react";

import { trackEvent } from "@/lib/analytics";

export interface DashboardPaginationBeaconProps {
  /// "principal" → /admin/principal, "teacher" → /admin/teacher.
  role: "principal" | "teacher";
  /// principal 진입 시 본인 institutionId, teacher 진입 시 null.
  institutionId: string | null;
  /// 반별 cursor 맵 — Record<classroomId, User.id cursor>. 빈 객체 가능 (이 경우 0회 발송).
  cursors: Record<string, string>;
}

export function DashboardPaginationBeacon({
  role,
  institutionId,
  cursors,
}: DashboardPaginationBeaconProps) {
  const sentMountRef = useRef(false);

  useEffect(() => {
    if (sentMountRef.current) return;
    sentMountRef.current = true;
    for (const [classroomId, cursor] of Object.entries(cursors)) {
      trackEvent("dashboard_students_paginated", {
        classroomId,
        cursor: cursor.length > 0 ? cursor : null,
        institutionId,
        role,
      });
    }
  }, [role, institutionId, cursors]);

  return null;
}

"use client";

// FR-Q-014 (#55) — 거울 모드 수동 토글 버튼.
//
// 본 PR 범위:
//   - hook (useMirrorMode) + 패널 (MirrorMode) 제공
//   - 수동 trigger 버튼 (본 컴포넌트) export — mission UI 가 import 해서 자유 배치
//   - 자동 trigger (FR-C-006 침묵 감지 → 거울 모드 활성화) 는 sibling Agent C 책임
//
// 사용 예 (MissionRunner 등에서):
//   <MirrorButton missionId={missionId} referenceOverlay="lips_open" />
//
// 이벤트 발송:
//   - 활성화 클릭 → trackEvent("mirror_mode_activated", { missionId, trigger:"manual" })
//   - 권한 거부 / 디바이스 부재 시 → MirrorMode 내부에서 별도 카운트 (component effect)

import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { MirrorMode, type MirrorReferenceOverlay } from "./MirrorMode";

export interface MirrorButtonProps {
  /// 미션 진행 중 거울 모드 노출 시 — 분석 이벤트에 함께 전달.
  missionId?: string;
  /// 정적 입 모양 가이드. null/undefined → video 만 표시.
  referenceOverlay?: MirrorReferenceOverlay | null;
  /// 외부에서 강제로 닫고 싶을 때 (예: 미션 완료) — controlled 모드.
  /// 미지정 시 본 컴포넌트가 자체 토글 state 관리 (uncontrolled).
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /// 버튼 카피 커스텀. 미지정 시 "입 모양 보기".
  label?: string;
}

export function MirrorButton({
  missionId,
  referenceOverlay,
  open: controlledOpen,
  onOpenChange,
  label = "입 모양 보기",
}: MirrorButtonProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  // 활성화 이벤트는 open: false → true 전이 시점 1회만 발송.
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (!prevOpenRef.current && open) {
      trackEvent("mirror_mode_activated", {
        missionId,
        trigger: "manual",
      });
    }
    prevOpenRef.current = open;
  }, [open, missionId]);

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  return (
    <div className="space-y-3">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="mirror-toggle-open"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-emerald-500 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
        >
          <span aria-hidden="true">🪞</span>
          {label}
        </button>
      )}
      {open && (
        <MirrorMode
          active={open}
          onClose={() => setOpen(false)}
          referenceOverlay={referenceOverlay}
        />
      )}
    </div>
  );
}

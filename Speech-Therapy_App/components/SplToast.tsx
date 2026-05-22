"use client";

// REQ-FUNC-007 — 60dB SPL 게이트 Toast 알림 (자녀 친화 카피).
//
// 본 컴포넌트는 useSplMeter hook 의 isOverThreshold 결과를 받아 부모에게 환경 소음 안내를 노출.
// CON-04 금칙어 ("치료/진단/장애") 사용 0건 — "조용한 곳" / "주변" / "발음 확인" 등 비의료 표현만.
//
// auto-dismiss 정책:
//   - visible=true 가 되면 5초 후 자동으로 onDismiss 호출.
//   - 사용자 X 버튼 클릭 시 즉시 onDismiss.
//   - visible=false 로 외부에서 전환 시 timer cleanup.

import { useEffect } from "react";

export interface SplToastProps {
  /// 부모 상태에 의해 노출 / 숨김 결정. true → 화면에 표시.
  visible: boolean;
  /// 사용자 X 버튼 클릭 또는 auto-dismiss 시 호출.
  onDismiss: () => void;
  /// 표시할 threshold 안내 (default 60).
  thresholdDb?: number;
  /// 자동 닫힘 시간 (ms). default 5000.
  autoDismissMs?: number;
}

const DEFAULT_THRESHOLD_DB = 60;
const DEFAULT_AUTO_DISMISS_MS = 5_000;

export function SplToast({
  visible,
  onDismiss,
  thresholdDb = DEFAULT_THRESHOLD_DB,
  autoDismissMs = DEFAULT_AUTO_DISMISS_MS,
}: SplToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [visible, autoDismissMs, onDismiss]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="spl-toast"
      className="fixed left-1/2 top-6 z-50 -translate-x-1/2 transform rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 shadow-lg dark:border-amber-700 dark:bg-amber-950/80"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">
          🔊
        </span>
        <div className="flex-1">
          <p className="text-base font-semibold text-amber-900 dark:text-amber-100">
            주변이 시끄러워요
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            조용한 곳으로 이동해 보세요. 발음을 더 잘 들을 수 있어요.
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            (주변 소음 약 {thresholdDb}dB 이상이 5초 동안 이어졌어요)
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          data-testid="spl-toast-dismiss"
          aria-label="안내 닫기"
          className="rounded p-1 text-amber-700 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-300 dark:hover:bg-amber-900/40 dark:hover:text-amber-100"
        >
          <span aria-hidden="true" className="text-lg">
            ✕
          </span>
        </button>
      </div>
    </div>
  );
}

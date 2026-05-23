"use client";

// FR-C-007 (#30) Replace D5 — 오프라인 상태 알림 Toast (단순화 안).
//
// 본 PR (FR-C-007 Replace D5) 은 Service Worker / IndexedDB / Background Sync 미사용.
// 오프라인 시 미션 완료를 IndexedDB 에 저장 → 소급 보상 적용하는 PWA 동작은 없음.
// 단순 navigator.onLine 감지 → 자녀 친화 카피로 "지금은 오프라인이에요" 안내만.
//
// CON-04 금칙어 ("치료/진단/장애") 사용 0건 — "지금은 오프라인" / "다시 연결" 등 비의료 표현만.
//
// 동작:
//   - offline 전환 시 Toast 즉시 노출 + offline_detected 이벤트 1회 발송.
//   - online 복귀 시 "다시 연결되었어요" 짧게 (3초) 노출 후 사라짐 + online_restored 이벤트 1회 발송.
//   - SSR 시 (navigator 없음) 기본 online → DOM 미렌더.
//
// 향후 확장 (본 PR 범위 외):
//   - 실 Service Worker 등록은 app/sw-register.tsx 가 별도로 담당 (INFRA-003).
//   - 본 toast 와 별개로 SW 가 캐시 fallback 응답 시 별도 안내 UI 추가 가능.

import { useEffect, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

interface OfflineToastProps {
  /// online 복귀 안내 노출 지속 시간 (ms). default 3000.
  reconnectedDisplayMs?: number;
}

const DEFAULT_RECONNECTED_DISPLAY_MS = 3_000;

export function OfflineToast({
  reconnectedDisplayMs = DEFAULT_RECONNECTED_DISPLAY_MS,
}: OfflineToastProps = {}) {
  const { isOnline, lastOfflineAt } = useOnlineStatus();
  // reconnected toast 가 표시 중인지 (online 복귀 후 N초간 노출).
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  // 이벤트 중복 발송 방지 ref — offline_detected / online_restored 각각 toggle 1회만.
  const detectedOfflineAtRef = useRef<number | null>(null);

  // 본 effect 는 외부 시스템 (navigator.onLine / window 'online/offline' 이벤트) 의 상태 전환을
  // analytics 이벤트 + reconnected toast 표시 state 로 동기화 — set-state-in-effect 정당 (SplCalibrationWizard 와 동일 패턴).
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!isOnline) {
      // offline 전환 — 같은 lastOfflineAt 에서 이미 발송했으면 skip.
      const offlineAtMs = lastOfflineAt?.getTime() ?? null;
      if (offlineAtMs !== null && detectedOfflineAtRef.current !== offlineAtMs) {
        detectedOfflineAtRef.current = offlineAtMs;
        trackEvent("offline_detected", {
          path: window.location.pathname,
        });
      }
      // offline 동안엔 render 분기 (!isOnline) 가 reconnected toast 를 가리므로 setState 불필요.
      // 다음 online 복귀 시 setShowReconnected(true) 가 idempotent 하게 재설정 + 타이머 재시작.
      return;
    }

    // online 복귀 — 직전이 offline 이었을 경우만 reconnected 토스트 + 이벤트 발송.
    if (detectedOfflineAtRef.current !== null && lastOfflineAt) {
      const durationMs = Date.now() - lastOfflineAt.getTime();
      trackEvent("online_restored", {
        offlineDurationMs: Math.max(0, durationMs),
      });
      detectedOfflineAtRef.current = null;
      setShowReconnected(true);

      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, reconnectedDisplayMs);
      return () => clearTimeout(timer);
    }
  }, [isOnline, lastOfflineAt, reconnectedDisplayMs]);

  // 렌더는 isOnline + showReconnected 로 derived — setState in effect 회피.
  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        data-testid="offline-toast"
        className="fixed left-1/2 top-6 z-50 -translate-x-1/2 transform rounded-lg border border-slate-300 bg-slate-50 px-5 py-4 shadow-lg dark:border-slate-700 dark:bg-slate-900/90"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">
            📡
          </span>
          <div className="flex-1">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
              지금은 오프라인이에요.
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              연결 후 다시 시도해 주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="offline-toast-reconnected"
        className="fixed left-1/2 top-6 z-50 -translate-x-1/2 transform rounded-lg border border-emerald-300 bg-emerald-50 px-5 py-4 shadow-lg dark:border-emerald-700 dark:bg-emerald-950/80"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">
            🟢
          </span>
          <p className="text-base font-semibold text-emerald-900 dark:text-emerald-100">
            다시 연결되었어요.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

"use client";

// FR-C-007 (#30) Replace D5 — navigator.onLine 단순 구독 hook.
//
// 본 hook 은 Service Worker / IndexedDB / Background Sync 미사용 (D5 단순화 Replace 안).
// 오프라인 시 IndexedDB 에 소급 보상 적용하지 않고, 단순 Toast 노출만 책임진다.
// 본 hook 은 OfflineToast (components/OfflineToast.tsx) 가 단독 소비.
//
// 참고: lib/hooks/useNetworkAware.ts 는 Server Action 자동 재시도용 별도 hook —
// 본 hook 은 "오프라인 진입 시각" lastOfflineAt 캡처가 추가 책임이므로 분리.
//
// 구현:
// - isOnline 은 useSyncExternalStore 로 SSR-safe 한 navigator.onLine 구독 (set-state-in-effect 회피).
// - lastOfflineAt 은 module-scope mutable cache + subscribe 콜백에서만 갱신 → React 상태로는 노출하지 않고
//   getSnapshot 이 isOnline 과 함께 stable 한 객체 reference 를 반환하도록 useMemo 로 wrap.

import { useMemo, useSyncExternalStore } from "react";

// module-scope cache — 마지막으로 navigator.onLine === false 로 전환된 시각.
// online 복귀 시 reset 하지 않음 — consumer (OfflineToast) 가 duration 계산에 사용.
let lastOfflineAtCache: Date | null = null;

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => {
    callback();
  };
  const handleOffline = () => {
    lastOfflineAtCache = new Date();
    callback();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

function getSnapshot(): boolean {
  if (typeof navigator === "undefined") return true;
  const online = navigator.onLine;
  // 첫 호출에서 이미 offline 인 경우 (mount 시 navigator.onLine=false) → lastOfflineAt 보정.
  if (!online && lastOfflineAtCache === null) {
    lastOfflineAtCache = new Date();
  }
  return online;
}

function getServerSnapshot(): boolean {
  return true;
}

export interface UseOnlineStatusReturn {
  /// 현재 온라인 여부. SSR 시 true.
  isOnline: boolean;
  /// 마지막으로 offline 으로 전환된 시각. duration 계산용 (online_restored 이벤트).
  /// online 으로 복귀한 후에도 직전 값 유지 — consumer 가 직접 reset 또는 ref 비교 책임.
  lastOfflineAt: Date | null;
}

export function useOnlineStatus(): UseOnlineStatusReturn {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // isOnline 이 바뀔 때만 새 객체 reference 발급 — useEffect dependency 안정성.
  return useMemo<UseOnlineStatusReturn>(
    () => ({ isOnline, lastOfflineAt: lastOfflineAtCache }),
    [isOnline],
  );
}

// 테스트 전용 헬퍼 — module-scope cache 초기화 (jsdom 환경에서 테스트 격리).
// production 코드에서 호출 금지.
export function __resetLastOfflineAtForTest(): void {
  lastOfflineAtCache = null;
}

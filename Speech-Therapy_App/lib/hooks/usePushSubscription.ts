"use client";

// FR-C-029 — F16 푸시 구독 Client Hook (V07).
//
// 책임:
//   - 브라우저 지원 / iOS 홈화면 설치 필요 여부 / 권한 / 구독 상태 노출.
//   - subscribe(): Notification.requestPermission → SW 등록 → pushManager.subscribe →
//     subscribePush Server Action 전달.
//   - unsubscribe(): pushManager.getSubscription → unsubscribe → unsubscribePush.
//
// 게이트: 토글 노출 자체는 서버(page.tsx isF16PushEnabled)가 결정 — 본 hook 은 노출된 경우만 동작.
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY 미설정 시 subscribe 는 graceful 오류 (게이트 off 환경 보호).
//
// iOS 제약: Safari 16.4+ 는 PWA(홈화면 추가, standalone)에서만 Web Push 허용 → 미설치 시 안내.
//
// CON-04: 본 파일 주석 / 메시지에 "치료/진단/장애" 금칙어 0건.
// R4: endpoint/키는 PII 아님. 자녀 식별 정보 미취급.

import { useCallback, useEffect, useState } from "react";

import { subscribePush } from "@/app/actions/subscribe-push";
import { unsubscribePush } from "@/app/actions/unsubscribe-push";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export interface UsePushSubscriptionState {
  /// 브라우저가 Service Worker + Push + Notification 모두 지원.
  supported: boolean;
  /// iOS Safari 인데 홈화면 미설치(standalone 아님) → 구독 전 설치 안내 필요.
  needsHomeScreen: boolean;
  /// 현재 활성 구독 보유.
  subscribed: boolean;
  /// 비동기 작업 진행 중 (버튼 disable).
  busy: boolean;
  /// 알림 권한 상태.
  permission: PushPermission;
  /// 마지막 오류 메시지 (UI 표시용).
  error: string | null;
}

export interface UsePushSubscriptionResult extends UsePushSubscriptionState {
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

/** base64url VAPID 공개키 → Uint8Array (pushManager applicationServerKey 요구 형식).
 *  명시적 ArrayBuffer 기반 — applicationServerKey 의 BufferSource(ArrayBuffer) 타입 정합. */
export function urlBase64ToUint8Array(
  base64String: string,
): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

/** 브라우저 지원 여부 — SW + PushManager + Notification 모두 존재. */
export function detectPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iOS Safari + 홈화면 미설치(standalone 아님) → 구독 전 설치 필요. */
export function detectNeedsHomeScreen(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  if (!isIOS) return false;
  const standalone =
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches) ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return !standalone;
}

function readPermission(): PushPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as PushPermission;
}

export function usePushSubscription(): UsePushSubscriptionResult {
  const [state, setState] = useState<UsePushSubscriptionState>({
    supported: false,
    needsHomeScreen: false,
    subscribed: false,
    busy: false,
    permission: "default",
    error: null,
  });

  // 초기화 — 지원/iOS/권한/기존 구독 감지.
  useEffect(() => {
    const supported = detectPushSupported();
    const needsHomeScreen = detectNeedsHomeScreen();
    const permission = readPermission();

    setState((prev) => ({
      ...prev,
      supported,
      needsHomeScreen,
      permission,
    }));

    if (!supported) return;

    let cancelled = false;
    // 기존 구독 여부 확인 (graceful — 실패해도 무시).
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) {
          setState((prev) => ({ ...prev, subscribed: sub !== null }));
        }
      })
      .catch(() => {
        // SW 미등록 등 — 구독 없음으로 간주.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async () => {
    if (!detectPushSupported()) {
      setState((prev) => ({
        ...prev,
        error: "이 브라우저는 푸시 알림을 지원하지 않아요.",
      }));
      return;
    }
    if (detectNeedsHomeScreen()) {
      setState((prev) => ({
        ...prev,
        needsHomeScreen: true,
        error: "홈 화면에 추가한 뒤 다시 시도해 주세요.",
      }));
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setState((prev) => ({
        ...prev,
        error: "푸시 알림이 아직 준비 중이에요. 잠시 후 다시 시도해 주세요.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, busy: true, error: null }));
    try {
      // (1) 권한 요청.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((prev) => ({
          ...prev,
          busy: false,
          permission: permission as PushPermission,
          error:
            permission === "denied"
              ? "알림 권한이 거부되어 있어요. 브라우저 설정에서 허용해 주세요."
              : "알림 권한이 필요해요.",
        }));
        return;
      }

      // (2) SW 등록 + ready.
      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;

      // (3) pushManager.subscribe.
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // (4) Server Action 전달.
      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("구독 정보가 올바르지 않아요.");
      }
      const result = await subscribePush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });

      if (!result.success) {
        setState((prev) => ({
          ...prev,
          busy: false,
          permission: "granted",
          error:
            result.reason === "consent_required"
              ? "개인정보 동의가 필요해요. 동의 후 다시 시도해 주세요."
              : result.reason === "disabled"
                ? "푸시 알림이 아직 준비 중이에요."
                : "구독에 실패했어요. 잠시 후 다시 시도해 주세요.",
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        busy: false,
        subscribed: true,
        permission: "granted",
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        busy: false,
        error:
          err instanceof Error
            ? err.message
            : "구독 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      }));
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setState((prev) => ({ ...prev, busy: true, error: null }));
    try {
      let endpoint: string | undefined;
      if (detectPushSupported()) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        endpoint = sub?.endpoint;
        if (sub) {
          await sub.unsubscribe();
        }
      }
      // 서버 row 삭제 (게이트 무관 — 수신거부 보장).
      await unsubscribePush(endpoint);
      setState((prev) => ({ ...prev, busy: false, subscribed: false }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        busy: false,
        error:
          err instanceof Error
            ? err.message
            : "해지 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      }));
    }
  }, []);

  return { ...state, subscribe, unsubscribe };
}

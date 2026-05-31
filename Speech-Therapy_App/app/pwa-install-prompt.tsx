"use client";

// FR-C-PWA-INSTALL-PROMPT — 홈 화면 설치 유도 배너 (beforeinstallprompt 캡처).
//
// 리텐션: 홈 화면 설치 사용자는 아이콘 상시 노출로 재방문율이 구조적으로 높음(W-AUR 기여).
// manifest.json + Service Worker(sw-register) 가 이미 존재 — 본 컴포넌트는 설치 유도 UI 만.
//
// 동작:
//   - beforeinstallprompt 캡처(preventDefault) → 배너 노출 + 1회 계측.
//   - "추가" → deferredPrompt.prompt() → userChoice(accepted/dismissed) 계측.
//   - "닫기"/설치완료 → localStorage 플래그로 재노출 차단.
//
// 한계(가치 상한): beforeinstallprompt 는 Android Chrome/데스크톱 한정 — iOS Safari 미지원
//   (정적 수동 설치 안내만 가능). 본 배너는 지원 브라우저에서만 노출됨.
//
// CON-04: "치료/진단/장애" 금칙어 0건.

import { useEffect, useState } from "react";

import { trackEvent } from "@/lib/analytics";

/// beforeinstallprompt 는 TS 표준 lib 에 타입 부재 — 최소 인터페이스(Chromium 계열).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwaInstallPromptDismissed";

function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}
function markDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // localStorage 차단 환경 — graceful (세션 한정 노출 허용).
  }
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // 이미 설치(standalone) 또는 사용자가 닫음 → 노출 안 함.
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
    if (standalone || isDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // 브라우저 기본 mini-infobar 억제 → 커스텀 배너로 유도.
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
      trackEvent("pwa_install_prompt_shown", {});
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      markDismissed();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !deferred) return null;

  const handleInstall = async () => {
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      trackEvent("pwa_install_prompt_result", { outcome });
      if (outcome === "dismissed") markDismissed();
    } catch {
      // prompt 실패 — graceful (사용자 응답 막지 않음).
    } finally {
      setVisible(false);
      setDeferred(null);
    }
  };

  const handleDismiss = () => {
    trackEvent("pwa_install_prompt_result", { outcome: "dismissed" });
    markDismissed();
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="홈 화면에 추가"
      data-testid="pwa-install-prompt"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border border-emerald-200 bg-white px-4 py-3 shadow-lg dark:border-emerald-800 dark:bg-gray-900"
    >
      <span aria-hidden="true" className="text-2xl">📱</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">홈 화면에 추가하기</p>
        <p className="text-xs text-gray-600 dark:text-gray-400">아이콘으로 더 빠르게 만나요.</p>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        className="min-h-[44px] rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        추가
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="닫기"
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        ×
      </button>
    </div>
  );
}

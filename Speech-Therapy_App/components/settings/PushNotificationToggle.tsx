"use client";

// FR-C-029 — F16 푸시 알림 구독 토글 (Client Component).
//
// 책임:
//   - usePushSubscription hook 으로 구독/해지 + 상태 표시.
//   - 미지원 / iOS 홈화면 설치 필요 / 권한 거부 / 구독 중 등 상태별 안내.
//
// 노출 게이트: 본 컴포넌트는 _서버(page.tsx isF16PushEnabled)가 렌더 결정_ 후에만 마운트.
//   (게이트 off 환경에선 page 가 본 컴포넌트를 렌더하지 않음.)
//
// 정보통신망법 §50: 푸시는 _명시 옵트인_ — default 미구독, 사용자가 직접 켬.
// CON-04: 본 컴포넌트 UI / aria-label 에 "치료/진단/장애" 금칙어 0건.

import { usePushSubscription } from "@/lib/hooks/usePushSubscription";

export function PushNotificationToggle() {
  const {
    supported,
    needsHomeScreen,
    subscribed,
    busy,
    permission,
    error,
    subscribe,
    unsubscribe,
  } = usePushSubscription();

  return (
    <fieldset
      data-testid="push-notification-toggle"
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <legend className="text-base font-semibold text-slate-900 dark:text-slate-100">
        푸시 알림 (선택)
      </legend>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        하루 한 번, 자녀와 함께 한마디 말해보기 좋은 시간을 알려드려요. 언제든 끌 수 있어요.
      </p>

      {/* 미지원 브라우저 */}
      {!supported && (
        <p
          data-testid="push-unsupported"
          className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          이 브라우저에서는 푸시 알림을 사용할 수 없어요.
        </p>
      )}

      {/* iOS 홈화면 설치 안내 */}
      {supported && needsHomeScreen && (
        <p
          data-testid="push-needs-home-screen"
          className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
        >
          iPhone / iPad 에서는 먼저 <strong>공유 → 홈 화면에 추가</strong> 후, 홈 화면의 앱에서 알림을 켤 수 있어요.
        </p>
      )}

      {/* 오류 메시지 */}
      {error && (
        <p
          data-testid="push-error"
          role="alert"
          className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {error}
        </p>
      )}

      {/* 토글 버튼 — 구독 상태에 따라 켜기/끄기 */}
      {supported && !needsHomeScreen && (
        <div className="flex items-center justify-between gap-4">
          <span
            data-testid="push-status-label"
            className="text-sm font-medium text-slate-900 dark:text-slate-100"
          >
            {subscribed ? "알림을 받고 있어요" : "알림이 꺼져 있어요"}
          </span>
          {subscribed ? (
            <button
              type="button"
              data-testid="push-unsubscribe"
              disabled={busy}
              onClick={() => void unsubscribe()}
              aria-label="푸시 알림 끄기"
              className="inline-flex min-h-[44px] items-center rounded-md border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {busy ? "처리 중..." : "끄기"}
            </button>
          ) : (
            <button
              type="button"
              data-testid="push-subscribe"
              disabled={busy || permission === "denied"}
              onClick={() => void subscribe()}
              aria-label="푸시 알림 켜기"
              className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {busy ? "처리 중..." : "켜기"}
            </button>
          )}
        </div>
      )}

      {/* 권한 거부 안내 */}
      {permission === "denied" && (
        <p
          data-testid="push-permission-denied"
          className="text-xs text-slate-500 dark:text-slate-400"
        >
          브라우저 알림 권한이 거부되어 있어요. 브라우저 설정에서 이 사이트의 알림을 허용한 뒤 다시 시도해 주세요.
        </p>
      )}
    </fieldset>
  );
}

"use client";

// FR-Q-014 (#55) — 카메라 거울 모드 입 모양 가이드 (단순화) Client Component.
//
// Controlled component:
//   - active=true → useMirrorMode.activate() (권한 prompt + stream attach)
//   - active=false → useMirrorMode.deactivate() (stream 정리)
//
// 자녀 (만 2~7세) UI:
//   - 큰 닫기 버튼 (44px+) — 부모 접근성 + 자녀 오작동 회피
//   - 카피 짧고 격려조 — CON-04 금칙어 (치료 / 진단 / 장애) 사용 금지
//
// referenceOverlay:
//   - public/mirror/{lips_open|lips_closed|tongue_up}.svg 정적 SVG
//   - 의료 도해 아님 — 단순 입 모양 가이드. AI 보정 / 자동 평가 없음.

import { useEffect } from "react";
import { useMirrorMode } from "@/lib/hooks/useMirrorMode";

export type MirrorReferenceOverlay = "lips_open" | "lips_closed" | "tongue_up";

const OVERLAY_LABELS: Record<MirrorReferenceOverlay, string> = {
  lips_open: "입을 크게 벌린 모양",
  lips_closed: "입을 살짝 다문 모양",
  tongue_up: "혀를 위로 올린 모양",
};

export interface MirrorModeProps {
  /// 부모가 mount/visibility 토글 시 자동 activate/deactivate.
  active: boolean;
  /// 닫기 버튼 클릭 시 호출. 부모 측이 active=false 로 전환 책임.
  onClose?: () => void;
  /// 정적 reference SVG 노출. null/undefined 시 video 만 표시.
  referenceOverlay?: MirrorReferenceOverlay | null;
}

export function MirrorMode({ active, onClose, referenceOverlay }: MirrorModeProps) {
  const { videoRef, status, activate, deactivate, errorMessage } = useMirrorMode();

  // active prop 변경 → activate/deactivate 동기화 (controlled pattern).
  useEffect(() => {
    if (active) {
      void activate();
    } else {
      deactivate();
    }
  }, [active, activate, deactivate]);

  // 미션 진행 차단 안 함 — active=false 면 본 컴포넌트 자체가 nothing 렌더.
  if (!active) return null;

  const showVideo = status === "active" || status === "requesting";
  const overlayLabel = referenceOverlay ? OVERLAY_LABELS[referenceOverlay] : null;

  return (
    <div
      data-testid="mirror-mode"
      role="dialog"
      aria-label="입 모양 함께 보기"
      className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-black shadow-md dark:border-gray-700"
    >
      {/* 닫기 버튼 — 부모/자녀 모두 접근 가능, 44px+ 탭 타깃 */}
      <button
        type="button"
        onClick={onClose}
        aria-label="거울 모드 닫기"
        data-testid="mirror-close"
        className="absolute right-2 top-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-2xl font-bold text-white hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <span aria-hidden="true">×</span>
      </button>

      {/* video element — scale-x-[-1] 좌우 반전으로 거울처럼 보이게 */}
      <div className="relative aspect-[3/4] w-full bg-gray-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          data-testid="mirror-video"
          className={`h-full w-full scale-x-[-1] object-cover ${showVideo ? "opacity-100" : "opacity-0"}`}
        />

        {/* referenceOverlay — 정적 SVG, video 위 겹쳐서 렌더 */}
        {showVideo && referenceOverlay && (
          /* eslint-disable-next-line @next/next/no-img-element -- public/mirror/*.svg 정적 자산.
             next/image 의 사이즈 최적화는 비필요 (SVG, ≤ 5KB). */
          <img
            src={`/mirror/${referenceOverlay}.svg`}
            alt={`${overlayLabel} 가이드`}
            data-testid={`mirror-overlay-${referenceOverlay}`}
            className="pointer-events-none absolute inset-0 z-10 m-auto h-3/4 w-3/4 object-contain opacity-80"
          />
        )}

        {/* 상태별 분기 — denied / unavailable / error / requesting */}
        {status === "requesting" && (
          <div
            data-testid="mirror-status-requesting"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-900 text-center text-white"
          >
            <div
              role="status"
              aria-label="카메라 준비 중"
              className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white"
            />
            <p className="text-sm">카메라 준비 중...</p>
          </div>
        )}

        {status === "denied" && (
          <div
            data-testid="mirror-status-denied"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-900 px-4 py-6 text-center text-white"
          >
            <p className="text-4xl" aria-hidden="true">🎥</p>
            <p className="text-sm font-medium">카메라 사용이 허용되지 않았어요</p>
            <p className="text-xs text-gray-300">
              주소창 왼쪽 자물쇠/카메라 아이콘에서 권한을 허용한 뒤 다시 시도해 주세요.
              (Safari · Chrome 공통)
            </p>
            <button
              type="button"
              onClick={() => void activate()}
              data-testid="mirror-retry"
              className="min-h-[44px] rounded-md bg-white px-5 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
            >
              다시 시도
            </button>
            <p className="text-xs text-gray-400">미션은 그대로 진행할 수 있어요.</p>
          </div>
        )}

        {status === "unavailable" && (
          <div
            data-testid="mirror-status-unavailable"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-900 px-4 py-6 text-center text-white"
          >
            <p className="text-4xl" aria-hidden="true">📷</p>
            <p className="text-sm font-medium">카메라가 연결되지 않았어요</p>
            <p className="text-xs text-gray-300">
              카메라 없이도 미션은 계속 진행할 수 있어요.
            </p>
          </div>
        )}

        {status === "error" && (
          <div
            data-testid="mirror-status-error"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-900 px-4 py-6 text-center text-white"
          >
            <p className="text-4xl" aria-hidden="true">⚠️</p>
            <p className="text-sm font-medium">카메라를 여는 중 문제가 생겼어요</p>
            {errorMessage && (
              <p className="text-xs text-gray-300" data-testid="mirror-error-message">
                {errorMessage}
              </p>
            )}
            <button
              type="button"
              onClick={() => void activate()}
              className="min-h-[44px] rounded-md bg-white px-5 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
            >
              다시 시도
            </button>
            <p className="text-xs text-gray-400">미션은 그대로 진행할 수 있어요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

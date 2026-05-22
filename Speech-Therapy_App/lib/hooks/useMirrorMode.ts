"use client";

// FR-Q-014 (#55) — 카메라 거울 모드 입 모양 가이드 (단순화).
//
// MVP 범위:
//   - 단순 self-view: front-facing 카메라 stream → <video> 좌우 반전 (scale-x-[-1])
//   - AI 분석 / 자동 보정 없음 — 정적 reference 오버레이만 (component 측)
//   - 권한 거부 / 디바이스 부재 graceful — 미션 진행 차단 절대 금지 (CON-04 의료 보조 도구 정책)
//
// SSR 안전:
//   - 'use client' + typeof navigator 가드 → SSR snapshot 에서는 status:"unavailable"
//   - useEffect cleanup 으로 stream tracks 정리 (메모리 leak / 카메라 indicator 잔존 방지)
//
// Sibling Agent C (FR-C-006 침묵 감지 통합) contract:
//   - 본 hook 의 시그니처는 task spec 그대로 유지 — Agent C 는 activate() 호출 + status 구독.
//   - 이벤트 (mirror_mode_activated.trigger="silence_intervention") 는 호출 측 (Agent C) 책임.

import { useCallback, useEffect, useRef, useState } from "react";

export type MirrorModeStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unavailable"
  | "error";

export interface UseMirrorModeReturn {
  /// <video> 요소에 forward 할 ref. activate() 호출 후 stream 이 .srcObject 에 attach.
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: MirrorModeStatus;
  /// 카메라 권한 요청 + stream attach. user gesture 안에서 호출 권장 (iOS Safari 정책).
  activate: () => Promise<void>;
  /// 현재 stream tracks 정리 + srcObject=null.
  deactivate: () => void;
  /// status="error" 또는 "denied" 일 때만 set. UI 카피 분기용.
  errorMessage?: string;
}

// getUserMedia 미지원 (typeof navigator === "undefined" / SSR / 구형 브라우저) 가드.
function getMediaDevices(): MediaDevices | null {
  if (typeof navigator === "undefined") return null;
  if (!navigator.mediaDevices?.getUserMedia) return null;
  return navigator.mediaDevices;
}

export function useMirrorMode(): UseMirrorModeReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<MirrorModeStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  // 내부 cleanup — stream tracks stop + videoRef.srcObject=null.
  // 외부 deactivate 와 unmount cleanup 양쪽에서 공용.
  const cleanupStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // already stopped — ignore.
        }
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      // srcObject null 대입은 일부 브라우저에서 throw — try/catch 로 보호.
      try {
        videoRef.current.srcObject = null;
      } catch {
        // ignore — 다음 attach 때 덮어씀.
      }
    }
  }, []);

  const activate = useCallback(async () => {
    const mediaDevices = getMediaDevices();
    if (!mediaDevices) {
      // SSR / 구형 브라우저 — graceful fallback.
      setStatus("unavailable");
      setErrorMessage("카메라를 사용할 수 없는 환경이에요.");
      return;
    }

    // 중복 activate — 기존 stream 정리 후 새로 요청.
    cleanupStream();
    setStatus("requesting");
    setErrorMessage(undefined);

    let stream: MediaStream | null = null;
    try {
      stream = await mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
    } catch (err) {
      // DOMException.name 기반 분기 — 다른 throw 케이스도 안전하게 폴백.
      const name = err instanceof Error ? err.name : "Error";
      const rawMessage = err instanceof Error ? err.message : String(err);
      if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
        setStatus("denied");
        setErrorMessage("카메라 사용이 허용되지 않았어요. 브라우저 설정에서 권한을 허용해 주세요.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") {
        setStatus("unavailable");
        setErrorMessage("연결된 카메라를 찾지 못했어요.");
      } else {
        setStatus("error");
        setErrorMessage(rawMessage || "카메라를 여는 중 알 수 없는 문제가 생겼어요.");
      }
      streamRef.current = null;
      return;
    }

    // getUserMedia 성공 — stream 보존 + video element 에 attach.
    // srcObject 대입은 일부 환경 (happy-dom 등) 에서 throw 가능 → try/catch 로 격리.
    // attach 실패해도 stream 자체는 살려 두고 status="active" 로 진행 — 일부 브라우저는
    // <video> mount 이후 effect 에서 재시도 가능 (호출 측 책임).
    streamRef.current = stream;
    if (videoRef.current && stream) {
      try {
        videoRef.current.srcObject = stream;
      } catch {
        // ignore — re-attach 는 ref attach 이후로.
      }
    }
    setStatus("active");
  }, [cleanupStream]);

  const deactivate = useCallback(() => {
    cleanupStream();
    setStatus("idle");
    setErrorMessage(undefined);
  }, [cleanupStream]);

  // unmount cleanup — 카메라 LED / OS indicator 잔존 방지.
  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  return { videoRef, status, activate, deactivate, errorMessage };
}

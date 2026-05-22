"use client";

// 단일 mic stream 공유 Provider (#106 후속 refactor).
//
// 배경:
//   - useAudioAnalyzer (lib/audio/analyzer.ts) 와 useSplMeter (lib/audio/useSplMeter.ts) 가
//     각자 navigator.mediaDevices.getUserMedia 를 호출해 별도 MediaStream 을 점유.
//   - 브라우저 (특히 iOS Safari) 에서 다중 stream 요청 시 권한 prompt 중복 / 트랙 충돌 가능.
//   - SpeechRecognition (Web Speech API) 은 자체 mic 관리 — 외부 stream 주입 불가 (스펙 한계).
//     → SpeechRecognition 활성 시점에는 useSplMeter / useAudioAnalyzer 둘 다 idle 유지 (호출 측 책임).
//
// 본 Provider 의 책임:
//   - getUserMedia 단일 호출 + tracks.stop 단일 cleanup.
//   - reference counter 로 다수의 consumer (useSplMeter / useAudioAnalyzer 동시 enable) 지원.
//     · 마지막 consumer 해제 시 stream 자동 종료.
//   - 권한 상태 / 에러 surface 공유 — consumer 둘 다 같은 status 확인 가능.
//
// 하위 호환:
//   - Provider 미존재 시 useOptionalMicStream() 는 null 반환 → consumer hook 들은 legacy
//     direct getUserMedia 경로로 fallback. 기존 테스트 / 기타 consumer 변경 불필요.
//
// R4 보호:
//   - stream 은 브라우저 내 RMS / FFT 측정용. raw audio 외부 전송 금지.
//   - cleanup 누락 시 mic 권한 indicator 잔존 → unmount 보호 ref 사용.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type MicStreamStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unavailable"
  | "error";

export interface MicStreamContextValue {
  /** 활성화된 공유 MediaStream. status !== "active" → null. */
  stream: MediaStream | null;
  /** 현재 lifecycle 상태. */
  status: MicStreamStatus;
  /** 마지막 에러 메시지 (status="error"/"denied"/"unavailable" 시 의미 있음). */
  errorMessage: string | null;
  /** 자녀 reference counter 가 0→1 일 때 getUserMedia 호출. 이미 active 면 no-op. */
  activate: () => Promise<void>;
  /** reference counter 감소. 마지막 release 시 tracks.stop + state="idle". */
  deactivate: () => void;
}

/**
 * Provider 가 없는 환경에서는 null 반환 — consumer hook 들은 legacy 직접 getUserMedia 경로로 fallback.
 */
const MicStreamCtx = createContext<MicStreamContextValue | null>(null);

/**
 * 공유 mic stream 을 사용한다. Provider 가 없을 경우 throw — 호출 측에서 useOptionalMicStream
 * 으로 fallback 분기를 명시할 책임.
 */
export function useMicStream(): MicStreamContextValue {
  const ctx = useContext(MicStreamCtx);
  if (!ctx) {
    throw new Error(
      "useMicStream: MicStreamProvider 가 트리 상단에 없습니다. " +
        "Provider-free 사용은 useOptionalMicStream() 로 명시적으로 처리하세요.",
    );
  }
  return ctx;
}

/**
 * Provider 가 있으면 context 반환, 없으면 null. consumer hook 들이 legacy 경로 fallback 판정에 사용.
 */
export function useOptionalMicStream(): MicStreamContextValue | null {
  return useContext(MicStreamCtx);
}

interface MicStreamProviderProps {
  children: ReactNode;
  /**
   * audio constraints. 환경 소음 측정 정확도를 위해 기본값은 ec/ns/agc 모두 OFF.
   * 호출 측에서 STT 와 stream 공유 시 (현재 본 PR 외 scope) constraints override 가능.
   */
  audioConstraints?: MediaTrackConstraints;
}

const DEFAULT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

/** SSR 안전 — navigator.mediaDevices.getUserMedia 지원 여부 검사. */
function isMicSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export function MicStreamProvider({
  children,
  audioConstraints,
}: MicStreamProviderProps): React.JSX.Element {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<MicStreamStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // reference counter — 여러 consumer 가 동시에 activate() 시 동일 stream 공유.
  // 0→1 transition 에서만 getUserMedia 호출, n→0 transition 에서 tracks.stop.
  const refCountRef = useRef(0);
  // unmount / strict mode 재실행 보호.
  const cancelledRef = useRef(false);
  // 비동기 race 보호 — activate() 가 in-flight 중 deactivate() 호출 시 stream 즉시 정리.
  const pendingActivationRef = useRef<Promise<void> | null>(null);
  // unmount cleanup 에서 setState 미반영 race 회피 — 최신 stream 을 ref 로도 보존.
  const streamRef = useRef<MediaStream | null>(null);

  // constraints 안정화 — render 마다 새 객체 시 useCallback 의존성 churn 방지.
  // 호출 측이 매번 새 객체 전달해도 effect 재실행 최소화.
  const constraints = useMemo<MediaTrackConstraints>(
    () => audioConstraints ?? DEFAULT_AUDIO_CONSTRAINTS,
    // 의도적 single-mount 안정화 — audioConstraints prop 변경 무시.
    // 변경 필요 시 Provider 자체를 remount 하도록 호출 측에 책임 이전.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const teardownStream = useCallback((s: MediaStream | null) => {
    if (!s) return;
    s.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* already stopped */
      }
    });
  }, []);

  const activate = useCallback(async (): Promise<void> => {
    refCountRef.current += 1;
    // 이미 active 거나 in-flight — 기존 stream / pending 재사용.
    if (refCountRef.current > 1) {
      if (pendingActivationRef.current) {
        await pendingActivationRef.current;
      }
      return;
    }
    if (!isMicSupported()) {
      setStatus("unavailable");
      setErrorMessage("getUserMedia 미지원 브라우저");
      // refCount 는 deactivate() 호출 시 정상 감소. 본 분기에서는 stream 없이도 unavailable surface.
      return;
    }

    setStatus("requesting");
    setErrorMessage(null);

    const pending = (async () => {
      let acquired: MediaStream | null = null;
      try {
        acquired = await navigator.mediaDevices.getUserMedia({ audio: constraints });
        if (cancelledRef.current || refCountRef.current === 0) {
          // unmount 또는 activate in-flight 중 모든 consumer deactivate — 즉시 정리.
          teardownStream(acquired);
          return;
        }
        streamRef.current = acquired;
        setStream(acquired);
        setStatus("active");
      } catch (err) {
        const isDenied =
          err instanceof Error &&
          (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
        setStatus(isDenied ? "denied" : "error");
        setErrorMessage(err instanceof Error ? err.message : String(err));
        // 실패 시 refCount 보존 — deactivate() 가 호출되어야 정상 0 으로 감소.
      } finally {
        pendingActivationRef.current = null;
      }
    })();
    pendingActivationRef.current = pending;
    await pending;
  }, [constraints, teardownStream]);

  const deactivate = useCallback((): void => {
    if (refCountRef.current === 0) return;
    refCountRef.current -= 1;
    if (refCountRef.current > 0) return;
    // 마지막 consumer 해제 — stream 정리.
    const current = streamRef.current;
    streamRef.current = null;
    teardownStream(current);
    setStream(null);
    setStatus("idle");
    setErrorMessage(null);
  }, [teardownStream]);

  // Provider unmount — 잔여 stream 강제 cleanup.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      refCountRef.current = 0;
      const current = streamRef.current;
      streamRef.current = null;
      teardownStream(current);
    };
  }, [teardownStream]);

  const value = useMemo<MicStreamContextValue>(
    () => ({ stream, status, errorMessage, activate, deactivate }),
    [stream, status, errorMessage, activate, deactivate],
  );

  return <MicStreamCtx.Provider value={value}>{children}</MicStreamCtx.Provider>;
}

/** 테스트용 — context 내부 접근. production code 직접 사용 금지. */
export const __MicStreamCtxForTest = MicStreamCtx;

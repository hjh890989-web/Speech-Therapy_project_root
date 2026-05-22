"use client";

// Sprint 3 §2 A — Web Audio API 측정 React hook.
// useSpeechRecognition 과 동일 user gesture 안에서 start() 호출 필수
// (iOS Safari + Chrome autoplay policy).
//
// #106 후속 refactor (2026-05-22):
//   - MicStreamProvider 가 트리 상단에 있으면 공유 stream 사용 (useSplMeter 와 동일 mic stream 공유).
//   - Provider 미존재 시 legacy 직접 getUserMedia 경로 유지 (기존 호출처 변경 불필요).
//   - 외부 시그니처 (start / stop / reset / features / status) 변경 없음 — 하위 호환.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  createAudioAnalyzer,
  isAudioAnalysisSupported,
  isAudioContextOnlySupported,
  type AcousticFeatures,
  type AudioAnalyzer,
} from "@/lib/audio/analyzer";
import { useOptionalMicStream } from "@/lib/audio/MicStreamProvider";

export type AudioAnalyzerStatus = "idle" | "recording" | "stopped" | "error";

export interface UseAudioAnalyzerResult {
  isSupported: boolean;
  status: AudioAnalyzerStatus;
  features: AcousticFeatures | null;
  errorMessage: string | null;
  /** 발화 시작과 동시에 호출 (user gesture 안에서). 마이크 권한 요청 트리거. */
  start: () => Promise<void>;
  /** 발화 종료 시 호출. 측정값 반환 + 내부 상태에 features 저장. */
  stop: () => AcousticFeatures;
  /** 측정 취소 (features 보존 안 함). */
  reset: () => void;
}

const noopSubscribe = () => () => {};
const getIsSupportedServer = () => false;

export function useAudioAnalyzer(): UseAudioAnalyzerResult {
  const micCtx = useOptionalMicStream();
  const sharedMode = micCtx !== null;

  // shared mode 에선 AudioContext 만 지원하면 OK (stream 은 Provider 책임).
  // legacy mode 는 getUserMedia 까지 검사.
  const getIsSupportedClient = useCallback(
    () => (sharedMode ? isAudioContextOnlySupported() : isAudioAnalysisSupported()),
    [sharedMode],
  );
  const isSupported = useSyncExternalStore(
    noopSubscribe,
    getIsSupportedClient,
    getIsSupportedServer,
  );
  const [status, setStatus] = useState<AudioAnalyzerStatus>("idle");
  const [features, setFeatures] = useState<AcousticFeatures | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  // shared mode 에서 본 hook 이 activate() 호출 후 보유한 activation 토큰 — deactivate 멱등 보장.
  const heldActivationRef = useRef(false);

  // unmount 시 마이크 트랙 cleanup (메모리 leak / 권한 indicator 잔존 방지).
  useEffect(() => {
    return () => {
      analyzerRef.current?.cancel();
      analyzerRef.current = null;
      if (heldActivationRef.current && micCtx) {
        micCtx.deactivate();
        heldActivationRef.current = false;
      }
    };
  }, [micCtx]);

  const start = useCallback(async () => {
    if (!isSupported) {
      setStatus("error");
      setErrorMessage("AudioContext / getUserMedia 미지원 브라우저");
      return;
    }
    if (analyzerRef.current) {
      // 중복 start — 이전 인스턴스 cancel + activation release.
      analyzerRef.current.cancel();
      analyzerRef.current = null;
      if (heldActivationRef.current && micCtx) {
        micCtx.deactivate();
        heldActivationRef.current = false;
      }
    }
    setErrorMessage(null);
    setFeatures(null);

    let externalStream: MediaStream | null = null;
    if (sharedMode && micCtx) {
      try {
        await micCtx.activate();
        heldActivationRef.current = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setErrorMessage(message);
        setStatus("error");
        return;
      }
      if (micCtx.status === "denied" || micCtx.status === "error" || micCtx.status === "unavailable") {
        setErrorMessage(micCtx.errorMessage ?? "mic stream 활성화 실패");
        setStatus("error");
        if (heldActivationRef.current) {
          micCtx.deactivate();
          heldActivationRef.current = false;
        }
        return;
      }
      externalStream = micCtx.stream;
    }

    const analyzer = createAudioAnalyzer({ externalStream });
    analyzerRef.current = analyzer;
    try {
      await analyzer.start();
      setStatus("recording");
    } catch (err) {
      analyzerRef.current = null;
      if (heldActivationRef.current && micCtx) {
        micCtx.deactivate();
        heldActivationRef.current = false;
      }
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
      setStatus("error");
    }
  }, [isSupported, sharedMode, micCtx]);

  const stop = useCallback((): AcousticFeatures => {
    if (!analyzerRef.current) {
      const empty: AcousticFeatures = {
        pitchMean: null,
        pitchStd: null,
        durationSec: null,
        energy: null,
      };
      return empty;
    }
    const result = analyzerRef.current.stop();
    analyzerRef.current = null;
    if (heldActivationRef.current && micCtx) {
      micCtx.deactivate();
      heldActivationRef.current = false;
    }
    setFeatures(result);
    setStatus("stopped");
    return result;
  }, [micCtx]);

  const reset = useCallback(() => {
    if (analyzerRef.current) {
      analyzerRef.current.cancel();
      analyzerRef.current = null;
    }
    if (heldActivationRef.current && micCtx) {
      micCtx.deactivate();
      heldActivationRef.current = false;
    }
    setFeatures(null);
    setErrorMessage(null);
    setStatus("idle");
  }, [micCtx]);

  return { isSupported, status, features, errorMessage, start, stop, reset };
}

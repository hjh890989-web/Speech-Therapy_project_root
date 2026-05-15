"use client";

// Sprint 3 §2 A — Web Audio API 측정 React hook.
// useSpeechRecognition 과 동일 user gesture 안에서 start() 호출 필수
// (iOS Safari + Chrome autoplay policy).

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  createAudioAnalyzer,
  isAudioAnalysisSupported,
  type AcousticFeatures,
  type AudioAnalyzer,
} from "@/lib/audio/analyzer";

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
const getIsSupportedClient = () => isAudioAnalysisSupported();
const getIsSupportedServer = () => false;

export function useAudioAnalyzer(): UseAudioAnalyzerResult {
  const isSupported = useSyncExternalStore(
    noopSubscribe,
    getIsSupportedClient,
    getIsSupportedServer,
  );
  const [status, setStatus] = useState<AudioAnalyzerStatus>("idle");
  const [features, setFeatures] = useState<AcousticFeatures | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);

  // unmount 시 마이크 트랙 cleanup (메모리 leak / 권한 indicator 잔존 방지).
  useEffect(() => {
    return () => {
      analyzerRef.current?.cancel();
      analyzerRef.current = null;
    };
  }, []);

  const start = useCallback(async () => {
    if (!isSupported) {
      setStatus("error");
      setErrorMessage("AudioContext / getUserMedia 미지원 브라우저");
      return;
    }
    if (analyzerRef.current) {
      // 중복 start — 이전 인스턴스 cancel.
      analyzerRef.current.cancel();
      analyzerRef.current = null;
    }
    const analyzer = createAudioAnalyzer();
    analyzerRef.current = analyzer;
    setErrorMessage(null);
    setFeatures(null);
    try {
      await analyzer.start();
      setStatus("recording");
    } catch (err) {
      analyzerRef.current = null;
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
      setStatus("error");
    }
  }, [isSupported]);

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
    setFeatures(result);
    setStatus("stopped");
    return result;
  }, []);

  const reset = useCallback(() => {
    if (analyzerRef.current) {
      analyzerRef.current.cancel();
      analyzerRef.current = null;
    }
    setFeatures(null);
    setErrorMessage(null);
    setStatus("idle");
  }, []);

  return { isSupported, status, features, errorMessage, start, stop, reset };
}

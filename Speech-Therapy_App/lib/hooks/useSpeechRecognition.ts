"use client";

// FR-Q-001 — Web Speech API 통합 훅 (한국어 STT, SSR-safe).
// REQ-FUNC-003~007 + 마이크 권한·무음·네트워크 등 5종 에러 매핑.
//
// SSR Hydration 안전성:
// - isSupported 는 useSyncExternalStore 로 처리해 서버 (false) ↔ hydration (false) ↔
//   mount 후 (true) 가 자연스럽게 reconcile 되도록 함. 서버/클라이언트 분기로 인한
//   hydration mismatch 발생 안 함.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// ----- 브라우저 전역 타입 (TS dom lib 에 webkit prefixed 정의 없음) -----
type WebSpeechRecognitionEvent = {
  results: {
    0: {
      0: { transcript: string; confidence: number };
      isFinal: boolean;
    };
  };
};
type WebSpeechRecognitionErrorEvent = { error: string; message?: string };
type WebSpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};
type WebSpeechRecognitionConstructor = new () => WebSpeechRecognitionInstance;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: WebSpeechRecognitionConstructor;
  webkitSpeechRecognition?: WebSpeechRecognitionConstructor;
};

export type SpeechRecognitionStatus =
  | "idle"
  | "listening"
  | "result"
  | "error";

export type SpeechRecognitionErrorCode =
  | "not_supported"
  | "permission_denied"
  | "no_speech"
  | "audio_capture"
  | "network"
  | "aborted"
  | "unknown";

export interface UseSpeechRecognitionResult {
  status: SpeechRecognitionStatus;
  transcript: string;
  confidence: number | null;
  errorCode: SpeechRecognitionErrorCode | null;
  isSupported: boolean;
  /// mount 완료 여부. 첫 paint 에는 false. SSR placeholder 분기에 사용.
  isMounted: boolean;
  /// 발화 시작.
  start: () => void;
  /// 발화 중단 + 현재까지의 결과 보존.
  stop: () => void;
  /// transcript / error / status 를 idle 로 리셋.
  reset: () => void;
}

function getRecognitionConstructor(): WebSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as SpeechRecognitionWindow;
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

function mapErrorCode(error: string): SpeechRecognitionErrorCode {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "permission_denied";
    case "no-speech":
      return "no_speech";
    case "audio-capture":
      return "audio_capture";
    case "network":
      return "network";
    case "aborted":
      return "aborted";
    default:
      return "unknown";
  }
}

// useSyncExternalStore: subscribe 는 noop (값이 변하지 않으므로),
// client snapshot 은 실제 window 검사, server snapshot 은 false 고정.
const noopSubscribe = () => () => {};
const getIsSupportedClient = () => getRecognitionConstructor() !== null;
const getIsSupportedServer = () => false;
const getIsMountedClient = () => true;
const getIsMountedServer = () => false;

export function useSpeechRecognition(options: { lang?: string } = {}): UseSpeechRecognitionResult {
  const lang = options.lang ?? "ko-KR";
  const isSupported = useSyncExternalStore(
    noopSubscribe,
    getIsSupportedClient,
    getIsSupportedServer,
  );
  const isMounted = useSyncExternalStore(
    noopSubscribe,
    getIsMountedClient,
    getIsMountedServer,
  );
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [errorCodeState, setErrorCodeState] = useState<SpeechRecognitionErrorCode | null>(null);
  const recognitionRef = useRef<WebSpeechRecognitionInstance | null>(null);

  // Mount 후 isSupported=true 가 되면 instance 생성.
  useEffect(() => {
    if (!isSupported) return;
    const Constructor = getRecognitionConstructor();
    if (!Constructor) return;
    const instance = new Constructor();
    instance.lang = lang;
    instance.continuous = false;
    instance.interimResults = false;
    instance.onresult = (event) => {
      const result = event.results[0]?.[0];
      if (result) {
        setTranscript(result.transcript);
        setConfidence(result.confidence);
        setStatus("result");
      }
    };
    instance.onerror = (event) => {
      setErrorCodeState(mapErrorCode(event.error));
      setStatus("error");
    };
    instance.onend = () => {
      setStatus((current) => (current === "listening" ? "idle" : current));
    };
    recognitionRef.current = instance;
    return () => {
      try {
        instance.stop();
      } catch {
        // already stopped — ignore
      }
      recognitionRef.current = null;
    };
  }, [isSupported, lang]);

  // 미지원 환경에선 errorCode 를 not_supported 로 계산값으로 노출.
  const errorCode: SpeechRecognitionErrorCode | null =
    errorCodeState ?? (isMounted && !isSupported ? "not_supported" : null);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript("");
    setConfidence(null);
    setErrorCodeState(null);
    setStatus("listening");
    try {
      recognitionRef.current.start();
    } catch {
      // 이미 listening 중이면 throw — 무시.
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setConfidence(null);
    setErrorCodeState(null);
    setStatus("idle");
  }, []);

  return { status, transcript, confidence, errorCode, isSupported, isMounted, start, stop, reset };
}

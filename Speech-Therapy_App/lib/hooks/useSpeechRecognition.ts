"use client";

// FR-Q-001 — Web Speech API 통합 훅 (한국어 STT).
// REQ-FUNC-003~007: 마이크 권한 거부 / STT 실패 / 60dB 소음 등 예외 처리.
// 후속 FR-C-003 가 1회 재시도 로직을 호출 측에서 추가.

import { useCallback, useEffect, useRef, useState } from "react";

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
  /// 발화 시작.
  start: () => void;
  /// 발화 중단 + 현재까지의 결과 보존.
  stop: () => void;
  /// transcript / error / status 를 idle 로 리셋.
  reset: () => void;
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

function getRecognitionConstructor(): WebSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as SpeechRecognitionWindow;
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(options: { lang?: string } = {}): UseSpeechRecognitionResult {
  const lang = options.lang ?? "ko-KR";
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  // Lazy init: 첫 render 전에 평가. SSR 에선 false 로 시작하고 client mount 시 갱신 안 함.
  const [isSupported] = useState<boolean>(() => getRecognitionConstructor() !== null);
  const [errorCode, setErrorCode] = useState<SpeechRecognitionErrorCode | null>(() =>
    typeof window !== "undefined" && getRecognitionConstructor() === null ? "not_supported" : null,
  );
  const recognitionRef = useRef<WebSpeechRecognitionInstance | null>(null);

  useEffect(() => {
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
      setErrorCode(mapErrorCode(event.error));
      setStatus("error");
    };
    instance.onend = () => {
      // result 또는 error 핸들러가 status 를 이미 갱신했을 가능성. listening 만 idle 로.
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
  }, [lang]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript("");
    setConfidence(null);
    setErrorCode(null);
    setStatus("listening");
    try {
      recognitionRef.current.start();
    } catch (err) {
      // start() 호출이 listening 상태 중복일 때 throw — 무시.
      void err;
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
    setErrorCode(null);
    setStatus("idle");
  }, []);

  return { status, transcript, confidence, errorCode, isSupported, start, stop, reset };
}

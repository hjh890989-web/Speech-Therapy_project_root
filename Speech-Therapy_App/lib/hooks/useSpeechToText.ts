"use client";

// FR-Q-022 — Web Speech API STT (음성 → 텍스트) Client Hook.
//
// /chat 입력에서 아이 발화를 음성으로 받아 텍스트로 변환 (부모가 타이핑 대신 말하기).
// 미지원 브라우저(일부 Firefox/iOS) → supported=false → 호출 측이 마이크 버튼 미노출.
//
// R4: transcript 는 onResult 콜백으로만 전달 — 본 hook 은 저장/전송 안 함(호출 측 책임).
// CON-04: 주석/식별자에 "치료/진단/장애" 금칙어 0건.

import { useCallback, useEffect, useRef, useState } from "react";

// SpeechRecognition 의 최소 타입 — lib.dom 에 미보장이라 런타임 feature-detect + 좁은 인터페이스.
interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
}
interface SpeechRecognitionEventLike {
  readonly results: ArrayLike<ArrayLike<SpeechRecognitionAlternativeLike>>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** 브라우저가 Web Speech API STT 를 지원하는지. */
export function isSpeechToTextSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export interface UseSpeechToText {
  /// STT 지원 브라우저 여부 (false 시 마이크 버튼 미노출).
  supported: boolean;
  /// 현재 음성 인식 중.
  listening: boolean;
  /// 인식 시작.
  start: () => void;
  /// 인식 중지.
  stop: () => void;
}

/**
 * Web Speech API STT hook.
 *
 * @param onResult 인식된 최종 transcript(trim) 1건 콜백.
 * @param lang     인식 언어 (default ko-KR).
 */
export function useSpeechToText(
  onResult: (text: string) => void,
  lang = "ko-KR",
): UseSpeechToText {
  const [supported] = useState<boolean>(() => isSpeechToTextSupported());
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  // 최신 콜백 참조 (start 의 closure 가 stale 되지 않도록). ref 갱신은 effect 에서 —
  // render 중 ref.current 변경 금지(react-hooks/refs). onResult 는 STT 결과 콜백(start 이후
  // 비동기 이벤트)에서만 읽히므로 effect 시점 갱신으로 항상 최신 반영.
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      // graceful — 이미 중지/미시작.
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    try {
      const rec = new Ctor();
      rec.lang = lang;
      rec.interimResults = false;
      rec.continuous = false;
      rec.onresult = (event) => {
        const transcript = event?.results?.[0]?.[0]?.transcript;
        if (typeof transcript === "string" && transcript.trim().length > 0) {
          onResultRef.current(transcript.trim());
        }
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [lang]);

  // 언마운트 시 진행 중 인식 정리.
  useEffect(
    () => () => {
      try {
        recRef.current?.stop();
      } catch {
        // graceful.
      }
    },
    [],
  );

  return { supported, listening, start, stop };
}

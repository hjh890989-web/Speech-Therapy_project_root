"use client";

// FR-C-006 — 미션 진행 중 N초 침묵 감지 (Sprint 1 단순화).
//
// AnalyserNode dB 측정 대신 명시적 발화 이벤트 (`reportSpeech()`) 기반.
// 호출부가 useSpeechRecognition 의 onspeechstart / onresult 시점에 reportSpeech() 호출.
// 마이크 권한 미허용 / 비활성 환경에서도 동작 (단순 setInterval 카운터).
//
// 분기 정책 (REQ-FUNC-019):
// - silenceMs > thresholdMs → onSilenceExceeded 1회 호출 (mirror | tooltip 50:50 결정적)

import { useCallback, useEffect, useRef, useState } from "react";

export type SilenceIntervention = "mirror" | "tooltip";

export interface UseSilenceDetectionOptions {
  /// 침묵 임계 (ms). 기본 60_000 (60s).
  thresholdMs?: number;
  /// 카운터 tick 주기 (ms). 기본 500ms.
  tickMs?: number;
  /// 임계 초과 시 1회 호출.
  onSilenceExceeded?: (intervention: SilenceIntervention) => void;
  /// 활성화 여부. false 면 카운터 정지.
  enabled?: boolean;
}

export interface UseSilenceDetectionReturn {
  silenceMs: number;
  intervention: SilenceIntervention | null;
  reportSpeech: () => void;
  reset: () => void;
}

export function useSilenceDetection(
  options: UseSilenceDetectionOptions = {},
): UseSilenceDetectionReturn {
  const { thresholdMs = 60_000, tickMs = 500, onSilenceExceeded, enabled = true } = options;
  const [silenceMs, setSilenceMs] = useState(0);
  const [intervention, setIntervention] = useState<SilenceIntervention | null>(null);
  // 0 = "아직 mount 전". mount effect 에서 Date.now() 로 초기화.
  const lastSpeechAtRef = useRef<number>(0);
  const exceededRef = useRef(false);

  const reset = useCallback(() => {
    lastSpeechAtRef.current = Date.now();
    exceededRef.current = false;
    setSilenceMs(0);
    setIntervention(null);
  }, []);

  const reportSpeech = useCallback(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (!enabled) return;
    if (lastSpeechAtRef.current === 0) lastSpeechAtRef.current = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - lastSpeechAtRef.current;
      setSilenceMs(elapsed);
      if (!exceededRef.current && elapsed >= thresholdMs) {
        exceededRef.current = true;
        // 50:50 결정적 분기 — Math.random 회피로 시드 의존 없는 단순 모드.
        const choice: SilenceIntervention = lastSpeechAtRef.current % 2 === 0 ? "mirror" : "tooltip";
        setIntervention(choice);
        onSilenceExceeded?.(choice);
      }
    }, tickMs);
    return () => window.clearInterval(id);
  }, [enabled, thresholdMs, tickMs, onSilenceExceeded]);

  return { silenceMs, intervention, reportSpeech, reset };
}

"use client";

// FR-Q-003-CONTENT-V3 — 미션 안에서 사용자 발화 감지 (Voice Activity Detection).
//
// 목적:
//   - 미션 안에서 사용자가 발화했는지 감지해 micro-feedback 표시 + intervention 침묵 카운터 reset.
//   - 절대 점수/평가가 아님 (CON-04 의료 disclaimer 유지). engagement loop 의 보조 신호.
//
// 설계:
//   - useSplMeter 의 currentDb (100ms tick) 를 input 으로 받아 speech state 만 추적.
//   - 별도 AnalyserNode 만들지 않음 — single source of truth + 추가 overhead 0.
//   - 임계 도달 후 minDurationMs 유지 → isSpeaking=true (speechCount++ + lastSpeechAt 갱신).
//   - 임계 아래로 silenceMs 유지 → isSpeaking=false 로 전환.
//
// 디바이스 보정 한계:
//   - currentDb 는 useSplMeter 의 SPL-like 추정값 (절대 보정 X) — 디바이스마다 ±10dB 오차.
//   - speech 임계 (default 40dB) 는 일반적인 노트북 마이크 기준 "조용한 환경에서의 발화" 수준.
//   - calibration 미설정 시 fallback (SPL offset 100) 기준이므로 환경/디바이스에 따라 가변.
//   - 본 hook 의 책임은 "발화 boolean 감지" 뿐 — 정확도 측정 X.

import { useEffect, useRef, useState } from "react";

export interface UseVoiceActivityArgs {
  /// useSplMeter 의 currentDb. null = 측정 전 / idle / error.
  currentDb: number | null;
  /// true 일 때만 감지 활성. false → isSpeaking=false 로 리셋.
  enabled: boolean;
  /// 발화 임계 (dB SPL-like). default 40.
  thresholdDb?: number;
  /// 임계 위로 minDurationMs 이상 유지되어야 isSpeaking=true. default 150.
  minDurationMs?: number;
  /// 임계 아래로 silenceMs 이상 유지되면 isSpeaking=false 로 전환. default 400.
  silenceMs?: number;
}

export interface UseVoiceActivityReturn {
  /// 현재 발화 중인지.
  isSpeaking: boolean;
  /// session 단위 누적 speech detect 횟수 (idle → speaking 전환 count).
  speechCount: number;
  /// 마지막 speech 감지 시각 (ms epoch). null = 한 번도 감지 안 됨.
  /// 호출 측은 이 값 변경을 dep 으로 reportSpeech() 등 side-effect 트리거 가능.
  lastSpeechAt: number | null;
}

const DEFAULT_THRESHOLD_DB = 40;
const DEFAULT_MIN_DURATION_MS = 150;
const DEFAULT_SILENCE_MS = 400;

export function useVoiceActivity(args: UseVoiceActivityArgs): UseVoiceActivityReturn {
  const {
    currentDb,
    enabled,
    thresholdDb = DEFAULT_THRESHOLD_DB,
    minDurationMs = DEFAULT_MIN_DURATION_MS,
    silenceMs = DEFAULT_SILENCE_MS,
  } = args;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechCount, setSpeechCount] = useState(0);
  const [lastSpeechAt, setLastSpeechAt] = useState<number | null>(null);

  // above-threshold 첫 진입 시각 — minDurationMs 도달 시 speech 판정.
  const aboveSinceRef = useRef<number | null>(null);
  // silence 전환 timeout — currentDb 가 동일 값으로 유지돼도 시간 기반 false 전환 보장.
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // unmount 시 timeout 정리.
  useEffect(
    () => () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) {
      aboveSinceRef.current = null;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      if (isSpeaking) setIsSpeaking(false);
      return;
    }
    if (currentDb === null) return;

    const now = Date.now();

    if (currentDb >= thresholdDb) {
      // continuous speech → silence timer 취소 (전환 미정).
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      if (aboveSinceRef.current === null) {
        aboveSinceRef.current = now;
      }
      const elapsed = now - aboveSinceRef.current;
      if (elapsed >= minDurationMs && !isSpeaking) {
        setIsSpeaking(true);
        setSpeechCount((c) => c + 1);
        setLastSpeechAt(now);
      }
    } else {
      aboveSinceRef.current = null;
      // 발화 중이고 silence timer 미등록 → silenceMs 후 false 전환 예약.
      // currentDb 가 같은 값으로 유지돼 effect 재실행 안 돼도 timeout 으로 보장.
      if (isSpeaking && silenceTimeoutRef.current === null) {
        silenceTimeoutRef.current = setTimeout(() => {
          setIsSpeaking(false);
          silenceTimeoutRef.current = null;
        }, silenceMs);
      }
    }
  }, [currentDb, enabled, thresholdDb, minDurationMs, silenceMs, isSpeaking]);

  return { isSpeaking, speechCount, lastSpeechAt };
}

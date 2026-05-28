"use client";

// FR-Q-003-CONTENT-V3 — 미션 안에서 사용자 발화 감지 (Voice Activity Detection).
//
// 목적:
//   - 미션 안에서 사용자가 발화했는지 감지해 micro-feedback 표시 + intervention 침묵 카운터 reset.
//   - 절대 점수/평가가 아님 (CON-04 의료 disclaimer 유지). engagement loop 의 보조 신호.
//
// 설계 (v2 — baseline + dynamic threshold):
//   - useSplMeter 의 currentDb (100ms tick) 를 input 으로 받아 speech state 만 추적.
//   - 별도 AnalyserNode 만들지 않음 — single source of truth + 추가 overhead 0.
//   - 시작 직후 baselineSamples 개 (default 10 = 1초) 동안 baseline 평균 측정.
//   - baseline 측정 후: currentDb > baselineDb + baselineOffsetDb 일 때만 speech.
//   - 정적 임계 (예: 40dB) 가 디바이스마다 baseline 차이로 false trigger 되는 문제 해결.
//
// 임계 도달 후 minDurationMs 유지 → isSpeaking=true (speechCount++ + lastSpeechAt 갱신).
// 임계 아래로 silenceMs 유지 → isSpeaking=false 로 전환 (setTimeout 기반).
//
// 디바이스 보정 한계:
//   - currentDb 는 useSplMeter 의 SPL-like 추정값 (절대 보정 X).
//   - 본 hook 은 baseline 기준 상대 비교만 — calibration 미설정 환경에서도 동작.
//   - baseline 측정 1초 동안에는 isSpeaking=false 고정 (false trigger 방지).
//   - 미션 시작 직후 1초간 사용자가 발화 안 한다고 가정 — 정상 흐름과 일치.

import { useEffect, useRef, useState } from "react";

export interface UseVoiceActivityArgs {
  /// useSplMeter 의 currentDb. null = 측정 전 / idle / error.
  currentDb: number | null;
  /// true 일 때만 감지 활성. false → isSpeaking=false 로 리셋.
  enabled: boolean;
  /// baseline 위로 이 dB 이상이면 speech 판정. default 10.
  baselineOffsetDb?: number;
  /// baseline 측정 sample 수 (= 100ms tick × N). default 10 (= 1초).
  baselineSamples?: number;
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
  /// 측정된 baseline dB (디버그/조정용). null = 측정 전.
  baselineDb: number | null;
}

const DEFAULT_BASELINE_OFFSET_DB = 10;
const DEFAULT_BASELINE_SAMPLES = 10;
const DEFAULT_MIN_DURATION_MS = 150;
const DEFAULT_SILENCE_MS = 400;

export function useVoiceActivity(args: UseVoiceActivityArgs): UseVoiceActivityReturn {
  const {
    currentDb,
    enabled,
    baselineOffsetDb = DEFAULT_BASELINE_OFFSET_DB,
    baselineSamples = DEFAULT_BASELINE_SAMPLES,
    minDurationMs = DEFAULT_MIN_DURATION_MS,
    silenceMs = DEFAULT_SILENCE_MS,
  } = args;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechCount, setSpeechCount] = useState(0);
  const [lastSpeechAt, setLastSpeechAt] = useState<number | null>(null);
  const [baselineDb, setBaselineDb] = useState<number | null>(null);

  // baseline 측정용 sample 누적.
  const baselineBufferRef = useRef<number[]>([]);
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

  // enabled false 전환 시 모든 상태 reset (다음 enable 시 baseline 재측정).
  useEffect(() => {
    if (!enabled) {
      baselineBufferRef.current = [];
      aboveSinceRef.current = null;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      if (isSpeaking) setIsSpeaking(false);
      if (baselineDb !== null) setBaselineDb(null);
    }
  }, [enabled, isSpeaking, baselineDb]);

  useEffect(() => {
    if (!enabled) return;
    if (currentDb === null) return;

    // ── Phase 1: baseline 측정 (sample N 개 누적) ──
    if (baselineDb === null) {
      baselineBufferRef.current.push(currentDb);
      if (baselineBufferRef.current.length >= baselineSamples) {
        const sum = baselineBufferRef.current.reduce((a, b) => a + b, 0);
        const avg = sum / baselineBufferRef.current.length;
        setBaselineDb(avg);
      }
      return; // baseline 측정 중에는 speech 감지 비활성.
    }

    // ── Phase 2: speech 감지 (baseline + offset 기준) ──
    const effectiveThreshold = baselineDb + baselineOffsetDb;
    const now = Date.now();

    if (currentDb >= effectiveThreshold) {
      // continuous speech → silence timer 취소.
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
      if (isSpeaking && silenceTimeoutRef.current === null) {
        silenceTimeoutRef.current = setTimeout(() => {
          setIsSpeaking(false);
          silenceTimeoutRef.current = null;
        }, silenceMs);
      }
    }
  }, [
    currentDb,
    enabled,
    baselineDb,
    baselineOffsetDb,
    baselineSamples,
    minDurationMs,
    silenceMs,
    isSpeaking,
  ]);

  return { isSpeaking, speechCount, lastSpeechAt, baselineDb };
}

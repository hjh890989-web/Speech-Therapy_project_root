"use client";

// REQ-FUNC-007 — 60dB SPL 게이트 (환경 소음 측정 + Toast 트리거 hook).
//
// 본 hook 은 마이크 stream 으로부터 RMS 를 100ms 마다 측정하고, 일정 시간 (default 5s)
// 동안 평균 SPL-like dB 가 threshold (default 60dB) 를 초과하면 isOverThreshold 를
// 활성화한다. 호출자는 isOverThreshold + overThresholdMs >= persistMs 조합으로 Toast 노출
// 시점을 결정한다.
//
// 측정 방식 (SPL "유사" 추정 — 절대 보정 불가):
//   1) MediaStream 획득 — 우선순위:
//      a) MicStreamProvider context 가 있으면 공유 stream 사용 (#106 refactor — useAudioAnalyzer 와 공유).
//      b) Provider 미존재 시 navigator.mediaDevices.getUserMedia({ audio: { ec/ns/agc: false } })
//         → 환경 소음 측정 위해 echoCancellation/noiseSuppression/autoGainControl 모두 OFF.
//      ※ 하위 호환 — 기존 단독 사용처는 Provider 없이도 그대로 동작.
//   2) AudioContext + AnalyserNode (fftSize 1024) → getByteTimeDomainData
//   3) byte 샘플 [0..255] → centered [-1..1] → RMS = sqrt(mean(x^2))
//   4) dBFS = 20 * log10(rms) — full-scale 기준 음의 값 (0dBFS 가 최대).
//   5) SPL-like 추정: dBFS + SPL_OFFSET_DB (default 100) → 일반적인 노트북 마이크 SPL 추정
//      ※ 절대 보정 X. 디바이스/드라이버/Gain 에 따라 ±10dB 오차 가능. 상대 비교 목적만.
//
// 5초 지속 판정 정책:
//   - tick 마다 currentDb 계산.
//   - currentDb >= thresholdDb 이면 overSince 마커 (시각) 설정 + overThresholdMs = now - overSince.
//   - currentDb < thresholdDb 이면 overSince null 로 리셋 (single below-threshold tick 이라도 카운터 reset
//     → 자녀 발화 등 짧은 spike 가 아닌 "지속적 환경 소음" 만 트리거).
//   - persistMs 도달 시점부터 isOverThreshold=true. 호출 측은 1회만 Toast trigger 책임.
//
// SSR / 미지원 환경 / 권한 거부:
//   - typeof window === "undefined" → status:"unsupported", currentDb:null.
//   - AudioContext (or webkitAudioContext) 미존재 → status:"unsupported".
//   - getUserMedia reject → status:"error".
//
// R4 보호: 마이크 stream 은 로컬 RMS 계산용만. raw audio / fft data 외부 전송 절대 금지.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useOptionalMicStream } from "@/lib/audio/MicStreamProvider";
import { getCalibrationOffset } from "@/lib/audio/spl-calibration";

export interface UseSplMeterArgs {
  /// true 일 때만 mic stream 점유 + 측정. false → idle.
  enabled: boolean;
  /// 초과 판정 임계 (dB SPL-like). default 60.
  thresholdDb?: number;
  /// 초과 상태가 이 시간 (ms) 이상 지속되면 isOverThreshold=true. default 5000.
  persistMs?: number;
  /// 측정 주기 (ms). default 100.
  tickMs?: number;
  /// SPL 보정 offset (dBFS → SPL-like 변환).
  ///   - 미지정 시 lib/audio/spl-calibration 의 getCalibrationOffset() 결과 사용
  ///     (사용자가 /settings/calibration 에서 저장한 디바이스별 offset → localStorage).
  ///   - 미보정 / SSR / localStorage 사용 불가 → DEFAULT_SPL_OFFSET_DB (100) 로 fallback.
  ///   - 명시 호출 (DiagnosisForm 등 외부 호출처 포함) 시 prop 값을 우선 — 하위 호환 100%.
  splOffsetDb?: number;
}

export interface UseSplMeterReturn {
  /// 가장 최근 tick 의 SPL-like dB. 측정 전 / idle / error → null.
  currentDb: number | null;
  /// persistMs 이상 threshold 초과 상태가 지속되면 true.
  isOverThreshold: boolean;
  /// 현재 threshold 초과 지속 시간 (ms). below-threshold tick 발생 시 0 으로 리셋.
  overThresholdMs: number;
  /// 측정 lifecycle 상태.
  status: "idle" | "measuring" | "error" | "unsupported";
  /// threshold 초과 동안 관측한 최대 dB (Toast 분석 이벤트의 peakDb 용).
  peakDb: number;
}

const DEFAULT_THRESHOLD_DB = 60;
const DEFAULT_PERSIST_MS = 5_000;
const DEFAULT_TICK_MS = 100;
// Default SPL offset 은 lib/audio/spl-calibration 의 DEFAULT_OFFSET (100) 로 단일 출처화.
// 호출 측에서 splOffsetDb 미지정 시 getCalibrationOffset() (localStorage → 100 fallback) 가 자동 활용.
const FFT_SIZE = 1024;

interface AudioContextWindow extends Window {
  AudioContext: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

/** SSR 안전 — AudioContext + getUserMedia 지원 여부 검사. */
function isSplMeterSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
  const w = window as unknown as AudioContextWindow;
  return Boolean(w.AudioContext ?? w.webkitAudioContext);
}

/** AudioContext 만 단독 검사 — Provider 가 stream 을 책임지는 경로용. */
function isAudioContextSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as AudioContextWindow;
  return Boolean(w.AudioContext ?? w.webkitAudioContext);
}

export function useSplMeter(args: UseSplMeterArgs): UseSplMeterReturn {
  const {
    enabled,
    thresholdDb = DEFAULT_THRESHOLD_DB,
    persistMs = DEFAULT_PERSIST_MS,
    tickMs = DEFAULT_TICK_MS,
    splOffsetDb,
  } = args;

  // calibration default 해상: prop 명시 → 그 값 / 미지정 → localStorage (없으면 100).
  // mount 시 1회 평가 — 본 hook 의 effect dep 으로 들어가 stream/interval 재구성 트리거.
  // 사용자가 /settings/calibration 에서 값을 바꿔도 다음 mount/페이지 진입 시 반영.
  const resolvedSplOffsetDb = useMemo(() => {
    if (splOffsetDb !== undefined) return splOffsetDb;
    // SSR 안전 — getCalibrationOffset 자체가 window 가드 + DEFAULT_OFFSET fallback.
    return getCalibrationOffset();
    // 의도적 single-mount 평가 — splOffsetDb prop 변경만 재계산.
    // calibration 갱신 후 즉시 반영이 필요한 페이지는 prop 명시 또는 hook 호출 컴포넌트 remount.
  }, [splOffsetDb]);

  const micCtx = useOptionalMicStream();
  const sharedMode = micCtx !== null;

  const [currentDb, setCurrentDb] = useState<number | null>(null);
  const [isOverThreshold, setIsOverThreshold] = useState(false);
  const [overThresholdMs, setOverThresholdMs] = useState(0);
  // internalStatus 는 effect 안에서 async 콜백으로만 갱신 ("measuring" / "error").
  // "idle" / "unsupported" 는 enabled + 환경 능력 으로 derived — render 시 계산.
  const [internalStatus, setInternalStatus] = useState<"measuring" | "error" | null>(null);
  const [peakDb, setPeakDb] = useState(-Infinity);

  // SSR 안전 — render 시 1회 평가. enabled toggle 시 status 재계산.
  // shared mode 에선 AudioContext 만 검사 (stream 은 Provider 책임).
  const supported = useMemo(
    () => (sharedMode ? isAudioContextSupported() : isSplMeterSupported()),
    [sharedMode],
  );

  // shared mode 의 권한 거부 / 미지원 surface — Provider context 의 상태를 반영.
  const sharedFailed = sharedMode && (micCtx.status === "denied" || micCtx.status === "error");
  const sharedUnavailable = sharedMode && micCtx.status === "unavailable";

  const status: UseSplMeterReturn["status"] = !enabled
    ? "idle"
    : !supported || sharedUnavailable
      ? "unsupported"
      : sharedFailed
        ? "error"
        : (internalStatus ?? "idle");

  // 측정 리소스 ref — re-render 격리.
  const audioContextRef = useRef<AudioContext | null>(null);
  // legacy direct mode 에서만 hook 이 stream 소유. shared mode 는 Provider 가 소유.
  const ownedStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const overSinceRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const teardownResources = useCallback(() => {
    if (tickIntervalRef.current !== null) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (ownedStreamRef.current) {
      ownedStreamRef.current.getTracks().forEach((t) => t.stop());
      ownedStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {
        /* 이미 닫힌 컨텍스트 무시 */
      });
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    overSinceRef.current = null;
  }, []);

  // ── Shared mode: Provider 의 activate/deactivate 만 enabled 와 동기화 ──
  // Provider 가 stream 을 제공하면 별도 effect 에서 AnalyserNode 연결.
  const activateRef = useRef(micCtx?.activate);
  const deactivateRef = useRef(micCtx?.deactivate);
  useEffect(() => {
    activateRef.current = micCtx?.activate;
    deactivateRef.current = micCtx?.deactivate;
  }, [micCtx?.activate, micCtx?.deactivate]);

  useEffect(() => {
    if (!sharedMode) return;
    if (!enabled) return;
    if (!isAudioContextSupported()) return;
    const act = activateRef.current;
    if (!act) return;
    void act();
    return () => {
      const deact = deactivateRef.current;
      if (deact) deact();
    };
  }, [sharedMode, enabled]);

  // ── 측정 effect: stream 확보 후 AnalyserNode + 100ms tick 시작 ──
  useEffect(() => {
    if (!enabled) {
      // 비활성 → cleanup 함수가 (이전 enabled=true effect run 의 cleanup) 리소스/상태 리셋.
      // 본 effect body 에선 setState 회피 (react-hooks/set-state-in-effect).
      return;
    }

    if (sharedMode) {
      // Provider 의 stream 이 도착할 때까지 대기. status="active" + stream 존재 시점에 측정 시작.
      if (!micCtx || micCtx.status !== "active" || !micCtx.stream) {
        return;
      }
    } else if (!isSplMeterSupported()) {
      // legacy mode + 환경 미지원 — status 는 derived 로 "unsupported".
      return;
    }

    cancelledRef.current = false;

    const w = window as unknown as AudioContextWindow;
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctx) {
      return;
    }

    let localStream: MediaStream | null = null;
    let localCtx: AudioContext | null = null;

    (async () => {
      try {
        if (sharedMode) {
          // Provider stream 재사용 — hook 이 소유하지 않으므로 cleanup 시 tracks.stop 호출 금지.
          localStream = micCtx!.stream;
        } else {
          localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          });
          if (cancelledRef.current) {
            localStream.getTracks().forEach((t) => t.stop());
            return;
          }
          ownedStreamRef.current = localStream;
        }

        if (!localStream) {
          // shared mode 에서 stream 이 null 로 변한 경우 (Provider race) — no-op.
          return;
        }

        localCtx = new Ctx();
        if (localCtx.state === "suspended") {
          await localCtx.resume();
        }
        if (cancelledRef.current) {
          localCtx.close().catch(() => {});
          return;
        }
        audioContextRef.current = localCtx;

        const source = localCtx.createMediaStreamSource(localStream);
        const analyser = localCtx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        source.connect(analyser);
        analyserRef.current = analyser;

        setInternalStatus("measuring");

        const sampleBuffer = new Uint8Array(analyser.fftSize);
        tickIntervalRef.current = setInterval(() => {
          const a = analyserRef.current;
          if (!a) return;
          // getByteTimeDomainData: 0 ~ 255, 128 = silence center.
          a.getByteTimeDomainData(sampleBuffer);
          let sumSq = 0;
          for (let i = 0; i < sampleBuffer.length; i++) {
            const centered = (sampleBuffer[i] - 128) / 128; // [-1, 1]
            sumSq += centered * centered;
          }
          const rms = Math.sqrt(sumSq / sampleBuffer.length);
          // dBFS 계산: rms=0 (완전 무음) 보호용 floor.
          const safeRms = Math.max(rms, 1e-7);
          const dbfs = 20 * Math.log10(safeRms);
          const splLikeDb = dbfs + resolvedSplOffsetDb;

          setCurrentDb(splLikeDb);

          if (splLikeDb >= thresholdDb) {
            const now = Date.now();
            if (overSinceRef.current === null) {
              overSinceRef.current = now;
            }
            const elapsed = now - overSinceRef.current;
            setOverThresholdMs(elapsed);
            setPeakDb((prev) => (splLikeDb > prev ? splLikeDb : prev));
            if (elapsed >= persistMs) {
              setIsOverThreshold(true);
            }
          } else {
            // 단발 below-threshold tick → 카운터 reset (지속 노이즈만 트리거).
            overSinceRef.current = null;
            setOverThresholdMs(0);
            setIsOverThreshold(false);
          }
        }, tickMs);
      } catch (err) {
        // getUserMedia reject (권한 거부 / 디바이스 부재 등) — status:"error" 로 surface.
        if (cancelledRef.current) return;
        if (!sharedMode && localStream) {
          localStream.getTracks().forEach((t) => t.stop());
        }
        if (localCtx) {
          localCtx.close().catch(() => {});
        }
        setInternalStatus("error");
        setCurrentDb(null);
        // 의도적으로 throw 안 함 — hook 호출 측에서는 status 로 분기.
        void err;
      }
    })();

    return () => {
      cancelledRef.current = true;
      teardownResources();
      // cleanup 시 (enabled 비활성 / unmount / deps 변경) UI 상태 모두 리셋.
      // 본 위치의 setState 는 effect cleanup → React 가 동기 batched commit 으로 처리하므로
      // react-hooks/set-state-in-effect 룰 적용 대상 아님 (cleanup 함수는 effect body 가 아님).
      setInternalStatus(null);
      setCurrentDb(null);
      setIsOverThreshold(false);
      setOverThresholdMs(0);
      setPeakDb(-Infinity);
    };
    // thresholdDb / persistMs / tickMs / resolvedSplOffsetDb 는 tick callback 안에서 closure 로 사용 —
    // 변경 시 effect 재실행으로 새 stream / interval 재구성. enabled toggle 과 동일 경로.
    // sharedMode 가 활성일 땐 micCtx.stream 변경 시에도 재실행 — Provider 가 stream 재발급 시 분석기 재구성.
  }, [
    enabled,
    sharedMode,
    micCtx,
    thresholdDb,
    persistMs,
    tickMs,
    resolvedSplOffsetDb,
    teardownResources,
  ]);

  return {
    currentDb,
    isOverThreshold,
    overThresholdMs,
    status,
    peakDb: peakDb === -Infinity ? 0 : peakDb,
  };
}

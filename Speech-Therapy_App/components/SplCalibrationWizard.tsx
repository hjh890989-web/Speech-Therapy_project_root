"use client";

// REQ-FUNC-007 잔여 (#106) — SPL calibration UI wizard (Client Component).
//
// 목적:
//   - useSplMeter 의 splOffsetDb (dBFS → SPL-like 변환) 가 디바이스/드라이버/Gain 마다 ±10dB
//     오차를 가지므로, 부모가 1회 "조용한 환경 5초 측정" 으로 보정.
//   - 측정 평균 dB 가 목표 환경 base (default 50dB — Toast 임계 60dB 의 10dB 마진) 와 같아지도록
//     splOffsetDb 자동 추천.
//
// 측정 → offset 산출 공식:
//   - 현재 splOffsetDb = useSplMeter 가 사용 중인 base (보정 전: 100, 보정 후: 저장된 값).
//   - measuredAvgDb = 5초간 currentDb 의 산술 평균.
//   - delta = TARGET_BASE_DB - measuredAvgDb   (예: 50dB 목표)
//   - recommendedOffsetDb = clamp(currentBaseOffset + delta, [MIN_OFFSET, MAX_OFFSET])
//   - 사용자가 slider 로 미세 조정 가능 (±15dB).
//
// R4 보호:
//   - localStorage 외 외부 전송 0건 (분석 이벤트는 numeric metric 만).
//   - 카메라 / raw audio / FFT 절대 노출 금지.
//   - MicStreamProvider 가 5초 후 자동 deactivate → mic indicator OFF 보장.
//
// CON-04 금칙어 ("치료/진단/장애") 사용 0건 — "환경 소음", "안내" 등 비의료 표현.

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_OFFSET,
  MAX_OFFSET,
  MIN_OFFSET,
  getCalibrationOffset,
  hasCalibration,
  resetCalibrationOffset,
  setCalibrationOffset,
} from "@/lib/audio/spl-calibration";
import { MicStreamProvider } from "@/lib/audio/MicStreamProvider";
import { useSplMeter } from "@/lib/audio/useSplMeter";
import { trackEvent } from "@/lib/analytics";

/** 보정 후 환경 base 목표 dB. Toast 임계 60dB - 10dB 마진. */
const TARGET_BASE_DB = 50;
/** 측정 시간 (ms). 너무 짧으면 transient noise spike 가 평균 왜곡. */
const MEASURE_DURATION_MS = 5_000;
/** Slider 미세 조정 범위 (recommended 기준 ±). */
const SLIDER_SPAN_DB = 15;

type WizardState =
  | { phase: "idle" }
  | {
      phase: "measuring";
      remainingMs: number;
    }
  | {
      phase: "measured";
      measuredAvgDb: number;
      recommendedOffsetDb: number;
      pendingOffsetDb: number;
    }
  | { phase: "saved"; savedOffsetDb: number; measuredAvgDb: number }
  | { phase: "denied" }
  | { phase: "unsupported" };

export interface SplCalibrationWizardProps {
  /// 저장 성공 시 부모 콜백 (선택). 미지정이면 본 컴포넌트가 saved phase 로 표시.
  onSaved?: (offsetDb: number, measuredAvgDb: number) => void;
}

export function SplCalibrationWizard({ onSaved }: SplCalibrationWizardProps = {}) {
  return (
    <MicStreamProvider>
      <SplCalibrationWizardInner onSaved={onSaved} />
    </MicStreamProvider>
  );
}

function SplCalibrationWizardInner({ onSaved }: SplCalibrationWizardProps) {
  const [state, setState] = useState<WizardState>({ phase: "idle" });
  // mount 시 1회 확인 — 보정됨/미보정 라벨 + reset 버튼 가시성.
  // SSR mismatch 회피를 위해 초기값은 false/DEFAULT (서버) 로 두고 mount 후 effect 에서 보정.
  const [calibrated, setCalibrated] = useState<boolean>(false);
  const [currentOffsetDb, setCurrentOffsetDb] = useState<number>(DEFAULT_OFFSET);
  useEffect(() => {
    // 본 effect 는 외부 시스템 (localStorage) 의 최초 read → React state 동기화.
    // SSR-friendly 패턴: 서버 render 시 false/DEFAULT, hydration 직후 client 만 실제 값 반영.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCalibrated(hasCalibration());
    setCurrentOffsetDb(getCalibrationOffset());
  }, []);

  // 측정 샘플 누적 — 5초간 currentDb 를 평균. tick 100ms × 50 = 50 sample target.
  const samplesRef = useRef<number[]>([]);
  // 측정 시작 시각 / setInterval / countdown 갱신 — cleanup 위해 ref.
  const startedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // cleanupCountdown 을 status effect 보다 먼저 선언 (react-hooks/immutability 룰).
  const cleanupCountdown = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startedAtRef.current = null;
  }, []);

  // 측정 중에만 useSplMeter enable. 측정 후 (measured/saved) idle 로 떨어뜨려 mic 해제.
  const isMeasuring = state.phase === "measuring";
  // 측정 중에는 calibration default 가 아니라 "현재 저장된 base" 로 측정해야 정확한 추천이 가능.
  // (저장 안 된 첫 측정은 DEFAULT_OFFSET 100 으로 측정 → recommended = 100 + (50 - measured).)
  const splMeterOffset = currentOffsetDb;
  const { currentDb, status } = useSplMeter({
    enabled: isMeasuring,
    splOffsetDb: splMeterOffset,
  });

  // 측정 중 currentDb 변화 → samplesRef 누적 (state 미반영, render churn 최소화).
  useEffect(() => {
    if (!isMeasuring) return;
    if (currentDb !== null && Number.isFinite(currentDb)) {
      samplesRef.current.push(currentDb);
    }
  }, [currentDb, isMeasuring]);

  // status 변화 surface — 권한 거부 / 미지원 → 해당 phase 로 전환.
  // 외부 시스템 (useSplMeter 의 status) 변경 반영 + cleanup 트리거 — set-state-in-effect 정당.
  useEffect(() => {
    if (!isMeasuring) return;
    if (status === "error") {
      cleanupCountdown();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ phase: "denied" });
    } else if (status === "unsupported") {
      cleanupCountdown();
      setState({ phase: "unsupported" });
    }
    // status="measuring" → 정상 진행 (별도 처리 없음).
    // status="idle" → 본 wizard 가 직접 enabled toggle 했으므로 발생 안 함.
  }, [status, isMeasuring, cleanupCountdown]);

  const startMeasure = useCallback(() => {
    samplesRef.current = [];
    startedAtRef.current = Date.now();
    setState({ phase: "measuring", remainingMs: MEASURE_DURATION_MS });

    // 200ms 마다 countdown UI 갱신 + 종료 도달 시 평균 산출.
    intervalRef.current = setInterval(() => {
      const startedAt = startedAtRef.current;
      if (startedAt === null) return;
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MEASURE_DURATION_MS - elapsed);

      if (remaining > 0) {
        setState({ phase: "measuring", remainingMs: remaining });
        return;
      }

      // 측정 종료 — 평균 산출 + recommended offset 계산.
      cleanupCountdown();
      const samples = samplesRef.current;
      const sum = samples.reduce((acc, v) => acc + v, 0);
      const avg = samples.length > 0 ? sum / samples.length : currentOffsetDb;
      const measuredAvgDb = roundTo1(avg);

      // delta: 측정 평균 → 목표 base (TARGET_BASE_DB). offset 을 더해 보정.
      const delta = TARGET_BASE_DB - measuredAvgDb;
      const recommended = clamp(currentOffsetDb + delta, MIN_OFFSET, MAX_OFFSET);
      const roundedRecommended = roundTo1(recommended);

      setState({
        phase: "measured",
        measuredAvgDb,
        recommendedOffsetDb: roundedRecommended,
        pendingOffsetDb: roundedRecommended,
      });
    }, 200);
  }, [cleanupCountdown, currentOffsetDb]);

  const cancelMeasure = useCallback(() => {
    cleanupCountdown();
    samplesRef.current = [];
    setState({ phase: "idle" });
  }, [cleanupCountdown]);

  const adjustOffset = useCallback((next: number) => {
    setState((prev) => {
      if (prev.phase !== "measured") return prev;
      const clamped = clamp(next, MIN_OFFSET, MAX_OFFSET);
      return { ...prev, pendingOffsetDb: roundTo1(clamped) };
    });
  }, []);

  const saveOffset = useCallback(() => {
    if (state.phase !== "measured") return;
    const ok = setCalibrationOffset(state.pendingOffsetDb);
    if (!ok) return;
    setCurrentOffsetDb(state.pendingOffsetDb);
    setCalibrated(true);
    trackEvent("spl_calibration_completed", {
      offsetDb: state.pendingOffsetDb,
      measuredAvgDb: state.measuredAvgDb,
    });
    onSaved?.(state.pendingOffsetDb, state.measuredAvgDb);
    setState({
      phase: "saved",
      savedOffsetDb: state.pendingOffsetDb,
      measuredAvgDb: state.measuredAvgDb,
    });
  }, [state, onSaved]);

  const resetOffset = useCallback(() => {
    resetCalibrationOffset();
    setCalibrated(false);
    setCurrentOffsetDb(DEFAULT_OFFSET);
    setState({ phase: "idle" });
  }, []);

  // unmount cleanup.
  useEffect(() => {
    return () => {
      cleanupCountdown();
    };
  }, [cleanupCountdown]);

  return (
    <section
      data-testid="spl-calibration-wizard"
      className="rounded-lg border border-gray-200 p-6 dark:border-gray-700"
    >
      <header className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold">환경 소음 보정</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          조용한 환경에서 5초 동안 평균 소음을 측정해 알림 정확도를 높여요.
        </p>
        <p
          data-testid="spl-calibration-status"
          className="text-xs text-gray-500 dark:text-gray-400"
        >
          {calibrated
            ? `보정됨: 기준 ${currentOffsetDb}dB`
            : `미보정 (기본 ${DEFAULT_OFFSET}dB 사용 중)`}
        </p>
      </header>

      {state.phase === "idle" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            마이크 권한을 허용한 뒤 측정 시작을 눌러주세요. 측정 중에는 말이나 음악 없이 조용한
            상태를 유지해 주세요.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startMeasure}
              data-testid="spl-calibration-start"
              className="min-h-[44px] rounded-md bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
            >
              측정 시작
            </button>
            {calibrated && (
              <button
                type="button"
                onClick={resetOffset}
                data-testid="spl-calibration-reset"
                className="min-h-[44px] rounded-md border border-gray-300 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                기본값으로 되돌리기
              </button>
            )}
          </div>
        </div>
      )}

      {state.phase === "measuring" && (
        <div className="space-y-3" data-testid="spl-calibration-measuring">
          <p className="text-sm text-gray-700 dark:text-gray-300">측정 중입니다…</p>
          <p
            className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300"
            data-testid="spl-calibration-countdown"
          >
            {Math.ceil(state.remainingMs / 1000)}s
          </p>
          <p
            className="text-sm tabular-nums text-gray-600 dark:text-gray-400"
            data-testid="spl-calibration-live"
          >
            현재 약 {currentDb !== null ? roundTo1(currentDb) : "—"} dB
          </p>
          <button
            type="button"
            onClick={cancelMeasure}
            data-testid="spl-calibration-cancel"
            className="min-h-[44px] rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            취소
          </button>
        </div>
      )}

      {state.phase === "measured" && (
        <div className="space-y-4" data-testid="spl-calibration-measured">
          <div className="rounded-md bg-emerald-50 px-4 py-3 dark:bg-emerald-950/40">
            <p className="text-sm text-emerald-900 dark:text-emerald-100">
              측정된 평균:{" "}
              <strong className="tabular-nums">{state.measuredAvgDb} dB</strong>
              <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-300">
                (목표 임계 60dB)
              </span>
            </p>
            <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">
              추천 기준값:{" "}
              <strong className="tabular-nums">{state.recommendedOffsetDb} dB</strong>
            </p>
          </div>

          <label className="block text-sm text-gray-700 dark:text-gray-300">
            <span className="mb-1 block">
              기준값 미세 조정: <strong className="tabular-nums">{state.pendingOffsetDb} dB</strong>
            </span>
            <input
              type="range"
              data-testid="spl-calibration-slider"
              min={Math.max(MIN_OFFSET, state.recommendedOffsetDb - SLIDER_SPAN_DB)}
              max={Math.min(MAX_OFFSET, state.recommendedOffsetDb + SLIDER_SPAN_DB)}
              step={1}
              value={state.pendingOffsetDb}
              onChange={(e) => adjustOffset(Number.parseFloat(e.target.value))}
              className="w-full"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveOffset}
              data-testid="spl-calibration-save"
              className="min-h-[44px] rounded-md bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
            >
              이 환경으로 설정
            </button>
            <button
              type="button"
              onClick={startMeasure}
              data-testid="spl-calibration-retry"
              className="min-h-[44px] rounded-md border border-gray-300 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              다시 측정
            </button>
          </div>
        </div>
      )}

      {state.phase === "saved" && (
        <div
          role="status"
          data-testid="spl-calibration-saved"
          className="space-y-3 rounded-md bg-emerald-50 px-4 py-3 dark:bg-emerald-950/40"
        >
          <p className="text-sm text-emerald-900 dark:text-emerald-100">
            보정이 저장되었어요. (기준 <strong>{state.savedOffsetDb}dB</strong>)
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            앞으로 발음 확인 / 미션 페이지에서 더 정확한 안내가 노출됩니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startMeasure}
              data-testid="spl-calibration-remeasure"
              className="min-h-[44px] rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              다시 측정
            </button>
            <button
              type="button"
              onClick={resetOffset}
              data-testid="spl-calibration-reset"
              className="min-h-[44px] rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              기본값으로 되돌리기
            </button>
          </div>
        </div>
      )}

      {state.phase === "denied" && (
        <div
          role="alert"
          data-testid="spl-calibration-denied"
          className="space-y-2 rounded-md bg-amber-50 px-4 py-3 dark:bg-amber-950/40"
        >
          <p className="text-sm text-amber-900 dark:text-amber-100">
            마이크 권한이 필요해요. 브라우저 주소창의 권한 아이콘에서 마이크를 허용해 주세요.
          </p>
          <button
            type="button"
            onClick={() => setState({ phase: "idle" })}
            className="min-h-[44px] rounded-md border border-amber-400 px-4 py-2 text-sm text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-100 dark:hover:bg-amber-900/40"
          >
            다시 시도
          </button>
        </div>
      )}

      {state.phase === "unsupported" && (
        <div
          role="alert"
          data-testid="spl-calibration-unsupported"
          className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          이 브라우저는 환경 소음 측정을 지원하지 않아요. 최신 Chrome / Safari / Edge 에서 다시
          시도해 주세요.
        </div>
      )}
    </section>
  );
}

/** 소수 첫째 자리까지 반올림 (UI 표시 일관성). */
function roundTo1(v: number): number {
  return Math.round(v * 10) / 10;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

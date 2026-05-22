"use client";

// FR-Q-001 — 발화 입력 폼 (Client Component).
// Web Speech API + analyzeDiagnosis Server Action 호출.
// 입력 항목 ≤ 3개: 자녀 월령 / 타겟 음소 / 동의 체크.
// CON-04 — UI 카피의 "치료/진단/장애" 금칙어 0건 (발음 확인 / 발달 등 비의료 표현).
// (내부 식별자 `analyzeDiagnosis`, `app/actions/diagnosis.ts` 등은 미노출이라 예외)

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSpeechRecognition } from "@/lib/hooks/useSpeechRecognition";
import { useAnonymousUserId } from "@/lib/hooks/useAnonymousUserId";
import { useSilenceDetection } from "@/lib/hooks/useSilenceDetection";
import { useNetworkAware } from "@/lib/hooks/useNetworkAware";
import { useAudioAnalyzer } from "@/lib/hooks/useAudioAnalyzer";
import type { AcousticFeatures } from "@/lib/audio/analyzer";
import { useSplMeter } from "@/lib/audio/useSplMeter";
import { SplToast } from "@/components/SplToast";
import { analyzeDiagnosis } from "@/app/actions/diagnosis";
import { trackEvent } from "@/lib/analytics";

// Sprint 3 §2 A 핫픽스 (2026-05-15) → §2 A-2 재설계 (2026-05-19, 옵션 A):
// STT 와 Web Audio 의 mic 동시 점유 충돌 회피를 위해 발화를 2 단계로 분리.
//   1단계: STT 단독 mic 점유 → transcript / sttConfidence 수집
//   2단계: STT 종료 후 audio analyzer 단독 mic 점유 → AcousticFeatures 수집 (선택, 사용자 추가 발화 1회)
// env 플래그로 활성화 제어. false 일 때는 1단계만 진행하며 acoustic-score 는 텍스트 프록시 fallback.
const ENABLE_AUDIO_ANALYZER = process.env.NEXT_PUBLIC_ENABLE_AUDIO_ANALYZER === "true";

// 2단계 audio 측정 phase.
type AudioPhase = "idle" | "ready" | "recording" | "done";
// 2단계 자동 종료 시간 (ms). 너무 길면 아이 집중 깨짐, 너무 짧으면 발화 누락.
const AUDIO_MAX_DURATION_MS = 4_000;

const PHONEMES = ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"] as const;
const SAMPLE_WORDS: Record<(typeof PHONEMES)[number], ReadonlyArray<string>> = {
  ㄱ: ["거북", "가위", "고양이"],
  ㄴ: ["나무", "누나", "노래"],
  ㅅ: ["사과", "시계", "사자"],
  ㅈ: ["자동차", "주스", "종이"],
  ㄹ: ["라면", "로봇", "라디오"],
};

// 분석 진행 단계 카피 — 실제 Server Action 의 진척과 시간 매핑은 근사값.
// Gemini 호출 (5~8s) > DB nested write (~0.5s) > 페이지 이동 (~0.5s).
const PROGRESS_STAGES: ReadonlyArray<{ ms: number; label: string }> = [
  { ms: 0, label: "발음을 듣고 있어요..." },
  { ms: 1_500, label: "또래와 비교하는 중이에요..." },
  { ms: 5_000, label: "결과를 정리하는 중이에요..." },
  { ms: 9_000, label: "조금만 더 기다려 주세요..." },
];

export function DiagnosisForm() {
  const router = useRouter();
  const [childAgeMonths, setChildAgeMonths] = useState(36);
  const [targetPhoneme, setTargetPhoneme] = useState<(typeof PHONEMES)[number]>("ㅅ");
  /// Sprint 2 §2 — 부모가 발화 전에 선택하는 의도 단어. 미선택 시 발화/제출 차단.
  const [intendedWord, setIntendedWord] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string>(PROGRESS_STAGES[0].label);
  const progressTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const anonymousUserId = useAnonymousUserId();
  const {
    status,
    transcript,
    confidence: sttConfidence,
    errorCode,
    isSupported,
    isMounted,
    retryCount,
    start,
    reset,
  } = useSpeechRecognition();

  // FR-C-006 — 60s 침묵 감지 → 부모 개입 격려 카피.
  // intervention 은 hook 의 state 직접 사용 (transcript 변경 시 reportSpeech → reset 으로 null 복귀).
  const {
    reportSpeech,
    reset: resetSilence,
    intervention: silenceWarning,
  } = useSilenceDetection({
    thresholdMs: 60_000,
    enabled: status === "listening" || status === "retrying",
  });

  // FR-C-007 — navigator.onLine 구독 + Server Action 1회 자동 재시도.
  const { isOnline, runWithRetry } = useNetworkAware();

  // Sprint 3 §2 A — Web Audio API 직접 측정 (pitch / duration / energy).
  // STT 와 동일 user gesture 안에서 start, STT 종료 시점에 stop.
  const {
    isSupported: isAudioSupported,
    status: audioStatus,
    start: startAudio,
    stop: stopAudio,
    reset: resetAudio,
  } = useAudioAnalyzer();
  const acousticFeaturesRef = useRef<AcousticFeatures | null>(null);
  const audioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // INFRA-005-FU (#104) — trackEvent 발송용 타이밍 / 멱등 ref.
  // sttStartTimeRef: "발화 시작" 클릭 시각 → transcript 도착 시 duration 산출.
  // audioStartTimeRef: startAudioPhase 시각 → finishAudioPhase 시 duration 산출.
  // ttrackedRef: 멱등 발송 (transcript 변경마다 fire 방지, errorCode 동일 값 재발송 방지).
  const sttStartTimeRef = useRef<number | null>(null);
  const audioStartTimeRef = useRef<number | null>(null);
  const sttRecordedFiredRef = useRef(false);
  const sttUnsupportedFiredRef = useRef(false);
  const lastFailedErrorCodeRef = useRef<string | null>(null);

  // 2단계 audio 측정 phase.
  // - idle: 초기 / STT 진행 전
  // - ready: STT 완료, "한 번 더 들려주세요" 버튼 표시 단계
  // - recording: audio analyzer 단독 작동 중
  // - done: features 캡처 완료, submit 가능
  const [audioPhase, setAudioPhase] = useState<AudioPhase>("idle");

  // REQ-FUNC-007 — 60dB SPL 게이트 (환경 소음 측정 + Toast).
  // 활성 조건: 동의 체크 완료 + STT/audio analyzer 미점유 + 미제출 상태.
  //   - STT (status="listening"/"retrying") 와 동시 점유는 브라우저 충돌 위험 → SPL meter idle.
  //   - audio analyzer phase="recording" 도 mic 점유 → SPL meter idle.
  // 단순화 정책: 발화 시작 전 / 사이 (transcript 도착 후 ready phase) 에만 환경 노이즈 측정.
  // 후속 PR refactor: STT 와 SPL meter 의 mic stream 공유 (현재는 별도 stream).
  const splMeterEnabled =
    agreed &&
    status !== "listening" &&
    status !== "retrying" &&
    audioPhase !== "recording" &&
    !isSubmitting;
  const {
    isOverThreshold: noiseOverThreshold,
    peakDb: noisePeakDb,
    overThresholdMs: noiseOverMs,
  } = useSplMeter({ enabled: splMeterEnabled });
  const [splToastVisible, setSplToastVisible] = useState(false);
  const splEventFiredRef = useRef(false);

  // SPL toast 트리거 — 5초 임계 도달 1회만 노출 + 이벤트 발송.
  // dismiss 후에도 새로운 over-threshold 사이클 (overThresholdMs=0 으로 리셋 후 재진입) 시 다시 노출.
  useEffect(() => {
    if (noiseOverThreshold && !splEventFiredRef.current) {
      setSplToastVisible(true);
      trackEvent("noise_threshold_exceeded", {
        peakDb: Math.round(noisePeakDb),
        durationMs: noiseOverMs,
        surface: "diagnose",
      });
      splEventFiredRef.current = true;
    } else if (!noiseOverThreshold && noiseOverMs === 0) {
      // 카운터 리셋 — 다음 over-threshold 사이클 시 재발송 허용.
      splEventFiredRef.current = false;
    }
  }, [noiseOverThreshold, noisePeakDb, noiseOverMs]);

  // transcript 변경 시 silence 카운터 reset + STT 단계 audio_recorded 발송 (1회).
  useEffect(() => {
    if (!transcript) return;
    reportSpeech();
    if (!sttRecordedFiredRef.current && sttStartTimeRef.current !== null) {
      trackEvent("diagnose_audio_recorded", {
        phase: "stt",
        durationMs: Date.now() - sttStartTimeRef.current,
      });
      sttRecordedFiredRef.current = true;
    }
  }, [transcript, reportSpeech]);

  // !isSupported → stt_unsupported 1회 발송.
  useEffect(() => {
    if (isMounted && !isSupported && !sttUnsupportedFiredRef.current) {
      trackEvent("diagnose_failed", { reason: "stt_unsupported" });
      sttUnsupportedFiredRef.current = true;
    }
  }, [isMounted, isSupported]);

  // STT errorCode 전환 시 diagnose_failed 발송 (동일 값 재발송 방지).
  useEffect(() => {
    if (!errorCode) {
      lastFailedErrorCodeRef.current = null;
      return;
    }
    if (lastFailedErrorCodeRef.current === errorCode) return;
    if (
      errorCode === "permission_denied" ||
      errorCode === "no_speech" ||
      errorCode === "network"
    ) {
      trackEvent("diagnose_failed", { reason: errorCode });
      lastFailedErrorCodeRef.current = errorCode;
    }
  }, [errorCode]);

  // §2 A-2: audio "ready" 상태는 derived — STT 결과 도착 + env 플래그 ON + browser 지원 시 자동 활성화.
  // audioPhase state 의 idle 일 때만 derived "ready" 가 보임. recording/done 은 state 가 우선.
  const audioPhaseEffective: AudioPhase =
    audioPhase !== "idle"
      ? audioPhase
      : ENABLE_AUDIO_ANALYZER && isAudioSupported && transcript
        ? "ready"
        : "idle";

  // unmount 또는 phase 전환 시 audio timeout cleanup.
  useEffect(() => {
    return () => {
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
        audioTimeoutRef.current = null;
      }
    };
  }, []);

  const startAudioPhase = () => {
    setAudioPhase("recording");
    // 본 함수는 button onClick 에서만 호출 (event handler) — render purity 영향 없음.
    // eslint-disable-next-line react-hooks/purity
    audioStartTimeRef.current = Date.now();
    void startAudio();
    // AUDIO_MAX_DURATION_MS 후 자동 종료 (사용자가 stop 안 눌러도 안전 종료).
    audioTimeoutRef.current = setTimeout(() => {
      finishAudioPhase();
    }, AUDIO_MAX_DURATION_MS);
  };

  const finishAudioPhase = () => {
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
      audioTimeoutRef.current = null;
    }
    // stopAudio() 는 analyzerRef null 시 empty features 반환 (idempotent). audioStatus 체크 시
    // setTimeout 콜백의 stale closure 로 인해 호출이 누락되는 버그 회피.
    acousticFeaturesRef.current = stopAudio();
    if (audioStartTimeRef.current !== null) {
      trackEvent("diagnose_audio_recorded", {
        phase: "audio",
        durationMs: Date.now() - audioStartTimeRef.current,
      });
      audioStartTimeRef.current = null;
    }
    setAudioPhase("done");
  };

  const skipAudioPhase = () => {
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
      audioTimeoutRef.current = null;
    }
    acousticFeaturesRef.current = null;
    setAudioPhase("done");
  };

  // unmount 시 잔여 progress 타이머 정리 (메모리 누수 방지).
  useEffect(() => {
    return () => {
      progressTimersRef.current.forEach((t) => clearTimeout(t));
      progressTimersRef.current = [];
    };
  }, []);

  const startProgressTimers = () => {
    progressTimersRef.current.forEach((t) => clearTimeout(t));
    progressTimersRef.current = PROGRESS_STAGES.slice(1).map((stage) =>
      setTimeout(() => setProgressLabel(stage.label), stage.ms),
    );
  };

  const clearProgressTimers = () => {
    progressTimersRef.current.forEach((t) => clearTimeout(t));
    progressTimersRef.current = [];
  };

  const handleSubmit = async () => {
    if (!agreed) {
      setSubmitError("아래 안내 확인 후 동의 체크를 부탁드려요.");
      trackEvent("diagnose_failed", { reason: "validation" });
      return;
    }
    if (!intendedWord) {
      setSubmitError("먼저 자녀가 발음할 단어를 선택해 주세요.");
      trackEvent("diagnose_failed", { reason: "validation" });
      return;
    }
    if (!transcript) {
      setSubmitError("발화 결과가 비어 있어요. 다시 한 번 들려주세요.");
      trackEvent("diagnose_failed", { reason: "validation" });
      return;
    }
    if (!isOnline) {
      setSubmitError("인터넷 연결을 확인하고 다시 시도해 주세요.");
      trackEvent("diagnose_failed", { reason: "network" });
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    setProgressLabel(PROGRESS_STAGES[0].label);
    startProgressTimers();
    const submitStartedAt = Date.now();
    try {
      // FR-C-001 (Sprint 2 §2) — phonetic similarity 기반 점수 산출.
      // FR-C-007 — runWithRetry: 네트워크 일시 단절 시 1회 자동 재시도.
      // anonymousUserId: localStorage 영구 식별자 → /rewards 페이지가 동일 사용자 인식.
      // Sprint 3 §2 A — audio analyzer 가 STT 종료 시 자동 stop 했어야 함.
      // 혹시라도 아직 recording 상태면 (timing race) 여기서 강제 stop 후 features 캡처.
      if (audioStatus === "recording") {
        acousticFeaturesRef.current = stopAudio();
      }
      const result = await runWithRetry(() =>
        analyzeDiagnosis({
          intendedWord,
          transcript,
          childAgeMonths,
          targetPhoneme,
          anonymousUserId: anonymousUserId ?? undefined,
          acousticFeatures: acousticFeaturesRef.current ?? undefined,
          sttConfidence: sttConfidence ?? undefined,
        }),
      );
      trackEvent("diagnose_completed", {
        articulationScore: Math.round(result.articulationScore),
        linguisticScore: Math.round(result.linguisticScore),
        acousticScore: Math.round(result.acousticScore),
        requiresHITL: result.requiresHITL,
        elapsedMs: Date.now() - submitStartedAt,
      });
      const params = new URLSearchParams({
        phoneme: targetPhoneme,
        age: String(childAgeMonths),
        intendedWord,
        transcript,
      });
      router.push(`/diagnose/result/${result.sessionId}?${params.toString()}`);
    } catch (err) {
      // LLM_TIMEOUT / INTERNAL_ERROR / Zod validation 등.
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("LLM_TIMEOUT")) {
        setSubmitError("분석에 시간이 오래 걸려요. 잠시 후 다시 시도해 주세요.");
      } else if (message.includes("GOOGLE_GENERATIVE_AI_API_KEY")) {
        setSubmitError("AI 분석 서비스 설정이 누락되었어요. 운영자에게 문의해 주세요.");
      } else {
        setSubmitError("일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
      }
      trackEvent("diagnose_failed", { reason: "server_error" });
    } finally {
      clearProgressTimers();
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      {/* REQ-FUNC-007 — 60dB SPL 게이트 Toast (5초 자동 닫힘 + 사용자 닫기) */}
      <SplToast visible={splToastVisible} onDismiss={() => setSplToastVisible(false)} />

      {/* FR-C-007 — 오프라인 배너 */}
      {isMounted && !isOnline && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          오프라인 상태입니다. 인터넷 연결 후 다시 시도해 주세요.
        </div>
      )}

      {/* 1) 자녀 월령 */}
      <div className="space-y-2">
        <label htmlFor="childAgeMonths" className="block text-sm font-medium">
          자녀 월령 (만 2~7세)
        </label>
        <div className="flex items-center gap-3">
          <input
            id="childAgeMonths"
            type="range"
            min={24}
            max={84}
            step={1}
            value={childAgeMonths}
            onChange={(event) => setChildAgeMonths(Number(event.target.value))}
            className="flex-1 accent-blue-600"
            aria-label="자녀 월령 슬라이더"
          />
          <span className="w-16 text-right tabular-nums">{childAgeMonths}개월</span>
        </div>
      </div>

      {/* 2) 음소 선택 */}
      <div className="space-y-2">
        <label htmlFor="targetPhoneme" className="block text-sm font-medium">
          확인할 발음
        </label>
        <select
          id="targetPhoneme"
          value={targetPhoneme}
          onChange={(event) => {
            setTargetPhoneme(event.target.value as (typeof PHONEMES)[number]);
            // 음소 변경 시 의도 단어 + 발화 결과 + 음향 측정 모두 초기화 (잔여값 혼동 방지).
            setIntendedWord(null);
            reset();
            resetAudio();
            acousticFeaturesRef.current = null;
          }}
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
        >
          {PHONEMES.map((p) => (
            <option key={p} value={p}>
              {p} 소리
            </option>
          ))}
        </select>
      </div>

      {/* 2-b) Sprint 2 §2 — 의도 단어 선택 */}
      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium">자녀가 발음할 단어를 골라 주세요</legend>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_WORDS[targetPhoneme].map((word) => {
            const isSelected = word === intendedWord;
            return (
              <button
                key={word}
                type="button"
                onClick={() => {
                  setIntendedWord(word);
                  // 새 의도 단어 선택 시 이전 발화 결과 제거 → 짝이 맞지 않는 transcript 사용 방지.
                  reset();
                }}
                className={`min-h-[44px] rounded-md border px-4 py-2 text-sm font-medium transition ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-gray-300 bg-white text-gray-800 hover:border-emerald-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                }`}
                aria-pressed={isSelected}
              >
                {word}
              </button>
            );
          })}
        </div>
        {intendedWord && (
          <p className="text-xs text-gray-600 dark:text-gray-400">
            선택한 단어: <span className="font-semibold">{intendedWord}</span>
          </p>
        )}
      </fieldset>

      {/* 3) 동의 체크 */}
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-1"
        />
        <span>
          본 서비스는 의료적 평가를 제공하지 않으며, 부모님께 정보 제공을 위한 보조 도구임을
          이해했습니다.
        </span>
      </label>

      {/* 발화 영역 */}
      <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <p className="text-sm">
          {intendedWord
            ? `자녀에게 "${intendedWord}" 를 또렷하게 들려달라고 해 주세요.`
            : "먼저 위에서 발음할 단어를 골라 주세요."}
        </p>

        {/* mount 전엔 placeholder — SSR HTML 과 hydration 일치 보장. */}
        {!isMounted ? (
          <div className="h-10" aria-hidden />
        ) : !isSupported ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            현재 브라우저에서는 음성 인식이 지원되지 않습니다. 모바일 Chrome 또는 Edge 를 사용해
            주세요.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  reset();
                  resetSilence();
                  acousticFeaturesRef.current = null;
                  setAudioPhase("idle");
                  sttRecordedFiredRef.current = false;
                  sttStartTimeRef.current = Date.now();
                  trackEvent("diagnose_started", {
                    targetPhoneme,
                    childAgeMonths,
                  });
                  // §2 A-2 옵션 A — 1단계 (STT 단독 mic 점유).
                  // audio analyzer 는 STT 완료 후 사용자 추가 발화 시 별도 활성화.
                  start();
                }}
                disabled={
                  !intendedWord || status === "listening" || status === "retrying" || !isOnline
                }
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {status === "listening"
                  ? "듣는 중..."
                  : status === "retrying"
                    ? "다시 듣고 있어요..."
                    : "발화 시작"}
              </button>
              {transcript && (
                <div className="text-sm">
                  들린 단어: <span className="font-semibold">{transcript}</span>
                  {intendedWord && transcript === intendedWord && (
                    <span className="ml-2 text-emerald-600 dark:text-emerald-400">✓ 일치</span>
                  )}
                </div>
              )}
            </div>
            {retryCount > 0 && status !== "error" && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                자동으로 한 번 더 시도하고 있어요.
              </p>
            )}
            {/* FR-C-006 — 60s 침묵 시 부모 개입 격려 (mirror/tooltip 모두 동일 카피, Sprint 2 단순화) */}
            {silenceWarning && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                어렵죠? 부모님과 함께 한 번 더 해볼까요?
              </p>
            )}

            {/* §2 A-2 옵션 A — 2단계 audio 측정 (STT 완료 후 추가 발화 1회) */}
            {ENABLE_AUDIO_ANALYZER && isAudioSupported && audioPhaseEffective === "ready" && transcript && (
              <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                <p className="text-sm text-emerald-900 dark:text-emerald-100">
                  잘했어요! 음향 분석을 위해 <strong>한 번 더</strong> 발음해 줄래요?
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={startAudioPhase}
                    className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    🎤 한 번 더 들려주기
                  </button>
                  <button
                    type="button"
                    onClick={skipAudioPhase}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    건너뛰기
                  </button>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  음향 분석을 건너뛰어도 결과 확인은 가능합니다 (텍스트 분석으로 진행).
                </p>
              </div>
            )}

            {ENABLE_AUDIO_ANALYZER && isAudioSupported && audioPhaseEffective === "recording" && (
              <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  🎙️ 음향 측정 중... 자녀의 발음을 들려주세요. (자동 종료 ~{AUDIO_MAX_DURATION_MS / 1000}초)
                </p>
                <button
                  type="button"
                  onClick={finishAudioPhase}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  ⏹️ 측정 완료
                </button>
              </div>
            )}

            {ENABLE_AUDIO_ANALYZER && audioPhaseEffective === "done" && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                ✓ 음향 분석 준비 완료. 아래 &ldquo;결과 확인&rdquo; 버튼을 눌러 주세요.
              </p>
            )}
          </>
        )}

        {errorCode === "permission_denied" && (
          <p className="text-sm text-red-700 dark:text-red-300">
            마이크 권한이 필요합니다. 브라우저 설정에서 권한을 허용해 주세요.
          </p>
        )}
        {errorCode === "no_speech" && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            발화가 감지되지 않았어요. 조용한 환경에서 다시 시도해 주세요.
          </p>
        )}
        {errorCode === "network" && (
          <p className="text-sm text-red-700 dark:text-red-300">
            네트워크 오류가 발생했어요. 연결 확인 후 다시 시도해 주세요.
          </p>
        )}
      </div>

      {submitError && (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !isOnline}
        className="w-full rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {isSubmitting ? "분석 중..." : !isOnline ? "오프라인 — 연결 후 시도" : "결과 확인"}
      </button>

      {isSubmitting && (
        <div
          className="mt-3 flex items-center gap-3 rounded-md bg-emerald-50 px-4 py-3 dark:bg-emerald-950/40"
          role="status"
          aria-live="polite"
        >
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"
            aria-hidden
          />
          <span className="text-sm text-emerald-900 dark:text-emerald-100">{progressLabel}</span>
        </div>
      )}
    </form>
  );
}

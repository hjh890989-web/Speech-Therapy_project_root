// FR-Q-003 — 미션 카운트다운 + 진행바 + trackEvent.
//
// REQ-FUNC-016: 1~3분 세션 (본 컴포넌트 default 120s = 2분).
// REQ-FUNC-017: 진행바 시각화 (Tailwind, shadcn/ui 미설치 → PercentileBar 패턴 재사용).
//
// 흐름:
//   ready → "미션 시작" → running (mission_started 발송)
//   running → 타이머 0 도달 → completed (mission_completed{reason:"timer_ended"})
//   running → "완료" 클릭 → completed (mission_completed{reason:"manual_done"})
//   running → "건너뛰기" 클릭 → completed (mission_completed{reason:"skipped"})
//   completed → "발음 연습 가기" (/diagnose?phoneme=...) — 별도 흐름으로 전환

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MirrorButton } from "@/components/MirrorButton";
import { MirrorMode } from "@/components/MirrorMode";
import { SplToast } from "@/components/SplToast";
import { MicStreamProvider } from "@/lib/audio/MicStreamProvider";
import { useSplMeter } from "@/lib/audio/useSplMeter";
import { useVoiceActivity } from "@/lib/audio/useVoiceActivity";
import { trackEvent } from "@/lib/analytics";
import { useMissionIntervention } from "@/lib/hooks/useMissionIntervention";

type Phase = "ready" | "running" | "completed";
type SupportedPhoneme = "ㄱ" | "ㄴ" | "ㅅ" | "ㅈ" | "ㄹ";

const SUPPORTED_PHONEMES: ReadonlyArray<SupportedPhoneme> = ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"];

// REQ-FUNC-007 — noise_threshold_exceeded 이벤트 cooldown.
// useMissionIntervention 의 cooldownMs (300_000) 와 동일 정책 — 미션 1회 안에서 같은
// SPL alert 가 spam 처럼 발화하지 않도록 보호. Toast 노출도 cooldown 안엔 skip.
const SPL_ALERT_COOLDOWN_MS = 300_000;

// FR-Q-003 fix — 미션 진실성 가드 (W-AUR KPI 보호).
// 사용자가 미션 시작 즉시 "완료" 클릭 시 mission_completed 발송 → KPI inflate 위험.
// 30초 미만 "완료" 클릭 시 차단 + "건너뛰기" 안내 (skipped reason 으로 분리 분석).
const MIN_MISSION_DURATION_SEC = 30;

function isSupportedPhoneme(p: string): p is SupportedPhoneme {
  return (SUPPORTED_PHONEMES as ReadonlyArray<string>).includes(p);
}

export interface MissionRunnerProps {
  missionId: string;
  targetPhoneme: string;
  difficultyLevel: number;
  /// 기본 120s (2분). REQ-FUNC-016 의 1~3분 범위 내. 호출 측에서 60~180 조정 가능.
  durationSec?: number;
  /// FR-Q-003-CONTENT — running phase 에 inject 되는 미션 콘텐츠 (난이도 2 빈칸 / 난이도 3 문장).
  /// timer + progress 아래, intervention/mirror 위 영역에 렌더된다. 미지정 시 기존 호출자와 동일하게 동작.
  children?: React.ReactNode;
}

/**
 * REQ-FUNC-007 (#106 잔여) — 미션 페이지에 환경 소음 측정 게이트 통합.
 *
 * MicStreamProvider 가 SPL meter (그리고 추후 audio analyzer) 의 단일 mic stream 을 공유 관리.
 * DiagnosisForm 과 동일 패턴 — outer 컴포넌트는 Provider wrap 만 책임, 실제 로직은 Inner 가 보유.
 *
 * Provider scope 는 본 컴포넌트 sub-tree 한정 — 미션 종료 (phase="completed") 후에도
 * Provider 자체는 mount 유지되지만, useSplMeter(enabled=false) → reference counter 0 → stream 종료.
 */
export function MissionRunner(props: MissionRunnerProps): React.JSX.Element {
  return (
    <MicStreamProvider>
      <MissionRunnerInner {...props} />
    </MicStreamProvider>
  );
}

function MissionRunnerInner({
  missionId,
  targetPhoneme,
  difficultyLevel,
  durationSec = 120,
  children,
}: MissionRunnerProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [remainingSec, setRemainingSec] = useState(durationSec);
  const startTimestampRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // FR-Q-003 fix — 30초 미만 "완료" 시 사용자에게 warning 노출용 errorMessage state.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // FR-C-006 — 미션 침묵 감지 → 2단계 intervention (60s tooltip → 90s mirror).
  // orchestrator 가 trackEvent("mission_silence_intervention") 발화 + cooldown / reset 모두 처리.
  // 향후 마이크 통합 (useSpeechRecognition onspeechstart) 에서 intervention.reportSpeech() 호출 예정.
  const intervention = useMissionIntervention({
    missionId,
    enabled: phase === "running",
  });

  // REQ-FUNC-007 — 환경 소음 SPL 게이트.
  // 활성 조건: phase==="running" 일 때만. ready / completed → enabled=false → stream teardown.
  // splOffsetDb 는 default 사용 — 추후 sibling Agent B 의 calibration UI 가 반영 (lib/audio/useSplMeter 본체 책임).
  // SPL 게이트는 useMissionIntervention 과 독립 축 (90s 침묵 + 60dB 환경 소음 동시 발생 시 두 UI 모두 노출 가능).
  const {
    currentDb: noiseCurrentDb,
    isOverThreshold: noiseOverThreshold,
    peakDb: noisePeakDb,
    overThresholdMs: noiseOverMs,
  } = useSplMeter({ enabled: phase === "running", thresholdDb: 60, persistMs: 5_000 });

  // FR-Q-003-CONTENT-V3 — 발화 감지 (Voice Activity Detection).
  // useSplMeter 의 currentDb 를 input 으로 받아 별도 AnalyserNode 없이 speech state 추적.
  // 감지 시 intervention.reportSpeech() 호출 → 60/90s 침묵 카운터 자동 reset + UI indicator.
  const { isSpeaking, lastSpeechAt } = useVoiceActivity({
    currentDb: noiseCurrentDb,
    enabled: phase === "running",
  });

  const [splToastVisible, setSplToastVisible] = useState(false);
  // 본 미션 instance 안에서 마지막 SPL alert 시각 — 5분 cooldown 판정용.
  // useMissionIntervention 의 cooldown 패턴 (useRef + Date.now) 그대로 차용.
  // null = 한 번도 발화 안 함. setState 대신 ref 사용 — render churn 회피.
  const splLastAlertAtRef = useRef<number | null>(null);
  // 현재 over-threshold 사이클 안에서 이미 alert 처리했는지 — 사이클 끝 (below-threshold) 에 리셋.
  const splAlertedThisRunRef = useRef(false);

  // FR-Q-003-CONTENT-V3 — 발화 감지 시 침묵 intervention 카운터 reset.
  // lastSpeechAt 갱신 (idle → speaking 전환 시점) 마다 intervention.reportSpeech() 호출.
  // 결과: 60s tooltip / 90s mirror trigger 가 실제 침묵에만 발화하도록 정확도 향상.
  useEffect(() => {
    if (lastSpeechAt !== null) {
      intervention.reportSpeech();
    }
  }, [lastSpeechAt, intervention]);

  // SPL toast 트리거 — 5초 임계 도달 1회 + 5분 cooldown 체크 + 1회 trackEvent 발송.
  // 정책: cooldown 안엔 Toast 노출/이벤트 발송 모두 skip (한 번 알렸으면 그만).
  useEffect(() => {
    if (noiseOverThreshold && !splAlertedThisRunRef.current) {
      splAlertedThisRunRef.current = true;
      const now = Date.now();
      const sinceLast =
        splLastAlertAtRef.current === null ? Infinity : now - splLastAlertAtRef.current;
      if (sinceLast >= SPL_ALERT_COOLDOWN_MS) {
        splLastAlertAtRef.current = now;
        setSplToastVisible(true);
        trackEvent("noise_threshold_exceeded", {
          peakDb: Math.round(noisePeakDb),
          durationMs: noiseOverMs,
          surface: "mission",
        });
      }
    } else if (!noiseOverThreshold && noiseOverMs === 0) {
      // below-threshold 사이클 진입 — 다음 over-threshold 발생 시 cooldown 재평가 허용.
      splAlertedThisRunRef.current = false;
    }
  }, [noiseOverThreshold, noisePeakDb, noiseOverMs]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // unmount 시 타이머 정리.
  useEffect(() => clearTimer, [clearTimer]);

  const finish = useCallback(
    (reason: "timer_ended" | "manual_done" | "skipped") => {
      const started = startTimestampRef.current ?? Date.now();
      const elapsedSec = Math.min(durationSec, Math.round((Date.now() - started) / 1000));

      // FR-Q-003 fix — manual_done 시 30초 미만 차단 (W-AUR KPI 보호).
      // 진짜 종료를 원하면 "건너뛰기" 사용 — skipped reason 으로 funnel 분석 분리.
      // timer_ended (자동) / skipped (명시) 는 통과.
      if (reason === "manual_done" && elapsedSec < MIN_MISSION_DURATION_SEC) {
        setErrorMessage(
          `미션 시작 후 ${MIN_MISSION_DURATION_SEC}초 이상 연습한 뒤 완료해 주세요. 지금 종료하시려면 '건너뛰기' 를 눌러 주세요.`,
        );
        return;
      }

      setErrorMessage(null);
      clearTimer();
      trackEvent("mission_completed", {
        missionId,
        elapsedSec,
        completedReason: reason,
      });
      // REQ-FUNC-007 — 미션 종료 시 잔여 SPL Toast 정리 + 사이클 ref 리셋.
      // useSplMeter 는 enabled=false 전환에 따라 자동 teardown — 본 setState 는 UI 잔존 방지용.
      setSplToastVisible(false);
      splAlertedThisRunRef.current = false;
      setPhase("completed");
      setRemainingSec(0);
    },
    [clearTimer, durationSec, missionId],
  );

  const start = useCallback(() => {
    // PII 보호: 카탈로그 phoneme 만 허용. 미지원 음소면 발송 생략.
    if (!isSupportedPhoneme(targetPhoneme)) {
      console.warn("MissionRunner: unsupported phoneme, skip tracking", targetPhoneme);
    } else {
      trackEvent("mission_started", {
        missionId,
        targetPhoneme,
        difficultyLevel,
        plannedDurationSec: durationSec,
      });
    }
    startTimestampRef.current = Date.now();
    setRemainingSec(durationSec);
    setPhase("running");
    intervalRef.current = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          // setState 안에서 finish 호출 시 React 경고 → microtask 로 분리.
          queueMicrotask(() => finish("timer_ended"));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [difficultyLevel, durationSec, finish, missionId, targetPhoneme]);

  const progressPct = ((durationSec - remainingSec) / durationSec) * 100;
  const mm = Math.floor(remainingSec / 60);
  const ss = remainingSec % 60;

  // REQ-FUNC-007 — SPL Toast 는 phase 무관 노출 가능 위치. running 중 임계 도달 시 자동 표시.
  // ready / completed phase 에서는 useSplMeter enabled=false 라 noiseOverThreshold 발생 자체가 없음.
  // 단 cooldown 안에서 phase 전환 발생 시 위 useEffect 가 setSplToastVisible(false) 처리.
  const splToast = (
    <SplToast visible={splToastVisible} onDismiss={() => setSplToastVisible(false)} />
  );

  if (phase === "ready") {
    return (
      <>
        {splToast}
        <button
          type="button"
          onClick={start}
          className="inline-block min-h-[44px] rounded-md bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
          aria-label={`미션 시작 (${durationSec}초 타이머)`}
        >
          미션 시작하기
        </button>
      </>
    );
  }

  if (phase === "running") {
    return (
      <div className="space-y-3" aria-live="polite" data-testid="mission-runner-running">
        {splToast}
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">남은 시간</p>
            {/* FR-Q-003-CONTENT-V3 — 발화 감지 indicator. CON-04: 점수/평가 카피 금지, 단순 "듣고 있어요" 표시만. */}
            {isSpeaking && (
              <span
                data-testid="voice-activity-indicator"
                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                aria-live="polite"
              >
                <span aria-hidden="true" className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                듣고 있어요
              </span>
            )}
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {mm}:{ss.toString().padStart(2, "0")}
          </p>
        </div>
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPct)}
          aria-label={`미션 진행도 ${Math.round(progressPct)} 퍼센트`}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {/* FR-Q-003-CONTENT — 난이도별 콘텐츠 (난이도 2 빈칸, 난이도 3 문장) inject 슬롯. */}
        {children}
        {intervention.tooltipVisible && (
          <ParentInterventionTooltip
            targetPhoneme={targetPhoneme}
            onDismiss={intervention.dismissTooltip}
          />
        )}
        {intervention.mirrorActive && (
          <div data-testid="intervention-mirror">
            <MirrorMode
              active={true}
              onClose={intervention.deactivateMirror}
              referenceOverlay={phonemeToOverlay(targetPhoneme)}
            />
          </div>
        )}
        {/* FR-Q-014 — 수동 mirror trigger. 자동 (90s 침묵) trigger 활성 중이면 중복 노출 회피. */}
        {!intervention.mirrorActive && (
          <MirrorButton
            missionId={missionId}
            referenceOverlay={phonemeToOverlay(targetPhoneme)}
          />
        )}
        {/* FR-Q-003 fix — 30초 미만 "완료" 시 warning. */}
        {errorMessage && (
          <p
            role="alert"
            data-testid="mission-runner-warning"
            className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          >
            {errorMessage}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => finish("manual_done")}
            className="min-h-[44px] flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            완료
          </button>
          <button
            type="button"
            onClick={() => finish("skipped")}
            className="min-h-[44px] rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            건너뛰기
          </button>
        </div>
      </div>
    );
  }

  // completed
  return (
    <div className="space-y-3" data-testid="mission-runner-completed">
      {splToast}
      <div className="rounded-md bg-emerald-100 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
        <p className="mb-1 font-medium">연습 완료! 잘 따라했어요.</p>
        <p className="text-xs">
          이제 <strong>&lsquo;발음 연습&rsquo;</strong>에서 실제 발음을 들려주면 정확도 점수와 별을
          받을 수 있어요.
        </p>
      </div>
      <Link
        href={`/diagnose?phoneme=${encodeURIComponent(targetPhoneme)}`}
        className="inline-block min-h-[44px] rounded-md bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
      >
        발음 연습으로 가기 →
      </Link>
    </div>
  );
}

// FR-C-006 1단계 — 부모 개입 툴팁 (60s 침묵 시).
// CON-04: "치료/진단/장애" 금칙어 미사용. 친화적 코칭 카피만.
function ParentInterventionTooltip({
  targetPhoneme,
  onDismiss,
}: {
  targetPhoneme: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      data-testid="intervention-tooltip"
      className="relative rounded-md border border-amber-200 bg-amber-50 px-4 py-3 pr-10 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <p className="mb-1 font-medium">아이가 따라하기 어려워 보이면 함께 발음해 보세요</p>
      <p className="text-xs">
        부모님이 옆에서 천천히 &ldquo;{targetPhoneme}&rdquo; 소리를 한 번 보여주시면 큰 도움이 돼요.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="툴팁 닫기"
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-amber-700 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
      >
        ×
      </button>
    </div>
  );
}

// FR-C-006 + FR-Q-014 — targetPhoneme → referenceOverlay 매핑.
// 단순화: ㄱ/ㅅ/ㅈ 은 lips_open, ㄴ 은 lips_closed, ㄹ 은 tongue_up. 의료 도해 아님.
function phonemeToOverlay(
  phoneme: string,
): "lips_open" | "lips_closed" | "tongue_up" | null {
  switch (phoneme) {
    case "ㄴ":
      return "lips_closed";
    case "ㄹ":
      return "tongue_up";
    case "ㄱ":
    case "ㅅ":
    case "ㅈ":
      return "lips_open";
    default:
      return null;
  }
}

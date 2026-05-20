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
import { trackEvent } from "@/lib/analytics";
import { useSilenceDetection, type SilenceIntervention } from "@/lib/hooks/useSilenceDetection";

type Phase = "ready" | "running" | "completed";
type SupportedPhoneme = "ㄱ" | "ㄴ" | "ㅅ" | "ㅈ" | "ㄹ";

const SUPPORTED_PHONEMES: ReadonlyArray<SupportedPhoneme> = ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"];

function isSupportedPhoneme(p: string): p is SupportedPhoneme {
  return (SUPPORTED_PHONEMES as ReadonlyArray<string>).includes(p);
}

export interface MissionRunnerProps {
  missionId: string;
  targetPhoneme: string;
  difficultyLevel: number;
  /// 기본 120s (2분). REQ-FUNC-016 의 1~3분 범위 내. 호출 측에서 60~180 조정 가능.
  durationSec?: number;
}

export function MissionRunner({
  missionId,
  targetPhoneme,
  difficultyLevel,
  durationSec = 120,
}: MissionRunnerProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [remainingSec, setRemainingSec] = useState(durationSec);
  const startTimestampRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // FR-Q-003 Scenario 4 — useSilenceDetection (REQ-FUNC-019).
  // mic 불사용 — 사용자 인터랙션 부재 60s+ = 도움 필요로 해석. FR-C-006 mic 통합 시 reportSpeech 연동.
  const handleSilenceExceeded = useCallback(
    (intervention: SilenceIntervention) => {
      trackEvent("mission_silence_intervention", {
        missionId,
        intervention,
        silenceMs: 60_000,
      });
    },
    [missionId],
  );
  const silence = useSilenceDetection({
    enabled: phase === "running",
    thresholdMs: 60_000,
    tickMs: 1000,
    onSilenceExceeded: handleSilenceExceeded,
  });

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
      clearTimer();
      const started = startTimestampRef.current ?? Date.now();
      const elapsedSec = Math.min(durationSec, Math.round((Date.now() - started) / 1000));
      trackEvent("mission_completed", {
        missionId,
        elapsedSec,
        completedReason: reason,
      });
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

  if (phase === "ready") {
    return (
      <button
        type="button"
        onClick={start}
        className="inline-block min-h-[44px] rounded-md bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
        aria-label={`미션 시작 (${durationSec}초 타이머)`}
      >
        미션 시작하기
      </button>
    );
  }

  if (phase === "running") {
    return (
      <div className="space-y-3" aria-live="polite" data-testid="mission-runner-running">
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-gray-600 dark:text-gray-400">남은 시간</p>
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
        {silence.intervention && (
          <SilenceInterventionBanner
            intervention={silence.intervention}
            targetPhoneme={targetPhoneme}
          />
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
      <p className="rounded-md bg-emerald-100 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
        잘 했어요! 발음 연습으로 별을 모아 볼까요?
      </p>
      <Link
        href={`/diagnose?phoneme=${encodeURIComponent(targetPhoneme)}`}
        className="inline-block min-h-[44px] rounded-md bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
      >
        발음 연습 가기
      </Link>
    </div>
  );
}

// FR-Q-003 Scenario 4 — 침묵 (= 60s 무인터랙션) 시 부모 개입 안내.
// "mirror" → 거울 모드 (FR-Q-014 미구현, /diagnose 폴백). "tooltip" → 인라인 안내.
function SilenceInterventionBanner({
  intervention,
  targetPhoneme,
}: {
  intervention: SilenceIntervention;
  targetPhoneme: string;
}) {
  if (intervention === "mirror") {
    return (
      <div
        role="status"
        data-testid="silence-intervention"
        className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100"
      >
        <p className="mb-2 font-medium">입 모양을 함께 보여줄까요?</p>
        <Link
          href={`/diagnose?phoneme=${encodeURIComponent(targetPhoneme)}`}
          className="inline-block min-h-[36px] text-xs underline hover:no-underline"
        >
          발음 연습 화면 열기
        </Link>
      </div>
    );
  }
  // tooltip
  return (
    <p
      role="status"
      data-testid="silence-intervention"
      className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
    >
      함께 천천히 입을 움직이며 발음해 보세요. 옆에서 한 번 시범을 보여주셔도 좋아요.
    </p>
  );
}

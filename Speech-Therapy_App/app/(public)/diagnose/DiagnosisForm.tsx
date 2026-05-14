"use client";

// FR-Q-001 — 발화 진단 입력 폼 (Client Component).
// Web Speech API + analyzeDiagnosis Server Action 호출.
// 입력 항목 ≤ 3개: 자녀 월령 / 타겟 음소 / 동의 체크.
// CON-04 — 모든 카피는 "치료/진단/장애" 금칙어 0건 (발달 확인 / 발음 등 비의료 표현).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSpeechRecognition } from "@/lib/hooks/useSpeechRecognition";
import { useAnonymousUserId } from "@/lib/hooks/useAnonymousUserId";
import { analyzeDiagnosis } from "@/app/actions/diagnosis";

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
  const { status, transcript, errorCode, isSupported, isMounted, retryCount, start, reset } =
    useSpeechRecognition();

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
      return;
    }
    if (!intendedWord) {
      setSubmitError("먼저 자녀가 발음할 단어를 선택해 주세요.");
      return;
    }
    if (!transcript) {
      setSubmitError("발화 결과가 비어 있어요. 다시 한 번 들려주세요.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    setProgressLabel(PROGRESS_STAGES[0].label);
    startProgressTimers();
    try {
      // FR-C-001 (Sprint 2 §2) — phonetic similarity 기반 점수 산출.
      // anonymousUserId: localStorage 영구 식별자 → /rewards 페이지가 동일 사용자 인식.
      const result = await analyzeDiagnosis({
        intendedWord,
        transcript,
        childAgeMonths,
        targetPhoneme,
        anonymousUserId: anonymousUserId ?? undefined,
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
            // 음소 변경 시 의도 단어 + 발화 결과 모두 초기화 (잔여값 혼동 방지).
            setIntendedWord(null);
            reset();
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
          본 서비스는 의료적 판단을 제공하지 않으며, 부모님께 정보 제공을 위한 보조 도구임을
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
                  start();
                }}
                disabled={
                  !intendedWord || status === "listening" || status === "retrying"
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
        disabled={isSubmitting}
        className="w-full rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {isSubmitting ? "분석 중..." : "결과 확인"}
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

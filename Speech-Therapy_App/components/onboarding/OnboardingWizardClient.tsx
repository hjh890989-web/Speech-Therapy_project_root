"use client";

// FR-C-PARENT-ONBOARDING — 신규 부모 first-time wizard (4-step) Client Component.
//
// 4-step 흐름:
//   Step1 환영       — 큰 진행도 + "발음 가이드에 오신 것을 환영합니다!" + 다음
//   Step2 자녀 정보  — childAgeMonths slider (24~144, CR-2026-009) + 관심 음소 1~2개 선택
//                       → saveChildInfo Server Action 호출 → 다음
//   Step3 첫 발음 확인 — 마이크 권한 안내 + "시작하기" → /diagnose 로 이동
//   Step4 완료/보상   — "별을 모으는 여정의 시작!" + /rewards/collection / /missions 안내
//                       → markOnboardingCompleted + 분석 이벤트 + 메인 이동
//
// 사용자 친화 디자인:
//   - 큰 글씨 (text-lg ~ text-2xl), 밝은 파스텔 색상 (emerald / sky / amber).
//   - "함께", "같이", "재미있게" — 부정적 표현 회피.
//   - 큰 버튼 + aria-label 확보 (자녀가 옆에서 봐도 부담 적게).
//
// CON-04 금칙어 (의료 단정 표현) 절대 사용 금지 — wizard 카피 / 주석 / aria-label / 이벤트 properties 모두.
// 본 컴포넌트는 "발음 발달 확인", "발음 가이드", "발음 어려움" 같은 비의료 표현만 사용.
//
// R4 보호:
//   - localStorage 외 외부 전송 0건 (분석 이벤트는 numeric/boolean 메트릭만).
//   - 자녀 이름 / 식별 정보 0건 — 월령 + 음소만.
//
// follow-up PR 적용:
//   - layout 자동 redirect 통합 — app/(public)/layout.tsx + OnboardingRedirectGate.
//   - DB User.onboardingCompletedAt 컬럼 동기화 — markOnboardingCompletedInDb Server Action.
//   - localStorage 는 즉시 UX snapshot, DB 는 다중 디바이스 canonical 상태.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { trackEvent } from "@/lib/analytics";
import {
  MAX_STEP,
  MIN_STEP,
  getOnboardingState,
  markOnboardingCompleted,
  markOnboardingSkipped,
  setOnboardingStep,
} from "@/lib/onboarding/state";
import { saveChildInfo } from "@/app/actions/onboarding-save-child";
// FR-PERF-3-USE-SERVER-REFACTOR — const/type 은 shape 모듈 (non-"use server") 에서.
import {
  ALLOWED_PHONEMES,
  CHILD_AGE_MAX_MONTHS,
  CHILD_AGE_MIN_MONTHS,
  SPEECH_PHONEME_AGE_MAX_MONTHS,
  type AllowedPhoneme,
} from "@/app/actions/onboarding-save-child-shape";
import { markOnboardingCompletedInDb } from "@/app/actions/mark-onboarding-completed";
// SEC-COMP-PIPA (Grill #3A A1+A2) — onboarding Step2 에서 PIPA 동의 통합.
import { savePrivacyConsent } from "@/app/actions/privacy-consent";

/** 본 컴포넌트가 외부로부터 받는 props. */
export interface OnboardingWizardClientProps {
  /** Server Component 에서 결정한 시작 step (1~4). 기본 1. */
  initialStep?: number;
  /** 기존 User.childAgeMonths 값 (있다면 prefill). */
  prefillChildAgeMonths?: number | null;
  /** 분석 분기용 — 본인 user 가 이미 child info 를 저장한 적 있는지. */
  hasExistingChildInfo?: boolean;
  /** UI 상 사용할 자녀 친화 이름 — 기본 "우리 아이". */
  childDisplayName?: string;
  /**
   * 서버 측 onboardingCompletedAt 기준 완료 여부.
   *   - true  : DB 마킹 완료된 user — 본 페이지 진입 자체가 비정상 (sync 또는 redirect).
   *   - false : DB 미완료 — 정상 wizard 흐름.
   *   - null  : 비인증 또는 미확정 — wizard 정상 노출 (page 가 비인증 시 /login redirect 처리).
   */
  initialDbCompleted?: boolean | null;
}

type WizardStep = 1 | 2 | 3 | 4;

const DEFAULT_AGE_MONTHS = 48; // 만 4세 = 48개월 (중앙값).
const NAMESPACE_PHONEME_LIMIT = 2; // 1~2개 동시 선택 허용.

export function OnboardingWizardClient({
  initialStep = MIN_STEP,
  prefillChildAgeMonths = null,
  hasExistingChildInfo = false,
  childDisplayName = "우리 아이",
  initialDbCompleted = null,
}: OnboardingWizardClientProps) {
  const router = useRouter();

  // step state — 1~4 clamp.
  const [step, setStep] = useState<WizardStep>(clampStep(initialStep));

  // 자녀 정보 입력 state.
  const [childAgeMonths, setChildAgeMonths] = useState<number>(
    prefillChildAgeMonths && prefillChildAgeMonths >= CHILD_AGE_MIN_MONTHS
      ? prefillChildAgeMonths
      : DEFAULT_AGE_MONTHS,
  );
  const [selectedPhonemes, setSelectedPhonemes] = useState<AllowedPhoneme[]>([
    "ㅅ",
  ]);

  // SEC-COMP-PIPA (Grill #3A A1+A2) — Step2 에서 받는 두 동의 state.
  // 둘 다 체크되어야 "다음으로" 버튼 활성. saveChildInfo 성공 후 savePrivacyConsent 도 호출.
  const [pipaConsent, setPipaConsent] = useState(false);
  const [overseasConsent, setOverseasConsent] = useState(false);

  // Server Action 호출 상태 (Step2 → Step3 진행).
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // CR-2026-009 — 학령기(만 7세 초과): 발음 미션 비대상 → 음소 선택사항(0개 허용) +
  //   Step3 발음 진단 funnel 대신 읽기·말 놀이로 안내(발음 진단은 만2-7 월령 clamp로 또래비교 무의미).
  const isSchoolAge = childAgeMonths > SPEECH_PHONEME_AGE_MAX_MONTHS;

  // age-2 — 학령기에서 음소를 0개로 비운 뒤 만 7세 이하로 슬라이더를 내리면 빈 채 잔류 →
  //   제출 시 invalid_phonemes. 비학령기 전환 + 0개면 기본값 복구(서버는 만2-7 1~2개 필수).
  useEffect(() => {
    if (!isSchoolAge && selectedPhonemes.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPhonemes(["ㅅ"]);
    }
  }, [isSchoolAge, selectedPhonemes.length]);

  // 시간 측정 — wizard 시작 + 각 step 진입 시각.
  // useRef 초기값은 render 중 호출되므로 Date.now() 직접 호출 회피 (react-hooks/purity).
  // null 초기화 → mount effect 에서 lazy 초기화.
  const wizardStartedAtRef = useRef<number | null>(null);
  const stepStartedAtRef = useRef<number | null>(null);
  // 사용자가 명시적으로 "나중에 할게요" 선택한 step 카운트 (주로 Step3 — 첫 발음 확인 미실시).
  const skippedStepsRef = useRef<number>(0);
  // mount-once 분석 이벤트 guard.
  const startedTrackedRef = useRef(false);

  // mount 시 1회 — 분석 이벤트 + localStorage step 동기화 + DB ↔ localStorage 정합성 보정.
  useEffect(() => {
    if (startedTrackedRef.current) return;
    startedTrackedRef.current = true;
    wizardStartedAtRef.current = Date.now();
    stepStartedAtRef.current = Date.now();
    trackEvent("onboarding_started", { hasExistingChildInfo });
    // hydration mismatch 회피 — localStorage 읽기는 effect 안에서 (외부 시스템 → React state 동기화).
    let localCompleted = false;
    try {
      const state = getOnboardingState();
      localCompleted = state.completed;
      // 이미 완료된 사용자라도 본 wizard 가 노출되었다면 다시 마지막 step 부터 시작.
      if (state.currentStep > step) {
        // 외부 시스템 (localStorage) → React state 의 일회성 동기화 — set-state-in-effect 룰의
        // 정당한 예외 (SplCalibrationWizard 와 동일 패턴).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStep(clampStep(state.currentStep));
      }
    } catch {
      // graceful — default step 유지.
    }

    // DB ↔ localStorage 정합성 동기화 (양방향):
    //   - DB true  + localStorage false → 이미 완료 user. localStorage 마킹 + /missions 로 이동.
    //   - DB false + localStorage true  → 저장 누락 복구 — DB 동기화 후 /missions 로 이동.
    //   - DB true  + localStorage true  → 정상 완료 user. /missions 로 이동.
    //   - DB null              → 비인증/미확정. wizard 그대로 노출 (page 가 비인증 시 redirect 처리).
    //   - DB false + localStorage false → 신규 user. wizard 정상 노출.
    if (initialDbCompleted === true || localCompleted) {
      if (initialDbCompleted === true && !localCompleted) {
        // DB 만 완료 — localStorage 마킹 보충.
        try {
          markOnboardingCompleted();
        } catch {
          // graceful.
        }
      }
      if (initialDbCompleted === false && localCompleted) {
        // localStorage 만 완료 — DB 동기화 (fire-and-forget, 결과 ignore).
        void markOnboardingCompletedInDb().catch(() => {
          // graceful — 다음 device 진입 시 다시 마킹 가능.
        });
      }
      // 이미 완료된 user — wizard 가 노출돼선 안 됨. /missions 로 이동.
      router.replace("/missions");
      return;
    }
    // 의존성 의도적 비움 — mount 시 1회만.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // step 전환 시 localStorage 갱신.
  useEffect(() => {
    setOnboardingStep(step);
    stepStartedAtRef.current = Date.now();
  }, [step]);

  /** 다음 step 진행 — 분석 이벤트 발송 후 step 증가. */
  const goToNextStep = useCallback(
    (currentStep: WizardStep) => {
      const startedAt = stepStartedAtRef.current ?? Date.now();
      const durationMs = Math.max(0, Date.now() - startedAt);
      trackEvent("onboarding_step_completed", {
        step: currentStep,
        durationMs,
      });
      if (currentStep < MAX_STEP) {
        setStep(clampStep(currentStep + 1) as WizardStep);
      }
    },
    [],
  );

  /** wizard 완료 처리 — markCompleted (localStorage + DB) + 분석 이벤트. */
  const handleComplete = useCallback(() => {
    const startedAt = wizardStartedAtRef.current ?? Date.now();
    const totalDurationMs = Math.max(0, Date.now() - startedAt);
    // 1) localStorage 즉시 마킹 — 동일 device 의 다음 진입 시 wizard 차단.
    markOnboardingCompleted();
    // 2) DB 동기화 — 다중 디바이스에서도 wizard 재노출 차단. fire-and-forget — 실패해도
    //    localStorage 마킹은 유효 (해당 device 한정 즉시 UX). 다음 device 진입 시 layout
    //    redirect 가 wizard 다시 노출하면서 DB 마킹 재시도 가능.
    void markOnboardingCompletedInDb().catch(() => {
      // graceful — DB 실패는 사용자 흐름 차단 X.
    });
    trackEvent("onboarding_completed", {
      totalDurationMs,
      skippedSteps: skippedStepsRef.current,
    });
  }, []);

  /** 사용자가 "다시 보지 않기" 클릭 시. */
  const handleSkip = useCallback(
    (atStep: WizardStep) => {
      markOnboardingSkipped();
      trackEvent("onboarding_skipped", { atStep });
      router.push("/");
    },
    [router],
  );

  /** Step 2 → Server Action 호출 (자녀 정보 + PIPA 동의) → Step 3 으로 진행. */
  const handleSubmitChildInfo = useCallback(async () => {
    // SEC-COMP-PIPA 가드 — 두 동의 모두 필수.
    if (!pipaConsent || !overseasConsent) {
      setSaveError("두 동의 모두 체크해 주세요.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      // 1) 자녀 정보 저장.
      const result = await saveChildInfo({
        childAgeMonths,
        targetPhonemes: selectedPhonemes,
      });
      if (!result.success) {
        setSaveError(result.message);
        return;
      }
      // 2) PIPA 동의 저장 — 실패해도 자녀 정보는 저장된 상태이므로 graceful 분기.
      //    실패 시 사용자는 /settings/privacy-consent 에서 재동의 가능.
      const consentResult = await savePrivacyConsent({
        pipaUnderage: pipaConsent,
        overseasTransfer: overseasConsent,
      });
      if (!consentResult.success) {
        setSaveError(
          "동의 저장에 실패했어요. /settings/privacy-consent 에서 다시 시도해 주세요.",
        );
        return;
      }
      goToNextStep(2);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "저장 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    childAgeMonths,
    selectedPhonemes,
    pipaConsent,
    overseasConsent,
    goToNextStep,
  ]);

  /** Step 3 의 "시작하기" — 분석 이벤트 후 /diagnose 로 이동. */
  const handleStartDiagnose = useCallback(() => {
    goToNextStep(3);
    if (isSchoolAge) {
      // age-1 — 학령기(만 7세 초과)는 발음 진단(만2-7 월령 clamp → 또래비교 무의미) 대신 읽기·말 놀이로.
      router.push("/literacy/start");
      return;
    }
    const primaryPhoneme = selectedPhonemes[0] ?? "ㅅ";
    // 발음 확인 페이지 진입 — onboarding=1 query 로 분기 표시.
    const params = new URLSearchParams({
      phoneme: primaryPhoneme,
      onboarding: "1",
    });
    router.push(`/diagnose?${params.toString()}`);
  }, [router, selectedPhonemes, goToNextStep, isSchoolAge]);

  /** Step 3 의 "이번엔 건너뛰기" — Step4 로 바로 이동. */
  const handleSkipDiagnose = useCallback(() => {
    skippedStepsRef.current += 1;
    goToNextStep(3);
  }, [goToNextStep]);

  /** 음소 토글. */
  const togglePhoneme = useCallback((p: AllowedPhoneme) => {
    setSelectedPhonemes((prev) => {
      if (prev.includes(p)) {
        // 만 2~7세는 최소 1개 유지 / 학령기는 0개까지 허용(선택사항).
        if (!isSchoolAge && prev.length === 1) return prev;
        return prev.filter((x) => x !== p);
      }
      if (prev.length >= NAMESPACE_PHONEME_LIMIT) {
        // 1~2개 제한: 가장 오래된 것 제거 후 추가.
        return [prev[prev.length - 1], p];
      }
      return [...prev, p];
    });
  }, [isSchoolAge]);

  const progressPct = useMemo(
    () => Math.round(((step - MIN_STEP + 1) / (MAX_STEP - MIN_STEP + 1)) * 100),
    [step],
  );

  return (
    <section
      data-testid="onboarding-wizard"
      aria-labelledby="onboarding-wizard-heading"
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
    >
      {/* 진행도 표시 — 4단계 progressbar (자녀 친화 emerald 색). */}
      <div
        data-testid="onboarding-progress"
        className="mb-8"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={MIN_STEP}
        aria-valuemax={MAX_STEP}
        aria-label={`온보딩 진행도 ${step} / ${MAX_STEP}`}
      >
        <div className="mb-2 flex items-center justify-between text-sm text-emerald-700">
          <span>
            {step} / {MAX_STEP} 단계
          </span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-emerald-100">
          <div
            data-testid="onboarding-progress-bar"
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {step === 1 && (
        <Step1Welcome
          onNext={() => goToNextStep(1)}
          onSkip={() => handleSkip(1)}
        />
      )}

      {step === 2 && (
        <Step2ChildInfo
          childAgeMonths={childAgeMonths}
          onChangeAge={setChildAgeMonths}
          selectedPhonemes={selectedPhonemes}
          onTogglePhoneme={togglePhoneme}
          pipaConsent={pipaConsent}
          onTogglePipa={setPipaConsent}
          overseasConsent={overseasConsent}
          onToggleOverseas={setOverseasConsent}
          onSubmit={handleSubmitChildInfo}
          onSkip={() => handleSkip(2)}
          isSaving={isSaving}
          error={saveError}
        />
      )}

      {step === 3 && (
        <Step3FirstDiagnose
          childDisplayName={childDisplayName}
          primaryPhoneme={selectedPhonemes[0] ?? "ㅅ"}
          onStart={handleStartDiagnose}
          onSkipForNow={handleSkipDiagnose}
          onSkip={() => handleSkip(3)}
        />
      )}

      {step === 4 && (
        <Step4Complete
          onFinish={() => {
            handleComplete();
            router.push("/");
          }}
          onGoCollection={() => {
            handleComplete();
            router.push("/rewards/collection");
          }}
          onGoMissions={() => {
            handleComplete();
            router.push("/missions");
          }}
        />
      )}
    </section>
  );
}

// ===========================================================================
// Step 컴포넌트들 — 같은 파일 안에 정의 (단순화). 각 step 은 자체 testid 보유.
// ===========================================================================

function Step1Welcome({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div data-testid="onboarding-step-1" className="space-y-6 text-center">
      <h1
        id="onboarding-wizard-heading"
        className="text-3xl font-bold text-emerald-700 sm:text-4xl"
      >
        발음 가이드에 오신 것을 환영합니다!
      </h1>
      <p className="text-lg text-slate-700">
        우리 아이의 발음 발달을 함께 살펴보고, 매일 작은 성취를 모아 가는
        즐거운 여정이에요.
      </p>
      <p className="text-base text-slate-600">
        본 안내는 약 1분이 걸려요. 자녀가 옆에 있어도 함께 보기 좋은 화면이에요.
      </p>
      <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onNext}
          data-testid="onboarding-next-btn"
          className="w-full rounded-full bg-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-md hover:bg-emerald-600 sm:w-auto"
          aria-label="다음 단계로 이동"
        >
          시작하기
        </button>
        <button
          type="button"
          onClick={onSkip}
          data-testid="onboarding-skip-btn"
          className="text-sm text-slate-500 underline-offset-2 hover:underline"
          aria-label="안내를 다시 보지 않기"
        >
          이번엔 건너뛰기
        </button>
      </div>
    </div>
  );
}

function Step2ChildInfo({
  childAgeMonths,
  onChangeAge,
  selectedPhonemes,
  onTogglePhoneme,
  pipaConsent,
  onTogglePipa,
  overseasConsent,
  onToggleOverseas,
  onSubmit,
  onSkip,
  isSaving,
  error,
}: {
  childAgeMonths: number;
  onChangeAge: (v: number) => void;
  selectedPhonemes: ReadonlyArray<AllowedPhoneme>;
  onTogglePhoneme: (p: AllowedPhoneme) => void;
  /// SEC-COMP-PIPA (Grill #3A A1) — 만 14세 미만 부모 대리 동의 체크 여부.
  pipaConsent: boolean;
  onTogglePipa: (v: boolean) => void;
  /// SEC-COMP-PIPA (Grill #3A A2) — STT + Gemini 국외 이전 동의 체크 여부.
  overseasConsent: boolean;
  onToggleOverseas: (v: boolean) => void;
  onSubmit: () => void;
  onSkip: () => void;
  isSaving: boolean;
  error: string | null;
}) {
  const bothConsented = pipaConsent && overseasConsent;
  return (
    <div data-testid="onboarding-step-2" className="space-y-6">
      <h2 className="text-2xl font-bold text-emerald-700">
        우리 아이를 함께 알려 주세요
      </h2>
      <p className="text-base text-slate-700">
        나이와 관심 있는 발음을 알려 주시면 더 잘 맞는 안내를 드릴 수 있어요.
      </p>

      <div className="space-y-3 rounded-lg bg-amber-50 p-5">
        <label
          htmlFor="onboarding-age-slider"
          className="block text-lg font-semibold text-amber-900"
        >
          자녀 나이: 만 {Math.floor(childAgeMonths / 12)}세 {childAgeMonths % 12}개월
          <span className="ml-2 text-base font-normal text-amber-800">
            ({childAgeMonths}개월)
          </span>
        </label>
        <input
          id="onboarding-age-slider"
          data-testid="onboarding-age-slider"
          type="range"
          min={CHILD_AGE_MIN_MONTHS}
          max={CHILD_AGE_MAX_MONTHS}
          value={childAgeMonths}
          onChange={(e) => onChangeAge(Number(e.target.value))}
          className="w-full accent-amber-500"
          aria-label="자녀 월령 슬라이더 24개월부터 144개월"
        />
        <p className="text-xs text-amber-800">
          만 2세 (24개월) ~ 만 12세 (144개월) 사이로 선택해 주세요.
        </p>
      </div>

      <div className="space-y-3 rounded-lg bg-sky-50 p-5">
        <p className="text-lg font-semibold text-sky-900">
          {childAgeMonths > SPEECH_PHONEME_AGE_MAX_MONTHS
            ? "어떤 발음이 궁금하세요? (선택)"
            : "어떤 발음이 궁금하세요? (1~2개)"}
        </p>
        {childAgeMonths > SPEECH_PHONEME_AGE_MAX_MONTHS && (
          <p
            data-testid="onboarding-phoneme-optional-note"
            className="text-sm text-sky-800"
          >
            큰 아이는 읽기·말 놀이 중심이에요. 발음이 궁금하면 골라도 좋아요(선택).
          </p>
        )}
        <div
          data-testid="onboarding-phoneme-group"
          role="group"
          aria-label="관심 음소 선택"
          className="flex flex-wrap gap-3"
        >
          {ALLOWED_PHONEMES.map((p) => {
            const selected = selectedPhonemes.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => onTogglePhoneme(p)}
                data-testid={`onboarding-phoneme-${p}`}
                aria-pressed={selected}
                className={`rounded-full px-6 py-3 text-xl font-bold transition ${
                  selected
                    ? "bg-sky-500 text-white shadow-md"
                    : "bg-white text-sky-800 ring-1 ring-sky-300 hover:bg-sky-100"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* SEC-COMP-PIPA (Grill #3A A1+A2) — 부모 대리 동의 + 국외 이전 동의 (둘 다 필수). */}
      <div className="space-y-3 rounded-lg bg-slate-50 p-5 dark:bg-slate-900">
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          개인정보 동의 (필수)
        </p>
        <label
          data-testid="onboarding-pipa-checkbox"
          className="flex items-start gap-3 rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <input
            type="checkbox"
            checked={pipaConsent}
            onChange={(e) => onTogglePipa(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              [필수] 만 14세 미만 자녀의 개인정보 처리 (PIPA §22조 6항)
            </span>
            <span className="mt-1 block">
              자녀의 발화 텍스트 + 월령 + 발달 점수 등을 발음 가이드 목적으로 처리하는 데
              법정대리인 (부모) 의 동의가 필요해요.
            </span>
          </span>
        </label>
        <label
          data-testid="onboarding-overseas-checkbox"
          className="flex items-start gap-3 rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <input
            type="checkbox"
            checked={overseasConsent}
            onChange={(e) => onToggleOverseas(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              [필수] 개인정보 국외 이전 (PIPA §17조)
            </span>
            <span className="mt-1 block">
              Google Cloud Speech (미국, 음성 → 텍스트) + Google Gemini (미국, 안내 문구)
              로 이전돼요. 자세한 항목은{" "}
              <Link href="/privacy" className="underline">
                개인정보 처리방침
              </Link>{" "}
              참고.
            </span>
          </span>
        </label>
      </div>

      {error && (
        <p
          data-testid="onboarding-save-error"
          role="alert"
          className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onSkip}
          data-testid="onboarding-skip-btn"
          className="text-sm text-slate-500 underline-offset-2 hover:underline"
          aria-label="안내를 다시 보지 않기"
        >
          이번엔 건너뛰기
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSaving || !bothConsented}
          data-testid="onboarding-next-btn"
          className="w-full rounded-full bg-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-md hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          aria-label="자녀 정보 + 동의 저장하고 다음 단계로 이동"
        >
          {isSaving ? "저장 중..." : "다음으로"}
        </button>
      </div>
    </div>
  );
}

function Step3FirstDiagnose({
  childDisplayName,
  primaryPhoneme,
  onStart,
  onSkipForNow,
  onSkip,
}: {
  childDisplayName: string;
  primaryPhoneme: AllowedPhoneme;
  onStart: () => void;
  onSkipForNow: () => void;
  onSkip: () => void;
}) {
  return (
    <div data-testid="onboarding-step-3" className="space-y-6">
      <h2 className="text-2xl font-bold text-emerald-700">
        {childDisplayName}와 함께 첫 발음 발달 확인을 시작해 볼까요?
      </h2>
      <p className="text-base text-slate-700">
        오늘 함께 살펴볼 발음은{" "}
        <span className="font-bold text-emerald-700">{primaryPhoneme}</span>{" "}
        예요. 한 단어만 또박또박 따라 말해 주면 끝나요.
      </p>

      <div className="space-y-2 rounded-lg bg-emerald-50 p-5 text-base text-emerald-900">
        <p className="font-semibold">마이크 사용 안내</p>
        <ul className="ml-5 list-disc space-y-1 text-sm text-emerald-800">
          <li>브라우저가 마이크 접근을 물어보면 &quot;허용&quot; 을 눌러 주세요.</li>
          <li>아이의 목소리 외 소음이 적은 조용한 곳이 좋아요.</li>
          <li>녹음 데이터는 발음 확인에만 사용되고 외부로 공유되지 않아요.</li>
        </ul>
      </div>

      <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onSkip}
          data-testid="onboarding-skip-btn"
          className="text-sm text-slate-500 underline-offset-2 hover:underline"
          aria-label="안내를 다시 보지 않기"
        >
          이번엔 건너뛰기
        </button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onSkipForNow}
            data-testid="onboarding-step3-skip-now-btn"
            className="rounded-full bg-slate-100 px-6 py-3 text-base font-medium text-slate-700 hover:bg-slate-200"
            aria-label="첫 발음 확인은 나중에 하고 다음으로 이동"
          >
            나중에 할게요
          </button>
          <button
            type="button"
            onClick={onStart}
            data-testid="onboarding-step3-start-btn"
            className="rounded-full bg-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-md hover:bg-emerald-600"
            aria-label="첫 발음 발달 확인 시작하기"
          >
            지금 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}

function Step4Complete({
  onFinish,
  onGoCollection,
  onGoMissions,
}: {
  onFinish: () => void;
  onGoCollection: () => void;
  onGoMissions: () => void;
}) {
  return (
    <div data-testid="onboarding-step-4" className="space-y-6 text-center">
      <h2 className="text-3xl font-bold text-emerald-700">
        별을 모으는 즐거운 여정의 시작!
      </h2>
      <p className="text-lg text-slate-700">
        우리 아이가 한 단계씩 성장할 때마다 별과 나무가 함께 자라요. 매일 작은
        미션으로 발음 발달을 즐겁게 살펴보세요.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/rewards/collection"
          onClick={onGoCollection}
          data-testid="onboarding-step4-collection-link"
          className="rounded-lg bg-amber-100 p-5 text-left transition hover:bg-amber-200"
          aria-label="보상 도감으로 이동하기"
        >
          <p className="text-lg font-semibold text-amber-900">보상 도감 보기</p>
          <p className="mt-1 text-sm text-amber-800">
            지금까지 모은 별과 나무를 한눈에 볼 수 있어요.
          </p>
        </Link>
        <Link
          href="/missions"
          onClick={onGoMissions}
          data-testid="onboarding-step4-missions-link"
          className="rounded-lg bg-sky-100 p-5 text-left transition hover:bg-sky-200"
          aria-label="오늘의 미션으로 이동하기"
        >
          <p className="text-lg font-semibold text-sky-900">오늘의 미션</p>
          <p className="mt-1 text-sm text-sky-800">
            짧은 발음 놀이 한 가지로 별을 받아 보세요.
          </p>
        </Link>
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={onFinish}
          data-testid="onboarding-finish-btn"
          className="rounded-full bg-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-md hover:bg-emerald-600"
          aria-label="안내 마치고 메인으로 이동"
        >
          메인으로 이동
        </button>
      </div>
    </div>
  );
}

/** 내부 — step 번호를 1~4 로 clamp + WizardStep 타입 안정화. */
function clampStep(n: number): WizardStep {
  const t = Math.trunc(n);
  if (t < MIN_STEP) return MIN_STEP as WizardStep;
  if (t > MAX_STEP) return MAX_STEP as WizardStep;
  return t as WizardStep;
}

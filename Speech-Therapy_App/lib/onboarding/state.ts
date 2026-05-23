// FR-C-PARENT-ONBOARDING — 신규 부모 first-time wizard 의 localStorage 게이트웨이.
//
// 책임:
//   1) SSR 안전 (typeof window === "undefined" 가드 → 모든 read 는 default 반환)
//   2) wizard 진행도 / 완료 / 건너뛰기 상태 단순 boolean + step 번호 보관
//   3) 손상된 값 (NaN / 범위 외 step) 은 graceful 처리 — 항상 1~4 clamp
//
// DB 변경 회피 정책:
//   - MVP 단순화. 본 PR 에선 User.onboardingCompletedAt 컬럼 도입 X.
//   - localStorage 기반 1차 차단 → 후속 PR 에서 DB 동기화 + 다중 디바이스 동기화.
//
// R4 (자녀 보호):
//   - localStorage 외 외부 전송 0건. 저장 값은 단순 boolean / number — PII 0건.
//   - 카피 / aria-label / 이벤트 properties 어디서도 자녀 식별 정보 0건.
//
// CON-04:
//   - 본 모듈의 key 명 / 주석에 의료 단정 금칙어 0건. wizard 내에선 "발음 발달 확인" 표현 사용.

/** wizard 완료 마킹 key — 4단계 모두 완주한 사용자. */
export const STORAGE_KEY_COMPLETED = "onboarding-completed";

/** wizard 건너뛰기 마킹 key — 사용자가 "다시 보지 않기" 선택. */
export const STORAGE_KEY_SKIPPED = "onboarding-skipped";

/** 마지막으로 도달한 step 번호 key — 1~4 범위. */
export const STORAGE_KEY_STEP = "onboarding-current-step";

/** wizard 최소 step (환영 화면). */
export const MIN_STEP = 1;

/** wizard 최대 step (완료/보상 안내). */
export const MAX_STEP = 4;

/** 모든 onboarding 상태를 한번에 표현하는 shape. */
export interface OnboardingState {
  /** 4단계 모두 완료 마킹 여부. */
  completed: boolean;
  /** 사용자가 "다시 보지 않기" 선택 여부. */
  skipped: boolean;
  /** 마지막 step 번호 (1~4 clamp). 미저장이면 1. */
  currentStep: number;
}

/**
 * 현재 onboarding 상태를 읽어 반환.
 *
 * SSR / localStorage 미접근 / 손상값 분기는 default 로 graceful:
 *   - completed=false, skipped=false, currentStep=1.
 *
 * 호출 비용: localStorage 동기 3회. mount 시 1회 read → React state 동기화 권장
 *           (tick / render 마다 호출 금지).
 */
export function getOnboardingState(): OnboardingState {
  if (typeof window === "undefined") {
    return { completed: false, skipped: false, currentStep: MIN_STEP };
  }
  try {
    const completedRaw = window.localStorage.getItem(STORAGE_KEY_COMPLETED);
    const skippedRaw = window.localStorage.getItem(STORAGE_KEY_SKIPPED);
    const stepRaw = window.localStorage.getItem(STORAGE_KEY_STEP);
    return {
      completed: completedRaw === "true",
      skipped: skippedRaw === "true",
      currentStep: clampStep(parseStep(stepRaw)),
    };
  } catch {
    // QuotaExceeded / SecurityError (private mode 일부) — default 폴백.
    return { completed: false, skipped: false, currentStep: MIN_STEP };
  }
}

/**
 * 마지막 step 번호를 갱신. 범위 외 / NaN 은 거부 (no-op).
 * 반환 boolean: 성공 (저장됨) 여부.
 */
export function setOnboardingStep(step: number): boolean {
  if (typeof window === "undefined") return false;
  if (!Number.isFinite(step)) return false;
  const clamped = clampStep(step);
  try {
    window.localStorage.setItem(STORAGE_KEY_STEP, String(clamped));
    return true;
  } catch {
    return false;
  }
}

/**
 * wizard 완료 마킹. 동시에 currentStep 을 MAX_STEP 로 고정.
 * 이후 getOnboardingState 호출은 completed=true 반환.
 */
export function markOnboardingCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_COMPLETED, "true");
    window.localStorage.setItem(STORAGE_KEY_STEP, String(MAX_STEP));
  } catch {
    // no-op — graceful.
  }
}

/**
 * 사용자가 "다시 보지 않기" 선택 시 호출. completed 와 별개 — 추후 분석에서
 * "끝까지 본 사용자" vs "건너뛴 사용자" 분기 측정에 사용.
 */
export function markOnboardingSkipped(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_SKIPPED, "true");
  } catch {
    // no-op.
  }
}

/**
 * 모든 onboarding 마킹을 제거 — 신규 사용자처럼 처음부터 다시 진입 가능.
 * 주로 dev 도구 / 테스트 / 향후 "다시 보기" 옵션에서 사용.
 */
export function resetOnboardingState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_COMPLETED);
    window.localStorage.removeItem(STORAGE_KEY_SKIPPED);
    window.localStorage.removeItem(STORAGE_KEY_STEP);
  } catch {
    // no-op.
  }
}

/** 내부 — step 문자열 → number (NaN 시 MIN_STEP). */
function parseStep(raw: string | null): number {
  if (raw === null) return MIN_STEP;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return MIN_STEP;
  return parsed;
}

/** 내부 — step 번호를 [MIN_STEP, MAX_STEP] 로 clamp. */
function clampStep(step: number): number {
  if (step < MIN_STEP) return MIN_STEP;
  if (step > MAX_STEP) return MAX_STEP;
  return Math.trunc(step);
}

// FR-C-PARENT-ONBOARDING — 서버 측 wizard 시작 step 산출.
//
// localStorage 는 클라이언트 only → Server Component 에선 DB 정보만으로 추론.
// 정책 (보수적 — 클라이언트 effect 가 더 큰 currentStep 로 다시 끌어올림):
//   - childAgeMonths 미저장 → Step 2 부터 (자녀 정보 입력 단계).
//     단, 본 PR 단순화: 항상 Step 1 부터 시작하여 환영 카피 노출 — 신규 사용자에게 컨텍스트 제공.
//   - 본 helper 는 향후 server-side onboardingCompletedAt 컬럼 도입 시 분기 확장점.
//
// 본 PR 에선 무조건 1 반환 (단순). 추후 server-side state 가 풍부해지면 본 함수만 교체.

import { MIN_STEP } from "@/lib/onboarding/state";

/**
 * 서버 측 wizard 시작 step 산출. 본 PR 단순화: 항상 MIN_STEP (1).
 * 향후 server-side state 추가 시 본 함수 분기 확장.
 */
export function getOnboardingStartStep(
  _prefillChildAgeMonths: number | null,
): number {
  return MIN_STEP;
}

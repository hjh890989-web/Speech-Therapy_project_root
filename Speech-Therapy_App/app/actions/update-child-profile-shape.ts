// FR-PERF-3-USE-SERVER-REFACTOR — update-child-profile Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.
//
// 참고: ALLOWED_PHONEMES / CHILD_AGE_*_MONTHS 는 onboarding-save-child-shape.ts 와
// 의도적 _중복_ — 두 흐름이 schema 변경 시 독립 진화 가능하도록 분리 보존.
// 만약 한쪽이 확장되면 다른 쪽도 동기 갱신해야 함.

/** 허용 음소 — onboarding-save-child 의 ALLOWED_PHONEMES 와 동일. */
export const ALLOWED_PHONEMES = ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"] as const;
export type AllowedPhoneme = (typeof ALLOWED_PHONEMES)[number];

/** 자녀 월령 허용 범위 (만 2~12세 — CR-2026-009 학령기 전면확장. literacy 도메인 상한 144 정합). */
export const CHILD_AGE_MIN_MONTHS = 24;
export const CHILD_AGE_MAX_MONTHS = 144;

/** preferredPhonemes 최대 선택 개수. */
export const PREFERRED_PHONEMES_MAX = 5;

/** Server Action 입력 — 가입한 부모가 변경하려는 자녀 프로필. */
export interface UpdateChildProfileInput {
  /** 자녀 월령 (24~144). */
  childAgeMonths: number;
  /** 관심 음소 (0~5개, 빈 배열 허용 = 시스템 자동 추천). */
  preferredPhonemes: ReadonlyArray<AllowedPhoneme>;
}

/** Server Action 결과 — graceful (throw 없음). */
export type UpdateChildProfileResult =
  | {
      success: true;
      userId: string;
      childAgeMonths: number;
      preferredPhonemes: ReadonlyArray<AllowedPhoneme>;
    }
  | {
      success: false;
      reason:
        | "unauthorized"
        | "invalid_age"
        | "invalid_phonemes"
        | "db_failed"
        /// SEC-COMP-PIPA (Grill #3A) — PIPA 두 동의 미완료. UI 에서 /settings/privacy-consent 안내.
        | "consent_required";
      message: string;
    };

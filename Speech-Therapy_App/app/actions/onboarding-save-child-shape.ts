// FR-PERF-3-USE-SERVER-REFACTOR — onboarding-save-child Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.
//
// 참고: ALLOWED_PHONEMES / CHILD_AGE_*_MONTHS 는 update-child-profile-shape.ts 와
// 의도적 _중복_ — 두 흐름이 schema 변경 시 독립 진화 가능하도록 분리 보존.
// 만약 한쪽이 확장되면 다른 쪽도 동기 갱신해야 함.

/** 허용 음소 — 발음 확인/미션 카탈로그 (FR-Q-001 / FR-Q-003) 와 정합. */
export const ALLOWED_PHONEMES = ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"] as const;
export type AllowedPhoneme = (typeof ALLOWED_PHONEMES)[number];

/** 자녀 월령 허용 범위 (만 2~12세 — CR-2026-009 학령기 전면확장. literacy 도메인 상한 144 정합). */
export const CHILD_AGE_MIN_MONTHS = 24;
export const CHILD_AGE_MAX_MONTHS = 144;

/**
 * 발음 음소 선택이 의미 있는 연령 상한(만 7세 = 84개월).
 * CR-2026-009 온보딩 음소 연령분기: 이 값을 **초과(학령기)** 하면 발음 미션 비대상 →
 * 온보딩 음소 선택을 **선택사항(0개 허용)** 으로 완화(읽기·말 놀이 중심). 만 2~7세는 1~2개 필수 유지.
 */
export const SPEECH_PHONEME_AGE_MAX_MONTHS = 84;

/** wizard Step 2 입력. */
export interface SaveChildInfoInput {
  /** 자녀 월령 (24~144). */
  childAgeMonths: number;
  /** 관심 타겟 음소 (1~2개). */
  targetPhonemes: ReadonlyArray<AllowedPhoneme>;
}

/** Server Action 결과. */
export type SaveChildInfoResult =
  | {
      success: true;
      userId: string;
      childAgeMonths: number;
      targetPhonemes: ReadonlyArray<AllowedPhoneme>;
    }
  | {
      success: false;
      reason:
        | "unauthorized"
        | "invalid_age"
        | "invalid_phonemes"
        | "db_failed";
      message: string;
    };

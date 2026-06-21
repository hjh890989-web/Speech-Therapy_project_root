// 비단어 따라말하기(nonword-repetition) — 활성 플래그 + 연령 게이트 + 세션 구성 (CR-2026-007 후속).
//
// ⚠️ 활성 게이트 (음운인식/추론/F15 선례): 임상 해석·영속·연동은 KOPLAC 자문 통과 전까지 비활성.
//    LITERACY_NWR_ENABLED !== 'true' (default off) → UI 휴면("준비 중").
// 연령 게이트: 만 2~7세 — 어휘 놀이와 공통 상수 재사용(vocabulary.ts).
//
// **연습/유도만 — 점수·정상규준·위험 판정 산출 X.** 음절 길이 점증 따라말하기(음운 작업기억 부하).

import {
  CLINICAL_PLAY_AGE_MIN_MONTHS,
  CLINICAL_PLAY_AGE_MAX_MONTHS,
} from "./vocabulary";
import {
  NONWORD_LENGTHS,
  nonwordItemsByLength,
  type NonwordItem,
} from "./nonword-repetition-content";

// ----- 활성 플래그 (default off) -----
/// LITERACY_NWR_ENABLED === 'true' 일 때만 비단어 따라말하기 활성. KOPLAC 게이트.
export function isNwrEnabled(): boolean {
  return process.env.LITERACY_NWR_ENABLED === "true";
}

// ----- 연령 게이트 (만 2~7세, 임상 놀이 공통) -----
/// 비단어 따라말하기 연령 적격 여부 (만 2~7세만).
export function isNwrAgeEligible(ageMonths: number): boolean {
  return (
    Number.isFinite(ageMonths) &&
    ageMonths >= CLINICAL_PLAY_AGE_MIN_MONTHS &&
    ageMonths <= CLINICAL_PLAY_AGE_MAX_MONTHS
  );
}

// ----- 세션 구성 (결정적 순수 함수, 채점 X) -----
/// 음절 길이 짧은→긴 순으로 각 길이 앞 N개를 이어붙인 결정적 따라말하기 세션. UI 입력용.
export function buildNwrSession(perLength = 2): NonwordItem[] {
  const n = Math.max(0, perLength);
  return NONWORD_LENGTHS.flatMap((len: number) =>
    nonwordItemsByLength(len).slice(0, n),
  );
}

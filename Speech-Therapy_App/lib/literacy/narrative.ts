// 이야기 놀이(narrative) — 활성 플래그 + 연령 게이트 + 순서/다시말하기 구성 (CR-2026-007 후속).
//
// ⚠️ 활성 게이트 (음운인식/추론/F15 선례): 임상 해석·영속·연동은 KOPLAC 자문 통과 전까지 비활성.
//    LITERACY_NARRATIVE_ENABLED !== 'true' (default off) → UI 휴면("준비 중").
// 연령 게이트: 만 2~7세 — 어휘 놀이와 공통 상수 재사용(vocabulary.ts).
//
// **연습/유도만 — 점수·정상규준·위험 판정 산출 X.** 장면 순서 잇기 + 이야기문법 7요소 다시말하기 스캐폴딩.

import {
  CLINICAL_PLAY_AGE_MIN_MONTHS,
  CLINICAL_PLAY_AGE_MAX_MONTHS,
} from "./vocabulary";
import {
  STORY_ELEMENT_LABEL,
  type StoryItem,
  type StoryScene,
} from "./narrative-content";

// ----- 활성 플래그 (default off) -----
/// LITERACY_NARRATIVE_ENABLED === 'true' 일 때만 이야기 놀이 활성. KOPLAC 게이트.
export function isNarrativeEnabled(): boolean {
  return process.env.LITERACY_NARRATIVE_ENABLED === "true";
}

// ----- 연령 게이트 (만 2~7세, 임상 놀이 공통) -----
/// 이야기 놀이 연령 적격 여부 (만 2~7세만).
export function isNarrativeAgeEligible(ageMonths: number): boolean {
  return (
    Number.isFinite(ageMonths) &&
    ageMonths >= CLINICAL_PLAY_AGE_MIN_MONTHS &&
    ageMonths <= CLINICAL_PLAY_AGE_MAX_MONTHS
  );
}

// ----- 다시말하기 스캐폴딩 (결정적 순수 함수, 채점 X) -----
export interface RetellStep {
  element: StoryScene["element"];
  /// 아이용 스캐폴딩 질문.
  label: string;
  /// 해당 장면 설명(부모 참고용 단서).
  caption: string;
  emoji: string;
}

/// 7요소 정본 순서대로 다시말하기 스캐폴딩 단계 구성. UI 입력용(유도만).
export function buildRetellSteps(story: StoryItem): RetellStep[] {
  return story.scenes.map((s) => ({
    element: s.element,
    label: STORY_ELEMENT_LABEL[s.element],
    caption: s.caption,
    emoji: s.emoji,
  }));
}

// ----- 순서 잇기 (결정적 비-항등 제시 순서, 채점 X) -----
/// 장면을 결정적으로 뒤섞어 제시(순서 잇기 놀이용). 정본 순서는 story.scenes.
///  길이 ≥2 면 정본과 다른 순서를 보장(앞쪽 두 장면 위치 교환 후 회전).
export function presentedScenes(story: StoryItem): StoryScene[] {
  const scenes = story.scenes;
  if (scenes.length < 2) return [...scenes];
  // 회전(1칸) → 정본과 확실히 다른 결정적 순서.
  return [...scenes.slice(1), scenes[0]];
}

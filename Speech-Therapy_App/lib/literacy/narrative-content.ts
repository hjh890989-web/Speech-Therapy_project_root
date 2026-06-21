// MOCK-LIT-NARR (CR-2026-007 후속 / 이야기문법·담화) — 이야기 장면 (자체 제작).
//
// ⚠️ 저작권·원본성 (OPS-LIT-01):
//   이야기·장면·질문은 **자체 작성**이며 어떤 표준화 담화/이야기 검사의 지문·그림·문항을
//   인용·복제하지 않는다. 일상적 짧은 이야기만 사용. 상업 출시 전 원본성 법률검토.
//
// 임상 구인 (외부 wiki 근거 — ../Speech_Therapy_Wiki/my-healthcare-workbase/wiki/):
//   이야기문법(story grammar) 7요소 거시구조 — Stein & Glenn 계열(배경·계기사건·내적반응·계획·
//   시도·결과·반응). sources: S024·S102·S148 (이야기 중재·이야기문법 산출). concept: 이야기문법 · 담화.
//   **유도/연습만 — 평가·채점·정상규준 산출 X.** 순서 잇기 + 7요소 스캐폴딩 다시말하기.
//
// CON-04: 자녀 친화 + 의료/진단/장애 금칙어 0건. 만 2~7세.

/// 이야기문법 7요소 (산출 위계 거시구조 순서).
export type StoryElement =
  | "setting"
  | "initiating"
  | "internalResponse"
  | "internalPlan"
  | "attempt"
  | "consequence"
  | "reaction";

export const STORY_ELEMENTS: readonly StoryElement[] = [
  "setting",
  "initiating",
  "internalResponse",
  "internalPlan",
  "attempt",
  "consequence",
  "reaction",
];

/// 요소별 아이용 스캐폴딩 질문(금칙어 0). 다시말하기 유도용.
export const STORY_ELEMENT_LABEL: Record<StoryElement, string> = {
  setting: "누가, 어디에 있었나요?",
  initiating: "무슨 일이 생겼나요?",
  internalResponse: "그때 마음이 어땠을까요?",
  internalPlan: "어떻게 하기로 했나요?",
  attempt: "무엇을 해 보았나요?",
  consequence: "어떻게 되었나요?",
  reaction: "이야기 끝에 기분이 어땠을까요?",
};

export interface StoryScene {
  element: StoryElement;
  emoji: string;
  /// 짧은 장면 설명(자체 작성).
  caption: string;
}

export interface StoryItem {
  id: string;
  title: string;
  /// 7요소 순서대로(거시구조 정본).
  scenes: StoryScene[];
}

// 자체 작성 이야기 3편 — 각 7요소 장면.
export const NARRATIVE_STORIES: readonly StoryItem[] = [
  {
    id: "story-1",
    title: "토끼와 당근",
    scenes: [
      { element: "setting", emoji: "🐰", caption: "토끼가 마당에서 놀고 있었어요." },
      { element: "initiating", emoji: "🥕", caption: "멀리 큰 당근이 보였어요." },
      { element: "internalResponse", emoji: "😋", caption: "토끼는 당근이 무척 먹고 싶었어요." },
      { element: "internalPlan", emoji: "💡", caption: "당근까지 깡충깡충 가기로 했어요." },
      { element: "attempt", emoji: "🏃", caption: "토끼가 열심히 뛰어갔어요." },
      { element: "consequence", emoji: "🥕", caption: "드디어 당근을 손에 넣었어요." },
      { element: "reaction", emoji: "😊", caption: "토끼는 기뻐서 활짝 웃었어요." },
    ],
  },
  {
    id: "story-2",
    title: "비 오는 날",
    scenes: [
      { element: "setting", emoji: "🌳", caption: "지우가 공원에서 그림을 그렸어요." },
      { element: "initiating", emoji: "🌧️", caption: "갑자기 비가 내리기 시작했어요." },
      { element: "internalResponse", emoji: "😟", caption: "지우는 그림이 젖을까 봐 걱정했어요." },
      { element: "internalPlan", emoji: "☂️", caption: "우산을 펴기로 했어요." },
      { element: "attempt", emoji: "🙆", caption: "지우가 우산을 활짝 폈어요." },
      { element: "consequence", emoji: "🖼️", caption: "그림이 비에 젖지 않았어요." },
      { element: "reaction", emoji: "😌", caption: "지우는 마음이 놓였어요." },
    ],
  },
  {
    id: "story-3",
    title: "함께 만든 성",
    scenes: [
      { element: "setting", emoji: "🧒", caption: "민수가 방에서 블록을 가지고 있었어요." },
      { element: "initiating", emoji: "🧱", caption: "친구가 와서 같이 놀고 싶어 했어요." },
      { element: "internalResponse", emoji: "🤔", caption: "민수는 잠깐 망설였어요." },
      { element: "internalPlan", emoji: "🤝", caption: "함께 만들기로 마음먹었어요." },
      { element: "attempt", emoji: "🏗️", caption: "둘이서 블록을 쌓았어요." },
      { element: "consequence", emoji: "🏰", caption: "멋진 성이 완성됐어요." },
      { element: "reaction", emoji: "😄", caption: "둘 다 신나서 손뼉을 쳤어요." },
    ],
  },
];

/// 이야기 조회 (결정적). 기본 = 첫 이야기.
export function pickNarrativeStory(index = 0): StoryItem {
  return NARRATIVE_STORIES[
    Math.max(0, Math.min(NARRATIVE_STORIES.length - 1, index))
  ];
}

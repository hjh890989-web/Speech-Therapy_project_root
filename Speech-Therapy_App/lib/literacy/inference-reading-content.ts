// MOCK-LIT (CR-2026-009 / Phase 3b S4) — 추론 독해 미니게임 아이템 풀 (자체 제작).
//
// ⚠️ 저작권·원본성 (설계서 tasks/13 §7): 지문·문항·선택지 **전부 자체 제작**(창작 생활글).
//   NISE-B·ACT·KOLRA·RA-RCP 등 표준화 검사의 지문·문항을 복사·변형 사용하지 않는다.
//
// 임상 구인 (wiki concepts/읽기이해·내러티브-담화-추론-중재):
//   추론 독해 = 글에 **직접 드러나지 않은** 내용(인물의 마음·까닭·결과)을 단서로 유추하는 상위
//   읽기이해 수준(사실적 이해 다음 단계). 정답은 지문에 그대로 적혀 있지 않다 — 단서로 추론.
//   ※ 기존 `inference`(만5-7 가이드형 생각 나누기)와 별개: 본 게임은 학령기(초5~6) 지문 기반 채점형.
//
// 연습-only: 점수 등급/판정/임상밴드 미산출(Phase 2 검증). raw 정답수만 영속.
// CON-04: 모든 콘텐츠 자녀 친화 + 의료/진단/장애 금칙어 0건.

export interface InferenceCard {
  id: string;
  passageTitle: string;
  passageText: string;
  question: string;
  /// 정답(지문 단서로 추론 — 직접 제시되지 않음).
  answer: string;
  /// 선택지 (정답 1 + 오답 2). answer 포함. UI 셔플.
  choices: [string, string, string];
}

interface Passage {
  id: string;
  title: string;
  text: string;
  questions: ReadonlyArray<{
    q: string;
    answer: string;
    choices: [string, string, string];
  }>;
}

/// 자체 창작 지문 3편 × 추론 문항 3 = 9 카드 (초5~6 수준). 정답은 단서로 추론(직접 제시 X).
const PASSAGES: readonly Passage[] = [
  {
    id: "drawing",
    title: "동생의 그림",
    text: "유나는 동생이 그린 그림을 받았어요. 삐뚤빼뚤한 선이 가득했지만, 유나는 그림을 책상 앞에 붙였어요. 그리고 동생에게 “고마워, 정말 마음에 들어”라고 말했어요.",
    questions: [
      { q: "유나는 그림을 받고 어떤 마음이었을까요?", answer: "동생의 마음이 고마웠다", choices: ["동생의 마음이 고마웠다", "그림이 마음에 들지 않았다", "그림을 버리고 싶었다"] },
      { q: "동생은 왜 유나에게 그림을 주었을까요?", answer: "유나를 좋아해서", choices: ["유나를 좋아해서", "종이가 남아서", "그림이 싫어서"] },
      { q: "유나는 어떤 사람일까요?", answer: "마음을 헤아릴 줄 안다", choices: ["마음을 헤아릴 줄 안다", "쉽게 화를 낸다", "그림에 관심이 없다"] },
    ],
  },
  {
    id: "running",
    title: "운동장의 민호",
    text: "체육 시간에 민호는 달리기를 하다 넘어졌어요. 무릎이 아팠지만 민호는 다시 일어나 끝까지 달려 결승선을 통과했어요. 친구들이 큰 박수를 보냈어요.",
    questions: [
      { q: "민호는 어떤 아이일까요?", answer: "끈기 있는 아이", choices: ["끈기 있는 아이", "쉽게 포기하는 아이", "달리기를 싫어하는 아이"] },
      { q: "친구들이 박수를 보낸 까닭은 무엇일까요?", answer: "포기하지 않아서", choices: ["포기하지 않아서", "일등을 해서", "넘어져서"] },
      { q: "결승선을 통과한 민호의 마음은 어땠을까요?", answer: "뿌듯했다", choices: ["뿌듯했다", "창피했다", "지루했다"] },
    ],
  },
  {
    id: "umbrella",
    title: "비 오는 하굣길",
    text: "학교가 끝나자 하늘이 어두워지더니 비가 쏟아졌어요. 현관 우산꽂이는 텅 비어 있었어요. 서연이는 가방을 머리 위로 들고 집까지 뛰어갔어요.",
    questions: [
      { q: "서연이는 왜 가방을 머리 위로 들었을까요?", answer: "비를 막으려고", choices: ["비를 막으려고", "가방이 무거워서", "친구를 부르려고"] },
      { q: "우산꽂이가 비어 있던 까닭은 무엇일까요?", answer: "다들 우산을 가져가서", choices: ["다들 우산을 가져가서", "우산꽂이가 고장 나서", "비가 오지 않아서"] },
      { q: "집에 도착한 서연이의 모습은 어떨까요?", answer: "비에 젖은 모습", choices: ["비에 젖은 모습", "뽀송한 모습", "눈사람이 된 모습"] },
    ],
  },
];

/// 전체 카드 풀 (9 = 지문 3 × 문항 3).
export const INFERENCE_CARDS: readonly InferenceCard[] = PASSAGES.flatMap((p) =>
  p.questions.map((qq, qi) => ({
    id: `ir-${p.id}-${qi + 1}`,
    passageTitle: p.title,
    passageText: p.text,
    question: qq.q,
    answer: qq.answer,
    choices: qq.choices,
  })),
);

export const INFERENCE_PASSAGE_COUNT = PASSAGES.length;

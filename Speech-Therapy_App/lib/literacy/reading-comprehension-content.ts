// MOCK-LIT (CR-2026-009 / Phase 3b S3) — 사실적 읽기이해 미니게임 아이템 풀 (자체 제작).
//
// ⚠️ 저작권·원본성 (설계서 tasks/13 §7): 지문·문항·선택지 **전부 자체 제작**(창작 동화/생활글).
//   NISE-B·ACT·KOLRA·RA-RCP 등 표준화 검사의 지문·문항을 복사·변형 사용하지 않는다.
//
// 임상 구인 (wiki concepts/읽기이해·독해력):
//   사실적 이해 = 글에 **직접 제시된** 정보를 확인하는 가장 기초적 읽기이해 수준(추론·평가 이전).
//   각 문항의 정답은 지문에 글자 그대로 드러나 있다(look-back 허용).
//
// 연습-only: 점수 등급/판정/임상밴드 미산출(Phase 2 검증). raw 정답수만 영속.
// CON-04: 모든 콘텐츠 자녀 친화 + 의료/진단/장애 금칙어 0건.

export interface ComprehensionCard {
  /// 문항 id (= 세션 단위).
  id: string;
  passageTitle: string;
  passageText: string;
  question: string;
  /// 정답(지문에 직접 제시됨).
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

/// 자체 창작 지문 3편 × 사실 확인 3문항 = 9 카드 (초3~4 수준).
const PASSAGES: readonly Passage[] = [
  {
    id: "garden",
    title: "교실의 화분",
    text: "우리 반 창가에는 작은 화분이 있어요. 화분에는 방울토마토가 자라요. 매일 아침 민수가 물을 줘요. 지난주에 노란색 꽃이 피었어요. 곧 빨간 열매가 열릴 거예요.",
    questions: [
      { q: "화분에는 무엇이 자라나요?", answer: "방울토마토", choices: ["방울토마토", "해바라기", "딸기"] },
      { q: "누가 물을 주나요?", answer: "민수", choices: ["민수", "지영", "선생님"] },
      { q: "지난주에 무슨 색 꽃이 피었나요?", answer: "노란색", choices: ["노란색", "빨간색", "하얀색"] },
    ],
  },
  {
    id: "market",
    title: "주말 시장",
    text: "토요일에 엄마와 시장에 갔어요. 시장은 사람들로 북적였어요. 우리는 사과와 고등어를 샀어요. 사과는 한 봉지에 다섯 개였어요. 집에 와서 고등어를 구워 먹었어요.",
    questions: [
      { q: "언제 시장에 갔나요?", answer: "토요일", choices: ["토요일", "일요일", "금요일"] },
      { q: "무엇을 샀나요?", answer: "사과와 고등어", choices: ["사과와 고등어", "빵과 우유", "감자와 양파"] },
      { q: "사과는 한 봉지에 몇 개였나요?", answer: "다섯 개", choices: ["다섯 개", "세 개", "열 개"] },
    ],
  },
  {
    id: "rainy",
    title: "비 오는 날",
    text: "아침부터 비가 내렸어요. 지호는 노란색 우산을 챙겼어요. 학교 가는 길에 개구리를 보았어요. 개구리는 풀숲으로 폴짝 뛰어갔어요. 지호는 빗소리를 들으며 천천히 걸었어요.",
    questions: [
      { q: "지호는 무슨 색 우산을 챙겼나요?", answer: "노란색", choices: ["노란색", "파란색", "초록색"] },
      { q: "학교 가는 길에 무엇을 보았나요?", answer: "개구리", choices: ["개구리", "달팽이", "고양이"] },
      { q: "개구리는 어디로 갔나요?", answer: "풀숲", choices: ["풀숲", "연못", "나무 위"] },
    ],
  },
];

/// 전체 카드 풀 (9 = 지문 3 × 문항 3). 지문 정보를 각 카드에 펼쳐 담는다.
export const COMPREHENSION_CARDS: readonly ComprehensionCard[] = PASSAGES.flatMap((p) =>
  p.questions.map((qq, qi) => ({
    id: `rc-${p.id}-${qi + 1}`,
    passageTitle: p.title,
    passageText: p.text,
    question: qq.q,
    answer: qq.answer,
    choices: qq.choices,
  })),
);

/// 지문 수(세션 구성 참고).
export const COMPREHENSION_PASSAGE_COUNT = PASSAGES.length;

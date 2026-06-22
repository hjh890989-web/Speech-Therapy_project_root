// MOCK-LIT (CR-2026-009 / Phase 3b S2) — 받아쓰기·철자 미니게임 아이템 풀 (자체 제작).
//
// ⚠️ 저작권·원본성 (설계서 tasks/13 §7 / tasks/11 §2):
//   본 아이템(낱말·소리·선택지)은 **전부 자체 제작**이다. NISE-B·ACT·KOLRA 등 표준화 검사의
//   문항·단어목록·받아쓰기 지문을 복사·변형 사용하지 않는다. 측정하려는 **구인**(철자=음운규칙
//   인식, 분야 표준 지식)만 근거로 한국어 고빈도 낱말로 직접 구성. 상업 출시 전 원본성 법률검토.
//
// 임상 구인 (wiki concepts/철자쓰기발달·철자오류·음운변동, 원문 S113/S160):
//   철자 = 소리(음운)와 표기(철자)의 불일치를 음운규칙으로 해소하는 능력. 학령기(초1~3) 핵심.
//   '옳은 철자 고르기' 형식 — 부모가 소리를 들려주면 아이가 바르게 쓴 글자를 고른다.
//
// 난이도 위계(level 1~5) = wiki 검증 음운규칙 정확률 순서(S113, 초1-3 단어과제):
//   경음화 > 연음화 > 기식음화 > 종성규칙 > 구개음화. ⚠️ 이는 **난이도 정렬용**이며,
//   임상 참고밴드/판정이 아니다(Phase 2 검증상 출시가능 모집단 밴드 0건 → 연습-only).
//
// CON-04: 모든 콘텐츠 자녀 친화 + 의료/진단/장애 금칙어 0건.

export type SpellingRule =
  | "tensification" // 경음화 (된소리되기)
  | "liaison" // 연음화 (받침 넘김)
  | "aspiration" // 기식음화 (격음화)
  | "coda" // 종성규칙 (받침 대표음)
  | "palatalization"; // 구개음화

export interface SpellingItem {
  id: string;
  rule: SpellingRule;
  /// 난이도 위계 (1 경음화 … 5 구개음화 — 검증 정렬, 임상 밴드 아님).
  level: number;
  /// 부모가 들려줄 소리(발음, 자체 작성). UI 는 「소리」로 표시 — 아이는 듣고 철자를 고른다.
  sound: string;
  /// 정답(바르게 쓴 철자).
  answer: string;
  /// 선택지 [정답, 소리기반 오답]. answer 를 반드시 포함. 표시 순서 셔플은 UI 책임.
  choices: [string, string];
}

/// level 1 경음화 — 받침 뒤 된소리. 소리엔 된소리, 표기엔 예사소리.
const TENSIFICATION: ReadonlyArray<Omit<SpellingItem, "rule" | "level">> = [
  { id: "sp-te-1", sound: "국쑤", answer: "국수", choices: ["국수", "국쑤"] },
  { id: "sp-te-2", sound: "학꾜", answer: "학교", choices: ["학교", "학꾜"] },
  { id: "sp-te-3", sound: "약쏙", answer: "약속", choices: ["약속", "약쏙"] },
  { id: "sp-te-4", sound: "접씨", answer: "접시", choices: ["접시", "접씨"] },
  { id: "sp-te-5", sound: "숙쩨", answer: "숙제", choices: ["숙제", "숙쩨"] },
];

/// level 2 연음화 — 받침이 뒤 모음으로 넘어가 소리남.
const LIAISON: ReadonlyArray<Omit<SpellingItem, "rule" | "level">> = [
  { id: "sp-li-1", sound: "꼬치", answer: "꽃이", choices: ["꽃이", "꼬치"] },
  { id: "sp-li-2", sound: "오슬", answer: "옷을", choices: ["옷을", "오슬"] },
  { id: "sp-li-3", sound: "바비", answer: "밥이", choices: ["밥이", "바비"] },
  { id: "sp-li-4", sound: "소니", answer: "손이", choices: ["손이", "소니"] },
  { id: "sp-li-5", sound: "지베", answer: "집에", choices: ["집에", "지베"] },
];

/// level 3 기식음화 — ㅎ 과 만나 거센소리.
const ASPIRATION: ReadonlyArray<Omit<SpellingItem, "rule" | "level">> = [
  { id: "sp-as-1", sound: "조타", answer: "좋다", choices: ["좋다", "조타"] },
  { id: "sp-as-2", sound: "노코", answer: "놓고", choices: ["놓고", "노코"] },
  { id: "sp-as-3", sound: "추카", answer: "축하", choices: ["축하", "추카"] },
  { id: "sp-as-4", sound: "구콰", answer: "국화", choices: ["국화", "구콰"] },
  { id: "sp-as-5", sound: "배콰점", answer: "백화점", choices: ["백화점", "배콰점"] },
];

/// level 4 종성규칙 — 받침이 대표음으로 소리남.
const CODA: ReadonlyArray<Omit<SpellingItem, "rule" | "level">> = [
  { id: "sp-co-1", sound: "부억", answer: "부엌", choices: ["부엌", "부억"] },
  { id: "sp-co-2", sound: "압", answer: "앞", choices: ["앞", "압"] },
  { id: "sp-co-3", sound: "박", answer: "밖", choices: ["밖", "박"] },
  { id: "sp-co-4", sound: "입", answer: "잎", choices: ["잎", "입"] },
  { id: "sp-co-5", sound: "무릅", answer: "무릎", choices: ["무릎", "무릅"] },
];

/// level 5 구개음화 — ㄷ/ㅌ 받침 + 이 → ㅈ/ㅊ 소리.
const PALATALIZATION: ReadonlyArray<Omit<SpellingItem, "rule" | "level">> = [
  { id: "sp-pa-1", sound: "구지", answer: "굳이", choices: ["굳이", "구지"] },
  { id: "sp-pa-2", sound: "가치", answer: "같이", choices: ["같이", "가치"] },
  { id: "sp-pa-3", sound: "해도지", answer: "해돋이", choices: ["해돋이", "해도지"] },
  { id: "sp-pa-4", sound: "끄치", answer: "끝이", choices: ["끝이", "끄치"] },
  { id: "sp-pa-5", sound: "마지", answer: "맏이", choices: ["맏이", "마지"] },
];

/// 전체 아이템 풀 (25 = 5 규칙 × 5). rule/level 부여.
export const SPELLING_ITEMS: readonly SpellingItem[] = [
  ...TENSIFICATION.map((i) => ({ ...i, rule: "tensification" as const, level: 1 })),
  ...LIAISON.map((i) => ({ ...i, rule: "liaison" as const, level: 2 })),
  ...ASPIRATION.map((i) => ({ ...i, rule: "aspiration" as const, level: 3 })),
  ...CODA.map((i) => ({ ...i, rule: "coda" as const, level: 4 })),
  ...PALATALIZATION.map((i) => ({ ...i, rule: "palatalization" as const, level: 5 })),
];

/// 규칙 순서(난이도 위계, 쉬움→어려움). 세션 구성·표시에 사용.
export const SPELLING_RULES: readonly SpellingRule[] = [
  "tensification",
  "liaison",
  "aspiration",
  "coda",
  "palatalization",
];

/// 규칙 라벨 (부모용 — 금칙어 0).
export const SPELLING_RULE_LABEL: Record<SpellingRule, string> = {
  tensification: "된소리",
  liaison: "이어지는 소리",
  aspiration: "거센소리",
  coda: "받침 소리",
  palatalization: "바뀌는 소리",
};

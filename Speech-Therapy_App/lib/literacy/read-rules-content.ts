// MOCK-LIT (CR-2026-009 / Phase 3b S2) — 소리 규칙 읽기(해독) 미니게임 아이템 풀 (자체 제작).
//
// ⚠️ 저작권·원본성 (설계서 tasks/13 §7): 본 아이템(낱말·소리·선택지)은 **전부 자체 제작**.
//   NISE-B·ACT·KOLRA·RA-RCP 등 표준화 검사의 문항·단어목록·지문을 복사·변형 사용하지 않는다.
//   측정 구인(해독=음운규칙 적용 읽기, 분야 표준 지식)만 근거로 한국어 고빈도 낱말로 직접 구성.
//
// 임상 구인 (wiki concepts/해독·읽기해독·음운변동):
//   해독 = 글자(표기)를 음운규칙을 적용해 바른 소리로 읽는 능력. '받아쓰기'(표기 고르기)의 역 —
//   여기선 낱말을 보고 **바른 소리**를 고른다. 오답 = 글자 그대로(규칙 미적용) 읽은 소리.
//
// 난이도 위계(level 1~5) = **잠정**(음운규칙 복잡도 순, 정렬용) — 임상 참고밴드/판정 아님.
//   ⚠️ 받아쓰기(철자) 위계 수치(S113)는 표기 정확률이라 읽기에 그대로 적용 안 함 — 본 정렬은 잠정.
// CON-04: 모든 콘텐츠 자녀 친화 + 의료/진단/장애 금칙어 0건.

export type ReadRule =
  | "tensification" // 경음화 (된소리되기)
  | "liaison" // 연음화 (받침 넘김)
  | "nasalization" // 비음화 (자음동화)
  | "aspiration" // 기식음화 (격음화)
  | "palatalization"; // 구개음화

export interface ReadRuleItem {
  id: string;
  rule: ReadRule;
  /// 난이도 위계 (1~5, 잠정 정렬 — 임상 밴드 아님).
  level: number;
  /// 화면에 보이는 낱말(바른 표기).
  word: string;
  /// 정답(바른 소리).
  answer: string;
  /// 선택지 [바른 소리, 글자 그대로(규칙 미적용) 읽은 소리]. answer 포함. UI 셔플.
  choices: [string, string];
}

/// level 1 경음화 — 받침 뒤 된소리.
const TENSIFICATION: ReadonlyArray<Omit<ReadRuleItem, "rule" | "level">> = [
  { id: "rr-te-1", word: "봄비", answer: "봄삐", choices: ["봄삐", "봄비"] },
  { id: "rr-te-2", word: "등불", answer: "등뿔", choices: ["등뿔", "등불"] },
  { id: "rr-te-3", word: "물고기", answer: "물꼬기", choices: ["물꼬기", "물고기"] },
  { id: "rr-te-4", word: "길가", answer: "길까", choices: ["길까", "길가"] },
  { id: "rr-te-5", word: "안과", answer: "안꽈", choices: ["안꽈", "안과"] },
];

/// level 2 연음화 — 받침이 뒤 모음으로 이어 소리남.
const LIAISON: ReadonlyArray<Omit<ReadRuleItem, "rule" | "level">> = [
  { id: "rr-li-1", word: "산이", answer: "사니", choices: ["사니", "산이"] },
  { id: "rr-li-2", word: "손에", answer: "소네", choices: ["소네", "손에"] },
  { id: "rr-li-3", word: "집을", answer: "지블", choices: ["지블", "집을"] },
  { id: "rr-li-4", word: "물을", answer: "무를", choices: ["무를", "물을"] },
  { id: "rr-li-5", word: "발에", answer: "바레", choices: ["바레", "발에"] },
];

/// level 3 비음화 — ㄱ/ㄷ/ㅂ 받침이 ㄴ/ㅁ 앞에서 비음으로.
const NASALIZATION: ReadonlyArray<Omit<ReadRuleItem, "rule" | "level">> = [
  { id: "rr-na-1", word: "국물", answer: "궁물", choices: ["궁물", "국물"] },
  { id: "rr-na-2", word: "먹는", answer: "멍는", choices: ["멍는", "먹는"] },
  { id: "rr-na-3", word: "닫는", answer: "단는", choices: ["단는", "닫는"] },
  { id: "rr-na-4", word: "입는", answer: "임는", choices: ["임는", "입는"] },
  { id: "rr-na-5", word: "곡물", answer: "공물", choices: ["공물", "곡물"] },
];

/// level 4 기식음화 — ㅎ 과 만나 거센소리.
const ASPIRATION: ReadonlyArray<Omit<ReadRuleItem, "rule" | "level">> = [
  { id: "rr-as-1", word: "많고", answer: "만코", choices: ["만코", "만고"] },
  { id: "rr-as-2", word: "싫다", answer: "실타", choices: ["실타", "실다"] },
  { id: "rr-as-3", word: "닿고", answer: "다코", choices: ["다코", "다고"] },
  { id: "rr-as-4", word: "놓다", answer: "노타", choices: ["노타", "노다"] },
  { id: "rr-as-5", word: "그렇게", answer: "그러케", choices: ["그러케", "그러게"] },
];

/// level 5 구개음화 — ㄷ/ㅌ 받침 + 이 → ㅈ/ㅊ 소리.
const PALATALIZATION: ReadonlyArray<Omit<ReadRuleItem, "rule" | "level">> = [
  { id: "rr-pa-1", word: "굳이", answer: "구지", choices: ["구지", "구디"] },
  { id: "rr-pa-2", word: "같이", answer: "가치", choices: ["가치", "가티"] },
  { id: "rr-pa-3", word: "끝이", answer: "끄치", choices: ["끄치", "끄티"] },
  { id: "rr-pa-4", word: "해돋이", answer: "해도지", choices: ["해도지", "해도디"] },
  { id: "rr-pa-5", word: "붙이다", answer: "부치다", choices: ["부치다", "부티다"] },
];

/// 전체 아이템 풀 (25 = 5 규칙 × 5). rule/level 부여.
export const READ_RULE_ITEMS: readonly ReadRuleItem[] = [
  ...TENSIFICATION.map((i) => ({ ...i, rule: "tensification" as const, level: 1 })),
  ...LIAISON.map((i) => ({ ...i, rule: "liaison" as const, level: 2 })),
  ...NASALIZATION.map((i) => ({ ...i, rule: "nasalization" as const, level: 3 })),
  ...ASPIRATION.map((i) => ({ ...i, rule: "aspiration" as const, level: 4 })),
  ...PALATALIZATION.map((i) => ({ ...i, rule: "palatalization" as const, level: 5 })),
];

/// 규칙 순서(난이도 위계, 잠정). 세션 구성에 사용.
export const READ_RULES: readonly ReadRule[] = [
  "tensification",
  "liaison",
  "nasalization",
  "aspiration",
  "palatalization",
];

/// 규칙 라벨 (부모용 — 금칙어 0).
export const READ_RULE_LABEL: Record<ReadRule, string> = {
  tensification: "된소리",
  liaison: "이어지는 소리",
  nasalization: "콧소리",
  aspiration: "거센소리",
  palatalization: "바뀌는 소리",
};

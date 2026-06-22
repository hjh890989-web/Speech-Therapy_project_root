// MOCK-LIT (CR-2026-009 / Phase 3b S4) — 형태소 인식 미니게임 아이템 풀 (자체 제작).
//
// ⚠️ 저작권·원본성 (설계서 tasks/13 §7): 문항·낱말·선택지 **전부 자체 제작**.
//   NISE-B·ACT·KOLRA 등 표준화 검사의 문항·단어목록을 복사·변형 사용하지 않는다.
//
// 임상 구인 (wiki concepts/형태소인식 · 원문 S114/S115):
//   형태소 인식 = 낱말 속 의미 단위(어근·접사)를 인식·조작하는 능력 → 어휘·읽기이해 상위 기여.
//   과제: 합성어 만들기(어근+어근) / 파생어 만들기(어근+접사) / 형태소 분석(공통 형태소·접사 의미).
//
// 난이도 위계(level 1~3) = 잠정(합성<파생<분석, 정렬용) — 임상 참고밴드/판정 아님(Phase 2 검증).
// CON-04: 모든 콘텐츠 자녀 친화 + 의료/진단/장애 금칙어 0건.

export type MorphType = "compound" | "derivation" | "analysis";

export interface MorphItem {
  id: string;
  type: MorphType;
  /// 난이도 위계 (1 합성 / 2 파생 / 3 분석 — 잠정 정렬, 임상 밴드 아님).
  level: number;
  /// 문항(자체 작성).
  prompt: string;
  /// 정답.
  answer: string;
  /// 선택지 (정답 1 + 오답 2). answer 포함. UI 셔플.
  choices: [string, string, string];
}

/// level 1 합성어 — 어근 + 어근.
const COMPOUND: ReadonlyArray<Omit<MorphItem, "type" | "level">> = [
  { id: "mo-co-1", prompt: "「손」과 「수건」을 합치면 무슨 낱말이 될까요?", answer: "손수건", choices: ["손수건", "수건손", "손걸레"] },
  { id: "mo-co-2", prompt: "「밤」과 「하늘」을 합치면 무슨 낱말이 될까요?", answer: "밤하늘", choices: ["밤하늘", "하늘밤", "별빛"] },
  { id: "mo-co-3", prompt: "「책」과 「가방」을 합치면 무슨 낱말이 될까요?", answer: "책가방", choices: ["책가방", "가방책", "책상"] },
  { id: "mo-co-4", prompt: "「눈」과 「사람」을 합치면 무슨 낱말이 될까요?", answer: "눈사람", choices: ["눈사람", "사람눈", "눈싸움"] },
  { id: "mo-co-5", prompt: "「비」와 「바람」을 합치면 무슨 낱말이 될까요?", answer: "비바람", choices: ["비바람", "바람비", "소나기"] },
];

/// level 2 파생어 — 어근 + 접사.
const DERIVATION: ReadonlyArray<Omit<MorphItem, "type" | "level">> = [
  { id: "mo-de-1", prompt: "「선생」에 「-님」을 붙이면 무슨 낱말이 될까요?", answer: "선생님", choices: ["선생님", "님선생", "선생들"] },
  { id: "mo-de-2", prompt: "「사냥」에 「-꾼」을 붙이면 무슨 낱말이 될까요?", answer: "사냥꾼", choices: ["사냥꾼", "꾼사냥", "사냥감"] },
  { id: "mo-de-3", prompt: "「멋」에 「-쟁이」를 붙이면 무슨 낱말이 될까요?", answer: "멋쟁이", choices: ["멋쟁이", "쟁이멋", "멋짐"] },
  { id: "mo-de-4", prompt: "「장난」에 「-꾸러기」를 붙이면 무슨 낱말이 될까요?", answer: "장난꾸러기", choices: ["장난꾸러기", "꾸러기장난", "장난감"] },
  { id: "mo-de-5", prompt: "「일」에 「-꾼」을 붙이면 무슨 낱말이 될까요?", answer: "일꾼", choices: ["일꾼", "꾼일", "일감"] },
];

/// level 3 형태소 분석 — 공통 형태소 찾기 / 접사 의미.
const ANALYSIS: ReadonlyArray<Omit<MorphItem, "type" | "level">> = [
  { id: "mo-an-1", prompt: "「사과나무, 감나무, 소나무」의 공통 부분은 무엇일까요?", answer: "나무", choices: ["나무", "사과", "열매"] },
  { id: "mo-an-2", prompt: "「풋사과」에서 「풋-」은 무슨 뜻일까요?", answer: "덜 익은", choices: ["덜 익은", "매우 큰", "아주 단"] },
  { id: "mo-an-3", prompt: "「맨손」에서 「맨-」은 무슨 뜻일까요?", answer: "아무것도 없는", choices: ["아무것도 없는", "매우 큰", "따뜻한"] },
  { id: "mo-an-4", prompt: "「헛소문」에서 「헛-」은 무슨 뜻일까요?", answer: "사실이 아닌", choices: ["사실이 아닌", "매우 오래된", "아주 작은"] },
  { id: "mo-an-5", prompt: "「덮개, 지우개, 가리개」의 「-개」는 무엇을 뜻할까요?", answer: "도구", choices: ["도구", "사람", "장소"] },
];

/// 전체 아이템 풀 (15 = 3 유형 × 5). type/level 부여.
export const MORPH_ITEMS: readonly MorphItem[] = [
  ...COMPOUND.map((i) => ({ ...i, type: "compound" as const, level: 1 })),
  ...DERIVATION.map((i) => ({ ...i, type: "derivation" as const, level: 2 })),
  ...ANALYSIS.map((i) => ({ ...i, type: "analysis" as const, level: 3 })),
];

/// 유형 순서(난이도 위계, 잠정). 세션 구성에 사용.
export const MORPH_TYPES: readonly MorphType[] = ["compound", "derivation", "analysis"];

/// 유형 라벨 (부모용 — 금칙어 0).
export const MORPH_TYPE_LABEL: Record<MorphType, string> = {
  compound: "낱말 합치기",
  derivation: "낱말 만들기",
  analysis: "숨은 뜻 찾기",
};

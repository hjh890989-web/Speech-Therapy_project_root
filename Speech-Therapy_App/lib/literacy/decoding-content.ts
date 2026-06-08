// MOCK-LIT-02 (CR-2026-007 / REQ-FUNC-CL-09) — 해독(자소-음소 대응) 무의미음절 생성기 + 풀 (자체 제작).
//
// ⚠️ 저작권·원본성 (SRS §4.1 D CL-12 / tasks/11 §2):
//   무의미 단어·자극은 **자체 자모 합성 생성**이며 NISE-B·ACT 등 표준화 검사의 문항·단어목록을
//   복사·변형 사용하지 않는다. 통째 암기 배제를 위해 **비어휘(non-word)** 로 구성 — 자소-음소 대응
//   처리만 측정. 상업 출시 전 원본성 법률검토(OPS-LIT-01).
//
// 임상 구인 (wiki F1a-F4-임상설계-reference §2.B · clinical/entities/U-TAP §음운변동):
//   규칙적 자소-음소 대응을 적용해 비단어를 소리 내어 읽기 = 순수 해독(어휘 기억 배제).
//   ⚠️ 음절 구조(CV/CVC)·위치(어두/어중/어말) 난이도 위계는 **KOPLAC 자문 확정 대상**(CL-09 Q2/Q3).
//
// CON-04: 자녀 친화 + 의료/진단/장애 금칙어 0건.

// ----- 한글 음절 합성 생성기 -----
const CHO = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];
const JUNG = [
  "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ",
  "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ",
];
const JONG = [
  "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ",
  "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];
const HANGUL_BASE = 0xac00;

/// 자모(초성·중성·종성) → 완성형 음절 합성. 종성 생략 = 개음절.
/// 미지원 자모는 throw — 풀 구성 시 자모 오타를 컴파일/테스트에서 차단.
export function composeSyllable(cho: string, jung: string, jong = ""): string {
  const ci = CHO.indexOf(cho);
  const ji = JUNG.indexOf(jung);
  const ki = JONG.indexOf(jong);
  if (ci < 0 || ji < 0 || ki < 0) {
    throw new Error(`composeSyllable: 미지원 자모 (${cho}/${jung}/${jong})`);
  }
  return String.fromCharCode(HANGUL_BASE + (ci * JUNG.length + ji) * JONG.length + ki);
}

/// 자모 음절 spec 배열 → 무의미 단어 생성. ("생성기" — 풀이 이 함수로 합성된다.)
export type SyllableSpec = [cho: string, jung: string, jong?: string];
export function generateNonword(syllables: readonly SyllableSpec[]): string {
  return syllables.map(([c, j, k]) => composeSyllable(c, j, k ?? "")).join("");
}

// ----- 무의미 단어 풀 (자체 생성) -----
export type DecodingStructure = "CV" | "CVC";
/// 디코딩 초점 위치: 어두 초성 / 어중 중성 / 어말 종성.
export type DecodingPosition = "onset" | "medial" | "coda";

export interface DecodingItem {
  id: string;
  /// 무의미 단어 (자모 합성 — 비어휘).
  word: string;
  structure: DecodingStructure;
  positionFocus: DecodingPosition;
  /// 초점 음소(자모) — 정확히 읽었는지 분석 참고.
  targetJamo: string;
}

interface DecodingSpec {
  id: string;
  syllables: readonly SyllableSpec[];
  structure: DecodingStructure;
  positionFocus: DecodingPosition;
  targetJamo: string;
}

// 잠정 풀 12 — 개음절(CV) 8 + 폐음절(CVC) 4. 위치·구조 위계는 KOPLAC 확정 대상.
const SPECS: readonly DecodingSpec[] = [
  { id: "dec-1", syllables: [["ㅂ", "ㅓ"], ["ㄷ", "ㅜ"]], structure: "CV", positionFocus: "onset", targetJamo: "ㅂ" },
  { id: "dec-2", syllables: [["ㄷ", "ㅣ"], ["ㅃ", "ㅗ"]], structure: "CV", positionFocus: "onset", targetJamo: "ㄷ" },
  { id: "dec-3", syllables: [["ㄴ", "ㅗ"], ["ㅉ", "ㅗ"]], structure: "CV", positionFocus: "onset", targetJamo: "ㄴ" },
  { id: "dec-4", syllables: [["ㄱ", "ㅏ"], ["ㅃ", "ㅡ"]], structure: "CV", positionFocus: "onset", targetJamo: "ㄱ" },
  { id: "dec-5", syllables: [["ㅈ", "ㅐ"], ["ㄲ", "ㅡ"]], structure: "CV", positionFocus: "onset", targetJamo: "ㅈ" },
  { id: "dec-6", syllables: [["ㅅ", "ㅜ"], ["ㅂ", "ㅑ"]], structure: "CV", positionFocus: "medial", targetJamo: "ㅑ" },
  { id: "dec-7", syllables: [["ㅁ", "ㅗ"], ["ㅌ", "ㅑ"]], structure: "CV", positionFocus: "medial", targetJamo: "ㅑ" },
  { id: "dec-8", syllables: [["ㅈ", "ㅗ"], ["ㅌ", "ㅠ"]], structure: "CV", positionFocus: "medial", targetJamo: "ㅠ" },
  { id: "dec-9", syllables: [["ㅂ", "ㅓ"], ["ㄷ", "ㅡ", "ㄱ"]], structure: "CVC", positionFocus: "coda", targetJamo: "ㄱ" },
  { id: "dec-10", syllables: [["ㄴ", "ㅗ"], ["ㅊ", "ㅏ", "ㅂ"]], structure: "CVC", positionFocus: "coda", targetJamo: "ㅂ" },
  { id: "dec-11", syllables: [["ㄷ", "ㅣ"], ["ㅁ", "ㅏ", "ㄹ"]], structure: "CVC", positionFocus: "coda", targetJamo: "ㄹ" },
  { id: "dec-12", syllables: [["ㄱ", "ㅏ"], ["ㄷ", "ㅜ", "ㅁ"]], structure: "CVC", positionFocus: "coda", targetJamo: "ㅁ" },
];

/// 전체 해독 아이템 풀 (자모 합성으로 생성).
export const DECODING_ITEMS: readonly DecodingItem[] = SPECS.map((s) => ({
  id: s.id,
  word: generateNonword(s.syllables),
  structure: s.structure,
  positionFocus: s.positionFocus,
  targetJamo: s.targetJamo,
}));

/// 위치 라벨 (부모용 — 금칙어 0).
export const DECODING_POSITION_LABEL: Record<DecodingPosition, string> = {
  onset: "첫소리",
  medial: "가운뎃소리",
  coda: "받침소리",
};

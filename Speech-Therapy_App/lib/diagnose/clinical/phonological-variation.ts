// CL-01 (정상 음운 변동 false-positive 방지) + CL-04 (단일 변동 우선 분석) (DRAFT).
//
// ⚠️ DRAFT — KOPLAC 임상 자문(CR-2026-006) 검증 대기. 활성 채점 미연결. 검증 후 wiring.
//    full 자모-수준 정규화/탐지 알고리즘은 임상 검증 + 추가 언어학 구현 후 — 본 모듈은
//    검증 대상 **규칙/데이터를 인코딩**(전문가 검토용) + 명확한 케이스만 함수화.
//
// 근거: wiki clinical/concepts/조음장애 §C(정상 음운 변동) · §N(유음 활음화) · §O(단일 변동 우선) · §M(변동 유형).

// taxonomy 단일 키원: ErrorPattern(developmental.ts, 9키). 본 모듈의 VARIATION_TYPES(탐지/우선순위 view)와
// developmental.ts 의 DEVELOPMENTAL_ERROR_PATTERNS(연령 정책 view)는 동일 ErrorPattern 키로 정렬된다.
import type { ErrorPattern } from "./developmental";
import { decomposeSyllables } from "@/lib/phonetic-similarity";

// === CL-01 — 한국어 정상 음운 변동 (false-positive 방지 대상) ===

/// 채점 시 "오류로 분류 금지"인 정상 음운 변동 규칙. (검증 시 전문가가 보완.)
export interface NormalVariationRule {
  name: string;
  /// 규칙 설명 (음운 환경).
  rule: string;
  /// 예: "국 + 물 → 궁물".
  example: string;
  /// 정상 발달 연령(개월). null = 전 연령 정상 규칙.
  developmentalMonths: number | null;
  citation: string;
}

export const NORMAL_VARIATION_RULES: readonly NormalVariationRule[] = [
  {
    name: "비음화",
    rule: "종성 파열음이 뒤 비음(ㅁ/ㄴ) 앞에서 비음으로 동화 (종성 ㄱ → ㅇ 등)",
    example: "국 + 물 → 궁물",
    developmentalMonths: null,
    citation: "조음장애 §C",
  },
  {
    name: "연음",
    rule: "받침이 뒤 모음 초성으로 이어 발음",
    example: "꽃이 → 꼬치",
    developmentalMonths: 72, // 5~6세부터 발달
    citation: "조음장애 §C / 다문화-언어발달 §B",
  },
];

/// (DRAFT) 두 발화가 "정상 변동" 관계인지 — 현재는 알려진 규칙명 조회 placeholder.
/// full 구현(자모 환경 정규화)은 검증 후. 검증 전엔 활성 채점에서 호출 금지.
export function listNormalVariationNames(): string[] {
  return NORMAL_VARIATION_RULES.map((r) => r.name);
}

// === CL-04 — 단일 음운 변동 우선 분석 ===

/// 변동 유형 (조음장애 §M/§N). key 는 단일 ErrorPattern 키원에 바인딩(컴파일 타임 오타/누락 차단).
/// isNormal=false → 비발달적(특이, atypical). (연령 정책 = developmental.ts 의 DEVELOPMENTAL_ERROR_PATTERNS.)
export interface VariationType {
  key: ErrorPattern;
  label: string;
  example: string;
  /// 단일 변동 매칭 우선순위 (작을수록 먼저 — 활음화 최우선: 가장 오래 잔존). atypical 은 최하위(8/9).
  priority: number;
  isNormal: boolean;
}

export const VARIATION_TYPES: readonly VariationType[] = [
  { key: "liquid_gliding", label: "유음 활음화", example: "호랑이 → 호양이 (ㄹ→j)", priority: 1, isNormal: true },
  { key: "liquid_nasalization", label: "유음 비음화", example: "라면 → 나면 (ㄹ→ㄴ)", priority: 2, isNormal: true },
  { key: "liquid_deletion", label: "유음 탈락", example: "다리 → 다이", priority: 3, isNormal: true },
  { key: "final_consonant_deletion", label: "종성 탈락", example: "가방 → 가바", priority: 4, isNormal: true },
  { key: "velar_fronting", label: "연구개음 전방화", example: "토끼 → 토띠 (ㄱ→ㄷ)", priority: 5, isNormal: true },
  { key: "affricate_stopping", label: "파찰음 파열음화", example: "자동차 → 다동차", priority: 6, isNormal: true },
  { key: "fricative_stopping", label: "마찰음 파열음화", example: "사자 → 타자", priority: 7, isNormal: true },
  // atypical(비발달적) — 자모 탐지 규칙 KOPLAC 미확정 → detectVariation 미탐지(데이터/우선순위만 박제).
  { key: "labialization", label: "양순음화", example: "우산 → 우바(ㅅ→ㅂ 류)", priority: 8, isNormal: false },
  { key: "regressive_assimilation", label: "역행화", example: "우산 → 우반(역행 동화)", priority: 9, isNormal: false },
];

/// 단일 변동 우선순위 정렬 (활음화 우선) — "단일 변동 우선" 원칙(§O).
export function singleVariationOrder(): VariationType[] {
  return [...VARIATION_TYPES].sort((a, b) => a.priority - b.priority);
}

/// 변동 유형 조회.
export function getVariationType(key: string): VariationType | undefined {
  return VARIATION_TYPES.find((v) => v.key === key);
}

// === CL-04 변동 탐지기 (자모 슬롯 정렬 기반 단일 변동 탐지) ===

/// 활음화 — 단모음 → 상향 이중모음(y-활음) 매핑. KOPLAC 검증 4쌍.
/// (ㅐ↔ㅒ/ㅔ↔ㅖ 는 빈도 낮고 자문 미명시 → 재확인 대상, MVP 제외.)
const PLAIN_TO_GLIDE: ReadonlyMap<string, string> = new Map([
  ["ㅏ", "ㅑ"],
  ["ㅓ", "ㅕ"],
  ["ㅗ", "ㅛ"],
  ["ㅜ", "ㅠ"],
]);

const NULL_ONSET = "ㅇ"; // 초성 자리의 무음가 'ㅇ'.
const VELAR_ONSETS: ReadonlySet<string> = new Set(["ㄱ", "ㄲ", "ㅋ"]);
const FRICATIVE_ONSETS: ReadonlySet<string> = new Set(["ㅅ", "ㅆ"]);
const AFFRICATE_ONSETS: ReadonlySet<string> = new Set(["ㅈ", "ㅉ", "ㅊ"]);
/// 전방화/파열음화의 실현(치조 파열음) — 양방향 검증의 '실현 슬롯' 조건.
const STOP_ONSETS: ReadonlySet<string> = new Set(["ㄷ", "ㄸ", "ㅌ"]);

/// 탐지된 단일 변동. slot/intendedJamo = 음소 scoping(targetPhoneme 매칭) 용.
export interface DetectedVariation {
  pattern: ErrorPattern;
  syllableIndex: number;
  slot: "cho" | "jung" | "jong";
  /// 변동이 일어난 슬롯의 *의도* 자모(임상 관련 음소). targetPhoneme 과 비교해 onTargetSlot 산출.
  intendedJamo: string;
}

/**
 * 단일 음운 변동 탐지 (CL-04 — 단일 변동 우선, 복합 중복 감점 금지).
 *
 * 음절 슬롯 정렬 위에서 정확히 1개 음절의 차이가 단일 변동 시그니처로 설명되면 그 변동 1건 반환.
 * 활음화는 'ㄹ소실 + 중성 활음화'를 한 음절 내 단일 변동으로 흡수(2건 중복 감점 차단, §O).
 * 치환형(전방화/파열음화)은 **의도·실현 슬롯 양방향**으로 검증 — 의도만 보면 무관 오류(예: ㄱ→ㅎ)를
 * 오분류해 부당한 완화를 줄 수 있다(적대적 비평 high #1).
 * 단일 매칭 실패(음절수 불일치·비한글·다중 음절 변동·비음운적·미정의 atypical) → null(보수적: 완화 보류).
 *
 * 결정적 순수 함수. 점수/escalation 에는 미사용 — 부모 표시(밴드/카피) 게이팅 전용.
 * labialization/regressive_assimilation 은 자모 규칙 KOPLAC 미확정 → 미탐지(taxonomy/게이팅만 박제).
 */
export function detectVariation(
  intendedWord: string,
  transcribedWord: string,
): DetectedVariation | null {
  const a = decomposeSyllables(intendedWord);
  const b = decomposeSyllables(transcribedWord);
  // 가드: 둘 다 비어있지 않고, 전부 완성형 한글, 음절수 동일 — 그 외 슬롯 정렬 신뢰 불가 → null.
  if (a.length === 0 || a.length !== b.length) return null;
  if (!a.every((s) => s.isHangul) || !b.every((s) => s.isHangul)) return null;

  // 차이 나는 음절 인덱스 수집 — 정확히 1개 음절만 변동해야 단일 변동(그 외 복합 → null).
  const diff: number[] = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i].cho !== b[i].cho || a[i].jung !== b[i].jung || a[i].jong !== b[i].jong) {
      diff.push(i);
    }
  }
  if (diff.length !== 1) return null; // 0건(완전 일치) 또는 다중 음절 변동(복합) → null.

  const i = diff[0];
  const s = a[i];
  const t = b[i];
  const sameJung = s.jung === t.jung;
  const sameJong = s.jong === t.jong;
  const sameCho = s.cho === t.cho;

  // priority 순(활음화 1 우선)으로 단일 시그니처 판정. 각 시그니처는 변동 슬롯 양방향 + 무관 슬롯 동일 요구.
  // 1) liquid_gliding: 초성 ㄹ→null onset AND 중성 plain→glide AND 종성 동일 (ㄹ소실+활음화 = 단일 1건).
  if (s.cho === "ㄹ" && t.cho === NULL_ONSET && sameJong && PLAIN_TO_GLIDE.get(s.jung) === t.jung) {
    return { pattern: "liquid_gliding", syllableIndex: i, slot: "cho", intendedJamo: "ㄹ" };
  }
  // 2) liquid_nasalization: 초성 ㄹ→ㄴ, 중성·종성 동일.
  if (s.cho === "ㄹ" && t.cho === "ㄴ" && sameJung && sameJong) {
    return { pattern: "liquid_nasalization", syllableIndex: i, slot: "cho", intendedJamo: "ㄹ" };
  }
  // 3) liquid_deletion: 초성 ㄹ→null onset, 중성·종성 동일(활음 첨가 없음 → gliding 과 구분).
  if (s.cho === "ㄹ" && t.cho === NULL_ONSET && sameJung && sameJong) {
    return { pattern: "liquid_deletion", syllableIndex: i, slot: "cho", intendedJamo: "ㄹ" };
  }
  // 5) velar_fronting: 초성 연구개음→치조 파열음(양방향), 중성·종성 동일.
  if (VELAR_ONSETS.has(s.cho) && STOP_ONSETS.has(t.cho) && sameJung && sameJong) {
    return { pattern: "velar_fronting", syllableIndex: i, slot: "cho", intendedJamo: s.cho };
  }
  // 6) affricate_stopping: 초성 파찰음→파열음(양방향).
  if (AFFRICATE_ONSETS.has(s.cho) && STOP_ONSETS.has(t.cho) && sameJung && sameJong) {
    return { pattern: "affricate_stopping", syllableIndex: i, slot: "cho", intendedJamo: s.cho };
  }
  // 7) fricative_stopping: 초성 마찰음→파열음(양방향).
  if (FRICATIVE_ONSETS.has(s.cho) && STOP_ONSETS.has(t.cho) && sameJung && sameJong) {
    return { pattern: "fricative_stopping", syllableIndex: i, slot: "cho", intendedJamo: s.cho };
  }
  // 4) final_consonant_deletion: 종성 소실(초성·중성 동일).
  if (sameCho && sameJung && s.jong !== "" && t.jong === "") {
    return { pattern: "final_consonant_deletion", syllableIndex: i, slot: "jong", intendedJamo: s.jong };
  }
  // 미정의 atypical(labialization/regressive) 또는 비음운적/복합 → null(완화 보류).
  return null;
}

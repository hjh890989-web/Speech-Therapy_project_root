// CL-01 (정상 음운 변동 false-positive 방지) + CL-04 (단일 변동 우선 분석) (DRAFT).
//
// ⚠️ DRAFT — KOPLAC 임상 자문(CR-2026-006) 검증 대기. 활성 채점 미연결. 검증 후 wiring.
//    full 자모-수준 정규화/탐지 알고리즘은 임상 검증 + 추가 언어학 구현 후 — 본 모듈은
//    검증 대상 **규칙/데이터를 인코딩**(전문가 검토용) + 명확한 케이스만 함수화.
//
// 근거: wiki clinical/concepts/조음장애 §C(정상 음운 변동) · §N(유음 활음화) · §O(단일 변동 우선) · §M(변동 유형).

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

/// 변동 유형 (조음장애 §M/§N). isNormal=false → 비발달적(특이).
export interface VariationType {
  key: string;
  label: string;
  example: string;
  /// 단일 변동 매칭 우선순위 (작을수록 먼저 — 활음화 최우선: 가장 오래 잔존).
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
];

/// 단일 변동 우선순위 정렬 (활음화 우선) — "단일 변동 우선" 원칙(§O).
export function singleVariationOrder(): VariationType[] {
  return [...VARIATION_TYPES].sort((a, b) => a.priority - b.priority);
}

/// 변동 유형 조회.
export function getVariationType(key: string): VariationType | undefined {
  return VARIATION_TYPES.find((v) => v.key === key);
}

// CL-02 — 음소별 발달 위계 연령 보정 (DRAFT).
//
// ⚠️ DRAFT — KOPLAC 임상 자문(CR-2026-006) 검증 대기. 활성 채점 미연결. 검증 후 wiring.
//
// 근거: wiki clinical/concepts/조음장애 §L(자음 발달 자세/5세/6세 완성) · §M(발달적 오류 소실 시기).
// 핵심: 발달적(연령상 정상) 오류는 감점 약화, 비발달적(특이) 오류는 분리.

/// 음소별 정상 완성 상한(개월). 이 이하 연령의 오류 = 발달적.
/// 위계: 자세(36) < 5세(60) < 6세(72).
export interface DevelopmentalNorm {
  phoneme: string;
  completionMonths: number;
  note: string;
}

export const PHONEME_DEVELOPMENT: Record<string, DevelopmentalNorm> = {
  "ㄱ": { phoneme: "ㄱ", completionMonths: 60, note: "연구개 파열음 — 5세 완성, 자세 전방화(ㄱ→ㄷ) 정상" },
  "ㄴ": { phoneme: "ㄴ", completionMonths: 36, note: "비음 — 자세(3세) 거의 완성" },
  "ㅅ": { phoneme: "ㅅ", completionMonths: 72, note: "마찰음 — 6세 완전 완성, 그 전 파열음화(ㅅ→ㅌ) 정상" },
  "ㅈ": { phoneme: "ㅈ", completionMonths: 60, note: "파찰음 — 5세 거의 완성" },
  "ㄹ": { phoneme: "ㄹ", completionMonths: 72, note: "유음 — 최장(6세+도 활음화 정상 가능)" },
};

/// 해당 음소 오류가 연령상 발달적(정상 범위)인가.
export function isDevelopmentalForAge(phoneme: string, ageMonths: number): boolean {
  const norm = PHONEME_DEVELOPMENT[phoneme];
  if (!norm) return false;
  return ageMonths <= norm.completionMonths;
}

/// 발달적 오류 패턴 + 소실 시기. disappearsByMonths=null → 최장(유음).
export const DEVELOPMENTAL_ERROR_PATTERNS = {
  velar_fronting: { label: "연구개음 전방화", disappearsByMonths: 60, developmental: true },
  affricate_stopping: { label: "파찰음 파열음화", disappearsByMonths: 60, developmental: true },
  fricative_stopping: { label: "마찰음 파열음화", disappearsByMonths: 72, developmental: true },
  liquid_gliding: { label: "유음 활음화", disappearsByMonths: null, developmental: true },
  liquid_nasalization: { label: "유음 비음화", disappearsByMonths: 60, developmental: true },
  final_consonant_deletion: { label: "종성 탈락", disappearsByMonths: 36, developmental: true },
  labialization: { label: "양순음화", disappearsByMonths: null, developmental: false },
  regressive_assimilation: { label: "역행화", disappearsByMonths: null, developmental: false },
} as const;

export type ErrorPattern = keyof typeof DEVELOPMENTAL_ERROR_PATTERNS;

export type ErrorClassification = "developmental" | "developmental_delayed" | "atypical";

/// 오류 패턴 × 연령 → 분류. 비발달적은 항상 atypical, 발달적은 소실 시기 기준.
export function classifyError(pattern: ErrorPattern, ageMonths: number): ErrorClassification {
  const p = DEVELOPMENTAL_ERROR_PATTERNS[pattern];
  if (!p.developmental) return "atypical";
  if (p.disappearsByMonths === null) return "developmental"; // 최장(유음) — 6세+도 정상 가능
  return ageMonths <= p.disappearsByMonths ? "developmental" : "developmental_delayed";
}

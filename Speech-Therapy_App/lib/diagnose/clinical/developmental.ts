// CL-02 — 음소별 발달 위계 연령 보정.
//
// ✅ KOPLAC 임상 자문 검증 완료(2026-05-30, "문제 없음"). 임상 *개념*(발달 위계/절단점) 검증됨.
//
// ⚠️ 적용 위치 = **부모 표시 레이어만**(app/(public)/diagnose/result/.../clinical-interpretation.ts
//    의 밴드/카피 완화). 채점·HITL·confidence·composite·peer·저장은 raw 기준이다.
//    이유: applyDevelopmentalAdjustment 의 floor(0.5·raw+50)를 채점에 넣으면 발달 연령 음소가
//    항상 ≥50 → similarity-HITL(<50)·enqueueForReview 가 큰 오류에도 발화 못 하는 escalation 회귀
//    (적대적 검증 2026-05-30 confirmed). 그래서 display-only.
//    오류유형 인식(atypical 분리, classifyError wiring)·음소 단위 scoping 은 C단계(CL-01/04) 작업.
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

/// 발달적 기대 음소의 오류 감점 약화 계수 (검증된 원칙; 정확한 값은 운영 조정 가능).
/// 0.5 = 발달 연령 내 오류의 "100 과의 격차"를 절반 메움(감점 절반).
export const DEVELOPMENTAL_CREDIT = 0.5;

/**
 * CL-02 — articulation 점수에 음소×연령 발달 보정.
 *
 * 해당 음소가 아동 연령에서 **아직 발달적으로 기대되는(미완성 정상)** 음소면, 오류(낮은 점수)의
 * 감점을 약화 — 100 과의 격차를 DEVELOPMENTAL_CREDIT 만큼 메움. 발달 완성 연령 이후(오류 유의미)
 * 또는 미지원 음소는 raw 그대로.
 *
 * 예: ㅅ(완성 72개월), 48개월 아동, raw 40 → 40 + (100-40)*0.5 = 70 (발달적 오류 → 관대).
 *     ㄴ(완성 36개월), 48개월 아동 → 보정 없음(이미 완성 기대 연령).
 */
export function applyDevelopmentalAdjustment(
  rawScore: number,
  phoneme: string,
  ageMonths: number,
): number {
  if (!isDevelopmentalForAge(phoneme, ageMonths)) return rawScore;
  const adjusted = rawScore + (100 - rawScore) * DEVELOPMENTAL_CREDIT;
  return Math.round(Math.max(0, Math.min(100, adjusted)));
}

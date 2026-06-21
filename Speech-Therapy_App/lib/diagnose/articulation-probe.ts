// 다중 단어/위치 조음 프로브 — 활성 플래그 + 연령 게이트 + 위치별 집계 (CR-2026-007 후속 / 진단 보강).
//
// ⚠️ **additive 독립 프로브 — 기존 단일단어 진단(app/actions/diagnosis.ts) 미수정(하위호환).**
//    단어별 조음 점수는 기존 computePhoneticSimilarity 재사용(동일 신호). 여러 단어·위치로 표집해
//    평균/위치별 분해를 보여줌 → 신호 안정화. **별도 판정/규준/HITL/저장 없음**(display 측정만).
// 비의료(ADR-04): 발음 '확인'일 뿐 진단 단정 아님.

import type { ProbePosition } from "./articulation-probe-content";

// ----- 활성 플래그 (default off) -----
/// ARTICULATION_PROBE_ENABLED === 'true' 일 때만 다중 단어 조음 프로브 활성.
export function isArticulationProbeEnabled(): boolean {
  return process.env.ARTICULATION_PROBE_ENABLED === "true";
}

// ----- 연령 게이트 (만 2~7세, 앱 진단 대상과 동일) -----
export const ARTICULATION_PROBE_AGE_MIN_MONTHS = 24; // 만 2세
export const ARTICULATION_PROBE_AGE_MAX_MONTHS = 84; // 만 7세 0개월

export function isArticulationProbeAgeEligible(ageMonths: number): boolean {
  return (
    Number.isFinite(ageMonths) &&
    ageMonths >= ARTICULATION_PROBE_AGE_MIN_MONTHS &&
    ageMonths <= ARTICULATION_PROBE_AGE_MAX_MONTHS
  );
}

export interface ProbeWordResult {
  word: string;
  position: ProbePosition;
  /// 단어별 조음 점수(0~100) — UI 가 computePhoneticSimilarity 로 산출해 전달.
  score: number;
}

export interface ProbeAggregate {
  /// 측정된 단어 수.
  count: number;
  /// 전체 평균(0~100) 또는 미측정 null.
  overallMean: number | null;
  /// 위치별 평균(어두/어중) 또는 해당 위치 미측정 null.
  byPosition: Record<ProbePosition, number | null>;
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

/// 단어별 결과 → 전체/위치별 평균 집계(결정적 순수 함수, 판정 없음).
export function aggregateArticulationProbe(results: readonly ProbeWordResult[]): ProbeAggregate {
  const valid = results.filter((r) => Number.isFinite(r.score));
  return {
    count: valid.length,
    overallMean: mean(valid.map((r) => r.score)),
    byPosition: {
      initial: mean(valid.filter((r) => r.position === "initial").map((r) => r.score)),
      medial: mean(valid.filter((r) => r.position === "medial").map((r) => r.score)),
    },
  };
}

// CL-03 — 표준화 검사 절단점 정합 (DRAFT).
//
// ⚠️ DRAFT — KOPLAC 임상 자문(CR-2026-006, docs/clinical-consultation-packet_CL01-04_F15.md)
//    검증 대기. 활성 진단 채점(lib/peer-percentile.ts, lib/diagnose/confidence.ts)에 **미연결**.
//    검증 통과 후 wiring (SRS §8.1 Tier 3 — 검증 전 채점 로직 변경 금지).
//
// 근거: wiki clinical/concepts/학령전-언어평가-도구-비교 §임상 절단점 · §3축 매핑.
// UI 표현은 ADR-04 금칙어 배제 — 밴드 라벨은 백분위/안내 톤으로 치환 후 노출.

/// 임상 절단점 상수 (검증 대상). 변경 시 자문 재확인.
export const CLINICAL_CUTOFFS = {
  /// U-TAP PCC(자음정확도): ≥80 정상 / 65–80 관심 / <65 지연.
  articulation: { normalPct: 80, watchPct: 65 },
  /// SELSI 표준편차: -1SD 경계 / -2SD 지연.
  selsi: { boundarySd: -1, delayedSd: -2 },
  /// PRES 표준편차: -1.25SD↑ 정상 / -2SD↓ 심한 지체.
  pres: { normalSd: -1.25, severeSd: -2 },
  /// REVT 등가연령: 생활연령 대비 6개월+ 지체 시 의심.
  revtDelayMonths: 6,
} as const;

/// 임상 밴드 — 내부용. UI 노출 시 ADR-04 치환(백분위/안내 톤).
export type ClinicalBand = "normal" | "watch" | "delayed";

/// articulation(PCC-like 0~100) → 밴드.
export function mapArticulationBand(pccLike: number): ClinicalBand {
  if (pccLike >= CLINICAL_CUTOFFS.articulation.normalPct) return "normal";
  if (pccLike >= CLINICAL_CUTOFFS.articulation.watchPct) return "watch";
  return "delayed";
}

/// 표준점수(SD) → 밴드. (normalSd ↑ 정상 / delayedSd ↓ 지연 / 사이 관심)
export function mapStandardScoreBand(
  sd: number,
  normalSd: number,
  delayedSd: number,
): ClinicalBand {
  if (sd >= normalSd) return "normal";
  if (sd >= delayedSd) return "watch";
  return "delayed";
}

/// REVT 등가연령 지체(개월) → 밴드.
export function mapRevtBand(
  equivalentAgeMonths: number,
  chronologicalAgeMonths: number,
): ClinicalBand {
  const delay = chronologicalAgeMonths - equivalentAgeMonths;
  return delay >= CLINICAL_CUTOFFS.revtDelayMonths ? "delayed" : "normal";
}

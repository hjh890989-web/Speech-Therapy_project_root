// FR-C-HITL-007 — expert 다양성 모니터링 (V07 §5.5).
//
// 책임:
//   - expertId 분포의 집중도 (HHI / Gini) 계산 — pure function.
//   - Phase 1: 단순 Top-3 임계 (≤ 60%).
//   - Phase 2: HHI ≤ 0.3 + Gini ≤ 0.4 (Wiki expert-diversity-monitoring 정합).
//
// 책임 분리:
//   - 본 모듈: aggregate 수치 입력 → 통계량 출력 (Prisma / fetch 0).
//   - 호출 측 (FR-C-HITL-006 / -007 Cron): lib/hitl/retraining.ts 의 aggregateByExpert
//     로 데이터 준비 + 본 helper 호출 → Slack alert (MON-006).
//
// R4 정합:
//   - 입력은 _expertId → count_ Map — 개별 사용자 식별자가 expertId 자체만 노출.
//   - 본 모듈은 raw user data 미접근.
//
// 통계량 정의:
//   - HHI (Herfindahl-Hirschman Index):
//       Σ (share_i)^2, where share_i = count_i / total
//       범위 [1/N, 1] — 1 에 가까울수록 단일 expert 독점.
//       임계 0.3 = 약 3.3 명 균등 분포 (1/0.3 ≈ 3.3) 이상의 다양성 요구.
//   - Gini coefficient:
//       1 - 2 × ∫ Lorenz curve dx (이산 근사).
//       범위 [0, 1) — 0 = 완전 균등, 1 = 단일 독점.
//       임계 0.4 = 적당히 균등 (소득 분배 통계 기준 "공정" 수준).
//
// Refs: TASK_FR-C-HITL-007.md, V07 §5.5, Wiki expert-diversity-monitoring.

/** expert 분포 분석 결과. */
export interface ExpertDiversityResult {
  /// 총 row 수 (검증 대상).
  totalCount: number;
  /// 고유 expert 수.
  uniqueExpertCount: number;
  /// Top-3 expert 의 누적 점유율 (0~1). Phase 1 임계 ≤ 0.6.
  top3SharePct: number;
  /// HHI (0~1). Phase 2 임계 ≤ 0.3.
  hhi: number;
  /// Gini coefficient (0~1). Phase 2 임계 ≤ 0.4.
  gini: number;
  /// expertId 별 점유율 (정렬: 큰 → 작은).
  shares: Array<{ expertId: string; count: number; share: number }>;
}

/**
 * expert 분포 통계 산출.
 *
 * @param distribution expertId → count map (FR-C-HITL-005 의 aggregateByExpert 출력)
 */
export function calculateExpertDiversity(
  distribution: Map<string, number>,
): ExpertDiversityResult {
  const entries = Array.from(distribution.entries()).map(([expertId, count]) => ({
    expertId,
    count,
  }));
  const totalCount = entries.reduce((sum, e) => sum + e.count, 0);

  if (totalCount === 0) {
    return {
      totalCount: 0,
      uniqueExpertCount: 0,
      top3SharePct: 0,
      hhi: 0,
      gini: 0,
      shares: [],
    };
  }

  // 정렬 (점유 큰 → 작은) + share 계산.
  const shares = entries
    .map((e) => ({ expertId: e.expertId, count: e.count, share: e.count / totalCount }))
    .sort((a, b) => b.count - a.count);

  // Top-3 share.
  const top3SharePct = shares.slice(0, 3).reduce((sum, s) => sum + s.share, 0);

  // HHI = Σ share_i^2.
  const hhi = shares.reduce((sum, s) => sum + s.share * s.share, 0);

  // Gini coefficient — 이산 Lorenz curve 근사.
  // ascending sort (작은 → 큰) 후 Brown's formula.
  const gini = calculateGini(shares.map((s) => s.count));

  return {
    totalCount,
    uniqueExpertCount: shares.length,
    top3SharePct,
    hhi,
    gini,
    shares,
  };
}

/**
 * Gini coefficient (Brown's formula 이산 근사).
 *
 *   G = 1 - Σ (x_{k-1} + x_k) × (y_k - y_{k-1})
 *
 * - input: counts (ascending order 권장 — 정렬 강제 처리).
 * - 범위 [0, 1).
 *
 * Reference: https://en.wikipedia.org/wiki/Gini_coefficient#Discrete_probability_distribution
 */
export function calculateGini(counts: number[]): number {
  if (counts.length === 0) return 0;
  if (counts.length === 1) return 0; // 단일 expert — Gini 정의상 0.

  // ascending sort.
  const sorted = [...counts].sort((a, b) => a - b);
  const n = sorted.length;
  const total = sorted.reduce((s, c) => s + c, 0);
  if (total === 0) return 0;

  // Brown's formula 의 단순화:
  //   G = (2 × Σ i × x_i) / (n × Σ x_i) - (n + 1) / n
  // 여기서 i 는 1-indexed.
  let weighted = 0;
  for (let i = 0; i < n; i++) {
    weighted += (i + 1) * sorted[i];
  }
  const gini = (2 * weighted) / (n * total) - (n + 1) / n;
  // 부동 소수점 오차 보정.
  return Math.max(0, Math.min(1, gini));
}

/** Phase 1 임계 통과 여부. */
export interface DiversityVerdict {
  phase: "phase1" | "phase2";
  passed: boolean;
  reasons: string[];
}

export function evaluateDiversityVerdict(
  result: ExpertDiversityResult,
  phase: "phase1" | "phase2",
): DiversityVerdict {
  const reasons: string[] = [];
  // 부동 소수점 epsilon — 정확히 임계 (0.6 / 0.3 / 0.4) 일 때 통과 보장.
  const EPS = 1e-9;

  if (phase === "phase1") {
    // Phase 1: Top-3 expert 점유율 ≤ 60%.
    if (result.top3SharePct > 0.6 + EPS) {
      reasons.push(
        `Top-3 expert 점유율 ${(result.top3SharePct * 100).toFixed(1)}% > 60% (Phase 1 임계 초과)`,
      );
    }
  } else {
    // Phase 2: HHI ≤ 0.3 AND Gini ≤ 0.4.
    if (result.hhi > 0.3 + EPS) {
      reasons.push(`HHI ${result.hhi.toFixed(3)} > 0.3 (Phase 2 단일 expert 독점 의심)`);
    }
    if (result.gini > 0.4 + EPS) {
      reasons.push(`Gini ${result.gini.toFixed(3)} > 0.4 (Phase 2 분배 불균등)`);
    }
  }

  return { phase, passed: reasons.length === 0, reasons };
}

/** 위반 시 Slack 메시지 빌더 (MON-006 호환). */
export function buildDiversityAlertMessage(
  result: ExpertDiversityResult,
  verdict: DiversityVerdict,
): string {
  const lines = [
    `:warning: HITL expert 다양성 ${verdict.phase} 임계 초과`,
    `• 총 row: ${result.totalCount}`,
    `• 고유 expert: ${result.uniqueExpertCount}`,
    `• Top-3 점유율: ${(result.top3SharePct * 100).toFixed(1)}%`,
    `• HHI: ${result.hhi.toFixed(3)}`,
    `• Gini: ${result.gini.toFixed(3)}`,
    "",
    "사유:",
    ...verdict.reasons.map((r) => `  - ${r}`),
  ];
  return lines.join("\n");
}

// FR-C-HITL-006 — HITL 재학습 3 게이트 검증 (V07 §5.3.3).
//
// 3 게이트 (ADR-11, REQ-FUNC-HITL-006):
//   1) diffPct ≥ 0.5% — AI ↔ expert 점수 차이가 의미 있는 수준
//   2) cumulative ≥ 500 — 통계적 충분성 확보
//   3) HHI ≤ 0.3 (Phase 2) 또는 Top-3 ≤ 60% (Phase 1) — expert 다양성
//
// 통과 시:
//   - 외부 ML 엔지니어 위탁 알림 (Slack — FR-C-HITL-007 alert 분리 가능)
//   - admin 승인 후 모델 재배포 (admin 수동 절차, 본 모듈 미관여)
//
// 본 helper 는 _pure logic_ — Prisma / Slack 호출 없음.
// 호출 측 (Cron Route Handler) 가 데이터 준비 + alert 발송.
//
// Refs: TASK_FR-C-HITL-006.md, V07 §5.3.3, ADR-11.

import {
  calculateExpertDiversity,
  type ExpertDiversityResult,
} from "./expert-diversity";

/** 3 게이트 검증 입력. */
export interface RetrainingGateInput {
  /// cohort 의 row 별 diffPct (model_retraining_data 의 diffPct 컬럼).
  diffPctValues: number[];
  /// cohort 의 expertId 별 카운트 (aggregateByExpert 결과).
  expertDistribution: Map<string, number>;
  /// Phase 1 (Top-3 임계) 또는 Phase 2 (HHI/Gini 이중).
  phase: "phase1" | "phase2";
}

/** 3 게이트 검증 결과. */
export interface RetrainingGateResult {
  /// 게이트 1 — 평균 diffPct ≥ 0.5%.
  gate1MeanDiffPct: number;
  gate1Passed: boolean;
  /// 게이트 2 — cumulative count ≥ 500.
  gate2Count: number;
  gate2Passed: boolean;
  /// 게이트 3 — 다양성 (phase 별 임계).
  diversity: ExpertDiversityResult;
  gate3Passed: boolean;
  gate3Reason: string;
  /// 3 게이트 모두 통과 → 외부 ML 위탁 트리거.
  allPassed: boolean;
}

/** 3 게이트 임계 상수 (V07 §5.3.3). */
export const RETRAINING_GATE_THRESHOLDS = {
  MEAN_DIFF_PCT: 0.5,
  CUMULATIVE_MIN: 500,
  HHI_MAX: 0.3,
  TOP3_MAX: 0.6,
} as const;

/** 3 게이트 검증 (pure function). */
export function evaluateRetrainingGate(
  input: RetrainingGateInput,
): RetrainingGateResult {
  // 게이트 1 — 평균 diffPct (부동 소수점 epsilon 보정).
  const EPS = 1e-9;
  const meanDiffPct =
    input.diffPctValues.length === 0
      ? 0
      : input.diffPctValues.reduce((s, v) => s + v, 0) / input.diffPctValues.length;
  const gate1Passed = meanDiffPct >= RETRAINING_GATE_THRESHOLDS.MEAN_DIFF_PCT - EPS;

  // 게이트 2 — cumulative count.
  const gate2Count = input.diffPctValues.length;
  const gate2Passed = gate2Count >= RETRAINING_GATE_THRESHOLDS.CUMULATIVE_MIN;

  // 게이트 3 — 다양성.
  const diversity = calculateExpertDiversity(input.expertDistribution);
  let gate3Passed: boolean;
  let gate3Reason: string;
  if (input.phase === "phase1") {
    gate3Passed = diversity.top3SharePct <= RETRAINING_GATE_THRESHOLDS.TOP3_MAX + EPS;
    gate3Reason = gate3Passed
      ? `Phase 1: Top-3 점유율 ${(diversity.top3SharePct * 100).toFixed(1)}% ≤ 60% — 통과`
      : `Phase 1: Top-3 점유율 ${(diversity.top3SharePct * 100).toFixed(1)}% > 60% — 차단`;
  } else {
    gate3Passed = diversity.hhi <= RETRAINING_GATE_THRESHOLDS.HHI_MAX + EPS;
    gate3Reason = gate3Passed
      ? `Phase 2: HHI ${diversity.hhi.toFixed(3)} ≤ 0.3 — 통과`
      : `Phase 2: HHI ${diversity.hhi.toFixed(3)} > 0.3 — 차단`;
  }

  const allPassed = gate1Passed && gate2Passed && gate3Passed;

  return {
    gate1MeanDiffPct: meanDiffPct,
    gate1Passed,
    gate2Count,
    gate2Passed,
    diversity,
    gate3Passed,
    gate3Reason,
    allPassed,
  };
}

/** 3 게이트 결과의 Slack 메시지 빌더 (운영팀 + 위탁 ML 알림). */
export function buildRetrainingGateMessage(
  result: RetrainingGateResult,
  period: { from: string; to: string },
): string {
  const emoji = result.allPassed ? ":rocket:" : ":no_entry_sign:";
  const verdictLabel = result.allPassed
    ? "재학습 3 게이트 통과 — 외부 ML 위탁 트리거"
    : "재학습 3 게이트 미통과 — skip";
  const checks = [
    `${result.gate1Passed ? "✅" : "❌"} 게이트 1 (diff) — 평균 ${result.gate1MeanDiffPct.toFixed(2)}%`,
    `${result.gate2Passed ? "✅" : "❌"} 게이트 2 (volume) — 누적 ${result.gate2Count} 건`,
    `${result.gate3Passed ? "✅" : "❌"} 게이트 3 (diversity) — ${result.gate3Reason}`,
  ];
  return [
    `${emoji} ${verdictLabel}`,
    `• period: ${period.from} ~ ${period.to}`,
    "",
    ...checks,
  ].join("\n");
}

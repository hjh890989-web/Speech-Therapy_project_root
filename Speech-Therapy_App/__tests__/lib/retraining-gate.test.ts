// TEST-022 — HITL 재학습 3 게이트 검증 단위 테스트 (V07 §5.3.3).
//
// 3 게이트 (ADR-11):
//   1) 평균 diffPct ≥ 0.5%
//   2) cumulative ≥ 500
//   3) HHI ≤ 0.3 (Phase 2) 또는 Top-3 ≤ 60% (Phase 1)
//
// 시나리오:
//   1) 3 게이트 모두 통과 (Phase 1)
//   2) 3 게이트 모두 통과 (Phase 2)
//   3) 게이트 1 미통과 (diff 부족) → 위탁 skip
//   4) 게이트 2 미통과 (cumulative < 500) → 위탁 skip
//   5) 게이트 3 미통과 (Phase 1 Top-3 > 60%) → 위탁 skip
//   6) 게이트 3 미통과 (Phase 2 HHI > 0.3) → 위탁 skip
//   7) 빈 cohort → 모두 미통과
//   8) Slack 메시지 R4 정합

import { describe, expect, it } from "vitest";
import {
  evaluateRetrainingGate,
  buildRetrainingGateMessage,
  RETRAINING_GATE_THRESHOLDS,
} from "@/lib/hitl/retraining-gate";

/** N expert 균등 분포 + total 카운트. */
function evenDistribution(n: number, total: number): Map<string, number> {
  const per = Math.floor(total / n);
  const remainder = total - per * n;
  const m = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    m.set(`expert-${i}`, per + (i < remainder ? 1 : 0));
  }
  return m;
}

describe("TEST-022 — HITL 재학습 3 게이트", () => {
  describe("Scenario 1: 3 게이트 모두 통과 (Phase 1)", () => {
    it("평균 diff 0.6 + 500건 + 10 expert 균등 → allPassed=true", () => {
      const diffPctValues = new Array(500).fill(0.6);
      const expertDistribution = evenDistribution(10, 500);
      const r = evaluateRetrainingGate({
        diffPctValues,
        expertDistribution,
        phase: "phase1",
      });
      expect(r.allPassed).toBe(true);
      expect(r.gate1Passed).toBe(true);
      expect(r.gate2Passed).toBe(true);
      expect(r.gate3Passed).toBe(true);
      expect(r.gate1MeanDiffPct).toBeCloseTo(0.6, 5);
      expect(r.gate2Count).toBe(500);
    });
  });

  describe("Scenario 2: 3 게이트 모두 통과 (Phase 2)", () => {
    it("평균 diff 1.0 + 600건 + 10 expert 균등 (HHI=0.1) → allPassed=true", () => {
      const diffPctValues = new Array(600).fill(1.0);
      const expertDistribution = evenDistribution(10, 600);
      const r = evaluateRetrainingGate({
        diffPctValues,
        expertDistribution,
        phase: "phase2",
      });
      expect(r.allPassed).toBe(true);
      expect(r.diversity.hhi).toBeLessThanOrEqual(RETRAINING_GATE_THRESHOLDS.HHI_MAX);
    });
  });

  describe("Scenario 3: 게이트 1 미통과 (diff 부족)", () => {
    it("평균 diff 0.3 < 0.5 → allPassed=false", () => {
      const diffPctValues = new Array(500).fill(0.3);
      const expertDistribution = evenDistribution(10, 500);
      const r = evaluateRetrainingGate({
        diffPctValues,
        expertDistribution,
        phase: "phase1",
      });
      expect(r.allPassed).toBe(false);
      expect(r.gate1Passed).toBe(false);
      expect(r.gate1MeanDiffPct).toBeCloseTo(0.3, 5);
      expect(r.gate2Passed).toBe(true);
      expect(r.gate3Passed).toBe(true);
    });
  });

  describe("Scenario 4: 게이트 2 미통과 (cumulative < 500)", () => {
    it("499건 → allPassed=false", () => {
      const diffPctValues = new Array(499).fill(0.8);
      const expertDistribution = evenDistribution(10, 499);
      const r = evaluateRetrainingGate({
        diffPctValues,
        expertDistribution,
        phase: "phase1",
      });
      expect(r.allPassed).toBe(false);
      expect(r.gate2Passed).toBe(false);
      expect(r.gate2Count).toBe(499);
    });

    it("정확히 500건 → 게이트 2 통과", () => {
      const diffPctValues = new Array(500).fill(0.8);
      const expertDistribution = evenDistribution(10, 500);
      const r = evaluateRetrainingGate({
        diffPctValues,
        expertDistribution,
        phase: "phase1",
      });
      expect(r.gate2Passed).toBe(true);
    });
  });

  describe("Scenario 5: 게이트 3 미통과 (Phase 1 Top-3 > 60%)", () => {
    it("3명이 80% 점유 → Phase 1 차단", () => {
      const diffPctValues = new Array(500).fill(0.8);
      const expertDistribution = new Map([
        ["expert-A", 300],
        ["expert-B", 200],
        ["expert-C", 200],
        ["expert-D", 100],
        ["expert-E", 50],
        ["expert-F", 50],
      ]);
      // total = 900, top3 = 700, top3% ≈ 77.8%
      const r = evaluateRetrainingGate({
        diffPctValues,
        expertDistribution,
        phase: "phase1",
      });
      expect(r.gate3Passed).toBe(false);
      expect(r.allPassed).toBe(false);
      expect(r.gate3Reason).toContain("Phase 1");
      expect(r.gate3Reason).toContain("차단");
    });
  });

  describe("Scenario 6: 게이트 3 미통과 (Phase 2 HHI > 0.3)", () => {
    it("1명 70% 독점 → HHI ≈ 0.5 → Phase 2 차단", () => {
      const diffPctValues = new Array(500).fill(0.8);
      const expertDistribution = new Map([
        ["expert-A", 700],
        ["expert-B", 100],
        ["expert-C", 100],
        ["expert-D", 100],
      ]);
      const r = evaluateRetrainingGate({
        diffPctValues,
        expertDistribution,
        phase: "phase2",
      });
      expect(r.gate3Passed).toBe(false);
      expect(r.allPassed).toBe(false);
      expect(r.gate3Reason).toContain("Phase 2");
      expect(r.diversity.hhi).toBeGreaterThan(0.3);
    });
  });

  describe("Scenario 7: 빈 cohort", () => {
    it("0건 → 게이트 1,2 미통과", () => {
      const r = evaluateRetrainingGate({
        diffPctValues: [],
        expertDistribution: new Map(),
        phase: "phase1",
      });
      expect(r.allPassed).toBe(false);
      expect(r.gate1Passed).toBe(false);
      expect(r.gate2Passed).toBe(false);
      expect(r.gate2Count).toBe(0);
      expect(r.gate1MeanDiffPct).toBe(0);
      // 빈 distribution 의 다양성은 임계 위반 아님 — 게이트 3 통과 (위반 사유 없음)
      expect(r.gate3Passed).toBe(true);
    });
  });

  describe("Scenario 8: Slack 메시지 빌더", () => {
    it("통과 시 🚀 + 위탁 트리거 라벨", () => {
      const r = evaluateRetrainingGate({
        diffPctValues: new Array(500).fill(0.6),
        expertDistribution: evenDistribution(10, 500),
        phase: "phase1",
      });
      const msg = buildRetrainingGateMessage(r, {
        from: "2026-05-20",
        to: "2026-05-27",
      });
      expect(msg).toContain(":rocket:");
      expect(msg).toContain("외부 ML 위탁 트리거");
      expect(msg).toContain("게이트 1");
      expect(msg).toContain("게이트 2");
      expect(msg).toContain("게이트 3");
      expect(msg).toContain("2026-05-20");
      // R4: 자녀 식별 정보 미노출 — 통계 + period 만
      expect(msg).not.toMatch(/userId|sessionId|email|phone/i);
    });

    it("미통과 시 🚫 + skip 라벨", () => {
      const r = evaluateRetrainingGate({
        diffPctValues: new Array(100).fill(0.3),
        expertDistribution: new Map([["expert-A", 100]]),
        phase: "phase2",
      });
      const msg = buildRetrainingGateMessage(r, { from: "x", to: "y" });
      expect(msg).toContain(":no_entry_sign:");
      expect(msg).toContain("skip");
    });
  });

  describe("Scenario 9: 임계 상수 검증 (회귀 sentinel)", () => {
    it("V07 §5.3.3 의 3 임계가 정확히 일치", () => {
      expect(RETRAINING_GATE_THRESHOLDS.MEAN_DIFF_PCT).toBe(0.5);
      expect(RETRAINING_GATE_THRESHOLDS.CUMULATIVE_MIN).toBe(500);
      expect(RETRAINING_GATE_THRESHOLDS.HHI_MAX).toBe(0.3);
      expect(RETRAINING_GATE_THRESHOLDS.TOP3_MAX).toBe(0.6);
    });
  });
});

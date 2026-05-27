// FR-C-031 단위 테스트 — EXP-2 코호트 검증 자동화 (V07 신규).
//
// 시나리오 (≥ 7):
//   1) 정상 통과 — clickers 25%, nonClickers 5% → diff 20%p (= threshold) → passed
//   2) 통과 — clickers 40%, nonClickers 5% → diff 35%p → passed
//   3) below_threshold — clickers 15%, nonClickers 10% → diff 5%p → 미통과
//   4) insufficient_sample — 각 cohort < 80 → verdict insufficient_sample
//   5) 둘 다 0 (가설 검증 불가) — diff 0, NaN 방지
//   6) clickers total 0 (잠재 edge) — clickersRate 0 + verdict insufficient
//   7) custom threshold — 10%p 임계 → 15%p diff → passed
//   8) custom minSampleSize — 10 → 작은 cohort 도 통과 가능
//   9) buildExp2ReportMessage 의 R4 정합 — 자녀 식별 정보 미포함
//   10) logExp2Verdict 의 텔레메트리 shape
//
// Refs: TASK_FR-C-031.md, REQ-FUNC-044/045, V07 §6.6 EXP-2.

import { describe, expect, it, vi } from "vitest";
import {
  evaluateExp2Verdict,
  buildExp2ReportMessage,
  logExp2Verdict,
  type CohortRetentionInput,
} from "@/lib/analytics/exp2-cohort";

describe("FR-C-031 — EXP-2 코호트 검증 자동화", () => {
  describe("evaluateExp2Verdict — passed 분기", () => {
    it("[1] clickers 25%, nonClickers 5% → diff 20%p (임계 정확히 충족) → passed", () => {
      const input: CohortRetentionInput = {
        clickers: { total: 400, retained: 100 },
        nonClickers: { total: 400, retained: 20 },
      };
      const result = evaluateExp2Verdict(input);
      expect(result.passed).toBe(true);
      expect(result.verdict).toBe("passed");
      expect(result.clickersRate).toBe(0.25);
      expect(result.nonClickersRate).toBe(0.05);
      expect(result.diffPp).toBeCloseTo(20, 5);
    });

    it("[2] clickers 40%, nonClickers 5% → diff 35%p → passed (충분 초과)", () => {
      const input: CohortRetentionInput = {
        clickers: { total: 200, retained: 80 },
        nonClickers: { total: 400, retained: 20 },
      };
      const result = evaluateExp2Verdict(input);
      expect(result.passed).toBe(true);
      expect(result.verdict).toBe("passed");
      expect(result.diffPp).toBeCloseTo(35, 5);
    });
  });

  describe("evaluateExp2Verdict — below_threshold 분기", () => {
    it("[3] clickers 15%, nonClickers 10% → diff 5%p → below_threshold", () => {
      const input: CohortRetentionInput = {
        clickers: { total: 200, retained: 30 },
        nonClickers: { total: 200, retained: 20 },
      };
      const result = evaluateExp2Verdict(input);
      expect(result.passed).toBe(false);
      expect(result.verdict).toBe("below_threshold");
      expect(result.diffPp).toBeCloseTo(5, 5);
      expect(result.hasSufficientSampleSize).toBe(true);
    });

    it("[3b] diff 19.99%p → below_threshold (경계 미달)", () => {
      const input: CohortRetentionInput = {
        clickers: { total: 200, retained: 50 }, // 25%
        nonClickers: { total: 200, retained: 11 }, // 5.5%
      };
      const result = evaluateExp2Verdict(input);
      // 25% - 5.5% = 19.5%p < 20
      expect(result.passed).toBe(false);
      expect(result.verdict).toBe("below_threshold");
    });
  });

  describe("evaluateExp2Verdict — insufficient_sample 분기", () => {
    it("[4] 각 cohort < 80 → insufficient_sample (diff 가 커도 통과 불가)", () => {
      const input: CohortRetentionInput = {
        clickers: { total: 50, retained: 25 }, // 50%
        nonClickers: { total: 50, retained: 5 }, // 10%
      };
      const result = evaluateExp2Verdict(input);
      // diff 40%p 이지만 sample 부족
      expect(result.passed).toBe(false);
      expect(result.verdict).toBe("insufficient_sample");
      expect(result.hasSufficientSampleSize).toBe(false);
    });

    it("[4b] clickers ≥ 80 but nonClickers < 80 → insufficient", () => {
      const input: CohortRetentionInput = {
        clickers: { total: 200, retained: 60 }, // 30%
        nonClickers: { total: 50, retained: 5 }, // 10%
      };
      const result = evaluateExp2Verdict(input);
      expect(result.verdict).toBe("insufficient_sample");
      expect(result.hasSufficientSampleSize).toBe(false);
    });
  });

  describe("evaluateExp2Verdict — edge cases", () => {
    it("[5] 둘 다 0 → NaN 방지 + diff 0 + insufficient", () => {
      const input: CohortRetentionInput = {
        clickers: { total: 0, retained: 0 },
        nonClickers: { total: 0, retained: 0 },
      };
      const result = evaluateExp2Verdict(input);
      expect(result.clickersRate).toBe(0);
      expect(result.nonClickersRate).toBe(0);
      expect(result.diffPp).toBe(0);
      expect(result.verdict).toBe("insufficient_sample");
      expect(Number.isFinite(result.diffPp)).toBe(true);
    });

    it("[6] clickers total 0 → clickersRate 0 (negative total 도 0)", () => {
      const input: CohortRetentionInput = {
        clickers: { total: 0, retained: 10 }, // 비정상 데이터 — graceful
        nonClickers: { total: 200, retained: 10 },
      };
      const result = evaluateExp2Verdict(input);
      expect(result.clickersRate).toBe(0);
      expect(result.diffPp).toBeLessThan(0);
      expect(result.verdict).toBe("insufficient_sample");
    });
  });

  describe("evaluateExp2Verdict — custom config", () => {
    it("[7] custom thresholdPp 10 → 15%p diff → passed", () => {
      const input: CohortRetentionInput = {
        clickers: { total: 200, retained: 50 }, // 25%
        nonClickers: { total: 200, retained: 20 }, // 10%
      };
      const result = evaluateExp2Verdict(input, 10);
      expect(result.passed).toBe(true);
      expect(result.thresholdPp).toBe(10);
    });

    it("[8] custom minSampleSize 10 → 작은 cohort 도 검증 통과", () => {
      const input: CohortRetentionInput = {
        clickers: { total: 20, retained: 10 }, // 50%
        nonClickers: { total: 20, retained: 2 }, // 10%
      };
      const result = evaluateExp2Verdict(input, 20, 10);
      expect(result.hasSufficientSampleSize).toBe(true);
      expect(result.passed).toBe(true);
      expect(result.verdict).toBe("passed");
    });
  });

  describe("buildExp2ReportMessage — R4 + verdict 라벨", () => {
    it("[9-a] passed 시 ✅ + verdict + 메트릭 노출, 자녀 PII 미포함", () => {
      const result = evaluateExp2Verdict({
        clickers: { total: 200, retained: 60 },
        nonClickers: { total: 200, retained: 20 },
      });
      const msg = buildExp2ReportMessage(result, {
        from: "2026-05-01",
        to: "2026-05-27",
      });
      expect(msg).toContain("EXP-2 검증");
      expect(msg).toContain("passed");
      expect(msg).toContain("30.0%");
      expect(msg).toContain("10.0%");
      expect(msg).toContain("20.0%p");
      expect(msg).toContain("2026-05-01");
      // R4: 자녀 식별 정보 미포함 검증
      expect(msg).not.toMatch(/userId|sessionId|email|phone/i);
    });

    it("[9-b] below_threshold 시 ⚠️", () => {
      const result = evaluateExp2Verdict({
        clickers: { total: 200, retained: 30 },
        nonClickers: { total: 200, retained: 20 },
      });
      const msg = buildExp2ReportMessage(result, { from: "x", to: "y" });
      expect(msg).toContain("below_threshold");
      expect(msg).toContain(":warning:");
    });

    it("[9-c] insufficient_sample 시 INSUFFICIENT label", () => {
      const result = evaluateExp2Verdict({
        clickers: { total: 10, retained: 5 },
        nonClickers: { total: 10, retained: 1 },
      });
      const msg = buildExp2ReportMessage(result, { from: "x", to: "y" });
      expect(msg).toContain("INSUFFICIENT");
    });
  });

  describe("logExp2Verdict — server-side telemetry", () => {
    it("[10] console.log shape — event 명 + properties + R4 정합", () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const result = evaluateExp2Verdict({
        clickers: { total: 200, retained: 60 },
        nonClickers: { total: 200, retained: 20 },
      });
      logExp2Verdict(result, { from: "2026-05-01", to: "2026-05-27" });

      expect(logSpy).toHaveBeenCalledTimes(1);
      const logged = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(logged.event).toBe("exp2_cohort_evaluated");
      expect(logged.properties.verdict).toBe("passed");
      expect(logged.properties.diffPp).toBeCloseTo(20, 5);
      expect(logged.properties.period.from).toBe("2026-05-01");
      // R4: properties 에 자녀 식별 정보 없음
      expect(JSON.stringify(logged)).not.toMatch(/userId|sessionId|email/i);
      logSpy.mockRestore();
    });

    it("[10b] logExp2Verdict throw 시 graceful (try/catch)", () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
        throw new Error("write failed");
      });
      const result = evaluateExp2Verdict({
        clickers: { total: 80, retained: 30 },
        nonClickers: { total: 80, retained: 10 },
      });
      // throw 발생해도 함수 자체는 throw 미전파 — graceful
      expect(() =>
        logExp2Verdict(result, { from: "x", to: "y" }),
      ).not.toThrow();
      logSpy.mockRestore();
    });
  });
});

// FR-Q-011 (Issue #52) — calculateRoi / buildMonthlyRoiSeries 단위 테스트.
// 검증: 정상 / 경계 / 0 / 음수 클램프 / 시리즈 길이.

import { describe, it, expect } from "vitest";
import {
  calculateRoi,
  buildMonthlyRoiSeries,
  HOURS_SAVED_PER_STUDENT_PER_MONTH,
} from "@/lib/roi";

describe("calculateRoi — FR-Q-011 / REQ-FUNC-048", () => {
  it("정상 — 50명 × ₩20,000 = 월매출 ₩1,000,000, 연매출 ₩12,000,000", () => {
    const r = calculateRoi({
      studentCount: 50,
      monthlyFeePerStudent: 20_000,
      expertHourlyRate: 100_000,
    });
    expect(r.monthlyRevenue).toBe(1_000_000);
    expect(r.annualRevenue).toBe(12_000_000);
    // 절감 시간: 50 × 0.5 = 25h
    expect(r.monthlyTimeSavedHours).toBe(25);
    // 절감 금액: 25h × ₩100,000 = ₩2,500,000
    expect(r.monthlySavings).toBe(2_500_000);
    expect(r.annualSavings).toBe(30_000_000);
  });

  it("최소 경계 — 1명 × ₩10,000 → 정상 산출", () => {
    const r = calculateRoi({
      studentCount: 1,
      monthlyFeePerStudent: 10_000,
      expertHourlyRate: 100_000,
    });
    expect(r.monthlyRevenue).toBe(10_000);
    expect(r.monthlyTimeSavedHours).toBeCloseTo(0.5);
    expect(r.monthlySavings).toBe(50_000);
  });

  it("최대 경계 — 500명 × ₩50,000 → 월 ₩25,000,000", () => {
    const r = calculateRoi({
      studentCount: 500,
      monthlyFeePerStudent: 50_000,
      expertHourlyRate: 100_000,
    });
    expect(r.monthlyRevenue).toBe(25_000_000);
    expect(r.annualRevenue).toBe(300_000_000);
    expect(r.monthlyTimeSavedHours).toBe(250);
  });

  it("studentCount=0 → 모든 산출 0", () => {
    const r = calculateRoi({
      studentCount: 0,
      monthlyFeePerStudent: 20_000,
      expertHourlyRate: 100_000,
    });
    expect(r.monthlyRevenue).toBe(0);
    expect(r.annualRevenue).toBe(0);
    expect(r.monthlyTimeSavedHours).toBe(0);
    expect(r.monthlySavings).toBe(0);
    expect(r.annualSavings).toBe(0);
  });

  it("음수 입력 → 0 으로 클램프 (NaN / -Infinity 도 안전)", () => {
    const r = calculateRoi({
      studentCount: -10,
      monthlyFeePerStudent: -5_000,
      expertHourlyRate: Number.NEGATIVE_INFINITY,
    });
    expect(r.monthlyRevenue).toBe(0);
    expect(r.annualRevenue).toBe(0);
    expect(r.monthlyTimeSavedHours).toBe(0);
    expect(r.monthlySavings).toBe(0);
    expect(r.annualSavings).toBe(0);
  });

  it("NaN 입력 → 0 으로 클램프", () => {
    const r = calculateRoi({
      studentCount: Number.NaN,
      monthlyFeePerStudent: 20_000,
      expertHourlyRate: 100_000,
    });
    expect(r.monthlyRevenue).toBe(0);
    expect(r.monthlyTimeSavedHours).toBe(0);
  });

  it("연 매출 = 월 매출 × 12 항등식", () => {
    for (const n of [10, 75, 200]) {
      const r = calculateRoi({
        studentCount: n,
        monthlyFeePerStudent: 25_000,
        expertHourlyRate: 100_000,
      });
      expect(r.annualRevenue).toBe(r.monthlyRevenue * 12);
      expect(r.annualSavings).toBe(r.monthlySavings * 12);
    }
  });

  it("상수 노출 — HOURS_SAVED_PER_STUDENT_PER_MONTH = 0.5", () => {
    expect(HOURS_SAVED_PER_STUDENT_PER_MONTH).toBe(0.5);
  });
});

describe("buildMonthlyRoiSeries", () => {
  it("기본 12개월 시리즈 — month 1~12, 누적 매출 단조 증가", () => {
    const series = buildMonthlyRoiSeries({
      studentCount: 50,
      monthlyFeePerStudent: 20_000,
      expertHourlyRate: 100_000,
    });
    expect(series).toHaveLength(12);
    expect(series[0].month).toBe(1);
    expect(series[11].month).toBe(12);
    // 누적 매출: 1개월 = 1,000,000 → 12개월 = 12,000,000
    expect(series[0].cumulativeRevenue).toBe(1_000_000);
    expect(series[11].cumulativeRevenue).toBe(12_000_000);
    // 단조 증가 검증.
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i].cumulativeRevenue).toBeGreaterThanOrEqual(series[i - 1].cumulativeRevenue);
      expect(series[i].cumulativeSavings).toBeGreaterThanOrEqual(series[i - 1].cumulativeSavings);
    }
  });

  it("months 파라미터 — 6 → 6개 포인트, 13 → 12 로 클램프", () => {
    expect(
      buildMonthlyRoiSeries(
        { studentCount: 10, monthlyFeePerStudent: 10_000, expertHourlyRate: 100_000 },
        6,
      ),
    ).toHaveLength(6);
    expect(
      buildMonthlyRoiSeries(
        { studentCount: 10, monthlyFeePerStudent: 10_000, expertHourlyRate: 100_000 },
        13,
      ),
    ).toHaveLength(12);
    expect(
      buildMonthlyRoiSeries(
        { studentCount: 10, monthlyFeePerStudent: 10_000, expertHourlyRate: 100_000 },
        0,
      ),
    ).toHaveLength(1);
  });
});

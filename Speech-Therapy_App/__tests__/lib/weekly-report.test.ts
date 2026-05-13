// DB-007 헬퍼 + ScoreTrend Zod 단위 테스트.

import { describe, it, expect } from "vitest";
import {
  getCurrentWeekNumber,
  ScoreTrendSchema,
} from "@/lib/weekly-report";

describe("getCurrentWeekNumber (ISO 8601)", () => {
  it("2026-01-04 = 2026 W01 (1월 4일이 1주차에 포함)", () => {
    const { year, week } = getCurrentWeekNumber(new Date(Date.UTC(2026, 0, 4)));
    expect(year).toBe(2026);
    expect(week).toBe(1);
  });

  it("2026-05-12 = 2026 W20", () => {
    const { year, week } = getCurrentWeekNumber(new Date(Date.UTC(2026, 4, 12)));
    expect(year).toBe(2026);
    expect(week).toBe(20);
  });
});

describe("ScoreTrendSchema", () => {
  it("정상 entry 1개 통과", () => {
    const data = [
      {
        date: "2026-05-12",
        phoneme: "ㅅ",
        articulation: 80,
        linguistic: 75,
        acoustic: 70,
        peerPercentile: 65,
      },
    ];
    expect(() => ScoreTrendSchema.parse(data)).not.toThrow();
  });

  it("범위 외 점수 (101) 차단", () => {
    const data = [
      {
        date: "2026-05-12",
        phoneme: "ㅅ",
        articulation: 101,
        linguistic: 75,
        acoustic: 70,
        peerPercentile: 65,
      },
    ];
    expect(() => ScoreTrendSchema.parse(data)).toThrow();
  });

  it("필수 필드 누락 차단", () => {
    const data = [{ date: "2026-05-12" }];
    expect(() => ScoreTrendSchema.parse(data)).toThrow();
  });
});

// DB-007 헬퍼 + ScoreTrend Zod + FR-Q-006 sufficiency 단위 테스트.

import { describe, it, expect } from "vitest";
import {
  getCurrentWeekNumber,
  ScoreTrendSchema,
  assessDataSufficiency,
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

describe("assessDataSufficiency — FR-Q-006 분기 키", () => {
  it("weekSessionCount ≥ 5 → full", () => {
    expect(
      assessDataSufficiency({ weekSessionCount: 5, lastSessionDaysAgo: 0, lifetimeSessionCount: 10 }),
    ).toEqual({ sufficiency: "full" });
  });

  it("weekSessionCount 2~4 → partial", () => {
    for (const n of [2, 3, 4]) {
      expect(
        assessDataSufficiency({
          weekSessionCount: n,
          lastSessionDaysAgo: 0,
          lifetimeSessionCount: 10,
        }),
      ).toEqual({ sufficiency: "partial" });
    }
  });

  it("0건 + 평생 0건 → insufficient/new_user", () => {
    expect(
      assessDataSufficiency({
        weekSessionCount: 0,
        lastSessionDaysAgo: null,
        lifetimeSessionCount: 0,
      }),
    ).toEqual({ sufficiency: "insufficient", emptyVariant: "new_user" });
  });

  it("0건 + 25일 미접속 → insufficient/long_absent", () => {
    expect(
      assessDataSufficiency({
        weekSessionCount: 0,
        lastSessionDaysAgo: 25,
        lifetimeSessionCount: 5,
      }),
    ).toEqual({ sufficiency: "insufficient", emptyVariant: "long_absent" });
  });

  it("0건 + 7일 전 마지막 + lifetime 3 → insufficient/week_empty", () => {
    expect(
      assessDataSufficiency({
        weekSessionCount: 0,
        lastSessionDaysAgo: 7,
        lifetimeSessionCount: 3,
      }),
    ).toEqual({ sufficiency: "insufficient", emptyVariant: "week_empty" });
  });

  it("1건 + lifetime 5 → insufficient/week_empty (partialThreshold=2 미달)", () => {
    expect(
      assessDataSufficiency({
        weekSessionCount: 1,
        lastSessionDaysAgo: 1,
        lifetimeSessionCount: 5,
      }),
    ).toEqual({ sufficiency: "insufficient", emptyVariant: "week_empty" });
  });

  it("커스텀 longAbsenceDays=10 적용", () => {
    expect(
      assessDataSufficiency(
        { weekSessionCount: 0, lastSessionDaysAgo: 12, lifetimeSessionCount: 5 },
        { longAbsenceDays: 10 },
      ),
    ).toEqual({ sufficiency: "insufficient", emptyVariant: "long_absent" });
  });
});

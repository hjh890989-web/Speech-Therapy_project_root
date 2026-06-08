// DB-007 헬퍼 + ScoreTrend Zod + FR-Q-006 sufficiency 단위 테스트.

import { describe, it, expect } from "vitest";
import {
  getCurrentWeekNumber,
  ScoreTrendSchema,
  summarizeWeeklyVariations,
  assessDataSufficiency,
  computeWeekOverWeekDelta,
  previousWeek,
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

describe("computeWeekOverWeekDelta — FR-Q-005 Scenario 4", () => {
  const current = { articulationAvg: 70, linguisticAvg: 70, acousticAvg: 70 };

  it("이번 70 / 직전 70 → delta 0", () => {
    expect(
      computeWeekOverWeekDelta(current, {
        articulationAvg: 70,
        linguisticAvg: 70,
        acousticAvg: 70,
      }),
    ).toBe(0);
  });

  it("이번 70 / 직전 65 → delta +5", () => {
    expect(
      computeWeekOverWeekDelta(current, {
        articulationAvg: 65,
        linguisticAvg: 65,
        acousticAvg: 65,
      }),
    ).toBe(5);
  });

  it("이번 70 / 직전 75 → delta -5 (불안 자극 회피 — 호출 측에서 회색 색상 처리)", () => {
    expect(
      computeWeekOverWeekDelta(current, {
        articulationAvg: 75,
        linguisticAvg: 75,
        acousticAvg: 75,
      }),
    ).toBe(-5);
  });

  it("직전 주 null (0건) → null — UI 비교 카드 미노출", () => {
    expect(computeWeekOverWeekDelta(current, null)).toBeNull();
  });

  it("축별 평균 다른 케이스 — 3축 평균의 평균 비교", () => {
    // 이번 (60+70+80)/3 = 70, 직전 (70+70+70)/3 = 70 → 0
    expect(
      computeWeekOverWeekDelta(
        { articulationAvg: 60, linguisticAvg: 70, acousticAvg: 80 },
        { articulationAvg: 70, linguisticAvg: 70, acousticAvg: 70 },
      ),
    ).toBe(0);
  });

  it("소수점 차이는 정수 반올림", () => {
    // 이번 (71+72+73)/3 = 72, 직전 (70+70+70)/3 = 70 → 2
    expect(
      computeWeekOverWeekDelta(
        { articulationAvg: 71, linguisticAvg: 72, acousticAvg: 73 },
        { articulationAvg: 70, linguisticAvg: 70, acousticAvg: 70 },
      ),
    ).toBe(2);
  });
});

describe("previousWeek — ISO 주차 단순 감소", () => {
  it("주차 2 이상은 단순 -1", () => {
    expect(previousWeek(2026, 20)).toEqual({ year: 2026, week: 19 });
    expect(previousWeek(2026, 2)).toEqual({ year: 2026, week: 1 });
  });

  it("주차 1 → 직전 해 W52 로 단순 폴백", () => {
    expect(previousWeek(2026, 1)).toEqual({ year: 2025, week: 52 });
  });
});

describe("ScoreTrendSchema — FR-Q-LIT-02 errorPattern optional", () => {
  const base = {
    date: "2026-05-12",
    phoneme: "ㅅ",
    articulation: 80,
    linguistic: 75,
    acoustic: 70,
    peerPercentile: 65,
  };

  it("errorPattern 부재 entry 통과 (레거시 비파괴)", () => {
    expect(() => ScoreTrendSchema.parse([base])).not.toThrow();
  });

  it("errorPattern 있는 entry 통과", () => {
    const data = [
      { ...base, errorPattern: { label: "마찰음 파열음화", classification: "developmental" } },
    ];
    expect(() => ScoreTrendSchema.parse(data)).not.toThrow();
  });

  it("잘못된 classification 차단", () => {
    const data = [{ ...base, errorPattern: { label: "x", classification: "bogus" } }];
    expect(() => ScoreTrendSchema.parse(data)).toThrow();
  });
});

describe("summarizeWeeklyVariations — FR-Q-LIT-02", () => {
  const base = {
    date: "2026-05-12",
    phoneme: "ㅅ",
    articulation: 80,
    linguistic: 75,
    acoustic: 70,
    peerPercentile: 65,
  };

  it("errorPattern 없으면 detectedSessions 0 + 빈 요약", () => {
    expect(summarizeWeeklyVariations([base, base])).toEqual({
      detectedSessions: 0,
      topPatterns: [],
      hasDelayed: false,
    });
  });

  it("라벨별 빈도 내림차순 + delayed 분류 → hasDelayed true", () => {
    const trend = [
      { ...base, errorPattern: { label: "마찰음 파열음화", classification: "developmental" } as const },
      { ...base, errorPattern: { label: "마찰음 파열음화", classification: "developmental" } as const },
      { ...base, errorPattern: { label: "종성 탈락", classification: "developmental_delayed" } as const },
    ];
    const s = summarizeWeeklyVariations(trend);
    expect(s.detectedSessions).toBe(3);
    expect(s.topPatterns[0]).toEqual({ label: "마찰음 파열음화", count: 2 });
    expect(s.topPatterns[1]).toEqual({ label: "종성 탈락", count: 1 });
    expect(s.hasDelayed).toBe(true);
  });

  it("모두 developmental → hasDelayed false", () => {
    const trend = [
      { ...base, errorPattern: { label: "유음 활음화", classification: "developmental" } as const },
    ];
    expect(summarizeWeeklyVariations(trend).hasDelayed).toBe(false);
  });
});

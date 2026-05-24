// FR-C-010 후속 — getCurrentWeekNumber + weekBounds 의 KST 주차 boundary 검증.
//
// 시나리오 (≥ 6):
//   [WTZ1] UTC 토요일 14:59 (KST 토요일 23:59) → 현재 주 (week N)
//   [WTZ2] UTC 토요일 15:00 (KST 일요일 00:00) → 다음 주 (week N+1) — KST 기준 주차 전환
//   [WTZ3] UTC 일요일 14:59 (KST 일요일 23:59) → 동일 주 (week N+1)
//   [WTZ4] UTC 일요일 15:00 (KST 월요일 00:00) → ISO 주차 정의상 새 주 시작
//   [WTZ5] 1월 첫째주 boundary — 2026-01-04 (ISO W01) KST 기준 정합
//   [WTZ6] aggregateWeeklyScores 호출 — weekBounds 가 KST 월요일 00:00 instant 반환
//   [WTZ7] 호출 시그니처 무변경 — default new Date() 호출 정상
//
// ISO 8601 week 정의:
//   - 월요일 = 한 주의 시작.
//   - 1월 4일이 포함된 주 = 1주차.
//   - 본 함수는 KST 일자 기준으로 ISO 주차 산출.

import { describe, it, expect, vi, beforeEach } from "vitest";

const evalFindManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    evaluationResult: {
      findMany: (...args: unknown[]) => evalFindManyMock(...args),
    },
  },
}));

import {
  getCurrentWeekNumber,
  aggregateWeeklyScores,
} from "@/lib/weekly-report";

beforeEach(() => {
  evalFindManyMock.mockReset();
});

describe("getCurrentWeekNumber — KST 기준 ISO 주차 (TZ 통일 PR)", () => {
  it("[WTZ1] UTC 토요일 14:59 (KST 토요일 23:59) → 현재 주차", () => {
    // 2026-05-23 (토) 14:59 UTC = 2026-05-23 23:59 KST → 여전히 토요일 → W21.
    const sat = new Date("2026-05-23T14:59:00.000Z");
    const { year, week } = getCurrentWeekNumber(sat);
    // 2026-05-18 (월) 이 W21 의 시작 → W21.
    expect(year).toBe(2026);
    expect(week).toBe(21);
  });

  it("[WTZ2] UTC 토요일 15:00 (KST 일요일 00:00) → 동일 ISO 주차 (일요일은 ISO 주의 마지막 요일)", () => {
    // 2026-05-23 15:00 UTC = 2026-05-24 00:00 KST (일).
    // ISO 8601 에서 일요일은 같은 주차의 마지막 요일 (월요일이 시작).
    // 즉, 2026-05-24 KST 는 여전히 W21.
    const sun = new Date("2026-05-23T15:00:00.000Z");
    const { year, week } = getCurrentWeekNumber(sun);
    expect(year).toBe(2026);
    expect(week).toBe(21);
  });

  it("[WTZ3] UTC 일요일 14:59 (KST 일요일 23:59) → 동일 주차 (W21)", () => {
    // 2026-05-24 14:59 UTC = 2026-05-24 23:59 KST → 여전히 일요일.
    const sunLate = new Date("2026-05-24T14:59:00.000Z");
    const { year, week } = getCurrentWeekNumber(sunLate);
    expect(year).toBe(2026);
    expect(week).toBe(21);
  });

  it("[WTZ4] UTC 일요일 15:00 (KST 월요일 00:00) → 다음 주차 W22 (ISO 월요일 = 새 주 시작)", () => {
    // 2026-05-24 15:00 UTC = 2026-05-25 00:00 KST (월요일).
    const mon = new Date("2026-05-24T15:00:00.000Z");
    const { year, week } = getCurrentWeekNumber(mon);
    expect(year).toBe(2026);
    expect(week).toBe(22);
  });

  it("[WTZ5] 1월 4일 기준 boundary — KST 2026-01-04 = W01", () => {
    // KST 2026-01-04 00:00 = UTC 2026-01-03 15:00.
    const jan4Kst = new Date("2026-01-03T15:00:00.000Z");
    const { year, week } = getCurrentWeekNumber(jan4Kst);
    expect(year).toBe(2026);
    expect(week).toBe(1);
  });

  it("[WTZ5b] KST 2026-01-03 23:59 (직전 인스턴트) — 직전 ISO 주차 (W53/2025)", () => {
    // KST 2026-01-03 23:59 = UTC 2026-01-03 14:59 → ISO 일자: 2026-01-03 (토).
    // 2026 의 1/4 가 일요일 → 1/4 가 포함된 주의 월요일 = 2025-12-29 → W01 시작은 12-29.
    // 따라서 2026-01-03 (토) 는 W01 에 속함 (월요일 12-29 ~ 일요일 1-04).
    const jan3Kst = new Date("2026-01-03T14:59:00.000Z");
    const { year, week } = getCurrentWeekNumber(jan3Kst);
    expect(year).toBe(2026);
    expect(week).toBe(1);
  });

  it("[WTZ7] 시그니처 무변경 — 인자 없이 호출 시 현재 시각 KST 주차", () => {
    const result = getCurrentWeekNumber();
    expect(typeof result.year).toBe("number");
    expect(typeof result.week).toBe("number");
    expect(result.week).toBeGreaterThanOrEqual(1);
    expect(result.week).toBeLessThanOrEqual(53);
  });
});

describe("aggregateWeeklyScores — weekBounds KST 정합 (TZ 통일 PR)", () => {
  it("[WTZ6] (2026, W21) → gte = UTC 2026-05-17T15:00 (= KST 월요일 5-18 00:00)", async () => {
    evalFindManyMock.mockResolvedValueOnce([]);
    await aggregateWeeklyScores("user-1", 2026, 21);

    const arg = evalFindManyMock.mock.calls[0][0] as {
      where: { createdAt: { gte: Date; lt: Date } };
    };
    // KST W21 = 2026-05-18 (월) ~ 2026-05-24 (일) → KST 월요일 00:00 = UTC 일요일 15:00.
    expect(arg.where.createdAt.gte.toISOString()).toBe("2026-05-17T15:00:00.000Z");
    // KST 다음 월요일 00:00 = UTC 일요일 15:00 + 7d.
    expect(arg.where.createdAt.lt.toISOString()).toBe("2026-05-24T15:00:00.000Z");
  });

  it("[WTZ6b] (2026, W01) → KST 2025-12-29 (월) ~ 2026-01-04 (일)", async () => {
    evalFindManyMock.mockResolvedValueOnce([]);
    await aggregateWeeklyScores("user-1", 2026, 1);

    const arg = evalFindManyMock.mock.calls[0][0] as {
      where: { createdAt: { gte: Date; lt: Date } };
    };
    // KST 2025-12-29 00:00 = UTC 2025-12-28 15:00.
    expect(arg.where.createdAt.gte.toISOString()).toBe("2025-12-28T15:00:00.000Z");
    // KST 2026-01-05 00:00 = UTC 2026-01-04 15:00.
    expect(arg.where.createdAt.lt.toISOString()).toBe("2026-01-04T15:00:00.000Z");
  });
});

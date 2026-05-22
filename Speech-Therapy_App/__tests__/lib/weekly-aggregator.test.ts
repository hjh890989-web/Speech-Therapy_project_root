// FR-C-010 (#33) — lib/reports/weekly-aggregator 단위 테스트 (Prisma mock).
//
// 검증 대상:
//   - W_AUR_MIN_SESSIONS 경계 (≥ 4 → true)
//   - aggregateWeeklyReport: 정상 / 0 row / wAur 경계 / mock 예측 계산
//   - upsertWeeklyReport: where 복합 키 / create vs update payload / 멱등 재호출
//   - getActiveUsers: distinct userId 매핑
//   - computeMockPredictedScore: 0~100 클램프 / 평균 + 5 정확성
//
// 본 모듈은 lib/weekly-report 의 aggregateWeeklyScores 를 prisma mock 으로 간접 검증.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Prisma mock — evaluationResult.findMany + weeklyReport.upsert 만 사용.
const evaluationResultFindManyMock = vi.fn();
const weeklyReportUpsertMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    evaluationResult: {
      findMany: (...args: unknown[]) => evaluationResultFindManyMock(...args),
    },
    weeklyReport: {
      upsert: (...args: unknown[]) => weeklyReportUpsertMock(...args),
    },
  },
}));

import {
  W_AUR_MIN_SESSIONS,
  aggregateWeeklyReport,
  upsertWeeklyReport,
  getActiveUsers,
  computeMockPredictedScore,
  type WeeklyReportData,
} from "@/lib/reports/weekly-aggregator";

beforeEach(() => {
  evaluationResultFindManyMock.mockReset();
  weeklyReportUpsertMock.mockReset();
});

// ----- 헬퍼 -----
function makeRow(
  userId: string,
  isoDate: string,
  articulation: number,
  linguistic: number,
  acoustic: number,
  peerPercentile = 50,
) {
  return {
    id: `er-${userId}-${isoDate}`,
    userId,
    createdAt: new Date(`${isoDate}T12:00:00Z`),
    targetPhoneme: "ㅅ",
    articulationScore: articulation,
    linguisticScore: linguistic,
    acousticScore: acoustic,
    peerPercentile,
  };
}

// ============================================================================
// 1. W-AUR 임계값 상수
// ============================================================================
describe("FR-C-010 — W_AUR_MIN_SESSIONS source of truth", () => {
  it("주 4회 이상 = W-AUR 충족 기준", () => {
    expect(W_AUR_MIN_SESSIONS).toBe(4);
  });
});

// ============================================================================
// 2. aggregateWeeklyReport — 정상 / 경계 / null
// ============================================================================
describe("aggregateWeeklyReport", () => {
  it("정상 1 user / 5 row → wAurAchieved=true + 평균 + mock 예측 계산", async () => {
    evaluationResultFindManyMock.mockResolvedValueOnce([
      makeRow("user-1", "2026-05-18", 80, 70, 75),
      makeRow("user-1", "2026-05-19", 82, 72, 77),
      makeRow("user-1", "2026-05-20", 84, 74, 79),
      makeRow("user-1", "2026-05-21", 86, 76, 81),
      makeRow("user-1", "2026-05-22", 88, 78, 83),
    ]);

    const data = await aggregateWeeklyReport({
      userId: "user-1",
      year: 2026,
      weekNumber: 20,
    });

    expect(data).not.toBeNull();
    expect(data!.userId).toBe("user-1");
    expect(data!.sessionCount).toBe(5);
    expect(data!.wAurAchieved).toBe(true);
    expect(data!.articulationAvg).toBeCloseTo(84, 6); // (80+82+84+86+88)/5
    expect(data!.linguisticAvg).toBeCloseTo(74, 6);
    expect(data!.acousticAvg).toBeCloseTo(79, 6);
    // mock 예측: (84+74+79)/3 + 5 = 79 + 5 = 84
    expect(data!.predictedNextScore).toBeCloseTo(84, 1);
    expect(data!.scoreTrend).toHaveLength(5);
  });

  it("0 session → null (FR-Q-006 EmptyState 분기 책임을 호출 측에 위임)", async () => {
    evaluationResultFindManyMock.mockResolvedValueOnce([]);
    const data = await aggregateWeeklyReport({
      userId: "user-empty",
      year: 2026,
      weekNumber: 20,
    });
    expect(data).toBeNull();
  });

  it("경계 — sessionCount 4 → wAurAchieved=true (포함 경계)", async () => {
    evaluationResultFindManyMock.mockResolvedValueOnce([
      makeRow("u", "2026-05-18", 70, 70, 70),
      makeRow("u", "2026-05-19", 70, 70, 70),
      makeRow("u", "2026-05-20", 70, 70, 70),
      makeRow("u", "2026-05-21", 70, 70, 70),
    ]);
    const data = await aggregateWeeklyReport({ userId: "u", year: 2026, weekNumber: 20 });
    expect(data!.sessionCount).toBe(4);
    expect(data!.wAurAchieved).toBe(true);
  });

  it("경계 — sessionCount 3 → wAurAchieved=false (직전 경계)", async () => {
    evaluationResultFindManyMock.mockResolvedValueOnce([
      makeRow("u", "2026-05-18", 70, 70, 70),
      makeRow("u", "2026-05-19", 70, 70, 70),
      makeRow("u", "2026-05-20", 70, 70, 70),
    ]);
    const data = await aggregateWeeklyReport({ userId: "u", year: 2026, weekNumber: 20 });
    expect(data!.sessionCount).toBe(3);
    expect(data!.wAurAchieved).toBe(false);
  });

  it("경계 — sessionCount 5 → wAurAchieved=true (충분히 초과)", async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow("u", `2026-05-${18 + i}`, 60, 60, 60),
    );
    evaluationResultFindManyMock.mockResolvedValueOnce(rows);
    const data = await aggregateWeeklyReport({ userId: "u", year: 2026, weekNumber: 20 });
    expect(data!.sessionCount).toBe(5);
    expect(data!.wAurAchieved).toBe(true);
  });

  it("R4 — 반환 객체에 자녀 식별 정보 (이메일/이름) 미포함", async () => {
    evaluationResultFindManyMock.mockResolvedValueOnce([
      makeRow("user-x", "2026-05-19", 80, 70, 75),
    ]);
    const data = await aggregateWeeklyReport({ userId: "user-x", year: 2026, weekNumber: 20 });
    const keys = Object.keys(data!);
    expect(keys).not.toContain("email");
    expect(keys).not.toContain("name");
    expect(keys).not.toContain("childName");
  });
});

// ============================================================================
// 3. computeMockPredictedScore — FR-C-011 통합 전 placeholder
// ============================================================================
describe("computeMockPredictedScore — mock 예측 (FR-C-011 placeholder)", () => {
  it("평균 70 → 75 (단순 +5)", () => {
    expect(
      computeMockPredictedScore({
        articulationAvg: 70,
        linguisticAvg: 70,
        acousticAvg: 70,
      }),
    ).toBe(75);
  });

  it("평균 50 → 55", () => {
    expect(
      computeMockPredictedScore({
        articulationAvg: 50,
        linguisticAvg: 50,
        acousticAvg: 50,
      }),
    ).toBe(55);
  });

  it("축별 평균이 다른 케이스 — 3축 평균의 평균 + 5", () => {
    // (60+70+80)/3 + 5 = 70 + 5 = 75
    expect(
      computeMockPredictedScore({
        articulationAvg: 60,
        linguisticAvg: 70,
        acousticAvg: 80,
      }),
    ).toBe(75);
  });

  it("100 클램프 — 평균 96 → 100 (95+5 가 아닌 max 100)", () => {
    expect(
      computeMockPredictedScore({
        articulationAvg: 96,
        linguisticAvg: 96,
        acousticAvg: 96,
      }),
    ).toBe(100);
  });

  it("0 클램프 — 평균 -100 → 0 (음수 가설 방어)", () => {
    // 일반 상황은 0~100 이지만 호출 측 ZodGuard 가 없을 가능성 대비.
    expect(
      computeMockPredictedScore({
        articulationAvg: -100,
        linguisticAvg: -100,
        acousticAvg: -100,
      }),
    ).toBe(0);
  });
});

// ============================================================================
// 4. upsertWeeklyReport — 멱등 패턴 검증
// ============================================================================
describe("upsertWeeklyReport — 멱등 (수동 재실행 안전)", () => {
  const sample: WeeklyReportData = {
    userId: "user-z",
    year: 2026,
    weekNumber: 20,
    scoreTrend: [
      {
        date: "2026-05-19",
        phoneme: "ㅅ",
        articulation: 80,
        linguistic: 70,
        acoustic: 75,
        peerPercentile: 60,
      },
    ],
    articulationAvg: 80,
    linguisticAvg: 70,
    acousticAvg: 75,
    peerPercentileAvg: 60,
    sessionCount: 1,
    wAurAchieved: false,
    predictedNextScore: 80,
  };

  it("upsert 1회 호출 — where 복합 키 + create/update 양쪽 동일 payload", async () => {
    weeklyReportUpsertMock.mockResolvedValue({ id: "wr-1" });
    await upsertWeeklyReport(sample);

    expect(weeklyReportUpsertMock).toHaveBeenCalledTimes(1);
    const arg = weeklyReportUpsertMock.mock.calls[0][0] as {
      where: { userId_year_weekNumber: { userId: string; year: number; weekNumber: number } };
      create: { userId: string; year: number; weekNumber: number; sessionCount: number };
      update: { sessionCount: number; generatedAt: Date };
    };

    expect(arg.where.userId_year_weekNumber).toEqual({
      userId: "user-z",
      year: 2026,
      weekNumber: 20,
    });
    expect(arg.create.userId).toBe("user-z");
    expect(arg.create.sessionCount).toBe(1);
    expect(arg.update.sessionCount).toBe(1);
    // update path 에서만 generatedAt 갱신 (create 는 default).
    expect(arg.update.generatedAt).toBeInstanceOf(Date);
  });

  it("멱등 — 동일 데이터로 2회 호출해도 upsert 호출만 2회 (DB 가 unique 키로 update path 선택)", async () => {
    weeklyReportUpsertMock.mockResolvedValue({ id: "wr-1" });
    await upsertWeeklyReport(sample);
    await upsertWeeklyReport(sample);
    expect(weeklyReportUpsertMock).toHaveBeenCalledTimes(2);
    // 두 호출 모두 동일한 where 키 (DB 가 update path 처리 — 본 단위는 호출 표면만 검증).
    const calls = weeklyReportUpsertMock.mock.calls.map(
      (c) => (c[0] as { where: { userId_year_weekNumber: { userId: string } } }).where.userId_year_weekNumber.userId,
    );
    expect(calls).toEqual(["user-z", "user-z"]);
  });
});

// ============================================================================
// 5. getActiveUsers — distinct userId 매핑
// ============================================================================
describe("getActiveUsers — 활성 사용자 식별", () => {
  it("findMany distinct 결과를 userId[] 로 매핑", async () => {
    evaluationResultFindManyMock.mockResolvedValueOnce([
      { userId: "user-a" },
      { userId: "user-b" },
      { userId: "user-c" },
    ]);
    const start = new Date("2026-05-18T00:00:00Z");
    const end = new Date("2026-05-25T00:00:00Z");
    const users = await getActiveUsers(start, end);
    expect(users).toEqual(["user-a", "user-b", "user-c"]);

    // findMany 인자 검증 — distinct + select + createdAt 범위.
    const arg = evaluationResultFindManyMock.mock.calls[0][0] as {
      where: { createdAt: { gte: Date; lt: Date } };
      select: { userId: boolean };
      distinct: ("userId")[];
    };
    expect(arg.where.createdAt.gte).toEqual(start);
    expect(arg.where.createdAt.lt).toEqual(end);
    expect(arg.distinct).toEqual(["userId"]);
    expect(arg.select.userId).toBe(true);
  });

  it("활성 user 0 → 빈 배열", async () => {
    evaluationResultFindManyMock.mockResolvedValueOnce([]);
    const users = await getActiveUsers(new Date(), new Date());
    expect(users).toEqual([]);
  });
});

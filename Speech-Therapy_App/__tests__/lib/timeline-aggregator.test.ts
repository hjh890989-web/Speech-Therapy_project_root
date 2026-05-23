// FR-Q-013 (#54) — loadUserTimeline + 그룹/시각 helper 단위 테스트 (Prisma mock).
//
// 검증 시나리오:
//   1. 정상 — diagnose + mission 모두 존재 → merge + sort desc + flags 정합
//   2. 빈 userId → Prisma 호출 0 + zero state
//   3. 빈 데이터 — entries=[], flags false
//   4. diagnose 만 보유 → hasMissionData=false
//   5. mission 만 보유 → hasDiagnoseData=false
//   6. cross-user 보호 — where.userId 가 정확히 입력값만 전달
//   7. classifyEntryGroup — today / yesterday / thisWeek / older 4분기
//   8. groupEntriesByDate — partition 결과 + 빈 그룹 빈 배열
//   9. formatTimelineRelative — 그룹별 카피 (오늘 HH:mm / 어제 HH:mm / N일 전 / M월 D일)
//   10. limit 파라미터 — take 가 입력값으로 전달
//   11. SessionLog 필터 — missionId not null (진단 세션 SessionLog 제외)

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================
const evalFindManyMock = vi.fn();
const sessionFindManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    evaluationResult: {
      findMany: (...args: unknown[]) => evalFindManyMock(...args),
    },
    sessionLog: {
      findMany: (...args: unknown[]) => sessionFindManyMock(...args),
    },
  },
}));

import {
  loadUserTimeline,
  TIMELINE_DEFAULT_LIMIT,
  classifyEntryGroup,
  groupEntriesByDate,
  formatTimelineRelative,
  TIMELINE_GROUP_ORDER,
  TIMELINE_GROUP_LABEL,
  type TimelineEntry,
} from "@/lib/timeline/aggregator";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function resetAll() {
  evalFindManyMock.mockReset();
  sessionFindManyMock.mockReset();
}

beforeEach(() => {
  resetAll();
});

describe("loadUserTimeline — FR-Q-013 통합 타임라인 집계", () => {
  it("[1] 정상 — diagnose + mission 모두 존재 → merge + sort desc + flags", async () => {
    const now = Date.now();
    const d1 = new Date(now - 1000); // 가장 최근
    const d2 = new Date(now - 5000);
    const d3 = new Date(now - 10_000);
    const d4 = new Date(now - 20_000);

    evalFindManyMock.mockResolvedValueOnce([
      {
        id: "e1",
        createdAt: d1,
        articulationScore: 80,
        linguisticScore: 75,
        acousticScore: 70,
        targetPhoneme: "ㅅ",
      },
      {
        id: "e2",
        createdAt: d3,
        articulationScore: 60,
        linguisticScore: 55,
        acousticScore: 65,
        targetPhoneme: "ㄱ",
      },
    ]);
    sessionFindManyMock.mockResolvedValueOnce([
      { id: "s1", createdAt: d2, missionId: "m1", durationSec: 120 },
      { id: "s2", createdAt: d4, missionId: "m2", durationSec: 90 },
    ]);

    const data = await loadUserTimeline(USER_A);

    expect(data.userId).toBe(USER_A);
    expect(data.totalCount).toBe(4);
    expect(data.hasDiagnoseData).toBe(true);
    expect(data.hasMissionData).toBe(true);
    // desc by createdAt: e1 (d1) > s1 (d2) > e2 (d3) > s2 (d4)
    expect(data.entries.map((e) => e.id)).toEqual(["e1", "s1", "e2", "s2"]);
    expect(data.entries[0]).toMatchObject({ kind: "diagnose", targetPhoneme: "ㅅ" });
    expect(data.entries[1]).toMatchObject({ kind: "mission", durationSec: 120 });
  });

  it("[2] 빈 userId → Prisma 호출 0 + zero state", async () => {
    const data = await loadUserTimeline("");

    expect(evalFindManyMock).not.toHaveBeenCalled();
    expect(sessionFindManyMock).not.toHaveBeenCalled();
    expect(data.userId).toBe("");
    expect(data.entries).toEqual([]);
    expect(data.totalCount).toBe(0);
    expect(data.hasDiagnoseData).toBe(false);
    expect(data.hasMissionData).toBe(false);
  });

  it("[3] 빈 데이터 — entries=[], flags false", async () => {
    evalFindManyMock.mockResolvedValueOnce([]);
    sessionFindManyMock.mockResolvedValueOnce([]);

    const data = await loadUserTimeline(USER_A);

    expect(data.entries).toEqual([]);
    expect(data.totalCount).toBe(0);
    expect(data.hasDiagnoseData).toBe(false);
    expect(data.hasMissionData).toBe(false);
  });

  it("[4] diagnose 만 보유 → hasMissionData=false", async () => {
    evalFindManyMock.mockResolvedValueOnce([
      {
        id: "e1",
        createdAt: new Date(),
        articulationScore: 70,
        linguisticScore: 70,
        acousticScore: 70,
        targetPhoneme: "ㅅ",
      },
    ]);
    sessionFindManyMock.mockResolvedValueOnce([]);

    const data = await loadUserTimeline(USER_A);

    expect(data.hasDiagnoseData).toBe(true);
    expect(data.hasMissionData).toBe(false);
    expect(data.totalCount).toBe(1);
  });

  it("[5] mission 만 보유 → hasDiagnoseData=false", async () => {
    evalFindManyMock.mockResolvedValueOnce([]);
    sessionFindManyMock.mockResolvedValueOnce([
      { id: "s1", createdAt: new Date(), missionId: "m1", durationSec: 60 },
    ]);

    const data = await loadUserTimeline(USER_A);

    expect(data.hasDiagnoseData).toBe(false);
    expect(data.hasMissionData).toBe(true);
    expect(data.totalCount).toBe(1);
  });

  it("[6] cross-user 보호 — where.userId 가 정확히 입력값만 (다른 userId 미등장)", async () => {
    evalFindManyMock.mockResolvedValueOnce([]);
    sessionFindManyMock.mockResolvedValueOnce([]);

    await loadUserTimeline(USER_A);

    const evalArg = evalFindManyMock.mock.calls[0][0];
    const sessArg = sessionFindManyMock.mock.calls[0][0];

    expect(evalArg.where.userId).toBe(USER_A);
    expect(sessArg.where.userId).toBe(USER_A);

    const allCalls = JSON.stringify([
      ...evalFindManyMock.mock.calls,
      ...sessionFindManyMock.mock.calls,
    ]);
    expect(allCalls).not.toContain(USER_B);
  });

  it("[10] limit 파라미터 — take 가 입력값으로 전달", async () => {
    evalFindManyMock.mockResolvedValueOnce([]);
    sessionFindManyMock.mockResolvedValueOnce([]);

    await loadUserTimeline(USER_A, 10);

    expect(evalFindManyMock.mock.calls[0][0].take).toBe(10);
    expect(sessionFindManyMock.mock.calls[0][0].take).toBe(10);

    // default 검증
    resetAll();
    evalFindManyMock.mockResolvedValueOnce([]);
    sessionFindManyMock.mockResolvedValueOnce([]);
    await loadUserTimeline(USER_A);
    expect(evalFindManyMock.mock.calls[0][0].take).toBe(TIMELINE_DEFAULT_LIMIT);
  });

  it("[11] SessionLog 필터 — missionId not null (진단 세션 SessionLog 제외)", async () => {
    evalFindManyMock.mockResolvedValueOnce([]);
    sessionFindManyMock.mockResolvedValueOnce([]);

    await loadUserTimeline(USER_A);

    const sessArg = sessionFindManyMock.mock.calls[0][0];
    // missionId: { not: null } 가 where 에 포함되어 진단 세션을 제외.
    expect(sessArg.where.missionId).toEqual({ not: null });
  });
});

describe("classifyEntryGroup — 날짜 그루핑 정책", () => {
  // 로컬 TZ 의존 — Date 생성자로 local time 구성 (TZ 가 어떤 곳이든 일관).
  it("[7] today / yesterday / thisWeek / older 4 분기 정확", () => {
    const now = new Date(2026, 4, 23, 14, 30, 0, 0); // 2026-05-23 14:30 local

    // today: 오늘 자정~오늘 23:59
    const todayStart = new Date(2026, 4, 23, 0, 0, 0, 0);
    const todayLate = new Date(2026, 4, 23, 23, 0, 0, 0);
    expect(classifyEntryGroup(todayStart, now)).toBe("today");
    expect(classifyEntryGroup(todayLate, now)).toBe("today");

    // yesterday: 어제 자정~오늘 자정 직전
    const yesterdayLate = new Date(2026, 4, 22, 23, 59, 59, 0);
    const yesterdayStart = new Date(2026, 4, 22, 0, 0, 0, 0);
    expect(classifyEntryGroup(yesterdayLate, now)).toBe("yesterday");
    expect(classifyEntryGroup(yesterdayStart, now)).toBe("yesterday");

    // thisWeek: 어제 자정 직전~오늘 -7d 자정 사이
    const thisWeekRecent = new Date(2026, 4, 21, 15, 0, 0, 0);
    const thisWeekBoundary = new Date(2026, 4, 16, 0, 0, 0, 0);
    expect(classifyEntryGroup(thisWeekRecent, now)).toBe("thisWeek");
    expect(classifyEntryGroup(thisWeekBoundary, now)).toBe("thisWeek");

    // older: 오늘 -7d 자정 이전
    const olderBoundary = new Date(2026, 4, 15, 23, 0, 0, 0);
    const olderFar = new Date(2026, 0, 1, 0, 0, 0, 0);
    expect(classifyEntryGroup(olderBoundary, now)).toBe("older");
    expect(classifyEntryGroup(olderFar, now)).toBe("older");
  });

  it("default now 인자 — 호출 즉시 today 분류 (자정 이전 호출 가정)", () => {
    // 호출 시점 + 1초 미래는 today.
    const ahead = new Date(Date.now() + 1000);
    expect(classifyEntryGroup(ahead)).toBe("today");
  });
});

describe("groupEntriesByDate — partition + 그룹 라벨 / 순서", () => {
  it("[8] partition 결과 + 빈 그룹 빈 배열", () => {
    const now = new Date(2026, 4, 23, 14, 30, 0, 0);
    const entries: TimelineEntry[] = [
      {
        kind: "diagnose",
        id: "e1",
        createdAt: new Date(2026, 4, 23, 10, 0, 0, 0),
        articulationScore: 80,
        linguisticScore: 70,
        acousticScore: 65,
        targetPhoneme: "ㅅ",
      },
      {
        kind: "mission",
        id: "s1",
        createdAt: new Date(2026, 4, 22, 10, 0, 0, 0),
        missionId: "m1",
        durationSec: 60,
      },
      {
        kind: "mission",
        id: "s2",
        createdAt: new Date(2026, 4, 19, 10, 0, 0, 0),
        missionId: "m1",
        durationSec: 60,
      },
      // older 그룹 entry 없음
    ];

    const groups = groupEntriesByDate(entries, now);

    expect(groups.today.map((e) => e.id)).toEqual(["e1"]);
    expect(groups.yesterday.map((e) => e.id)).toEqual(["s1"]);
    expect(groups.thisWeek.map((e) => e.id)).toEqual(["s2"]);
    expect(groups.older).toEqual([]);
  });

  it("그룹 라벨 / 순서 상수 정합", () => {
    expect(TIMELINE_GROUP_ORDER).toEqual(["today", "yesterday", "thisWeek", "older"]);
    expect(TIMELINE_GROUP_LABEL.today).toBe("오늘");
    expect(TIMELINE_GROUP_LABEL.yesterday).toBe("어제");
    expect(TIMELINE_GROUP_LABEL.thisWeek).toBe("이번 주");
    expect(TIMELINE_GROUP_LABEL.older).toBe("이전");
  });
});

describe("formatTimelineRelative — 상대 시각 카피", () => {
  it("[9] today → '오늘 HH:mm'", () => {
    const now = new Date(2026, 4, 23, 14, 30, 0, 0);
    const at = new Date(2026, 4, 23, 9, 5, 0, 0);
    const label = formatTimelineRelative(at, now);
    expect(label).toMatch(/^오늘 \d{2}:\d{2}$/);
  });

  it("yesterday → '어제 HH:mm'", () => {
    const now = new Date(2026, 4, 23, 14, 30, 0, 0);
    const yesterday = new Date(2026, 4, 22, 20, 15, 0, 0);
    expect(formatTimelineRelative(yesterday, now)).toMatch(/^어제 \d{2}:\d{2}$/);
  });

  it("thisWeek → 'N일 전'", () => {
    const now = new Date(2026, 4, 23, 14, 30, 0, 0);
    // 3일 전.
    const past = new Date(2026, 4, 20, 10, 0, 0, 0);
    expect(formatTimelineRelative(past, now)).toBe("3일 전");
  });

  it("older → 'M월 D일'", () => {
    const now = new Date(2026, 4, 23, 14, 30, 0, 0);
    const old = new Date(2026, 0, 15, 10, 0, 0, 0);
    expect(formatTimelineRelative(old, now)).toMatch(/^\d+월 \d+일$/);
  });

  it("CON-04 — 모든 분기 카피에 의료 금칙어 0건", () => {
    const now = new Date(2026, 4, 23, 14, 30, 0, 0);
    const dates = [
      new Date(now),
      new Date(2026, 4, 22, 10, 0, 0, 0), // yesterday
      new Date(2026, 4, 20, 10, 0, 0, 0), // 3일 전
      new Date(2026, 3, 15, 10, 0, 0, 0), // older
    ];
    for (const d of dates) {
      const label = formatTimelineRelative(d, now);
      for (const word of ["치료", "진단", "장애"]) {
        expect(label).not.toContain(word);
      }
    }
  });
});

// FR-NAV-BADGE — parent 의 "미션" 메뉴 오늘 미완료 badge 카운트 단위 테스트.
//
// 격리:
//   - @/lib/db.prisma.sessionLog.count mock
//   - 다른 mock 은 nav-badge-counts.test.ts 와 동일 (별도 파일이라 module isolation 자연 보장)
//
// "오늘 미완료" 정의 (옵션 A):
//   - missionId != null (진단 세션 제외)
//   - startTime >= kstStartOfDay(now)
//   - durationSec <= 0 (funnel.ts 의 mission_completed = `durationSec > 0` 부정)
//
// 검증 시나리오 (총 7건):
//   1) parent + 오늘 미완료 3건 → missionPendingToday=3
//   2) parent + 오늘 미완료 0건 (모두 완료) → 0
//   3) parent + userId=null → 0 (R4 가드, query skip)
//   4) parent + DB error → 0 graceful (count throws)
//   5) parent + KST boundary — kstStartOfDay 결과가 query 의 gte 로 정확히 전달
//   6) admin / teacher / principal / expert → missionPendingToday=0 + sessionLog.count 미호출
//   7) where clause 매핑 — userId / missionId not null / durationSec lte 0 검증

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sessionLogCountMock = vi.fn();
const hitlCountMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    hITLQueue: {
      count: (...args: unknown[]) => hitlCountMock(...args),
    },
    user: {
      findUnique: vi.fn(),
    },
    sessionLog: {
      count: (...args: unknown[]) => sessionLogCountMock(...args),
    },
  },
}));

import { getNavBadgeCounts } from "@/lib/nav/badge-counts";
import { kstStartOfDay } from "@/lib/timeline/tz";

beforeEach(() => {
  sessionLogCountMock.mockReset();
  hitlCountMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getNavBadgeCounts — parent missionPendingToday (FR-NAV-BADGE 후속)", () => {
  it("[1] parent + 오늘 미완료 3건 → missionPendingToday=3", async () => {
    sessionLogCountMock.mockResolvedValueOnce(3);
    const out = await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: "parent-1",
    });
    expect(out).toEqual({ hitlPending: 0, missionPendingToday: 3 });
    expect(sessionLogCountMock).toHaveBeenCalledTimes(1);
  });

  it("[2] parent + 오늘 모두 완료 (count=0) → missionPendingToday=0", async () => {
    sessionLogCountMock.mockResolvedValueOnce(0);
    const out = await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: "parent-2",
    });
    expect(out.missionPendingToday).toBe(0);
    expect(out.hitlPending).toBe(0);
  });

  it("[3] parent + userId=null → 0 graceful (R4 가드, query skip)", async () => {
    const out = await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: null,
    });
    expect(out).toEqual({ hitlPending: 0, missionPendingToday: 0 });
    expect(sessionLogCountMock).not.toHaveBeenCalled();
  });

  it("[4] parent + DB error → 0 graceful (count throws)", async () => {
    sessionLogCountMock.mockRejectedValueOnce(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: "parent-err",
    });
    expect(out).toEqual({ hitlPending: 0, missionPendingToday: 0 });
    expect(errSpy).toHaveBeenCalled();
  });

  it("[5] parent + KST 자정 boundary → kstStartOfDay(now) 가 query.gte 로 전달", async () => {
    sessionLogCountMock.mockResolvedValueOnce(1);
    const before = kstStartOfDay(new Date());
    await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: "parent-kst",
    });
    const after = kstStartOfDay(new Date());

    const args = sessionLogCountMock.mock.calls[0]![0] as {
      where: {
        userId: string;
        missionId: { not: null };
        startTime: { gte: Date };
        durationSec: { lte: number };
      };
    };
    // kstStartOfDay 는 동일 자정 instant 를 반환 (현재 시각 무관, 자정 분기에서만 변경).
    expect(args.where.startTime.gte.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(args.where.startTime.gte.getTime()).toBeLessThanOrEqual(
      after.getTime(),
    );
    // UTC 기준으로는 KST 자정 = 전날 15:00:00.000Z 가 되어야 함.
    expect(args.where.startTime.gte.getUTCHours()).toBe(15);
    expect(args.where.startTime.gte.getUTCMinutes()).toBe(0);
    expect(args.where.startTime.gte.getUTCSeconds()).toBe(0);
    expect(args.where.startTime.gte.getUTCMilliseconds()).toBe(0);
  });

  it("[6] non-parent role (admin/teacher/principal/expert) → missionPendingToday=0 + sessionLog.count 미호출", async () => {
    // admin: HITL count 만 호출 (sessionLog 는 미호출).
    hitlCountMock.mockResolvedValue(0);
    for (const role of ["admin", "teacher", "principal", "expert"] as const) {
      sessionLogCountMock.mockReset();
      const out = await getNavBadgeCounts({
        role,
        institutionId: "inst-X",
        userId: "user-x",
      });
      expect(out.missionPendingToday).toBe(0);
      expect(sessionLogCountMock).not.toHaveBeenCalled();
    }
  });

  it("[7] where clause 매핑 — userId / missionId not null / durationSec lte 0", async () => {
    sessionLogCountMock.mockResolvedValueOnce(5);
    await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: "parent-where",
    });
    const args = sessionLogCountMock.mock.calls[0]![0] as {
      where: {
        userId: string;
        missionId: { not: null };
        startTime: { gte: Date };
        durationSec: { lte: number };
      };
    };
    expect(args.where.userId).toBe("parent-where");
    expect(args.where.missionId).toEqual({ not: null });
    expect(args.where.durationSec).toEqual({ lte: 0 });
    expect(args.where.startTime.gte).toBeInstanceOf(Date);
  });

  it("[8] anonymous → missionPendingToday=0 + sessionLog.count 미호출 (회귀 가드)", async () => {
    const out = await getNavBadgeCounts({
      role: "anonymous",
      institutionId: null,
      userId: null,
    });
    expect(out).toEqual({ hitlPending: 0, missionPendingToday: 0 });
    expect(sessionLogCountMock).not.toHaveBeenCalled();
    expect(hitlCountMock).not.toHaveBeenCalled();
  });
});

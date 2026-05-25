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
const weeklyReportCountMock = vi.fn().mockResolvedValue(0);
const consentSignatureCountMock = vi.fn().mockResolvedValue(0);

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
    weeklyReport: {
      count: (...args: unknown[]) => weeklyReportCountMock(...args),
    },
    consentSignature: {
      count: (...args: unknown[]) => consentSignatureCountMock(...args),
    },
  },
}));

import { getNavBadgeCounts } from "@/lib/nav/badge-counts";
import { kstStartOfDay } from "@/lib/timeline/tz";

beforeEach(() => {
  sessionLogCountMock.mockReset();
  hitlCountMock.mockReset();
  weeklyReportCountMock.mockReset();
  weeklyReportCountMock.mockResolvedValue(0);
  consentSignatureCountMock.mockReset();
  consentSignatureCountMock.mockResolvedValue(0);
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
    expect(out).toEqual({
      hitlPending: 0,
      missionPendingToday: 3,
      weeklyReportUnread: 0,
      consentReminderPending: 0,
    });
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
    expect(out).toEqual({
      hitlPending: 0,
      missionPendingToday: 0,
      weeklyReportUnread: 0,
      consentReminderPending: 0,
    });
    expect(sessionLogCountMock).not.toHaveBeenCalled();
    expect(weeklyReportCountMock).not.toHaveBeenCalled();
    expect(consentSignatureCountMock).not.toHaveBeenCalled();
  });

  it("[4] parent + DB error → 0 graceful (count throws)", async () => {
    sessionLogCountMock.mockRejectedValueOnce(new Error("db down"));
    weeklyReportCountMock.mockRejectedValueOnce(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: "parent-err",
    });
    expect(out).toEqual({
      hitlPending: 0,
      missionPendingToday: 0,
      weeklyReportUnread: 0,
      consentReminderPending: 0,
    });
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
    expect(out).toEqual({
      hitlPending: 0,
      missionPendingToday: 0,
      weeklyReportUnread: 0,
      consentReminderPending: 0,
    });
    expect(sessionLogCountMock).not.toHaveBeenCalled();
    expect(hitlCountMock).not.toHaveBeenCalled();
    expect(weeklyReportCountMock).not.toHaveBeenCalled();
    expect(consentSignatureCountMock).not.toHaveBeenCalled();
  });
});

// ============================================================================
// FR-WEEKLY-UNREAD — parent weeklyReportUnread badge 단위 테스트.
// ============================================================================
//
// 검증 시나리오 (8건):
//   [w1] parent + 미열람 WeeklyReport 2건 → weeklyReportUnread=2
//   [w2] parent + 미열람 0건 → 0
//   [w3] parent + userId=null → 0 + weeklyReport.count 미호출
//   [w4] parent + weeklyReport.count error → 0 graceful (mission count 영향 X)
//   [w5] parent + 양쪽 정상 — sessionLog + weeklyReport 둘 다 호출 (Promise.all)
//   [w6] non-parent role → weeklyReportUnread=0 + weeklyReport.count 미호출
//   [w7] anonymous → weeklyReport.count 미호출
//   [w8] where clause 매핑 — userId + viewedAt: null
describe("getNavBadgeCounts — parent weeklyReportUnread (FR-WEEKLY-UNREAD)", () => {
  it("[w1] parent + 미열람 2건 → weeklyReportUnread=2", async () => {
    sessionLogCountMock.mockResolvedValueOnce(0);
    weeklyReportCountMock.mockResolvedValueOnce(2);
    const out = await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: "parent-w1",
    });
    expect(out).toEqual({
      hitlPending: 0,
      missionPendingToday: 0,
      weeklyReportUnread: 2,
      consentReminderPending: 0,
    });
  });

  it("[w2] parent + 미열람 0건 → 0", async () => {
    sessionLogCountMock.mockResolvedValueOnce(0);
    weeklyReportCountMock.mockResolvedValueOnce(0);
    const out = await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: "parent-w2",
    });
    expect(out.weeklyReportUnread).toBe(0);
  });

  it("[w3] parent + userId=null → 0 + weeklyReport.count 미호출", async () => {
    const out = await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: null,
    });
    expect(out.weeklyReportUnread).toBe(0);
    expect(weeklyReportCountMock).not.toHaveBeenCalled();
  });

  it("[w4] parent + weeklyReport.count error → 0 graceful (mission count 영향 X)", async () => {
    sessionLogCountMock.mockResolvedValueOnce(3);
    weeklyReportCountMock.mockRejectedValueOnce(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: "parent-w4",
    });
    // missionPendingToday 는 정상 (3), weeklyReportUnread 만 graceful 0.
    expect(out.missionPendingToday).toBe(3);
    expect(out.weeklyReportUnread).toBe(0);
    expect(errSpy).toHaveBeenCalled();
  });

  it("[w5] parent + 양쪽 정상 — sessionLog + weeklyReport 둘 다 호출 (Promise.all)", async () => {
    sessionLogCountMock.mockResolvedValueOnce(2);
    weeklyReportCountMock.mockResolvedValueOnce(1);
    const out = await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: "parent-w5",
    });
    expect(out).toEqual({
      hitlPending: 0,
      missionPendingToday: 2,
      weeklyReportUnread: 1,
      consentReminderPending: 0,
    });
    expect(sessionLogCountMock).toHaveBeenCalledTimes(1);
    expect(weeklyReportCountMock).toHaveBeenCalledTimes(1);
  });

  it("[w6] non-parent role (admin/teacher/principal/expert) → weeklyReportUnread=0 + weeklyReport.count 미호출", async () => {
    hitlCountMock.mockResolvedValue(0);
    for (const role of ["admin", "teacher", "principal", "expert"] as const) {
      weeklyReportCountMock.mockReset();
      weeklyReportCountMock.mockResolvedValue(0);
      const out = await getNavBadgeCounts({
        role,
        institutionId: "inst-X",
        userId: "user-x",
      });
      expect(out.weeklyReportUnread).toBe(0);
      expect(weeklyReportCountMock).not.toHaveBeenCalled();
    }
  });

  it("[w7] anonymous → weeklyReport.count 미호출", async () => {
    const out = await getNavBadgeCounts({
      role: "anonymous",
      institutionId: null,
      userId: null,
    });
    expect(out.weeklyReportUnread).toBe(0);
    expect(weeklyReportCountMock).not.toHaveBeenCalled();
  });

  it("[w8] where clause 매핑 — userId + viewedAt: null", async () => {
    sessionLogCountMock.mockResolvedValueOnce(0);
    weeklyReportCountMock.mockResolvedValueOnce(1);
    await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: "parent-w8",
    });
    const args = weeklyReportCountMock.mock.calls[0]![0] as {
      where: { userId: string; viewedAt: null };
    };
    expect(args.where.userId).toBe("parent-w8");
    expect(args.where.viewedAt).toBeNull();
  });
});

// ============================================================================
// FR-CONSENT-BADGE — parent/principal/teacher/admin 의 미서명 동의서 badge 단위 테스트.
// ============================================================================
//
// 검증 시나리오 (6건):
//   [c1] parent + userEmail + 2건 → consentReminderPending=2 (where: parentEmail+status='pending')
//   [c2] parent + userEmail=null → 0 + consentSignature.count 미호출 (R4 가드)
//   [c3] parent + consentSignature.count error → 0 graceful (mission/weekly 영향 X)
//   [c4] principal + institutionId='inst-X' + 3건 → 3 (institution scope where)
//   [c5] principal + institutionId=null → 0 graceful (query skip — 기존 [7] 와 동일 가드)
//   [c6] admin → 전체 status='pending' 카운트 (institution 무관 where)
describe("getNavBadgeCounts — consentReminderPending (FR-CONSENT-BADGE)", () => {
  it("[c1] parent + userEmail + 2건 → consentReminderPending=2 (where: parentEmail+status='pending')", async () => {
    sessionLogCountMock.mockResolvedValueOnce(0);
    weeklyReportCountMock.mockResolvedValueOnce(0);
    consentSignatureCountMock.mockResolvedValueOnce(2);
    const out = await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: "parent-c1",
      userEmail: "mom@example.com",
    });
    expect(out).toEqual({
      hitlPending: 0,
      missionPendingToday: 0,
      weeklyReportUnread: 0,
      consentReminderPending: 2,
    });
    const args = consentSignatureCountMock.mock.calls[0]![0] as {
      where: { parentEmail: string; status: string };
    };
    expect(args.where.parentEmail).toBe("mom@example.com");
    expect(args.where.status).toBe("pending");
  });

  it("[c2] parent + userEmail=null → 0 + consentSignature.count 미호출 (R4 가드)", async () => {
    sessionLogCountMock.mockResolvedValueOnce(0);
    weeklyReportCountMock.mockResolvedValueOnce(0);
    const out = await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: "parent-c2",
      userEmail: null,
    });
    expect(out.consentReminderPending).toBe(0);
    expect(consentSignatureCountMock).not.toHaveBeenCalled();
  });

  it("[c3] parent + consentSignature.count error → 0 graceful (mission/weekly 영향 X)", async () => {
    sessionLogCountMock.mockResolvedValueOnce(4);
    weeklyReportCountMock.mockResolvedValueOnce(1);
    consentSignatureCountMock.mockRejectedValueOnce(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await getNavBadgeCounts({
      role: "parent",
      institutionId: null,
      userId: "parent-c3",
      userEmail: "dad@example.com",
    });
    // 다른 두 카운트는 정상 보존, consent 만 graceful 0.
    expect(out.missionPendingToday).toBe(4);
    expect(out.weeklyReportUnread).toBe(1);
    expect(out.consentReminderPending).toBe(0);
    expect(errSpy).toHaveBeenCalled();
  });

  it("[c4] principal + institutionId='inst-X' + 3건 → 3 (institution scope where)", async () => {
    hitlCountMock.mockResolvedValueOnce(0);
    consentSignatureCountMock.mockResolvedValueOnce(3);
    const out = await getNavBadgeCounts({
      role: "principal",
      institutionId: "inst-X",
      userId: "principal-c4",
    });
    expect(out.consentReminderPending).toBe(3);
    const args = consentSignatureCountMock.mock.calls[0]![0] as {
      where: { institutionId: string; status: string };
    };
    expect(args.where.institutionId).toBe("inst-X");
    expect(args.where.status).toBe("pending");
  });

  it("[c4b] teacher + institutionId='inst-T' + 1건 → 1 (principal 과 동일 institution scope)", async () => {
    hitlCountMock.mockResolvedValueOnce(0);
    consentSignatureCountMock.mockResolvedValueOnce(1);
    const out = await getNavBadgeCounts({
      role: "teacher",
      institutionId: "inst-T",
      userId: "teacher-c4b",
    });
    expect(out.consentReminderPending).toBe(1);
    const args = consentSignatureCountMock.mock.calls[0]![0] as {
      where: { institutionId: string };
    };
    expect(args.where.institutionId).toBe("inst-T");
  });

  it("[c5] principal + institutionId=null → 0 graceful + consentSignature.count 미호출", async () => {
    const out = await getNavBadgeCounts({
      role: "principal",
      institutionId: null,
      userId: "principal-c5",
    });
    expect(out.consentReminderPending).toBe(0);
    expect(consentSignatureCountMock).not.toHaveBeenCalled();
  });

  it("[c6] admin → 전체 status='pending' 카운트 (institution 무관 where)", async () => {
    hitlCountMock.mockResolvedValueOnce(0);
    consentSignatureCountMock.mockResolvedValueOnce(42);
    const out = await getNavBadgeCounts({
      role: "admin",
      institutionId: null,
      userId: "admin-c6",
    });
    expect(out.consentReminderPending).toBe(42);
    const args = consentSignatureCountMock.mock.calls[0]![0] as {
      where: { status: string; institutionId?: string };
    };
    expect(args.where.status).toBe("pending");
    expect(args.where.institutionId).toBeUndefined();
  });

  it("[c7] expert → consentReminderPending=0 + consentSignature.count 미호출 (관여 안 함)", async () => {
    hitlCountMock.mockResolvedValueOnce(0);
    const out = await getNavBadgeCounts({
      role: "expert",
      institutionId: null,
      userId: "expert-c7",
    });
    expect(out.consentReminderPending).toBe(0);
    expect(consentSignatureCountMock).not.toHaveBeenCalled();
  });

  it("[c8] principal + HITL count OK + consent count error → HITL 유지, consent graceful 0", async () => {
    hitlCountMock.mockResolvedValueOnce(5);
    consentSignatureCountMock.mockRejectedValueOnce(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await getNavBadgeCounts({
      role: "principal",
      institutionId: "inst-c8",
      userId: "principal-c8",
    });
    // HITL 5 보존, consent 만 0 (독립 try/catch 동작 검증).
    expect(out.hitlPending).toBe(5);
    expect(out.consentReminderPending).toBe(0);
    expect(errSpy).toHaveBeenCalled();
  });
});

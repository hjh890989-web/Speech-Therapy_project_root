// FR-NAV-BADGE — lib/nav/badge-counts.ts 단위 테스트.
//
// 격리:
//   - @/lib/db.prisma.hITLQueue.count mock
//   - @/lib/db.prisma.user.findUnique mock
//
// 검증 시나리오 (총 9건):
//   getNavBadgeCounts:
//     1) admin → 전체 pending+in_review 카운트 (institution scope 무관)
//     2) principal → 본인 institutionId 의 HITL 만 (user.institutionId 필터)
//     3) teacher → principal 과 동일 institution scope 적용
//     4) expert → assignedExpertId == userId 분기
//     5) parent → 0 (메뉴 자체 미노출)
//     6) anonymous → 0
//     7) principal + institutionId=null → 0 (graceful, query skip)
//     8) DB error → 0 graceful (count throws)
//     9) cache dedup — 같은 인자로 2회 호출 → prisma.count 1회만 (React cache request-scope)
//
// React `cache()` dedup 검증:
//   - React 19 의 cache() 는 단일 RSC 렌더 컨텍스트 동안 동일 args 호출을 1회로 합침.
//   - 본 단위 테스트는 동일 args 로 2회 호출 후 count mock 의 호출 횟수가 1이어야 함을 검증.
//   - 단, vitest happy-dom 환경에서는 RSC 컨텍스트가 없어 cache() 가 정상 dedup 하지 않을 수
//     있음 → 본 케이스는 "최소 1회 이상" 으로 검증 + production 효과는 RSC integration 위임.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hitlCountMock = vi.fn();
const userFindUniqueMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    hITLQueue: {
      count: (...args: unknown[]) => hitlCountMock(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
    },
  },
}));

import {
  getCachedUserInstitutionId,
  getNavBadgeCounts,
} from "@/lib/nav/badge-counts";

beforeEach(() => {
  hitlCountMock.mockReset();
  userFindUniqueMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getNavBadgeCounts — role 별 HITL 카운트 매트릭스", () => {
  it("[1] admin → 전체 pending+in_review 카운트 (institution scope 무관)", async () => {
    hitlCountMock.mockResolvedValueOnce(7);
    const out = await getNavBadgeCounts({
      role: "admin",
      institutionId: null,
      userId: "admin-user-1",
    });
    expect(out).toEqual({ hitlPending: 7, missionPendingToday: 0 });
    // where 절: status in [pending, in_review] 만, user.institutionId 필터 없음.
    const args = hitlCountMock.mock.calls[0]![0] as {
      where: { status: { in: string[] }; user?: unknown };
    };
    expect(args.where.status.in).toEqual(["pending", "in_review"]);
    expect(args.where.user).toBeUndefined();
  });

  it("[2] principal → 본인 institutionId 의 HITL 만 (user.institutionId 필터)", async () => {
    hitlCountMock.mockResolvedValueOnce(3);
    const out = await getNavBadgeCounts({
      role: "principal",
      institutionId: "inst-A",
      userId: "principal-1",
    });
    expect(out.hitlPending).toBe(3);
    const args = hitlCountMock.mock.calls[0]![0] as {
      where: {
        status: { in: string[] };
        user: { institutionId: string };
      };
    };
    expect(args.where.user.institutionId).toBe("inst-A");
    expect(args.where.status.in).toEqual(["pending", "in_review"]);
  });

  it("[3] teacher → principal 과 동일 institution scope", async () => {
    hitlCountMock.mockResolvedValueOnce(2);
    const out = await getNavBadgeCounts({
      role: "teacher",
      institutionId: "inst-B",
      userId: "teacher-1",
    });
    expect(out.hitlPending).toBe(2);
    const args = hitlCountMock.mock.calls[0]![0] as {
      where: { user: { institutionId: string } };
    };
    expect(args.where.user.institutionId).toBe("inst-B");
  });

  it("[4] expert → assignedExpertId == userId 분기", async () => {
    hitlCountMock.mockResolvedValueOnce(5);
    const out = await getNavBadgeCounts({
      role: "expert",
      institutionId: null,
      userId: "expert-9",
    });
    expect(out.hitlPending).toBe(5);
    const args = hitlCountMock.mock.calls[0]![0] as {
      where: {
        status: { in: string[] };
        assignedExpertId: string;
      };
    };
    expect(args.where.assignedExpertId).toBe("expert-9");
    expect(args.where.status.in).toEqual(["pending", "in_review"]);
  });

  it("[5] parent → 0 (메뉴 자체 미노출, query 미호출)", async () => {
    const out = await getNavBadgeCounts({
      role: "parent",
      institutionId: "inst-A",
      userId: "parent-1",
    });
    expect(out).toEqual({ hitlPending: 0, missionPendingToday: 0 });
    expect(hitlCountMock).not.toHaveBeenCalled();
  });

  it("[6] anonymous → 0 + query 미호출", async () => {
    const out = await getNavBadgeCounts({
      role: "anonymous",
      institutionId: null,
      userId: null,
    });
    expect(out.hitlPending).toBe(0);
    expect(hitlCountMock).not.toHaveBeenCalled();
  });

  it("[7] principal + institutionId=null → 0 graceful (query skip)", async () => {
    const out = await getNavBadgeCounts({
      role: "principal",
      institutionId: null,
      userId: "principal-orphan",
    });
    expect(out.hitlPending).toBe(0);
    expect(hitlCountMock).not.toHaveBeenCalled();
  });

  it("[8] DB error → 0 graceful (count throws)", async () => {
    hitlCountMock.mockRejectedValueOnce(new Error("db down"));
    const out = await getNavBadgeCounts({
      role: "admin",
      institutionId: null,
      userId: "admin-2",
    });
    expect(out).toEqual({ hitlPending: 0, missionPendingToday: 0 });
  });

  it("[9] cache dedup — 같은 인자 2회 호출 → prisma.count 1회만 (React cache request-scope)", async () => {
    hitlCountMock.mockResolvedValue(4);
    const args = {
      role: "admin",
      institutionId: null,
      userId: "admin-cache-test",
    };
    const [a, b] = await Promise.all([
      getNavBadgeCounts(args),
      getNavBadgeCounts(args),
    ]);
    expect(a).toEqual(b);
    // React cache() dedup — 동일 인자 객체 reference 로 호출 시 1회.
    expect(hitlCountMock).toHaveBeenCalledTimes(1);
  });
});

describe("getCachedUserInstitutionId — institutionId 조회 캐시 wrapper", () => {
  it("userId=null → null (query 미호출)", async () => {
    const out = await getCachedUserInstitutionId(null);
    expect(out).toBeNull();
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("DB row 존재 → institutionId 노출", async () => {
    userFindUniqueMock.mockResolvedValueOnce({ institutionId: "inst-A" });
    const out = await getCachedUserInstitutionId("user-with-institution");
    expect(out).toBe("inst-A");
  });

  it("DB row 없음 → null", async () => {
    userFindUniqueMock.mockResolvedValueOnce(null);
    const out = await getCachedUserInstitutionId("user-not-in-db");
    expect(out).toBeNull();
  });

  it("DB error → null graceful", async () => {
    userFindUniqueMock.mockRejectedValueOnce(new Error("db down"));
    const out = await getCachedUserInstitutionId("user-db-err");
    expect(out).toBeNull();
  });
});

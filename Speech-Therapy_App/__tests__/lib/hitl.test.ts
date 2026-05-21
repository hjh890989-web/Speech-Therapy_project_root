// TEST-002 근간 — lib/hitl.ts enqueueForReview 단위 테스트 (Prisma mock).
// FR-C-002 (자동 이관) + TEST-014 (어뷰징 방어 + expert review count) 헬퍼 검증.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Prisma 싱글톤 mock — 실제 DB 호출 차단.
// TEST-014: enqueueForReview 가 upsert → findUnique + create/update 패턴으로 전환됨.
const findUniqueMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const updateManyMock = vi.fn();
const findManyMock = vi.fn();
const countMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    hITLQueue: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      updateMany: (...args: unknown[]) => updateManyMock(...args),
      findMany: (...args: unknown[]) => findManyMock(...args),
      count: (...args: unknown[]) => countMock(...args),
    },
  },
}));

beforeEach(() => {
  findUniqueMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  updateManyMock.mockReset();
  findManyMock.mockReset();
  countMock.mockReset();
});

describe("enqueueForReview (FR-C-002 + TEST-014 sc6 — 어뷰징 방어 통합)", () => {
  it("신규 + abuse 임계 미달 → create pending + slaDueAt = +48h", async () => {
    const { enqueueForReview } = await import("@/lib/hitl");
    findUniqueMock.mockResolvedValue(null); // 신규
    countMock.mockResolvedValue(0); // abuse 0
    createMock.mockResolvedValue({ id: "queue-1", status: "pending" });

    const before = Date.now();
    await enqueueForReview("session-1", "user-1", 65);
    const after = Date.now();

    expect(createMock).toHaveBeenCalledTimes(1);
    const arg = createMock.mock.calls[0][0] as {
      data: { sessionId: string; userId: string; confidenceScore: number; slaDueAt: Date; status: string };
    };
    expect(arg.data.sessionId).toBe("session-1");
    expect(arg.data.userId).toBe("user-1");
    expect(arg.data.confidenceScore).toBe(65);
    expect(arg.data.status).toBe("pending");

    const expectedMin = before + 48 * 60 * 60 * 1000 - 5_000;
    const expectedMax = after + 48 * 60 * 60 * 1000 + 5_000;
    expect(arg.data.slaDueAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(arg.data.slaDueAt.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it("재호출 (existing row) → update 만, abuse 검사 생략", async () => {
    const { enqueueForReview } = await import("@/lib/hitl");
    findUniqueMock.mockResolvedValue({ id: "queue-1", status: "pending" });
    updateMock.mockResolvedValue({ id: "queue-1" });

    await enqueueForReview("session-1", "user-1", 70);

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0]).toMatchObject({
      where: { sessionId: "session-1" },
      data: { confidenceScore: 70 },
    });
    expect(createMock).not.toHaveBeenCalled();
    expect(countMock).not.toHaveBeenCalled();
  });

  it("TEST-014 sc6 — 월 3건 dismissed → 4번째 신규 auto dismissed", async () => {
    const { enqueueForReview, ABUSE_MONTHLY_THRESHOLD } = await import("@/lib/hitl");
    findUniqueMock.mockResolvedValue(null);
    countMock.mockResolvedValue(ABUSE_MONTHLY_THRESHOLD); // 임계 도달
    createMock.mockResolvedValue({ id: "q-abuse", status: "dismissed" });

    await enqueueForReview("session-2", "user-abuse", 55);

    const arg = createMock.mock.calls[0][0];
    expect(arg.data.status).toBe("dismissed");
    expect(arg.data.completedAt).toBeTruthy();
  });
});

describe("escalateOverdueQueues (FR-C-014 24h+ 자동 escalated)", () => {
  it("status=pending + createdAt < now-24h 만 escalated 로 updateMany", async () => {
    const { escalateOverdueQueues } = await import("@/lib/hitl");
    updateManyMock.mockResolvedValue({ count: 2 });

    const now = new Date("2026-05-12T12:00:00Z");
    await escalateOverdueQueues(now);

    expect(updateManyMock).toHaveBeenCalledTimes(1);
    const arg = updateManyMock.mock.calls[0][0] as {
      where: { status: string; createdAt: { lt: Date } };
      data: { status: string; escalatedAt: Date };
    };
    expect(arg.where.status).toBe("pending");
    expect(arg.where.createdAt.lt.getTime()).toBe(now.getTime() - 24 * 60 * 60 * 1000);
    expect(arg.data.status).toBe("escalated");
    expect(arg.data.escalatedAt.getTime()).toBe(now.getTime());
  });
});

describe("findUpcomingSLABreaches (MON-003 알림 기준)", () => {
  it("status=pending + slaDueAt <= now+24h, asc 정렬", async () => {
    const { findUpcomingSLABreaches } = await import("@/lib/hitl");
    findManyMock.mockResolvedValue([]);

    const now = new Date("2026-05-12T12:00:00Z");
    await findUpcomingSLABreaches(24, now);

    expect(findManyMock).toHaveBeenCalledTimes(1);
    const arg = findManyMock.mock.calls[0][0] as {
      where: { status: string; slaDueAt: { lte: Date } };
      orderBy: { slaDueAt: string };
    };
    expect(arg.where.status).toBe("pending");
    expect(arg.where.slaDueAt.lte.getTime()).toBe(now.getTime() + 24 * 60 * 60 * 1000);
    expect(arg.orderBy.slaDueAt).toBe("asc");
  });
});

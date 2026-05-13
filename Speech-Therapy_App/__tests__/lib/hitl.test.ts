// TEST-002 근간 — lib/hitl.ts enqueueForReview 단위 테스트 (Prisma mock).
// FR-C-002 (자동 이관) 구현 전 헬퍼 자체 검증.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Prisma 싱글톤 mock — 실제 DB 호출 차단.
const upsertMock = vi.fn();
const updateManyMock = vi.fn();
const findManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    hITLQueue: {
      upsert: (...args: unknown[]) => upsertMock(...args),
      updateMany: (...args: unknown[]) => updateManyMock(...args),
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

beforeEach(() => {
  upsertMock.mockReset();
  updateManyMock.mockReset();
  findManyMock.mockReset();
});

describe("enqueueForReview (FR-C-002 트리거 헬퍼)", () => {
  it("upsert 호출 1회 + sessionId·userId·confidence + slaDueAt = +48h", async () => {
    const { enqueueForReview } = await import("@/lib/hitl");
    upsertMock.mockResolvedValue({ id: "queue-1" });

    const before = Date.now();
    await enqueueForReview("session-1", "user-1", 65);
    const after = Date.now();

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const arg = upsertMock.mock.calls[0][0] as {
      where: { sessionId: string };
      create: { sessionId: string; userId: string; confidenceScore: number; slaDueAt: Date };
      update: { confidenceScore: number };
    };
    expect(arg.where.sessionId).toBe("session-1");
    expect(arg.create.userId).toBe("user-1");
    expect(arg.create.confidenceScore).toBe(65);
    expect(arg.update.confidenceScore).toBe(65);

    // slaDueAt 가 호출 시점 + 48h 부근인지 (±5초 허용).
    const expectedMin = before + 48 * 60 * 60 * 1000 - 5_000;
    const expectedMax = after + 48 * 60 * 60 * 1000 + 5_000;
    expect(arg.create.slaDueAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(arg.create.slaDueAt.getTime()).toBeLessThanOrEqual(expectedMax);
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

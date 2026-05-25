// DB-011 후속 — loadAuditLogs (audit-aggregator) 단위 테스트.
//
// 검증 시나리오 (≥ 6):
//   [1] 정상 조회 → entries + hasMore=false + nextCursor 없음
//   [2] 필터 조합 (action / actorId / tableName / 날짜) → where 절 정확
//   [3] 빈 결과 → empty array + hasMore=false
//   [4] cursor 사용 → cursor + skip 옵션 정확 전달 + nextCursor 갱신
//   [5] take+1 trick — fetched.length=51 시 visible=50 + hasMore=true + nextCursor=50번째
//   [6] DB error → graceful empty + warn
//   [7] limit override + 상한 (AUDIT_LOGS_MAX_PAGE_SIZE) 적용

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const findManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    auditLog: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

import {
  loadAuditLogs,
  AUDIT_LOGS_PER_PAGE,
  AUDIT_LOGS_MAX_PAGE_SIZE,
  type AuditLogEntry,
} from "@/lib/admin/audit-aggregator";

function makeEntries(count: number, prefix = "audit-"): AuditLogEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${String(i + 1).padStart(4, "0")}`,
    actorId: `actor-${i}`,
    action: i % 2 === 0 ? "consent_sign" : "User_update",
    tableName: "ConsentSignature",
    rowId: `row-${i}`,
    diff: { before: { name: "old" }, after: { name: "new" } },
    createdAt: new Date(Date.UTC(2026, 4, 25, 0, 0, i)),
  }));
}

beforeEach(() => {
  findManyMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadAuditLogs — DB-011 audit 페이지 조회 helper", () => {
  it("[1] 정상 조회 — entries 반환 + hasMore=false + nextCursor 미설정 (50건 이하)", async () => {
    findManyMock.mockResolvedValueOnce(makeEntries(10));

    const result = await loadAuditLogs({});

    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(result.entries).toHaveLength(10);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
  });

  it("[2] 필터 조합 — action / actorId / tableName / 날짜 → where 절 정확", async () => {
    findManyMock.mockResolvedValueOnce([]);

    const from = new Date("2026-05-01T00:00:00.000Z");
    const to = new Date("2026-05-25T23:59:59.999Z");
    await loadAuditLogs({
      action: "consent_sign",
      actorId: "user-uuid-123",
      tableName: "ConsentSignature",
      fromDate: from,
      toDate: to,
    });

    const arg = findManyMock.mock.calls[0][0];
    expect(arg.where.action).toBe("consent_sign");
    expect(arg.where.actorId).toBe("user-uuid-123");
    expect(arg.where.tableName).toBe("ConsentSignature");
    expect(arg.where.createdAt.gte).toEqual(from);
    expect(arg.where.createdAt.lte).toEqual(to);
    // 정렬은 createdAt desc + id desc tiebreaker.
    expect(arg.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
    // take+1 trick — 50+1 fetch.
    expect(arg.take).toBe(AUDIT_LOGS_PER_PAGE + 1);
    expect(arg.cursor).toBeUndefined();
    expect(arg.skip).toBeUndefined();
  });

  it("[2b] 빈/공백 필터 → where 절 미포함 (skip)", async () => {
    findManyMock.mockResolvedValueOnce([]);

    await loadAuditLogs({
      action: "   ",
      actorId: "",
      tableName: undefined,
    });

    const arg = findManyMock.mock.calls[0][0];
    expect(arg.where.action).toBeUndefined();
    expect(arg.where.actorId).toBeUndefined();
    expect(arg.where.tableName).toBeUndefined();
    expect(arg.where.createdAt).toBeUndefined();
  });

  it("[3] 빈 결과 → entries=[] + hasMore=false + nextCursor 미설정", async () => {
    findManyMock.mockResolvedValueOnce([]);

    const result = await loadAuditLogs({ action: "nonexistent" });

    expect(result.entries).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
  });

  it("[4] cursor 사용 → cursor + skip 옵션 정확 전달", async () => {
    findManyMock.mockResolvedValueOnce(makeEntries(5));

    await loadAuditLogs({}, "audit-abc-123");

    const arg = findManyMock.mock.calls[0][0];
    expect(arg.cursor).toEqual({ id: "audit-abc-123" });
    expect(arg.skip).toBe(1);
  });

  it("[4b] 빈/undefined cursor → cursor 옵션 미설정", async () => {
    findManyMock.mockResolvedValueOnce(makeEntries(5));

    await loadAuditLogs({}, "");

    const arg = findManyMock.mock.calls[0][0];
    expect(arg.cursor).toBeUndefined();
    expect(arg.skip).toBeUndefined();
  });

  it("[5] take+1 trick — 51 fetch 시 visible=50 + hasMore=true + nextCursor=50번째 id", async () => {
    const fetched = makeEntries(AUDIT_LOGS_PER_PAGE + 1);
    findManyMock.mockResolvedValueOnce(fetched);

    const result = await loadAuditLogs({});

    expect(result.entries).toHaveLength(AUDIT_LOGS_PER_PAGE);
    expect(result.hasMore).toBe(true);
    // 마지막 노출 row 의 id 가 nextCursor.
    expect(result.nextCursor).toBe(fetched[AUDIT_LOGS_PER_PAGE - 1].id);
  });

  it("[5b] take+1 trick — 정확히 50 fetch 시 visible=50 + hasMore=false", async () => {
    const fetched = makeEntries(AUDIT_LOGS_PER_PAGE);
    findManyMock.mockResolvedValueOnce(fetched);

    const result = await loadAuditLogs({});

    expect(result.entries).toHaveLength(AUDIT_LOGS_PER_PAGE);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
  });

  it("[6] DB error → graceful empty + console.warn (throw X)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    findManyMock.mockRejectedValueOnce(new Error("connection refused"));

    const result = await loadAuditLogs({});

    expect(result.entries).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("AuditLog findMany 실패");
  });

  it("[7] limit override — 사용자 지정 + 상한 (AUDIT_LOGS_MAX_PAGE_SIZE) 적용", async () => {
    findManyMock.mockResolvedValueOnce([]);

    await loadAuditLogs({}, undefined, 10);

    const arg = findManyMock.mock.calls[0][0];
    expect(arg.take).toBe(11); // 10 + 1 (take+1 trick).

    findManyMock.mockResolvedValueOnce([]);
    await loadAuditLogs({}, undefined, 1_000); // 상한 200 초과 시도.

    const arg2 = findManyMock.mock.calls[1][0];
    expect(arg2.take).toBe(AUDIT_LOGS_MAX_PAGE_SIZE + 1);
  });
});

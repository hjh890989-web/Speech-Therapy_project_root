// FR-TZ-UNIFY-EXTEND — GET /api/admin/audit/export 의 KST 일자 boundary 검증.
//
// 시나리오:
//   [TZ1] from=YYYY-MM-DD → fromDate 가 KST 자정 (= UTC 전날 15:00)
//   [TZ2] to=YYYY-MM-DD   → toDate 가 KST 일자의 종일 포함 (= UTC 당일 14:59:59.999)
//   [TZ3] filename — KST 일자 (YYYYMMDD) 라벨 — 사용자 인지 일자 정합
//
// 정책:
//   - export endpoint 의 parseDateParam / parseDateParamEndOfDay 는 admin 페이지와 동일 KST 보정.
//   - toFilenameDate 가 KST 일자로 라벨 (formatKstDate(date).replace('-', '')).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const fromMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  })),
}));

const loadAuditLogsMock = vi.fn();
vi.mock("@/lib/admin/audit-aggregator", () => ({
  loadAuditLogs: (...args: unknown[]) => loadAuditLogsMock(...args),
  AUDIT_LOGS_PER_PAGE: 50,
  AUDIT_LOGS_MAX_PAGE_SIZE: 200,
}));

import { GET } from "@/app/api/admin/audit/export/route";
import { formatKstDate } from "@/lib/timeline/tz";

const ADMIN_USER_ID = "11111111-1111-4111-8111-111111111111";

function setAdmin() {
  getUserMock.mockResolvedValue({
    data: { user: { id: ADMIN_USER_ID, email: "admin@test.local" } },
    error: null,
  });
  const maybeSingleMock = vi
    .fn()
    .mockResolvedValue({ data: { role: "admin" }, error: null });
  const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  fromMock.mockReturnValue({ select: selectMock });
}

function makeRequest(query = "") {
  const url = query
    ? `http://localhost/api/admin/audit/export?${query}`
    : "http://localhost/api/admin/audit/export";
  return new Request(url, { method: "GET" });
}

beforeEach(() => {
  getUserMock.mockReset();
  fromMock.mockReset();
  loadAuditLogsMock.mockReset();
  loadAuditLogsMock.mockResolvedValue({ entries: [], hasMore: false });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/admin/audit/export — FR-TZ-UNIFY-EXTEND KST boundary", () => {
  it("[TZ1] from='2026-05-01' → KST 5-01 00:00 = UTC 4-30 15:00", async () => {
    setAdmin();
    await GET(makeRequest("format=csv&from=2026-05-01"));
    const [filter] = loadAuditLogsMock.mock.calls[0];
    expect(filter.fromDate).toBeInstanceOf(Date);
    expect(filter.fromDate.toISOString()).toBe("2026-04-30T15:00:00.000Z");
  });

  it("[TZ2] to='2026-05-25' → KST 5-25 23:59:59.999 = UTC 5-25 14:59:59.999", async () => {
    setAdmin();
    await GET(makeRequest("format=csv&to=2026-05-25"));
    const [filter] = loadAuditLogsMock.mock.calls[0];
    expect(filter.toDate).toBeInstanceOf(Date);
    expect(filter.toDate.toISOString()).toBe("2026-05-25T14:59:59.999Z");
  });

  it("[TZ3] filename — KST 일자 (사용자 wall-clock) 로 라벨", async () => {
    // formatKstDate(now) 의 KST 일자 라벨과 응답의 filename 이 동일해야 함.
    setAdmin();
    const expectedFilenameDate = formatKstDate(new Date()).replace(/-/g, "");
    const res = await GET(makeRequest("format=csv"));
    const cd = res.headers.get("Content-Disposition") ?? "";
    expect(cd).toMatch(
      new RegExp(`attachment; filename="audit-${expectedFilenameDate}\\.csv"`),
    );
  });
});

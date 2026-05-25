// DB-011 후속 — GET /api/admin/audit/export Route Handler 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server (getSupabaseServerClient) mock — auth + User SELECT
//   - @/lib/admin/audit-aggregator (loadAuditLogs) mock
//
// 검증 시나리오 (≥ 8):
//   [1] admin + format=csv → 200 + text/csv + BOM + Content-Disposition + 헤더 row
//   [2] admin + format=json → 200 + application/json + recordCount/exportedAt/entries
//   [3] admin + format 부재 → JSON 폴백 (default)
//   [4] 비로그인 → 401 UNAUTHORIZED
//   [5] principal role → 403 (admin 만 export)
//   [6] teacher / expert / parent → 403
//   [7] 필터 (action / actorId / from / to) → loadAuditLogs 인자에 정확 전달 + EXPORT_LIMIT
//   [8] CSV escape — diff 안에 쉼표/줄바꿈/큰따옴표 → 셀 quote + double-quote escape
//   [9] CON-04 — 응답 본문에 "치료/진단/장애" 0건 (구조적 통과 확인)
//  [10] DB 빈 결과 → 200 + 헤더 row 만 (CSV) / recordCount=0 (JSON)
//  [11] R4 sanitize — actorId 길이 200자 초과 → trim 후 200자로 cap 적용 (loadAuditLogs 호출 인자 검증)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mocks
// ============================================================================
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

import { GET, AUDIT_EXPORT_LIMIT } from "@/app/api/admin/audit/export/route";

// ============================================================================
// 상수
// ============================================================================
const ADMIN_USER_ID = "11111111-1111-4111-8111-111111111111";
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function setRole(role: string | null) {
  getUserMock.mockResolvedValue({
    data: { user: { id: ADMIN_USER_ID, email: "admin@test.local" } },
    error: null,
  });
  const maybeSingleMock = vi.fn().mockResolvedValue({
    data: role === null ? null : { role },
    error: null,
  });
  const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  fromMock.mockReturnValue({ select: selectMock });
}

function setAnonymous() {
  getUserMock.mockResolvedValue({
    data: { user: null },
    error: { message: "no session" },
  });
}

function fixtureEntries(count = 2) {
  return Array.from({ length: count }, (_, i) => ({
    id: `audit-${String(i + 1).padStart(4, "0")}`,
    actorId: `actor-uuid-${i}`,
    action: i % 2 === 0 ? "consent_sign" : "User_update",
    tableName: "ConsentSignature",
    rowId: `row-${i}`,
    diff: { before: null, after: { ok: true } },
    createdAt: new Date(Date.UTC(2026, 4, 25, 12, 0, i)),
  }));
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
  loadAuditLogsMock.mockResolvedValue({
    entries: fixtureEntries(2),
    hasMore: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// [1] admin + format=csv
// ============================================================================

describe("GET /api/admin/audit/export — 시나리오 1: admin + CSV", () => {
  it("200 + text/csv + BOM + Content-Disposition + 헤더 row", async () => {
    setRole("admin");
    const res = await GET(makeRequest("format=csv"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/csv.*charset=utf-8/);
    expect(res.headers.get("Content-Disposition")).toMatch(
      /attachment; filename="audit-\d{8}\.csv"/,
    );
    expect(res.headers.get("Cache-Control")).toMatch(/no-store/);

    // raw bytes 확인 — Response.text() 는 TextDecoder 기본 옵션으로 BOM strip.
    // 실 브라우저 다운로드 시에는 raw bytes 가 그대로 전달되므로 arrayBuffer 로 검증.
    const buf = new Uint8Array(await res.arrayBuffer());
    // UTF-8 BOM = EF BB BF (3 bytes).
    expect(buf[0]).toBe(0xef);
    expect(buf[1]).toBe(0xbb);
    expect(buf[2]).toBe(0xbf);
    const body = new TextDecoder("utf-8").decode(buf);
    // 헤더 row.
    expect(body).toContain("id,createdAt,actorId,action,tableName,rowId,diff");
    // 첫 entry row.
    expect(body).toContain("audit-0001");
    expect(body).toContain("consent_sign");
  });
});

// ============================================================================
// [2] admin + format=json
// ============================================================================

describe("GET /api/admin/audit/export — 시나리오 2: admin + JSON", () => {
  it("200 + application/json + recordCount/exportedAt/entries", async () => {
    setRole("admin");
    const res = await GET(makeRequest("format=json"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(
      /application\/json.*charset=utf-8/,
    );
    expect(res.headers.get("Content-Disposition")).toMatch(
      /attachment; filename="audit-\d{8}\.json"/,
    );

    const parsed = JSON.parse(await res.text());
    expect(parsed.recordCount).toBe(2);
    expect(typeof parsed.exportedAt).toBe("string");
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0].id).toBe("audit-0001");
  });
});

// ============================================================================
// [3] format 부재 → JSON default
// ============================================================================

describe("GET /api/admin/audit/export — 시나리오 3: format 미지정", () => {
  it("format 누락 → JSON 폴백", async () => {
    setRole("admin");
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/json/);
  });

  it("format=invalid → JSON 폴백 (안전한 default)", async () => {
    setRole("admin");
    const res = await GET(makeRequest("format=xml"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/json/);
  });
});

// ============================================================================
// [4] 비로그인 → 401
// ============================================================================

describe("GET /api/admin/audit/export — 시나리오 4: 비로그인", () => {
  it("auth.getUser 실패 → 401 UNAUTHORIZED", async () => {
    setAnonymous();
    const res = await GET(makeRequest("format=csv"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("UNAUTHORIZED");
  });
});

// ============================================================================
// [5~6] 권한 차단
// ============================================================================

describe("GET /api/admin/audit/export — 시나리오 5~6: 권한", () => {
  for (const role of ["principal", "expert", "teacher", "parent"] as const) {
    it(`${role} role → 403 FORBIDDEN`, async () => {
      setRole(role);
      const res = await GET(makeRequest("format=csv"));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("FORBIDDEN");
    });
  }

  it("role null → 403", async () => {
    setRole(null);
    const res = await GET(makeRequest("format=csv"));
    expect(res.status).toBe(403);
  });
});

// ============================================================================
// [7] 필터 → loadAuditLogs 인자 전달 + EXPORT_LIMIT
// ============================================================================

describe("GET /api/admin/audit/export — 시나리오 7: 필터 인자 전달", () => {
  it("action/actorId/tableName/from/to → loadAuditLogs 1st arg 매핑 + cursor=undefined + EXPORT_LIMIT", async () => {
    setRole("admin");
    await GET(
      makeRequest(
        "format=csv&action=User_delete&actorId=user-1&tableName=User&from=2026-05-01&to=2026-05-31",
      ),
    );

    expect(loadAuditLogsMock).toHaveBeenCalledTimes(1);
    const [filter, cursor, limit] = loadAuditLogsMock.mock.calls[0];
    expect(filter).toMatchObject({
      action: "User_delete",
      actorId: "user-1",
      tableName: "User",
    });
    // fromDate / toDate 가 Date 객체로 normalize.
    expect(filter.fromDate).toBeInstanceOf(Date);
    expect(filter.toDate).toBeInstanceOf(Date);
    expect(cursor).toBeUndefined();
    expect(limit).toBe(AUDIT_EXPORT_LIMIT);
  });

  it("필터 부재 → 빈 filter 객체로 호출", async () => {
    setRole("admin");
    await GET(makeRequest("format=csv"));
    const [filter] = loadAuditLogsMock.mock.calls[0];
    expect(filter).toEqual({});
  });
});

// ============================================================================
// [8] CSV escape (RFC 4180)
// ============================================================================

describe("GET /api/admin/audit/export — 시나리오 8: CSV escape", () => {
  it("diff 안에 쉼표/큰따옴표/줄바꿈 → 셀 quote + escape", async () => {
    setRole("admin");
    loadAuditLogsMock.mockResolvedValueOnce({
      entries: [
        {
          id: "audit-1",
          actorId: "actor-1",
          action: "consent_sign",
          tableName: "ConsentSignature",
          rowId: "row-1",
          diff: { note: 'a,b\n"c"' },
          createdAt: new Date(Date.UTC(2026, 4, 25, 0, 0, 0)),
        },
      ],
      hasMore: false,
    });

    const res = await GET(makeRequest("format=csv"));
    const body = await res.text();
    // diff JSON 안의 쉼표 + 큰따옴표 + 줄바꿈은 셀 quote + escape ("") 적용.
    // JSON.stringify({note:'a,b\n"c"'}) = `{"note":"a,b\n\"c\""}` →
    // CSV escape 시 첫 큰따옴표를 두 번, 그리고 셀 전체를 quote.
    expect(body).toMatch(/"\{""note"":""a,b\\n\\""c\\""""\}"/);
  });
});

// ============================================================================
// [9] CON-04 — 응답 본문 금칙어 0건
// ============================================================================

describe("GET /api/admin/audit/export — 시나리오 9: CON-04 금칙어", () => {
  it("CSV 응답 본문에 치료/진단/장애 0건 (정상 case)", async () => {
    setRole("admin");
    const res = await GET(makeRequest("format=csv"));
    const body = await res.text();
    for (const word of FORBIDDEN_MEDICAL_WORDS) {
      expect(body).not.toContain(word);
    }
  });

  it("JSON 응답 본문에 치료/진단/장애 0건 (정상 case)", async () => {
    setRole("admin");
    const res = await GET(makeRequest("format=json"));
    const body = await res.text();
    for (const word of FORBIDDEN_MEDICAL_WORDS) {
      expect(body).not.toContain(word);
    }
  });
});

// ============================================================================
// [10] 빈 결과
// ============================================================================

describe("GET /api/admin/audit/export — 시나리오 10: 빈 결과", () => {
  it("CSV — 헤더 row 만 (entries 0)", async () => {
    setRole("admin");
    loadAuditLogsMock.mockResolvedValueOnce({ entries: [], hasMore: false });
    const res = await GET(makeRequest("format=csv"));
    // arrayBuffer 로 BOM 까지 검증 (Response.text 는 BOM strip).
    const buf = new Uint8Array(await res.arrayBuffer());
    expect(buf[0]).toBe(0xef);
    expect(buf[1]).toBe(0xbb);
    expect(buf[2]).toBe(0xbf);
    const body = new TextDecoder("utf-8").decode(buf);
    // BOM strip 한 헤더 + CRLF 종료.
    expect(body.replace(/^﻿/, "")).toBe(
      "id,createdAt,actorId,action,tableName,rowId,diff\r\n",
    );
  });

  it("JSON — recordCount=0 + entries 빈 배열", async () => {
    setRole("admin");
    loadAuditLogsMock.mockResolvedValueOnce({ entries: [], hasMore: false });
    const res = await GET(makeRequest("format=json"));
    const parsed = JSON.parse(await res.text());
    expect(parsed.recordCount).toBe(0);
    expect(parsed.entries).toEqual([]);
  });
});

// ============================================================================
// [11] actorId 길이 cap
// ============================================================================

describe("GET /api/admin/audit/export — 시나리오 11: 입력 sanitize", () => {
  it("actorId 200자 초과 → 200자로 cap 후 filter 전달", async () => {
    setRole("admin");
    const tooLong = "a".repeat(300);
    await GET(makeRequest(`format=csv&actorId=${tooLong}`));
    const [filter] = loadAuditLogsMock.mock.calls[0];
    expect(filter.actorId).toHaveLength(200);
  });

  it("from 형식 불일치 (YYYY-MM-DD 외) → fromDate 미적용", async () => {
    setRole("admin");
    await GET(makeRequest("format=csv&from=invalid-date"));
    const [filter] = loadAuditLogsMock.mock.calls[0];
    expect(filter.fromDate).toBeUndefined();
  });
});

// FR-TZ-UNIFY-EXTEND — /admin/audit 페이지 KST 일자 boundary 검증.
//
// 시나리오 (≥ 4):
//   [TZ1] from=YYYY-MM-DD → fromDate 가 KST 자정 (= UTC 전날 15:00)
//   [TZ2] to=YYYY-MM-DD   → toDate 가 KST 일자의 종일 포함 (= UTC 당일 14:59:59.999)
//   [TZ3] from + to 조합   → 같은 KST 일자 단일 조회 시 9시간 누락 없음
//   [TZ4] 잘못된 일자       → undefined (기존 동작 유지)
//
// 정책:
//   - 한국 사용자의 "2026-05-25" 는 KST 5-25 00:00 ~ 5-25 23:59:59.999.
//   - 기존 UTC 자정 해석은 KST 09:00 ~ 다음날 08:59 → 9시간 미스매치.
//   - kstStartOfDay + addKstDays(+1) - 1ms 로 보정.

import { describe, it, expect, vi, beforeEach } from "vitest";

const getCachedUserRoleResultMock = vi.fn();
vi.mock("@/lib/auth/cached-get-user", () => ({
  getCachedUserRoleResult: (...args: unknown[]) =>
    getCachedUserRoleResultMock(...args),
}));

const loadAuditLogsMock = vi.fn();
vi.mock("@/lib/admin/audit-aggregator", () => ({
  loadAuditLogs: (...args: unknown[]) => loadAuditLogsMock(...args),
  AUDIT_LOGS_PER_PAGE: 50,
  AUDIT_LOGS_MAX_PAGE_SIZE: 200,
}));

vi.mock("next/navigation", () => ({
  redirect: (target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import AuditLogPage from "@/app/admin/audit/page";

const USER_ADMIN = "11111111-1111-4111-8111-111111111111";

function setAdmin() {
  getCachedUserRoleResultMock.mockResolvedValue({
    status: "ok",
    userId: USER_ADMIN,
    email: null,
    role: "admin",
  });
}

beforeEach(() => {
  getCachedUserRoleResultMock.mockReset();
  loadAuditLogsMock.mockReset();
  loadAuditLogsMock.mockResolvedValue({ entries: [], hasMore: false });
});

describe("/admin/audit — FR-TZ-UNIFY-EXTEND KST 일자 boundary", () => {
  it("[TZ1] from='2026-05-01' → KST 5-01 00:00 = UTC 4-30 15:00", async () => {
    setAdmin();
    await AuditLogPage({
      searchParams: Promise.resolve({ from: "2026-05-01" }),
    });
    const [filter] = loadAuditLogsMock.mock.calls[0];
    expect(filter.fromDate).toBeInstanceOf(Date);
    expect(filter.fromDate.toISOString()).toBe("2026-04-30T15:00:00.000Z");
    expect(filter.toDate).toBeUndefined();
  });

  it("[TZ2] to='2026-05-25' → KST 5-25 23:59:59.999 = UTC 5-25 14:59:59.999", async () => {
    setAdmin();
    await AuditLogPage({
      searchParams: Promise.resolve({ to: "2026-05-25" }),
    });
    const [filter] = loadAuditLogsMock.mock.calls[0];
    expect(filter.toDate).toBeInstanceOf(Date);
    expect(filter.toDate.toISOString()).toBe("2026-05-25T14:59:59.999Z");
  });

  it("[TZ3] from=to='2026-05-25' (단일 KST 일자 조회) → 24h 윈도우 정확", async () => {
    setAdmin();
    await AuditLogPage({
      searchParams: Promise.resolve({ from: "2026-05-25", to: "2026-05-25" }),
    });
    const [filter] = loadAuditLogsMock.mock.calls[0];
    // KST 5-25 00:00 ~ 5-25 23:59:59.999 = UTC 5-24 15:00 ~ 5-25 14:59:59.999.
    expect(filter.fromDate.toISOString()).toBe("2026-05-24T15:00:00.000Z");
    expect(filter.toDate.toISOString()).toBe("2026-05-25T14:59:59.999Z");
    // 윈도우 크기는 정확히 24h - 1ms.
    const windowMs = filter.toDate.getTime() - filter.fromDate.getTime();
    expect(windowMs).toBe(24 * 60 * 60 * 1000 - 1);
  });

  it("[TZ4] 잘못된 일자 → undefined (graceful)", async () => {
    setAdmin();
    await AuditLogPage({
      searchParams: Promise.resolve({ from: "not-a-date", to: "2026-13-99" }),
    });
    const [filter] = loadAuditLogsMock.mock.calls[0];
    expect(filter.fromDate).toBeUndefined();
    expect(filter.toDate).toBeUndefined();
  });

  it("[TZ5] from='2026-12-31' (연말) → KST 자정 = UTC 12-30 15:00", async () => {
    // 연말 / 연초 boundary 도 KST 보정 정확.
    setAdmin();
    await AuditLogPage({
      searchParams: Promise.resolve({ from: "2026-12-31" }),
    });
    const [filter] = loadAuditLogsMock.mock.calls[0];
    expect(filter.fromDate.toISOString()).toBe("2026-12-30T15:00:00.000Z");
  });
});

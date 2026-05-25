// DB-011 후속 — /admin/audit Server Component 통합 테스트.
//
// 격리:
//   - @/lib/auth/cached-get-user (getCachedUserRoleResult) mock
//   - @/lib/admin/audit-aggregator (loadAuditLogs) mock
//   - next/link mock — 단순 <a>
//   - next/navigation redirect mock — throw 흉내
//
// 검증 시나리오 (≥ 6):
//   [1] admin role → page 렌더 + filter + table 표시
//   [2] principal role → 403 (audit-forbidden)
//   [3] teacher role → 403
//   [4] expert role → 403
//   [5] parent role → 403
//   [6] 필터 적용 — searchParams 값이 loadAuditLogs 인자로 정확 전달 + sanitize
//   [7] 페이지네이션 cursor — loadAuditLogs 두 번째 호출 시나리오 + next href 생성
//   [8] CON-04 의료 금칙어 0건 (모든 분기)
//   [9] anonymous → redirect("/login?next=/admin/audit")

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const getCachedUserRoleResultMock = vi.fn();
vi.mock("@/lib/auth/cached-get-user", () => ({
  getCachedUserRoleResult: (...args: unknown[]) => getCachedUserRoleResultMock(...args),
}));

const loadAuditLogsMock = vi.fn();
vi.mock("@/lib/admin/audit-aggregator", () => ({
  loadAuditLogs: (...args: unknown[]) => loadAuditLogsMock(...args),
  AUDIT_LOGS_PER_PAGE: 50,
  AUDIT_LOGS_MAX_PAGE_SIZE: 200,
}));

const redirectMock = vi.fn((target: string) => {
  throw new Error(`NEXT_REDIRECT:${target}`);
});
vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
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
const USER_PRINCIPAL = "22222222-2222-4222-8222-222222222222";
const USER_TEACHER = "33333333-3333-4333-8333-333333333333";
const USER_EXPERT = "44444444-4444-4444-8444-444444444444";
const USER_PARENT = "55555555-5555-4555-8555-555555555555";

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function assertNoMedicalTerms(text: string) {
  for (const word of FORBIDDEN_MEDICAL_WORDS) {
    expect(text).not.toContain(word);
  }
}

function setAuthRole(userId: string, role: string | null) {
  getCachedUserRoleResultMock.mockResolvedValue({
    status: "ok",
    userId,
    email: null,
    role,
  });
}

function setAnonymous() {
  getCachedUserRoleResultMock.mockResolvedValue({ status: "anonymous" });
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

beforeEach(() => {
  getCachedUserRoleResultMock.mockReset();
  loadAuditLogsMock.mockReset();
  redirectMock.mockClear();
});

describe("/admin/audit — DB-011 audit 페이지 RBAC + 필터 + 페이지네이션", () => {
  it("[1] admin role → page 렌더 + filter + table 마운트", async () => {
    setAuthRole(USER_ADMIN, "admin");
    loadAuditLogsMock.mockResolvedValueOnce({
      entries: fixtureEntries(2),
      hasMore: false,
    });

    const ui = await AuditLogPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='admin-audit-page']")).not.toBeNull();
    expect(container.querySelector("[data-testid='audit-forbidden']")).toBeNull();
    expect(container.querySelector("[data-testid='audit-log-filter']")).not.toBeNull();
    expect(container.querySelector("[data-testid='audit-log-table']")).not.toBeNull();
    // 페이지네이션 없음 (hasMore=false).
    expect(container.querySelector("[data-testid='audit-log-next-page']")).toBeNull();
  });

  it("[2] principal role → 403 (audit-forbidden)", async () => {
    setAuthRole(USER_PRINCIPAL, "principal");

    const ui = await AuditLogPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='audit-forbidden']")).not.toBeNull();
    expect(container.querySelector("[data-testid='admin-audit-page']")).toBeNull();
    expect(loadAuditLogsMock).not.toHaveBeenCalled();
  });

  it("[3] teacher role → 403", async () => {
    setAuthRole(USER_TEACHER, "teacher");

    const ui = await AuditLogPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='audit-forbidden']")).not.toBeNull();
    expect(loadAuditLogsMock).not.toHaveBeenCalled();
  });

  it("[4] expert role → 403", async () => {
    setAuthRole(USER_EXPERT, "expert");

    const ui = await AuditLogPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='audit-forbidden']")).not.toBeNull();
    expect(loadAuditLogsMock).not.toHaveBeenCalled();
  });

  it("[5] parent role → 403", async () => {
    setAuthRole(USER_PARENT, "parent");

    const ui = await AuditLogPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='audit-forbidden']")).not.toBeNull();
    expect(loadAuditLogsMock).not.toHaveBeenCalled();
  });

  it("[6] 필터 적용 — searchParams 가 loadAuditLogs 인자로 정확 전달 + sanitize (KST 자정 기준)", async () => {
    // FR-TZ-UNIFY-EXTEND: 한국 사용자의 "2026-05-01" 은 KST 5-01 00:00 (= UTC 4-30 15:00).
    // 기존 UTC 자정 해석 (= "2026-05-01T00:00:00.000Z") 은 KST 5-01 09:00 ~ 5-01 23:59 의
    // row 만 매칭 → 9시간 누락. KST 자정 보정으로 일자 정합 보장.
    setAuthRole(USER_ADMIN, "admin");
    loadAuditLogsMock.mockResolvedValueOnce({ entries: [], hasMore: false });

    await AuditLogPage({
      searchParams: Promise.resolve({
        action: "consent_sign",
        actorId: "  user-uuid-xyz  ",
        tableName: "ConsentSignature",
        from: "2026-05-01",
        to: "2026-05-25",
      }),
    });

    expect(loadAuditLogsMock).toHaveBeenCalledTimes(1);
    const [filter, cursor] = loadAuditLogsMock.mock.calls[0];
    expect(filter.action).toBe("consent_sign");
    expect(filter.actorId).toBe("user-uuid-xyz"); // trim 적용.
    expect(filter.tableName).toBe("ConsentSignature");
    expect(filter.fromDate).toBeInstanceOf(Date);
    // KST 2026-05-01 00:00 = UTC 2026-04-30 15:00.
    expect(filter.fromDate.toISOString()).toBe("2026-04-30T15:00:00.000Z");
    expect(filter.toDate).toBeInstanceOf(Date);
    // 종일 포함 — KST 2026-05-25 23:59:59.999 = UTC 2026-05-25 14:59:59.999.
    expect(filter.toDate.toISOString()).toBe("2026-05-25T14:59:59.999Z");
    expect(cursor).toBeUndefined();
  });

  it("[6b] 잘못된 date 형식 → fromDate/toDate undefined (graceful skip)", async () => {
    setAuthRole(USER_ADMIN, "admin");
    loadAuditLogsMock.mockResolvedValueOnce({ entries: [], hasMore: false });

    await AuditLogPage({
      searchParams: Promise.resolve({
        from: "not-a-date",
        to: "2026-13-99",
      }),
    });

    const [filter] = loadAuditLogsMock.mock.calls[0];
    expect(filter.fromDate).toBeUndefined();
    expect(filter.toDate).toBeUndefined();
  });

  it("[7] 페이지네이션 cursor — hasMore=true 시 next page link 생성 + cursor 전달", async () => {
    setAuthRole(USER_ADMIN, "admin");
    loadAuditLogsMock.mockResolvedValueOnce({
      entries: fixtureEntries(3),
      hasMore: true,
      nextCursor: "audit-next-cursor-id",
    });

    const ui = await AuditLogPage({
      searchParams: Promise.resolve({
        action: "consent_sign",
        cursor: "audit-prev-cursor",
      }),
    });
    const { container } = render(ui);

    // loadAuditLogs 가 cursor 인자 받음.
    expect(loadAuditLogsMock).toHaveBeenCalledTimes(1);
    const [, cursor] = loadAuditLogsMock.mock.calls[0];
    expect(cursor).toBe("audit-prev-cursor");

    // 다음 페이지 링크 — 새 cursor 가 nextCursor 로 갱신 + 기존 action 유지.
    const nextLink = container.querySelector(
      "[data-testid='audit-log-next-page']",
    ) as HTMLAnchorElement | null;
    expect(nextLink).not.toBeNull();
    const href = nextLink!.getAttribute("href") ?? "";
    expect(href).toContain("/admin/audit?");
    expect(href).toContain("action=consent_sign");
    expect(href).toContain("cursor=audit-next-cursor-id");
  });

  it("[8] CON-04 의료 금칙어 0건 (admin / forbidden / empty 분기)", async () => {
    // (a) admin + full
    setAuthRole(USER_ADMIN, "admin");
    loadAuditLogsMock.mockResolvedValueOnce({
      entries: fixtureEntries(2),
      hasMore: false,
    });
    const fullUi = await AuditLogPage({ searchParams: Promise.resolve({}) });
    const { container: fullC } = render(fullUi);
    assertNoMedicalTerms(fullC.textContent ?? "");

    // (b) admin + empty
    setAuthRole(USER_ADMIN, "admin");
    loadAuditLogsMock.mockResolvedValueOnce({ entries: [], hasMore: false });
    const emptyUi = await AuditLogPage({ searchParams: Promise.resolve({}) });
    const { container: emptyC } = render(emptyUi);
    assertNoMedicalTerms(emptyC.textContent ?? "");
    expect(emptyC.querySelector("[data-testid='audit-log-empty']")).not.toBeNull();

    // (c) forbidden — teacher
    setAuthRole(USER_TEACHER, "teacher");
    const forbUi = await AuditLogPage({ searchParams: Promise.resolve({}) });
    const { container: forbC } = render(forbUi);
    assertNoMedicalTerms(forbC.textContent ?? "");
  });

  it("[9] anonymous → redirect('/login?next=/admin/audit')", async () => {
    setAnonymous();

    await expect(
      AuditLogPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/admin/audit");
    expect(loadAuditLogsMock).not.toHaveBeenCalled();
  });
});

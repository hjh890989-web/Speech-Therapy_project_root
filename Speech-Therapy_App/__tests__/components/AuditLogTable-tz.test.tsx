// FR-TZ-UNIFY-EXTEND — AuditLogTable 의 createdAt 표시가 KST wall-clock 인지 검증.
//
// 시나리오 (≥ 3):
//   [TZ1] entry.createdAt = UTC 14:30:00 (= KST 23:30) → "2026-05-25 23:30:00"
//   [TZ2] entry.createdAt = UTC 15:00:00 (= KST 다음날 00:00) → "2026-05-26 00:00:00"
//   [TZ3] entry.createdAt = string (서버→클라이언트 직렬화) → 정상 normalize 후 KST 표시
//   [TZ4] 정상 KST wall-clock 형식 (YYYY-MM-DD HH:MM:SS) 만 출력

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { AuditLogTable } from "@/components/admin/audit/AuditLogTable";
import type { AuditLogEntry } from "@/lib/admin/audit-aggregator";

// AuditLogDetailModal 은 modal — 본 테스트는 표 셀 텍스트만 확인이라 mock 으로 간소화.
vi.mock("@/components/admin/audit/AuditLogDetailModal", () => ({
  AuditLogDetailModal: () => null,
}));

function makeEntry(overrides: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: "audit-1",
    actorId: "actor-uuid-1",
    action: "consent_sign",
    tableName: "ConsentSignature",
    rowId: "row-1",
    diff: { ok: true },
    createdAt: new Date("2026-05-25T14:30:00.000Z"),
    ...overrides,
  };
}

describe("AuditLogTable — FR-TZ-UNIFY-EXTEND KST wall-clock 표시", () => {
  it("[TZ1] UTC 14:30 → 'YYYY-MM-DD 23:30:00' (KST)", () => {
    const entries = [makeEntry({ id: "audit-1" })];
    const { container } = render(<AuditLogTable entries={entries} />);
    const row = container.querySelector(
      "[data-testid='audit-log-row-audit-1']",
    );
    expect(row?.textContent).toContain("2026-05-25 23:30:00");
    // 기존 ISO UTC ('2026-05-25T14:30:00' 또는 '2026-05-25 14:30:00') 미포함 확인.
    expect(row?.textContent).not.toContain("T14:30");
  });

  it("[TZ2] UTC 15:00 (KST 다음날 00:00) → KST 일자 +1", () => {
    const entries = [
      makeEntry({ id: "audit-2", createdAt: new Date("2026-05-25T15:00:00.000Z") }),
    ];
    const { container } = render(<AuditLogTable entries={entries} />);
    const row = container.querySelector(
      "[data-testid='audit-log-row-audit-2']",
    );
    expect(row?.textContent).toContain("2026-05-26 00:00:00");
  });

  it("[TZ3] createdAt 이 string (직렬화 결과) 도 KST 로 표시", () => {
    const entries = [
      makeEntry({
        id: "audit-3",
        // server → client JSON 직렬화 시 ISO string 으로 도착.
        createdAt: "2026-05-25T14:30:00.000Z" as unknown as Date,
      }),
    ];
    const { container } = render(<AuditLogTable entries={entries} />);
    const row = container.querySelector(
      "[data-testid='audit-log-row-audit-3']",
    );
    expect(row?.textContent).toContain("2026-05-25 23:30:00");
  });

  it("[TZ4] 자정 직전 UTC 23:59 (KST 다음날 08:59) → KST 일자 +1", () => {
    const entries = [
      makeEntry({
        id: "audit-4",
        createdAt: new Date("2026-05-25T23:59:00.000Z"),
      }),
    ];
    const { container } = render(<AuditLogTable entries={entries} />);
    const row = container.querySelector(
      "[data-testid='audit-log-row-audit-4']",
    );
    expect(row?.textContent).toContain("2026-05-26 08:59:00");
  });
});

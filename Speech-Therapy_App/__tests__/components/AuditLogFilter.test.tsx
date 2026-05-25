// DB-011 후속 — AuditLogFilter Client Component 단위 테스트.
//
// 격리:
//   - next/navigation router.push mock
//
// 시나리오 (≥ 4):
//   [1] 초기 렌더 — 모든 input 노출 + initial props 반영
//   [2] 필터 입력 + 적용 → router.push 가 query string 포함 URL 호출
//   [3] 초기화 클릭 → 모든 state 빈 값 + router.push("/admin/audit")
//   [4] date range 정확 — from/to 둘 다 입력 시 둘 다 query 에 포함
//   [5] 빈 입력 + 적용 → router.push("/admin/audit") (query 없음)
//   [6] 키보드 nav — 모든 input 이 tab 으로 도달 가능

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { AuditLogFilter } from "@/components/admin/audit/AuditLogFilter";

beforeEach(() => {
  pushMock.mockReset();
});

describe("AuditLogFilter — DB-011 audit 필터 form", () => {
  it("[1] 초기 렌더 — 모든 input + 버튼 + initial props 반영", () => {
    render(
      <AuditLogFilter
        initialAction="consent_sign"
        initialActorId="user-uuid-123"
        initialTableName="ConsentSignature"
        initialFromDate="2026-05-01"
        initialToDate="2026-05-25"
      />,
    );

    const actionInput = screen.getByTestId("audit-filter-action") as HTMLInputElement;
    const actorIdInput = screen.getByTestId("audit-filter-actor-id") as HTMLInputElement;
    const tableNameInput = screen.getByTestId("audit-filter-table-name") as HTMLSelectElement;
    const fromInput = screen.getByTestId("audit-filter-from-date") as HTMLInputElement;
    const toInput = screen.getByTestId("audit-filter-to-date") as HTMLInputElement;

    expect(actionInput.value).toBe("consent_sign");
    expect(actorIdInput.value).toBe("user-uuid-123");
    expect(tableNameInput.value).toBe("ConsentSignature");
    expect(fromInput.value).toBe("2026-05-01");
    expect(toInput.value).toBe("2026-05-25");

    expect(screen.getByTestId("audit-filter-apply")).toBeInTheDocument();
    expect(screen.getByTestId("audit-filter-reset")).toBeInTheDocument();
  });

  it("[2] 필터 입력 + 적용 → router.push 가 query string 포함 URL 호출", async () => {
    render(<AuditLogFilter />);

    const actionInput = screen.getByTestId("audit-filter-action") as HTMLInputElement;
    const actorIdInput = screen.getByTestId("audit-filter-actor-id") as HTMLInputElement;

    fireEvent.change(actionInput, { target: { value: "hitl_assign" } });
    fireEvent.change(actorIdInput, { target: { value: "user-uuid-abc" } });

    const form = screen.getByTestId("audit-log-filter") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(pushMock).toHaveBeenCalledTimes(1);
    const target = pushMock.mock.calls[0][0] as string;
    expect(target.startsWith("/admin/audit?")).toBe(true);
    expect(target).toContain("action=hitl_assign");
    expect(target).toContain("actorId=user-uuid-abc");
  });

  it("[3] 초기화 클릭 → state 빈 값 + router.push('/admin/audit')", async () => {
    render(
      <AuditLogFilter
        initialAction="consent_sign"
        initialActorId="user-uuid-123"
      />,
    );

    const resetButton = screen.getByTestId("audit-filter-reset");
    await act(async () => {
      fireEvent.click(resetButton);
    });

    expect(pushMock).toHaveBeenCalledWith("/admin/audit");

    const actionInput = screen.getByTestId("audit-filter-action") as HTMLInputElement;
    const actorIdInput = screen.getByTestId("audit-filter-actor-id") as HTMLInputElement;
    expect(actionInput.value).toBe("");
    expect(actorIdInput.value).toBe("");
  });

  it("[4] date range — from/to 모두 입력 시 둘 다 query 에 포함", async () => {
    render(<AuditLogFilter />);

    const fromInput = screen.getByTestId("audit-filter-from-date") as HTMLInputElement;
    const toInput = screen.getByTestId("audit-filter-to-date") as HTMLInputElement;

    fireEvent.change(fromInput, { target: { value: "2026-05-01" } });
    fireEvent.change(toInput, { target: { value: "2026-05-25" } });

    const form = screen.getByTestId("audit-log-filter") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });

    const target = pushMock.mock.calls[0][0] as string;
    expect(target).toContain("from=2026-05-01");
    expect(target).toContain("to=2026-05-25");
  });

  it("[5] 빈 입력 + 적용 → router.push('/admin/audit') (query 없음)", async () => {
    render(<AuditLogFilter />);

    const form = screen.getByTestId("audit-log-filter") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(pushMock).toHaveBeenCalledWith("/admin/audit");
  });

  it("[6] 키보드 nav — 모든 input 이 tab 으로 도달 (focus 가능)", () => {
    render(<AuditLogFilter />);

    const actionInput = screen.getByTestId("audit-filter-action") as HTMLInputElement;
    const actorIdInput = screen.getByTestId("audit-filter-actor-id") as HTMLInputElement;
    const tableNameInput = screen.getByTestId("audit-filter-table-name") as HTMLSelectElement;
    const fromInput = screen.getByTestId("audit-filter-from-date") as HTMLInputElement;
    const toInput = screen.getByTestId("audit-filter-to-date") as HTMLInputElement;
    const applyBtn = screen.getByTestId("audit-filter-apply") as HTMLButtonElement;
    const resetBtn = screen.getByTestId("audit-filter-reset") as HTMLButtonElement;

    for (const el of [actionInput, actorIdInput, tableNameInput, fromInput, toInput, applyBtn, resetBtn]) {
      el.focus();
      expect(document.activeElement).toBe(el);
      // 모든 인터랙티브 영역은 disabled 가 아니어야 함 (tab 가능).
      expect((el as HTMLInputElement | HTMLButtonElement | HTMLSelectElement).disabled).toBeFalsy();
    }
  });
});

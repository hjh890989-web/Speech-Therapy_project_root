// FR-Q-008 (#49) — /admin/hitl HITL 큐 list Server Component 통합 테스트.
//
// 격리:
//   - @/lib/db Prisma mock — DB 호출 차단
//   - next/link mock — RSC 환경 외부에서 단순 <a> 로 렌더
//   - StatusPage 와 동일 패턴 (Server Component 직접 호출 → render → DOM 검증)
//
// 검증 시나리오 (≥6):
//   1. pending + in_review 만 표시 / completed/dismissed/escalated 미노출
//      → findMany where 필터 검증 + 표시 row count
//   2. 빈 상태 메시지 노출 + 가이드
//   3. confidence 색상 분기 — low(<50) / mid(50~69) / high(≥70)
//   4. SLA 초과 항목 강조 (slaDueAt < now)
//   5. R4 — userId 4자리 truncate + 풀길이 미노출
//   6. R4 — sessionId 8자리 truncate + 풀길이 미노출
//   7. createdAt orderBy desc 정합 — Prisma findMany 호출 인자 검증
//   8. CON-04 금칙어 ("치료" / "진단" / "장애") 0건

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const findManyMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    hITLQueue: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
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

import HitlQueueAdminPage from "@/app/admin/hitl/page";

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function assertNoMedicalTerms(text: string) {
  for (const word of FORBIDDEN_MEDICAL_WORDS) {
    expect(text).not.toContain(word);
  }
}

// 풀길이 36자 UUID (Zod 4 UUID 호환).
const SESSION_A = "11111111-1111-4111-8111-111111111111";
const SESSION_B = "22222222-2222-4222-8222-222222222222";
const SESSION_C = "33333333-3333-4333-8333-333333333333";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function rowA() {
  // SLA 충분히 미래 (24시간 후).
  return {
    id: "queue-A",
    sessionId: SESSION_A,
    userId: USER_A,
    confidenceScore: 35, // low
    status: "pending",
    assignedExpertId: null,
    slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    escalatedAt: null,
    createdAt: new Date("2026-05-22T10:00:00Z"),
  };
}

function rowB() {
  // SLA 초과 (1시간 전).
  return {
    id: "queue-B",
    sessionId: SESSION_B,
    userId: USER_B,
    confidenceScore: 60, // mid
    status: "in_review",
    assignedExpertId: "expert-1",
    slaDueAt: new Date(Date.now() - 60 * 60 * 1000),
    escalatedAt: null,
    createdAt: new Date("2026-05-22T09:00:00Z"),
  };
}

function rowC() {
  return {
    id: "queue-C",
    sessionId: SESSION_C,
    userId: USER_A,
    confidenceScore: 85, // high (수동 등록 가정)
    status: "pending",
    assignedExpertId: null,
    slaDueAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    escalatedAt: null,
    createdAt: new Date("2026-05-22T08:00:00Z"),
  };
}

describe("/admin/hitl — FR-Q-008 HITL 큐 list", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("[1] pending + in_review 만 표시되는 Prisma 필터 + 표시 row count", async () => {
    findManyMock.mockResolvedValueOnce([rowA(), rowB(), rowC()]);

    const ui = await HitlQueueAdminPage();
    const { container } = render(ui);

    // Prisma findMany 호출 인자 검증 — status filter.
    expect(findManyMock).toHaveBeenCalledTimes(1);
    const call = findManyMock.mock.calls[0][0];
    expect(call.where.status.in).toEqual(["pending", "in_review"]);
    // completed / dismissed / escalated 는 필터에 포함되지 않음.
    expect(call.where.status.in).not.toContain("completed");
    expect(call.where.status.in).not.toContain("dismissed");
    expect(call.where.status.in).not.toContain("escalated");

    const rows = container.querySelectorAll("tr[data-testid^='hitl-row-']");
    expect(rows).toHaveLength(3);
  });

  it("[2] 빈 상태 메시지 + 가이드 (findMany → []) ", async () => {
    findManyMock.mockResolvedValueOnce([]);

    const ui = await HitlQueueAdminPage();
    const { container } = render(ui);

    const empty = container.querySelector("[data-testid='hitl-empty-state']");
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toContain("현재 검토 대기 항목 없음");
    expect(empty?.textContent).toContain("hitl_enqueued");
    // 테이블 자체는 미렌더.
    expect(container.querySelector("[data-testid='hitl-queue-table']")).toBeNull();
  });

  it("[3] confidence 색상 분기 — low/mid/high 각 tone 매핑", async () => {
    findManyMock.mockResolvedValueOnce([rowA(), rowB(), rowC()]);

    const ui = await HitlQueueAdminPage();
    const { container } = render(ui);

    const lowRow = container.querySelector("[data-testid='hitl-row-queue-A']");
    const midRow = container.querySelector("[data-testid='hitl-row-queue-B']");
    const highRow = container.querySelector("[data-testid='hitl-row-queue-C']");

    expect(lowRow?.getAttribute("data-confidence-tone")).toBe("low");
    expect(midRow?.getAttribute("data-confidence-tone")).toBe("mid");
    expect(highRow?.getAttribute("data-confidence-tone")).toBe("high");

    // tailwind 색상 class — low=rose / mid=amber / high=emerald.
    const lowBadge = lowRow?.querySelector("[data-testid='hitl-confidence']");
    const midBadge = midRow?.querySelector("[data-testid='hitl-confidence']");
    const highBadge = highRow?.querySelector("[data-testid='hitl-confidence']");
    expect(lowBadge?.className).toContain("rose");
    expect(midBadge?.className).toContain("amber");
    expect(highBadge?.className).toContain("emerald");
  });

  it("[4] SLA 초과 항목 강조 (slaDueAt < now)", async () => {
    findManyMock.mockResolvedValueOnce([rowA(), rowB()]);

    const ui = await HitlQueueAdminPage();
    const { container } = render(ui);

    const okRow = container.querySelector("[data-testid='hitl-row-queue-A']");
    const overdueRow = container.querySelector("[data-testid='hitl-row-queue-B']");

    expect(okRow?.getAttribute("data-sla-overdue")).toBe("false");
    expect(overdueRow?.getAttribute("data-sla-overdue")).toBe("true");

    const overdueSlaCell = overdueRow?.querySelector("[data-testid='hitl-sla']");
    expect(overdueSlaCell?.textContent).toContain("초과");
    expect(overdueSlaCell?.className).toContain("rose");
  });

  it("[5] R4 — userId 4자리 truncate 표시 + 풀길이 미노출", async () => {
    findManyMock.mockResolvedValueOnce([rowA()]);

    const ui = await HitlQueueAdminPage();
    const { container } = render(ui);

    const userCell = container.querySelector("[data-testid='hitl-user-id']");
    expect(userCell?.textContent).toBe("aaaa…");
    // 풀길이 36자 UUID 가 DOM 어디에도 노출되지 않음.
    expect(container.textContent).not.toContain(USER_A);
  });

  it("[6] R4 — sessionId 8자리 truncate 표시 + 풀길이 미노출", async () => {
    findManyMock.mockResolvedValueOnce([rowA()]);

    const ui = await HitlQueueAdminPage();
    const { container } = render(ui);

    const sessionCell = container.querySelector("[data-testid='hitl-session-id']");
    expect(sessionCell?.textContent).toBe("11111111…");

    // title 속성 (tooltip) 도 풀길이 노출 — 그러나 표시 텍스트엔 미포함.
    // DOM textContent (보이는 텍스트) 에 풀길이 없음을 검증.
    const visibleText = container.textContent ?? "";
    expect(visibleText).not.toContain(SESSION_A);
  });

  it("[7] createdAt orderBy desc 정합 — Prisma 호출 인자 검증", async () => {
    findManyMock.mockResolvedValueOnce([rowA(), rowB(), rowC()]);

    await HitlQueueAdminPage();

    const call = findManyMock.mock.calls[0][0];
    expect(call.orderBy).toEqual({ createdAt: "desc" });
    expect(call.take).toBe(100);
  });

  it("[8] CON-04 의료 금칙어 0건 (전체 UI 텍스트)", async () => {
    findManyMock.mockResolvedValueOnce([rowA(), rowB(), rowC()]);

    const ui = await HitlQueueAdminPage();
    const { container } = render(ui);

    assertNoMedicalTerms(container.textContent ?? "");

    // 빈 상태 가이드도 금칙어 0건 확인.
    findManyMock.mockResolvedValueOnce([]);
    const emptyUi = await HitlQueueAdminPage();
    const { container: emptyContainer } = render(emptyUi);
    assertNoMedicalTerms(emptyContainer.textContent ?? "");
  });

  it("[보너스] 상세 페이지 (FR-C-013 #36) placeholder 링크가 /admin/hitl/[id] 형식", async () => {
    findManyMock.mockResolvedValueOnce([rowA()]);

    const ui = await HitlQueueAdminPage();
    const { container } = render(ui);

    const link = container.querySelector("[data-testid='hitl-action-link']");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("/admin/hitl/queue-A");
  });
});

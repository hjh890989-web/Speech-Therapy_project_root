// FR-C-013 (#36) — /admin/hitl/[id] HITL 상세 페이지 Server Component 테스트.
//
// 격리:
//   - @/lib/db Prisma mock — findUnique 차단
//   - next/navigation notFound mock — throw 캡처
//   - next/link mock — 단순 <a>
//   - HitlCommentForm mock — Client Component (useRouter 의존성 격리)
//
// 검증 시나리오 (≥ 5):
//   1. queueId 정상 → page 렌더 + sessionId / status / SLA / phoneme / confidence 노출
//   2. queueId 미존재 → notFound() 호출
//   3. R4 — userId 4자리 + sessionId 8자리 truncate, 풀길이 visible text 미노출
//   4. 기존 expertComment + correctedScore 있음 → 기존 코멘트 블록 노출 + HitlCommentForm prefill props 전달
//   5. EvaluationResult 3축 점수 카드 렌더
//   6. CON-04 의료 금칙어 0건
//   7. Escalate 버튼 placeholder 노출 + disabled
//   8. SLA 초과 항목 강조 (rose tone)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// ============================================================================
// Mocks
// ============================================================================
const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    hITLQueue: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

const notFoundMock = vi.fn(() => {
  // 실제 next/navigation 의 notFound 는 NEXT_NOT_FOUND throw — 동일하게 흉내.
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
  // HitlEscalateButton (Agent B integration) 가 useRouter 사용 — refresh stub.
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
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

// HitlCommentForm 은 Client Component — useRouter 의존성 회피를 위해 mock.
const commentFormPropsCapture = vi.fn();
vi.mock("@/components/admin/HitlCommentForm", () => ({
  HitlCommentForm: (props: {
    queueId: string;
    existingComment?: string | null;
    existingCorrectedScore?: number;
  }) => {
    commentFormPropsCapture(props);
    return (
      <div
        data-testid="hitl-comment-form-mock"
        data-queue-id={props.queueId}
        data-existing-comment={props.existingComment ?? ""}
        data-existing-score={
          typeof props.existingCorrectedScore === "number"
            ? String(props.existingCorrectedScore)
            : ""
        }
      >
        comment-form-mock
      </div>
    );
  },
}));

import HitlDetailPage from "@/app/admin/hitl/[id]/page";

// ============================================================================
// 상수 + helpers
// ============================================================================
const QUEUE_ID = "33333333-3333-4333-8333-333333333333";
const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function rowBase(overrides: Record<string, unknown> = {}) {
  return {
    id: QUEUE_ID,
    sessionId: SESSION_ID,
    userId: USER_ID,
    confidenceScore: 55,
    status: "pending",
    assignedExpertId: null,
    expertComment: null,
    correctedScore: null,
    reviewedAt: null,
    reviewedBy: null,
    slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    escalatedAt: null,
    completedAt: null,
    createdAt: new Date("2026-05-22T08:00:00Z"),
    evaluationResult: {
      targetPhoneme: "ㅅ",
      articulationScore: 62,
      linguisticScore: 70,
      acousticScore: 58,
      peerPercentile: 45,
      childAgeMonths: 60,
    },
    ...overrides,
  };
}

function makeProps(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  findUniqueMock.mockReset();
  notFoundMock.mockClear();
  commentFormPropsCapture.mockReset();
});

// ============================================================================
// 시나리오
// ============================================================================

describe("/admin/hitl/[id] — FR-C-013 detail page", () => {
  it("[시나리오 1] 정상 렌더 — sessionId / status / phoneme / confidence 노출", async () => {
    findUniqueMock.mockResolvedValueOnce(rowBase());

    const ui = await HitlDetailPage(makeProps(QUEUE_ID));
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='admin-hitl-detail-page']")).not.toBeNull();
    expect(container.querySelector("[data-testid='hitl-detail-session-id']")?.textContent).toContain(
      "11111111",
    );
    expect(container.querySelector("[data-testid='hitl-detail-status']")?.textContent).toBe("대기");
    expect(container.querySelector("[data-testid='hitl-detail-phoneme']")?.textContent).toBe("ㅅ");
    expect(container.querySelector("[data-testid='hitl-detail-confidence']")?.textContent).toBe(
      "55",
    );

    // Prisma findUnique 호출 인자 검증.
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    const call = findUniqueMock.mock.calls[0][0];
    expect(call.where).toEqual({ id: QUEUE_ID });
    expect(call.select).toHaveProperty("evaluationResult");
  });

  it("[시나리오 2] queueId 미존재 → notFound() 호출", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    await expect(HitlDetailPage(makeProps("missing-id"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("[시나리오 3] R4 — userId 4자리 + sessionId 8자리 truncate + visible text 미노출", async () => {
    findUniqueMock.mockResolvedValueOnce(rowBase());

    const ui = await HitlDetailPage(makeProps(QUEUE_ID));
    const { container } = render(ui);

    const userCell = container.querySelector("[data-testid='hitl-detail-user-id']");
    expect(userCell?.textContent).toBe("aaaa…");

    const sessionCell = container.querySelector("[data-testid='hitl-detail-session-id']");
    expect(sessionCell?.textContent).toContain("11111111…");

    // visible text 에 풀길이 미노출 — title 속성 (tooltip) 은 허용.
    const visibleText = container.textContent ?? "";
    expect(visibleText).not.toContain(USER_ID);
    expect(visibleText).not.toContain(SESSION_ID);
  });

  it("[시나리오 4] 기존 expertComment + correctedScore 있음 → 기존 코멘트 블록 + HitlCommentForm prefill", async () => {
    const existingComment = "조음 위치 보정 권고 — ㅅ 음소 혀끝 위치 안내 부탁드립니다.";
    findUniqueMock.mockResolvedValueOnce(
      rowBase({
        expertComment: existingComment,
        correctedScore: 75,
        reviewedAt: new Date("2026-05-22T18:00:00Z"),
        reviewedBy: "44444444-4444-4444-8444-444444444444",
        status: "completed",
      }),
    );

    const ui = await HitlDetailPage(makeProps(QUEUE_ID));
    const { container } = render(ui);

    const existingBlock = container.querySelector("[data-testid='hitl-detail-existing-comment']");
    expect(existingBlock).not.toBeNull();
    expect(
      container.querySelector("[data-testid='hitl-detail-existing-comment-text']")?.textContent,
    ).toBe(existingComment);
    expect(
      container.querySelector("[data-testid='hitl-detail-existing-corrected-score']")?.textContent,
    ).toBe("75");

    // HitlCommentForm prefill props 검증.
    expect(commentFormPropsCapture).toHaveBeenCalledTimes(1);
    const props = commentFormPropsCapture.mock.calls[0][0];
    expect(props.queueId).toBe(QUEUE_ID);
    expect(props.existingComment).toBe(existingComment);
    expect(props.existingCorrectedScore).toBe(75);
  });

  it("[시나리오 5] EvaluationResult 3축 점수 카드 렌더", async () => {
    findUniqueMock.mockResolvedValueOnce(rowBase());

    const ui = await HitlDetailPage(makeProps(QUEUE_ID));
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='hitl-detail-articulation']")?.textContent).toBe("62");
    expect(container.querySelector("[data-testid='hitl-detail-linguistic']")?.textContent).toBe("70");
    expect(container.querySelector("[data-testid='hitl-detail-acoustic']")?.textContent).toBe("58");
    expect(container.querySelector("[data-testid='hitl-detail-peer']")?.textContent).toBe("45");
  });

  it("[시나리오 6] CON-04 의료 금칙어 (치료/진단/장애) 0건", async () => {
    findUniqueMock.mockResolvedValueOnce(rowBase());

    const ui = await HitlDetailPage(makeProps(QUEUE_ID));
    const { container } = render(ui);

    const text = container.textContent ?? "";
    for (const forbidden of FORBIDDEN_MEDICAL_WORDS) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("[시나리오 7] Escalate 버튼 실 노출 (Agent B HitlEscalateButton 통합)", async () => {
    findUniqueMock.mockResolvedValueOnce(rowBase());

    const ui = await HitlDetailPage(makeProps(QUEUE_ID));
    const { container } = render(ui);

    const btn = container.querySelector(
      "[data-testid='hitl-escalate-button']",
    ) as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    // escalatedAt: null → alreadyEscalated=false → 버튼 활성화 상태.
    expect(btn?.disabled).toBe(false);
  });

  it("[시나리오 8] SLA 초과 항목 강조 (rose tone)", async () => {
    findUniqueMock.mockResolvedValueOnce(
      rowBase({
        slaDueAt: new Date(Date.now() - 60 * 60 * 1000), // 1시간 전 초과.
      }),
    );

    const ui = await HitlDetailPage(makeProps(QUEUE_ID));
    const { container } = render(ui);

    const sla = container.querySelector("[data-testid='hitl-detail-sla']");
    expect(sla?.textContent).toContain("초과");
    expect(sla?.className).toContain("rose");
  });
});

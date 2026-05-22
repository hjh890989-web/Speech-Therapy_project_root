// FR-C-014 잔여 (#37) — HitlEscalateButton Client Component 단위 테스트.
//
// 검증 시나리오 (≥4):
//   1. alreadyEscalated=true → 버튼 disabled + "이미 에스컬레이션된 항목" 안내 노출
//   2. 클릭 → fetch PATCH 호출 (정상 200) → router.refresh + 성공 메시지 노출
//   3. 429 응답 → "잠시 후 다시 시도" 안내 + status="rate_limited"
//   4. 5xx 에러 응답 → 에러 메시지 + status="error"
//   5. (보너스) 403 응답 → "권한 부족" 안내
//   6. (보너스) defaultReason 전달 시 body 에 reason 포함

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// next/navigation router mock — useRouter().refresh 캡처.
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import { HitlEscalateButton } from "@/components/admin/HitlEscalateButton";

const QUEUE_ID = "11111111-1111-4111-8111-111111111111";

const ORIGINAL_FETCH = globalThis.fetch;
const fetchMock = vi.fn();

beforeEach(() => {
  refreshMock.mockReset();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("HitlEscalateButton — disabled 상태", () => {
  it("[시나리오 1] alreadyEscalated=true → 버튼 disabled + 안내 노출", () => {
    render(<HitlEscalateButton queueId={QUEUE_ID} alreadyEscalated={true} skipConfirm />);
    const btn = screen.getByTestId("hitl-escalate-button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByTestId("hitl-escalate-already")).toBeInTheDocument();
    expect(screen.getByTestId("hitl-escalate-already").textContent).toContain("이미 에스컬레이션");
  });

  it("alreadyEscalated=true 시 클릭해도 fetch 호출 안 됨", async () => {
    render(<HitlEscalateButton queueId={QUEUE_ID} alreadyEscalated={true} skipConfirm />);
    const btn = screen.getByTestId("hitl-escalate-button");
    fireEvent.click(btn);
    // 비동기 작업 대기 (만약 호출됐다면 microtask 후 fetch 가 호출됨).
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("HitlEscalateButton — 정상 클릭", () => {
  it("[시나리오 2] 클릭 → PATCH 호출 + router.refresh + 성공 메시지", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        alreadyEscalated: false,
        queueId: QUEUE_ID,
        escalatedAt: new Date().toISOString(),
        slackNotified: true,
      }),
    );

    render(<HitlEscalateButton queueId={QUEUE_ID} alreadyEscalated={false} skipConfirm />);
    const btn = screen.getByTestId("hitl-escalate-button");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/hitl/${QUEUE_ID}/escalate`);
    expect(init.method).toBe("PATCH");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");

    await waitFor(() => {
      expect(screen.getByTestId("hitl-escalate-message")).toBeInTheDocument();
    });
    const msg = screen.getByTestId("hitl-escalate-message");
    expect(msg.getAttribute("data-status")).toBe("success");
    expect(msg.textContent).toContain("에스컬레이션 완료");

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("[시나리오 2b] alreadyEscalated:true 응답 → '이미 에스컬레이션' 메시지", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { ok: true, alreadyEscalated: true, queueId: QUEUE_ID }),
    );

    render(<HitlEscalateButton queueId={QUEUE_ID} alreadyEscalated={false} skipConfirm />);
    fireEvent.click(screen.getByTestId("hitl-escalate-button"));

    await waitFor(() => {
      expect(screen.getByTestId("hitl-escalate-message").textContent).toContain(
        "이미 에스컬레이션",
      );
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});

describe("HitlEscalateButton — 429 rate-limit", () => {
  it("[시나리오 3] 429 응답 → 'rate_limited' 상태 + retry 안내 노출", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(429, {
        error: "RATE_LIMITED",
        reason: "ACTOR_RATE_LIMIT",
        retryAfterSec: 42,
      }),
    );

    render(<HitlEscalateButton queueId={QUEUE_ID} alreadyEscalated={false} skipConfirm />);
    fireEvent.click(screen.getByTestId("hitl-escalate-button"));

    await waitFor(() => {
      expect(screen.getByTestId("hitl-escalate-message")).toBeInTheDocument();
    });
    const msg = screen.getByTestId("hitl-escalate-message");
    expect(msg.getAttribute("data-status")).toBe("rate_limited");
    expect(msg.textContent).toContain("42초");
    expect(msg.getAttribute("role")).toBe("alert");

    // 실패 → refresh 호출 안 함.
    expect(refreshMock).not.toHaveBeenCalled();
  });
});

describe("HitlEscalateButton — 에러 응답", () => {
  it("[시나리오 4] 500 응답 → 'error' 상태 + 에러 메시지", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { error: "DB_ERROR", detail: "connection lost" }),
    );

    render(<HitlEscalateButton queueId={QUEUE_ID} alreadyEscalated={false} skipConfirm />);
    fireEvent.click(screen.getByTestId("hitl-escalate-button"));

    await waitFor(() => {
      expect(screen.getByTestId("hitl-escalate-message")).toBeInTheDocument();
    });
    const msg = screen.getByTestId("hitl-escalate-message");
    expect(msg.getAttribute("data-status")).toBe("error");
    expect(msg.textContent).toContain("DB_ERROR");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("[시나리오 5] 403 응답 → '권한 부족' 메시지", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(403, { error: "FORBIDDEN" }),
    );

    render(<HitlEscalateButton queueId={QUEUE_ID} alreadyEscalated={false} skipConfirm />);
    fireEvent.click(screen.getByTestId("hitl-escalate-button"));

    await waitFor(() => {
      expect(screen.getByTestId("hitl-escalate-message").textContent).toContain("권한");
    });
  });

  it("[부록] 네트워크 예외 (fetch reject) → 에러 메시지", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    render(<HitlEscalateButton queueId={QUEUE_ID} alreadyEscalated={false} skipConfirm />);
    fireEvent.click(screen.getByTestId("hitl-escalate-button"));

    await waitFor(() => {
      expect(screen.getByTestId("hitl-escalate-message")).toBeInTheDocument();
    });
    const msg = screen.getByTestId("hitl-escalate-message");
    expect(msg.getAttribute("data-status")).toBe("error");
    expect(msg.textContent).toContain("network down");
  });
});

describe("HitlEscalateButton — defaultReason 전달", () => {
  it("[시나리오 6] defaultReason='duplicate' → body 에 reason 포함", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { ok: true, alreadyEscalated: false, queueId: QUEUE_ID }),
    );

    render(
      <HitlEscalateButton
        queueId={QUEUE_ID}
        alreadyEscalated={false}
        defaultReason="duplicate"
        skipConfirm
      />,
    );
    fireEvent.click(screen.getByTestId("hitl-escalate-button"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const parsedBody = JSON.parse(init.body as string) as { reason?: string };
    expect(parsedBody.reason).toBe("duplicate");
  });
});

describe("HitlEscalateButton — 금칙어 / CON-04", () => {
  it("DOM 텍스트 + 메시지 본문에 '치료' / '진단' / '장애' 미포함", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { ok: true, alreadyEscalated: false, queueId: QUEUE_ID }),
    );
    const { container } = render(
      <HitlEscalateButton queueId={QUEUE_ID} alreadyEscalated={true} skipConfirm />,
    );

    const initialText = container.textContent ?? "";
    for (const forbidden of ["치료", "진단", "장애"]) {
      expect(initialText).not.toContain(forbidden);
    }
  });
});

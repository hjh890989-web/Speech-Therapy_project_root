// FR-Q-TEACHER + FR-C-017+ — SendClassroomCushionButton Client Component 테스트.
//
// 검증 시나리오 (≥ 5):
//   1. studentCount=0 → 버튼 disabled + 빈 반 안내 노출
//   2. 클릭 → Server Action 호출 + sending 상태
//   3. status=ok 응답 → "N건 발송 / M건 skip / K건 실패" 토스트
//   4. status=rate_limited 응답 → 안내 + retryAfterSec 분 단위 표시
//   5. status=forbidden 응답 → "권한이 없어요" 안내
//   6. confirm dialog (skipConfirm=false default) → 거부 시 Server Action 호출 X
//   7. 금칙어 미포함 (CON-04)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const sendActionMock = vi.fn();
vi.mock("@/app/actions/classroom-cushion", () => ({
  sendClassroomCushionNotes: (...args: unknown[]) => sendActionMock(...args),
}));

import { SendClassroomCushionButton } from "@/components/admin/teacher/SendClassroomCushionButton";

const CLASS_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

beforeEach(() => {
  sendActionMock.mockReset();
});

describe("SendClassroomCushionButton — 입력 정합성", () => {
  it("[1] studentCount=0 → 버튼 disabled + 빈 반 안내 노출", () => {
    render(
      <SendClassroomCushionButton
        classId={CLASS_ID}
        studentCount={0}
        skipConfirm
      />,
    );
    const btn = screen.getByTestId(
      `send-classroom-cushion-button-${CLASS_ID}`,
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(
      screen.getByTestId(`send-classroom-cushion-empty-${CLASS_ID}`),
    ).toBeInTheDocument();
  });

  it("studentCount=0 → 클릭해도 Server Action 미호출", async () => {
    render(
      <SendClassroomCushionButton
        classId={CLASS_ID}
        studentCount={0}
        skipConfirm
      />,
    );
    fireEvent.click(
      screen.getByTestId(`send-classroom-cushion-button-${CLASS_ID}`),
    );
    await Promise.resolve();
    expect(sendActionMock).not.toHaveBeenCalled();
  });
});

describe("SendClassroomCushionButton — 정상 클릭 + Server Action", () => {
  it("[2] 클릭 → sendClassroomCushionNotes 호출 + classId 전달", async () => {
    sendActionMock.mockResolvedValueOnce({
      status: "ok",
      attempted: 5,
      sent: 4,
      skipped: 1,
      errors: 0,
      batchId: "cb_test",
    });
    render(
      <SendClassroomCushionButton
        classId={CLASS_ID}
        studentCount={5}
        skipConfirm
      />,
    );
    fireEvent.click(
      screen.getByTestId(`send-classroom-cushion-button-${CLASS_ID}`),
    );
    await waitFor(() => {
      expect(sendActionMock).toHaveBeenCalledTimes(1);
    });
    expect(sendActionMock.mock.calls[0][0]).toEqual({ classId: CLASS_ID });
  });

  it("[3] status=ok → '4건 발송 / 1건 skip / 0건 실패' 메시지", async () => {
    sendActionMock.mockResolvedValueOnce({
      status: "ok",
      attempted: 5,
      sent: 4,
      skipped: 1,
      errors: 0,
      batchId: "cb_test",
    });
    render(
      <SendClassroomCushionButton
        classId={CLASS_ID}
        studentCount={5}
        skipConfirm
      />,
    );
    fireEvent.click(
      screen.getByTestId(`send-classroom-cushion-button-${CLASS_ID}`),
    );
    await waitFor(() => {
      expect(
        screen.getByTestId(`send-classroom-cushion-message-${CLASS_ID}`),
      ).toBeInTheDocument();
    });
    const msg = screen.getByTestId(`send-classroom-cushion-message-${CLASS_ID}`);
    expect(msg.getAttribute("data-status")).toBe("sent");
    expect(msg.textContent).toContain("4건 발송");
    expect(msg.textContent).toContain("1건 skip");
    expect(msg.textContent).toContain("0건 실패");
  });
});

describe("SendClassroomCushionButton — 에러/rate-limit 응답", () => {
  it("[4] status=rate_limited → 안내 + 분 단위 표시 + role=alert", async () => {
    sendActionMock.mockResolvedValueOnce({
      status: "rate_limited",
      attempted: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      batchId: "cb_rl",
      retryAfterSec: 1800, // 30분
    });
    render(
      <SendClassroomCushionButton
        classId={CLASS_ID}
        studentCount={5}
        skipConfirm
      />,
    );
    fireEvent.click(
      screen.getByTestId(`send-classroom-cushion-button-${CLASS_ID}`),
    );
    await waitFor(() => {
      expect(
        screen.getByTestId(`send-classroom-cushion-message-${CLASS_ID}`),
      ).toBeInTheDocument();
    });
    const msg = screen.getByTestId(`send-classroom-cushion-message-${CLASS_ID}`);
    expect(msg.getAttribute("data-status")).toBe("rate_limited");
    expect(msg.textContent).toContain("30분");
    expect(msg.getAttribute("role")).toBe("alert");
  });

  it("[5] status=forbidden → '권한' 안내", async () => {
    sendActionMock.mockResolvedValueOnce({
      status: "forbidden",
      attempted: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      batchId: "cb_f",
    });
    render(
      <SendClassroomCushionButton
        classId={CLASS_ID}
        studentCount={5}
        skipConfirm
      />,
    );
    fireEvent.click(
      screen.getByTestId(`send-classroom-cushion-button-${CLASS_ID}`),
    );
    await waitFor(() => {
      expect(
        screen.getByTestId(`send-classroom-cushion-message-${CLASS_ID}`),
      ).toBeInTheDocument();
    });
    const msg = screen.getByTestId(`send-classroom-cushion-message-${CLASS_ID}`);
    expect(msg.getAttribute("data-status")).toBe("error");
    expect(msg.textContent).toContain("권한");
  });

  it("Server Action throw → '네트워크 오류' 메시지", async () => {
    sendActionMock.mockRejectedValueOnce(new Error("network down"));
    render(
      <SendClassroomCushionButton
        classId={CLASS_ID}
        studentCount={5}
        skipConfirm
      />,
    );
    fireEvent.click(
      screen.getByTestId(`send-classroom-cushion-button-${CLASS_ID}`),
    );
    await waitFor(() => {
      expect(
        screen.getByTestId(`send-classroom-cushion-message-${CLASS_ID}`),
      ).toBeInTheDocument();
    });
    const msg = screen.getByTestId(`send-classroom-cushion-message-${CLASS_ID}`);
    expect(msg.getAttribute("data-status")).toBe("error");
    expect(msg.textContent).toContain("network down");
  });
});

describe("SendClassroomCushionButton — confirm dialog", () => {
  it("[6] skipConfirm=false + confirm 거부 → Server Action 호출 X", async () => {
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => false);

    render(
      <SendClassroomCushionButton
        classId={CLASS_ID}
        studentCount={5}
      />,
    );
    fireEvent.click(
      screen.getByTestId(`send-classroom-cushion-button-${CLASS_ID}`),
    );
    await Promise.resolve();
    expect(window.confirm).toHaveBeenCalled();
    expect(sendActionMock).not.toHaveBeenCalled();

    window.confirm = originalConfirm;
  });

  it("skipConfirm=false + confirm 승인 → Server Action 호출", async () => {
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    sendActionMock.mockResolvedValueOnce({
      status: "ok",
      attempted: 3,
      sent: 3,
      skipped: 0,
      errors: 0,
      batchId: "cb_ok",
    });

    render(
      <SendClassroomCushionButton
        classId={CLASS_ID}
        studentCount={3}
      />,
    );
    fireEvent.click(
      screen.getByTestId(`send-classroom-cushion-button-${CLASS_ID}`),
    );
    await waitFor(() => {
      expect(sendActionMock).toHaveBeenCalledTimes(1);
    });

    window.confirm = originalConfirm;
  });
});

describe("SendClassroomCushionButton — CON-04 금칙어", () => {
  it("[7] DOM 텍스트에 '치료' / '진단' / '장애' 미포함", () => {
    const { container } = render(
      <SendClassroomCushionButton
        classId={CLASS_ID}
        studentCount={5}
        skipConfirm
      />,
    );
    const text = container.textContent ?? "";
    for (const forbidden of ["치료", "진단", "장애"]) {
      expect(text).not.toContain(forbidden);
    }
  });
});

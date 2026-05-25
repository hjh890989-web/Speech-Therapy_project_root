// FR-C-ACCOUNT — EmailChangeForm 컴포넌트 단위 테스트.
//
// 격리:
//   - @/app/actions/change-email mock (Server Action)
//   - @/lib/analytics trackEvent mock
//
// 시나리오 (총 6건):
//   1. 초기 mount → 현재 이메일 표시 + 제출 버튼 비활성 (빈 입력)
//   2. 입력 후 활성화 → 제출 → Server Action 호출 + success 메시지 + 분석 이벤트
//   3. invalid_email 응답 → 에러 분기 메시지 노출 (success 미노출)
//   4. same_as_current 응답 → 해당 에러 메시지
//   5. supabase_error 응답 → graceful 메시지
//   6. CON-04 — 모든 UI 카피에 의료 금칙어 0건

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const requestEmailChangeMock = vi.fn();
vi.mock("@/app/actions/change-email", () => ({
  requestEmailChange: (...args: unknown[]) => requestEmailChangeMock(...args),
}));

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

import { EmailChangeForm } from "@/components/settings/EmailChangeForm";

const CURRENT_EMAIL = "old@example.com";
const NEW_EMAIL = "new@example.com";
const FORBIDDEN = ["치료", "진단", "장애"];

beforeEach(() => {
  requestEmailChangeMock.mockReset();
  trackMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("EmailChangeForm — FR-C-ACCOUNT", () => {
  it("[1] 초기 mount → 현재 이메일 표시 + 제출 버튼 비활성 (빈 입력)", () => {
    render(<EmailChangeForm currentEmail={CURRENT_EMAIL} />);
    expect(screen.getByTestId("email-change-current").textContent).toContain(
      CURRENT_EMAIL,
    );
    const submit = screen.getByTestId(
      "email-change-submit",
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("[2] 입력 후 활성화 → 제출 → Server Action + success + 분석 이벤트", async () => {
    requestEmailChangeMock.mockResolvedValue({
      success: true,
      pendingEmail: NEW_EMAIL,
      analytics: { userId: "u-1" },
    });
    render(<EmailChangeForm currentEmail={CURRENT_EMAIL} />);

    const input = screen.getByTestId(
      "email-change-new-input",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: NEW_EMAIL } });

    const submit = screen.getByTestId(
      "email-change-submit",
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(submit);
    });

    await waitFor(() => {
      expect(requestEmailChangeMock).toHaveBeenCalledTimes(1);
    });
    expect(requestEmailChangeMock).toHaveBeenCalledWith({
      newEmail: NEW_EMAIL,
    });

    await waitFor(() => {
      expect(screen.getByTestId("email-change-success")).toBeTruthy();
    });
    expect(screen.getByTestId("email-change-success").textContent).toContain(
      NEW_EMAIL,
    );

    expect(trackMock).toHaveBeenCalledTimes(1);
    const evtArgs = trackMock.mock.calls[0]!;
    expect(evtArgs[0]).toBe("email_change_requested");
    expect(evtArgs[1].userId).toBe("u-1");
  });

  it("[3] invalid_email 응답 → 에러 분기 메시지 노출 (success 미노출)", async () => {
    // Server Action 측이 보다 엄격한 RFC 5321 검증을 적용 — 본 시나리오는 _Server Action 이
    // 반환한_ invalid_email 응답을 form 이 정확히 분기하는지 검증 (HTML5 type=email 의
    // primitive 검증은 클라이언트 single-line 보호일 뿐).
    requestEmailChangeMock.mockResolvedValue({
      success: false,
      reason: "invalid_email",
      message: "올바른 이메일 형식이 아니에요.",
    });
    render(<EmailChangeForm currentEmail={CURRENT_EMAIL} />);
    fireEvent.change(
      screen.getByTestId("email-change-new-input"),
      // 형식 자체는 유효 — Server Action 이 별도 사유 (예: 차단 도메인) 로 invalid_email 반환 가정.
      { target: { value: "blocked@example.com" } },
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("email-change-submit"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("email-change-error")).toBeTruthy();
    });
    expect(screen.getByTestId("email-change-error").textContent).toContain(
      "올바른 이메일",
    );
    expect(screen.queryByTestId("email-change-success")).toBeNull();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("[4] same_as_current 응답 → 해당 에러 메시지", async () => {
    requestEmailChangeMock.mockResolvedValue({
      success: false,
      reason: "same_as_current",
      message: "현재 이메일과 동일해요. 다른 이메일을 입력해 주세요.",
    });
    render(<EmailChangeForm currentEmail={CURRENT_EMAIL} />);
    fireEvent.change(
      screen.getByTestId("email-change-new-input"),
      { target: { value: CURRENT_EMAIL } },
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("email-change-submit"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("email-change-error").textContent).toContain(
        "현재 이메일과 동일",
      );
    });
  });

  it("[5] supabase_error 응답 → graceful 메시지", async () => {
    requestEmailChangeMock.mockResolvedValue({
      success: false,
      reason: "supabase_error",
      message: "이메일 변경 요청에 실패했어요. 잠시 후 다시 시도해 주세요.",
    });
    render(<EmailChangeForm currentEmail={CURRENT_EMAIL} />);
    fireEvent.change(
      screen.getByTestId("email-change-new-input"),
      { target: { value: NEW_EMAIL } },
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("email-change-submit"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("email-change-error").textContent).toContain(
        "실패",
      );
    });
  });

  it("[6] CON-04 — 전체 UI 카피에 의료 금칙어 0건", () => {
    render(<EmailChangeForm currentEmail={CURRENT_EMAIL} />);
    const all = document.body.textContent ?? "";
    for (const w of FORBIDDEN) {
      expect(all).not.toContain(w);
    }
  });
});

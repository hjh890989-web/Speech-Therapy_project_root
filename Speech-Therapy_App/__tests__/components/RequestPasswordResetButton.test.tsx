// FR-C-ACCOUNT — RequestPasswordResetButton 컴포넌트 단위 테스트.
//
// 격리:
//   - @/app/actions/request-password-reset mock (Server Action)
//   - @/lib/analytics trackEvent mock
//
// 시나리오 (총 5건):
//   1. 초기 mount → 버튼 활성 + 안내 메시지 없음
//   2. 클릭 → Server Action 호출 + success 메시지 (이메일 노출) + 분석 이벤트
//   3. unauthorized 응답 → 에러 메시지 (success 미노출)
//   4. supabase_error 응답 → graceful 메시지
//   5. CON-04 — 모든 UI 카피에 의료 금칙어 0건

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const requestPasswordResetMock = vi.fn();
vi.mock("@/app/actions/request-password-reset", () => ({
  requestPasswordReset: (...args: unknown[]) =>
    requestPasswordResetMock(...args),
}));

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

import { RequestPasswordResetButton } from "@/components/settings/RequestPasswordResetButton";

const USER_EMAIL = "parent@example.com";
const FORBIDDEN = ["치료", "진단", "장애"];

beforeEach(() => {
  requestPasswordResetMock.mockReset();
  trackMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RequestPasswordResetButton — FR-C-ACCOUNT", () => {
  it("[1] 초기 mount → 버튼 활성 + 안내 메시지 없음", () => {
    render(<RequestPasswordResetButton />);
    const btn = screen.getByTestId(
      "password-reset-button",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(screen.queryByTestId("password-reset-success")).toBeNull();
    expect(screen.queryByTestId("password-reset-error")).toBeNull();
  });

  it("[2] 클릭 → Server Action + success 메시지 (이메일 노출) + 분석 이벤트", async () => {
    requestPasswordResetMock.mockResolvedValue({
      success: true,
      sentToEmail: USER_EMAIL,
      analytics: { userId: "u-1" },
    });
    render(<RequestPasswordResetButton />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("password-reset-button"));
    });
    await waitFor(() => {
      expect(requestPasswordResetMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByTestId("password-reset-success")).toBeTruthy();
    });
    expect(screen.getByTestId("password-reset-success").textContent).toContain(
      USER_EMAIL,
    );

    expect(trackMock).toHaveBeenCalledTimes(1);
    const evtArgs = trackMock.mock.calls[0]!;
    expect(evtArgs[0]).toBe("password_reset_requested");
    expect(evtArgs[1].userId).toBe("u-1");

    // success 이후 버튼은 비활성 (재발송 방지).
    const btn = screen.getByTestId(
      "password-reset-button",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("[3] unauthorized 응답 → 에러 메시지 (success 미노출)", async () => {
    requestPasswordResetMock.mockResolvedValue({
      success: false,
      reason: "unauthorized",
      message: "로그인 후 다시 시도해 주세요.",
    });
    render(<RequestPasswordResetButton />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("password-reset-button"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("password-reset-error").textContent).toContain(
        "로그인",
      );
    });
    expect(screen.queryByTestId("password-reset-success")).toBeNull();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("[4] supabase_error 응답 → graceful 메시지", async () => {
    requestPasswordResetMock.mockResolvedValue({
      success: false,
      reason: "supabase_error",
      message: "비밀번호 재설정 메일 발송에 실패했어요. 잠시 후 다시 시도해 주세요.",
    });
    render(<RequestPasswordResetButton />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("password-reset-button"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("password-reset-error").textContent).toContain(
        "실패",
      );
    });
  });

  it("[5] CON-04 — 전체 UI 카피에 의료 금칙어 0건", () => {
    render(<RequestPasswordResetButton />);
    const all = document.body.textContent ?? "";
    for (const w of FORBIDDEN) {
      expect(all).not.toContain(w);
    }
  });
});

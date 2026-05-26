// FR-2FA-RECOVERY — AdminTotpResetForm 상태 머신 / submit 흐름 단위 테스트.
//
// 격리:
//   - @/app/actions/admin-reset-totp mock (adminResetTotp)
//   - @/lib/analytics mock (trackEvent)
//
// 시나리오:
//   [1] 초기 렌더 — submit 버튼 disabled (emails 비어 있음)
//   [2] 두 email 일치 시 submit 활성화 → 일치하지 않으면 disabled 유지
//   [3] prefilledTargetEmail prop → 첫 input 에 초기값 노출
//   [4] submit → success → success UI 노출 + trackEvent('admin_totp_reset')
//   [5] submit → server-side failure (forbidden) → error UI + 재시도 가능
//   [6] success 직후 "다른 사용자 초기화" 버튼 → idle 복귀

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";

const adminResetTotpMock = vi.fn();
vi.mock("@/app/actions/admin-reset-totp", () => ({
  adminResetTotp: (...args: unknown[]) => adminResetTotpMock(...args),
}));

const trackEventMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

import { AdminTotpResetForm } from "@/components/security/AdminTotpResetForm";

const TARGET = "victim@example.com";
const ADMIN_ID = "admin-uuid-aaa";
const TARGET_ID = "target-uuid-bbb";

beforeEach(() => {
  adminResetTotpMock.mockReset();
  trackEventMock.mockReset();
});

describe("AdminTotpResetForm — FR-2FA-RECOVERY 상태 머신", () => {
  it("[1] 초기 렌더 — submit disabled (emails 비어 있음)", () => {
    const { container } = render(<AdminTotpResetForm />);
    const submit = container.querySelector(
      "[data-testid='admin-totp-reset-submit']",
    ) as HTMLButtonElement | null;
    expect(submit).not.toBeNull();
    expect(submit!.disabled).toBe(true);
  });

  it("[2] 두 email 일치 시 submit 활성화, 불일치면 disabled", () => {
    const { container } = render(<AdminTotpResetForm />);
    const targetInput = container.querySelector(
      "[data-testid='admin-totp-reset-target']",
    ) as HTMLInputElement;
    const confirmInput = container.querySelector(
      "[data-testid='admin-totp-reset-confirm']",
    ) as HTMLInputElement;
    const submit = container.querySelector(
      "[data-testid='admin-totp-reset-submit']",
    ) as HTMLButtonElement;

    fireEvent.change(targetInput, { target: { value: TARGET } });
    fireEvent.change(confirmInput, { target: { value: "wrong@example.com" } });
    expect(submit.disabled).toBe(true);

    fireEvent.change(confirmInput, { target: { value: TARGET } });
    expect(submit.disabled).toBe(false);

    fireEvent.change(confirmInput, { target: { value: "" } });
    expect(submit.disabled).toBe(true);
  });

  it("[3] prefilledTargetEmail prop → 첫 input 초기값", () => {
    const { container } = render(
      <AdminTotpResetForm prefilledTargetEmail="user@example.com" />,
    );
    const targetInput = container.querySelector(
      "[data-testid='admin-totp-reset-target']",
    ) as HTMLInputElement;
    expect(targetInput.value).toBe("user@example.com");
  });

  it("[4] submit → success → success UI + trackEvent('admin_totp_reset')", async () => {
    adminResetTotpMock.mockResolvedValueOnce({
      success: true,
      analytics: { adminUserId: ADMIN_ID, targetUserId: TARGET_ID },
      factorsUnenrolled: 2,
      previousBackupCodesCount: 5,
    });

    const { container } = render(<AdminTotpResetForm />);
    const targetInput = container.querySelector(
      "[data-testid='admin-totp-reset-target']",
    ) as HTMLInputElement;
    const confirmInput = container.querySelector(
      "[data-testid='admin-totp-reset-confirm']",
    ) as HTMLInputElement;
    const form = container.querySelector(
      "[data-testid='admin-totp-reset-form']",
    ) as HTMLFormElement;

    fireEvent.change(targetInput, { target: { value: TARGET } });
    fireEvent.change(confirmInput, { target: { value: TARGET } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        container.querySelector("[data-testid='admin-totp-reset-success']"),
      ).not.toBeNull();
    });

    // Server Action 호출 인자 검증.
    expect(adminResetTotpMock).toHaveBeenCalledWith({
      targetUserEmail: TARGET,
      confirmationEmail: TARGET,
    });
    // trackEvent 호출 검증.
    expect(trackEventMock).toHaveBeenCalledWith("admin_totp_reset", {
      adminUserId: ADMIN_ID,
      targetUserId: TARGET_ID,
    });
    // success detail 노출.
    expect(
      container.querySelector(
        "[data-testid='admin-totp-reset-success-detail']",
      ),
    ).not.toBeNull();
    // form 자체는 unmount.
    expect(
      container.querySelector("[data-testid='admin-totp-reset-form']"),
    ).toBeNull();
  });

  it("[5] submit → server-side failure (forbidden) → error UI + 재시도 가능", async () => {
    adminResetTotpMock.mockResolvedValueOnce({
      success: false,
      reason: "forbidden",
      message: "관리자(admin) 권한이 필요해요.",
    });

    const { container } = render(<AdminTotpResetForm />);
    const targetInput = container.querySelector(
      "[data-testid='admin-totp-reset-target']",
    ) as HTMLInputElement;
    const confirmInput = container.querySelector(
      "[data-testid='admin-totp-reset-confirm']",
    ) as HTMLInputElement;
    const form = container.querySelector(
      "[data-testid='admin-totp-reset-form']",
    ) as HTMLFormElement;

    fireEvent.change(targetInput, { target: { value: TARGET } });
    fireEvent.change(confirmInput, { target: { value: TARGET } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        container.querySelector("[data-testid='admin-totp-reset-error']"),
      ).not.toBeNull();
    });

    const err = container.querySelector(
      "[data-testid='admin-totp-reset-error']",
    );
    expect(err!.textContent).toContain("관리자(admin) 권한이 필요해요.");
    // form 은 그대로 — 재시도 가능 (submit 버튼 enabled).
    const submit = container.querySelector(
      "[data-testid='admin-totp-reset-submit']",
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    // trackEvent 미호출 (실패였으므로).
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("[6] success 직후 '다른 사용자 초기화' 클릭 → idle 복귀 (form 다시 노출)", async () => {
    adminResetTotpMock.mockResolvedValueOnce({
      success: true,
      analytics: { adminUserId: ADMIN_ID, targetUserId: TARGET_ID },
      factorsUnenrolled: 1,
      previousBackupCodesCount: 0,
    });

    const { container } = render(<AdminTotpResetForm />);
    const targetInput = container.querySelector(
      "[data-testid='admin-totp-reset-target']",
    ) as HTMLInputElement;
    const confirmInput = container.querySelector(
      "[data-testid='admin-totp-reset-confirm']",
    ) as HTMLInputElement;
    const form = container.querySelector(
      "[data-testid='admin-totp-reset-form']",
    ) as HTMLFormElement;

    fireEvent.change(targetInput, { target: { value: TARGET } });
    fireEvent.change(confirmInput, { target: { value: TARGET } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        container.querySelector("[data-testid='admin-totp-reset-success']"),
      ).not.toBeNull();
    });

    const retryBtn = container.querySelector(
      "[data-testid='admin-totp-reset-retry']",
    ) as HTMLButtonElement;
    fireEvent.click(retryBtn);

    // form 다시 노출 + success 사라짐.
    await waitFor(() => {
      expect(
        container.querySelector("[data-testid='admin-totp-reset-form']"),
      ).not.toBeNull();
    });
    expect(
      container.querySelector("[data-testid='admin-totp-reset-success']"),
    ).toBeNull();
  });
});

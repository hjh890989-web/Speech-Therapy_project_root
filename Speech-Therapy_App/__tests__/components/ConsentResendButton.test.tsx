// FR-CONSENT-REMINDER-UI — ConsentResendButton 컴포넌트 단위 테스트.
//
// 격리:
//   - @/app/actions/resend-consent-reminder mock (Server Action)
//   - @/lib/analytics trackEvent mock
//
// 시나리오 (총 6건):
//   1. 초기 mount → 버튼 활성 + 안내/에러 메시지 없음
//   2. 클릭 → Server Action 호출 + success 메시지 + 분석 이벤트 + 버튼 disabled
//   3. emailSkipped=true → success 메시지에 '실제 발송은 지연될 수 있어요' 표시
//   4. not_found 응답 → 에러 메시지 노출 + 분석 이벤트 미발송 + 버튼 재활성화
//   5. send_failed 응답 → 에러 메시지 노출 (재시도 가능)
//   6. CON-04 — 모든 분기 UI 카피에 의료 금칙어 0건

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const resendMock = vi.fn();
vi.mock("@/app/actions/resend-consent-reminder", () => ({
  resendConsentReminder: (...args: unknown[]) => resendMock(...args),
}));

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

import { ConsentResendButton } from "@/components/settings/ConsentResendButton";

const CONSENT_ID = "11111111-2222-3333-4444-555555555555";
const USER_ID = "user-uuid-resend-btn";
const FORBIDDEN = ["치료", "진단", "장애"];

beforeEach(() => {
  resendMock.mockReset();
  trackMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ConsentResendButton — FR-CONSENT-REMINDER-UI", () => {
  it("[1] 초기 mount → 버튼 활성 + 안내/에러 메시지 없음", () => {
    render(<ConsentResendButton consentSignatureId={CONSENT_ID} />);
    const btn = screen.getByTestId(
      "consent-resend-button",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(screen.queryByTestId("consent-resend-success")).toBeNull();
    expect(screen.queryByTestId("consent-resend-error")).toBeNull();

    const root = screen.getByTestId("consent-resend-root");
    expect(root.getAttribute("data-consent-id")).toBe(CONSENT_ID);
  });

  it("[2] 클릭 → Server Action + success 메시지 + 분석 이벤트 + 버튼 disabled", async () => {
    resendMock.mockResolvedValue({
      success: true,
      consentSuffix: CONSENT_ID.slice(-4),
      emailSkipped: false,
      analytics: { userId: USER_ID, consentSignatureId: CONSENT_ID },
    });
    render(<ConsentResendButton consentSignatureId={CONSENT_ID} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("consent-resend-button"));
    });
    await waitFor(() => {
      expect(resendMock).toHaveBeenCalledTimes(1);
    });
    // Server Action 인자에 정확한 id 전달.
    expect(resendMock.mock.calls[0]![0]).toEqual({
      consentSignatureId: CONSENT_ID,
    });

    await waitFor(() => {
      expect(screen.getByTestId("consent-resend-success")).toBeTruthy();
    });
    const successText = screen.getByTestId("consent-resend-success").textContent ?? "";
    // 정상 발송 카피.
    expect(successText).toMatch(/안내 메일을 다시 보냈어요/);

    // 분석 이벤트 1회.
    expect(trackMock).toHaveBeenCalledTimes(1);
    const evtArgs = trackMock.mock.calls[0]!;
    expect(evtArgs[0]).toBe("consent_reminder_resent");
    expect(evtArgs[1]).toEqual({
      userId: USER_ID,
      consentSignatureId: CONSENT_ID,
    });

    // success 후 버튼 disabled.
    const btn = screen.getByTestId(
      "consent-resend-button",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toMatch(/다시 보냈어요/);
  });

  it("[3] emailSkipped=true → success 카피에 발송 지연 안내", async () => {
    resendMock.mockResolvedValue({
      success: true,
      consentSuffix: CONSENT_ID.slice(-4),
      emailSkipped: true,
      analytics: { userId: USER_ID, consentSignatureId: CONSENT_ID },
    });
    render(<ConsentResendButton consentSignatureId={CONSENT_ID} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("consent-resend-button"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("consent-resend-success")).toBeTruthy();
    });
    const txt = screen.getByTestId("consent-resend-success").textContent ?? "";
    expect(txt).toMatch(/지연될 수 있어요/);
  });

  it("[4] not_found 응답 → 에러 메시지 + 분석 이벤트 미발송 + 버튼 재활성화", async () => {
    resendMock.mockResolvedValue({
      success: false,
      reason: "not_found",
      message: "재발송할 동의서를 찾을 수 없어요.",
    });
    render(<ConsentResendButton consentSignatureId={CONSENT_ID} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("consent-resend-button"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("consent-resend-error").textContent).toContain(
        "찾을 수 없어요",
      );
    });
    expect(screen.queryByTestId("consent-resend-success")).toBeNull();
    expect(trackMock).not.toHaveBeenCalled();

    // 에러 후 버튼 재활성화 (재시도 가능).
    const btn = screen.getByTestId(
      "consent-resend-button",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("[5] send_failed 응답 → 에러 메시지 (재시도 가능)", async () => {
    resendMock.mockResolvedValue({
      success: false,
      reason: "send_failed",
      message: "재발송에 실패했어요. 잠시 후 다시 시도해 주세요.",
    });
    render(<ConsentResendButton consentSignatureId={CONSENT_ID} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("consent-resend-button"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("consent-resend-error").textContent).toContain(
        "실패",
      );
    });
  });

  it("[6] CON-04 — 모든 분기 UI 카피에 의료 금칙어 0건", async () => {
    // idle.
    const idleUi = render(
      <ConsentResendButton consentSignatureId={CONSENT_ID} />,
    );
    for (const w of FORBIDDEN) {
      expect(idleUi.container.textContent ?? "").not.toContain(w);
    }
    idleUi.unmount();

    // success.
    resendMock.mockResolvedValueOnce({
      success: true,
      consentSuffix: "abcd",
      emailSkipped: false,
      analytics: { userId: USER_ID, consentSignatureId: CONSENT_ID },
    });
    const successUi = render(
      <ConsentResendButton consentSignatureId={CONSENT_ID} />,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("consent-resend-button"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("consent-resend-success")).toBeTruthy();
    });
    for (const w of FORBIDDEN) {
      expect(successUi.container.textContent ?? "").not.toContain(w);
    }
    successUi.unmount();

    // error.
    resendMock.mockResolvedValueOnce({
      success: false,
      reason: "not_found",
      message: "재발송할 동의서를 찾을 수 없어요.",
    });
    const errorUi = render(
      <ConsentResendButton consentSignatureId={CONSENT_ID} />,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("consent-resend-button"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("consent-resend-error")).toBeTruthy();
    });
    for (const w of FORBIDDEN) {
      expect(errorUi.container.textContent ?? "").not.toContain(w);
    }
  });
});

// FR-Q-022 — PrivacyConsentForm next 복귀 단위 테스트.
//
// 격리: savePrivacyConsent Server Action + next/navigation useRouter mock.
// 핵심: 동의 성공 시 nextPath 가 있으면 router.push(nextPath) (예: /chat 복귀), 없으면 success 표시만.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const saveMock = vi.fn();
vi.mock("@/app/actions/privacy-consent", () => ({
  savePrivacyConsent: (...a: unknown[]) => saveMock(...a),
}));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { PrivacyConsentForm } from "@/components/settings/PrivacyConsentForm";

beforeEach(() => {
  saveMock.mockReset();
  pushMock.mockReset();
  saveMock.mockResolvedValue({ success: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PrivacyConsentForm — FR-Q-022 next 복귀", () => {
  it("두 동의 미체크 → 제출 버튼 disabled", () => {
    render(
      <PrivacyConsentForm
        initialPipaConsented={false}
        initialOverseasConsented={false}
      />,
    );
    expect(
      (screen.getByTestId("privacy-consent-submit") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("저장 성공 + nextPath 없음 → success 표시, redirect 안 함", async () => {
    render(
      <PrivacyConsentForm
        initialPipaConsented={true}
        initialOverseasConsented={true}
      />,
    );
    fireEvent.click(screen.getByTestId("privacy-consent-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("privacy-consent-success")).toBeTruthy(),
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("저장 성공 + nextPath='/chat' → router.push('/chat') 복귀", async () => {
    render(
      <PrivacyConsentForm
        initialPipaConsented={true}
        initialOverseasConsented={true}
        nextPath="/chat"
      />,
    );
    fireEvent.click(screen.getByTestId("privacy-consent-submit"));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/chat"));
  });

  it("저장 실패 → nextPath 있어도 redirect 안 함", async () => {
    saveMock.mockResolvedValue({ success: false, reason: "db_failed" });
    render(
      <PrivacyConsentForm
        initialPipaConsented={true}
        initialOverseasConsented={true}
        nextPath="/chat"
      />,
    );
    fireEvent.click(screen.getByTestId("privacy-consent-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("privacy-consent-error")).toBeTruthy(),
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});

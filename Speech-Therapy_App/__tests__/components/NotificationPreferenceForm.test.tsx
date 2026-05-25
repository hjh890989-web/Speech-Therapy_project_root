// FR-C-NOTIFICATION-PREFERENCE — NotificationPreferenceForm 컴포넌트 단위 테스트.
//
// 격리:
//   - @/app/actions/update-notification-preference mock (Server Action)
//   - @/lib/analytics trackEvent mock
//
// 시나리오 (총 6건):
//   1. 초기 mount → 4종 토글 노출 + initialPreference 반영 (checked 상태)
//   2. 토글 변경 → checked 상태 즉시 반영
//   3. 변경 없이 저장 → 서버 호출 없이 success toast (UX 단순화)
//   4. 변경 후 저장 → Server Action 호출 + success toast + 분석 이벤트
//   5. Server Action 실패 → 에러 분기 메시지 노출 (success 미노출)
//   6. CON-04 — 모든 UI 카피에 의료 금칙어 0건

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const updateMock = vi.fn();
vi.mock("@/app/actions/update-notification-preference", () => ({
  updateNotificationPreference: (...args: unknown[]) => updateMock(...args),
}));

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

import { NotificationPreferenceForm } from "@/components/settings/NotificationPreferenceForm";

const ALL_TRUE = {
  weeklyReportEmail: true,
  cushionNoteEmail: true,
  consentReminderEmail: true,
  parentInviteEmail: true,
};
const FORBIDDEN_MEDICAL = ["치료", "진단", "장애"];

beforeEach(() => {
  updateMock.mockReset();
  trackMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NotificationPreferenceForm — FR-C-NOTIFICATION-PREFERENCE", () => {
  it("[1] 초기 mount → 4종 토글 노출 + initialPreference 반영", () => {
    render(
      <NotificationPreferenceForm
        initialPreference={{
          ...ALL_TRUE,
          cushionNoteEmail: false,
        }}
      />,
    );

    const weekly = screen.getByTestId(
      "notification-toggle-weeklyReportEmail",
    ) as HTMLInputElement;
    const cushion = screen.getByTestId(
      "notification-toggle-cushionNoteEmail",
    ) as HTMLInputElement;
    const consent = screen.getByTestId(
      "notification-toggle-consentReminderEmail",
    ) as HTMLInputElement;
    const invite = screen.getByTestId(
      "notification-toggle-parentInviteEmail",
    ) as HTMLInputElement;

    expect(weekly.checked).toBe(true);
    expect(cushion.checked).toBe(false);
    expect(consent.checked).toBe(true);
    expect(invite.checked).toBe(true);
  });

  it("[2] 토글 변경 → checked 상태 즉시 반영", () => {
    render(<NotificationPreferenceForm initialPreference={ALL_TRUE} />);

    const weekly = screen.getByTestId(
      "notification-toggle-weeklyReportEmail",
    ) as HTMLInputElement;
    expect(weekly.checked).toBe(true);

    fireEvent.click(weekly);
    expect(weekly.checked).toBe(false);

    fireEvent.click(weekly);
    expect(weekly.checked).toBe(true);
  });

  it("[3] 변경 없이 저장 → 서버 호출 없이 success toast", async () => {
    render(<NotificationPreferenceForm initialPreference={ALL_TRUE} />);
    const submit = screen.getByTestId(
      "notification-preference-submit",
    ) as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(submit);
    });

    expect(updateMock).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId("notification-preference-success-toast"),
    ).not.toBeNull();
  });

  it("[4] 변경 후 저장 → Server Action 호출 + success toast + 분석 이벤트", async () => {
    updateMock.mockResolvedValue({
      success: true,
      preference: {
        ...ALL_TRUE,
        cushionNoteEmail: false,
      },
      analytics: { userId: "u-1", changed: ["cushionNoteEmail"] },
    });

    render(<NotificationPreferenceForm initialPreference={ALL_TRUE} />);

    const cushion = screen.getByTestId(
      "notification-toggle-cushionNoteEmail",
    ) as HTMLInputElement;
    fireEvent.click(cushion);
    expect(cushion.checked).toBe(false);

    const submit = screen.getByTestId(
      "notification-preference-submit",
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(submit);
    });

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledTimes(1);
    });
    // Server Action 은 diff (변경된 키만) 전달.
    expect(updateMock).toHaveBeenCalledWith({ cushionNoteEmail: false });

    // 분석 이벤트 — 정확한 페이로드.
    expect(trackMock).toHaveBeenCalledWith("notification_preference_updated", {
      userId: "u-1",
      changed: ["cushionNoteEmail"],
    });
    // success toast.
    await waitFor(() => {
      expect(
        screen.queryByTestId("notification-preference-success-toast"),
      ).not.toBeNull();
    });
  });

  it("[5] Server Action 실패 → 에러 메시지 노출 (success 미노출)", async () => {
    updateMock.mockResolvedValue({
      success: false,
      reason: "db_failed",
      message: "알림 옵션 저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
    });

    render(<NotificationPreferenceForm initialPreference={ALL_TRUE} />);

    const cushion = screen.getByTestId(
      "notification-toggle-cushionNoteEmail",
    ) as HTMLInputElement;
    fireEvent.click(cushion);

    const submit = screen.getByTestId(
      "notification-preference-submit",
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(submit);
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId("notification-preference-error"),
      ).not.toBeNull();
    });
    expect(
      screen.queryByTestId("notification-preference-success-toast"),
    ).toBeNull();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("[6] CON-04 — 모든 UI 텍스트 (토글 라벨 / 안내 / 버튼) 에 의료 금칙어 0건", () => {
    const { container } = render(
      <NotificationPreferenceForm initialPreference={ALL_TRUE} />,
    );
    const allText = container.textContent ?? "";
    for (const w of FORBIDDEN_MEDICAL) {
      expect(allText).not.toContain(w);
    }
    // aria-label 도 점검.
    const inputs = Array.from(container.querySelectorAll("input"));
    for (const input of inputs) {
      const aria = input.getAttribute("aria-label") ?? "";
      for (const w of FORBIDDEN_MEDICAL) {
        expect(aria).not.toContain(w);
      }
    }
  });
});

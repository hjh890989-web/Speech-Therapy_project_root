// FR-C-SECURITY (MFA 마무리) — MfaChallengeForm 컴포넌트 단위 테스트.
//
// 격리:
//   - @/app/actions/verify-mfa-challenge mock (Server Action)
//   - @/lib/analytics trackEvent mock
//   - next/navigation useRouter mock (replace + refresh)
//
// 시나리오 (≥ 4):
//   1. 초기 mount → TOTP mode (data-mode=totp) + 6자리 input + 확인 버튼 비활성
//   2. 6자리 입력 → 활성 → submit → Server Action + trackEvent + router.replace(next)
//   3. invalid_code 응답 → 에러 메시지 + trackEvent failed (reason='wrong_code')
//   4. 모드 토글 → backup → 8자리 input → submit + 잔여 카운트 표시
//   5. backup 사용 성공 → remaining hint + trackEvent succeeded (mode='backup')
//   6. CON-04 — UI 카피에 의료 금칙어 0건

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const verifyMock = vi.fn();
vi.mock("@/app/actions/verify-mfa-challenge", () => ({
  verifyMfaChallenge: (...args: unknown[]) => verifyMock(...args),
}));

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

const replaceMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: (...args: unknown[]) => replaceMock(...args),
    refresh: (...args: unknown[]) => refreshMock(...args),
  }),
}));

import { MfaChallengeForm } from "@/components/auth/MfaChallengeForm";

const FACTOR_ID = "factor-mfa-form-1";
const NEXT_URL = "/rewards";
const USER_ID = "user-uuid-mfa-form-1";
const FORBIDDEN = ["치료", "진단", "장애"];

beforeEach(() => {
  verifyMock.mockReset();
  trackMock.mockReset();
  replaceMock.mockReset();
  refreshMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MfaChallengeForm — FR-C-SECURITY", () => {
  it("[1] 초기 mount → TOTP mode + 6자리 input + 확인 버튼 비활성", () => {
    render(<MfaChallengeForm factorId={FACTOR_ID} next={NEXT_URL} />);
    const form = screen.getByTestId("mfa-challenge-form");
    expect(form.getAttribute("data-mode")).toBe("totp");
    expect(screen.getByTestId("mfa-totp-input")).toBeTruthy();
    const submit = screen.getByTestId(
      "mfa-challenge-submit",
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("[2] 6자리 입력 → submit → Server Action + trackEvent + router.replace(next)", async () => {
    verifyMock.mockResolvedValue({
      success: true,
      analytics: { userId: USER_ID, mode: "totp" },
    });
    render(<MfaChallengeForm factorId={FACTOR_ID} next={NEXT_URL} />);

    const input = screen.getByTestId("mfa-totp-input") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "123456" } });
    });
    const submit = screen.getByTestId(
      "mfa-challenge-submit",
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(submit);
    });

    await waitFor(() => {
      expect(verifyMock).toHaveBeenCalledWith({
        mode: "totp",
        factorId: FACTOR_ID,
        code: "123456",
      });
    });
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(NEXT_URL);
    });
    expect(refreshMock).toHaveBeenCalled();
    expect(trackMock).toHaveBeenCalledWith("mfa_challenge_succeeded", {
      userId: USER_ID,
      mode: "totp",
    });
  });

  it("[3] invalid_code 응답 → 에러 메시지 + trackEvent failed (reason='wrong_code')", async () => {
    verifyMock.mockResolvedValue({
      success: false,
      reason: "invalid_code",
      message: "코드가 일치하지 않아요. 다시 확인 후 입력해 주세요.",
      analytics: { userId: USER_ID, mode: "totp" },
    });
    render(<MfaChallengeForm factorId={FACTOR_ID} next={NEXT_URL} />);

    const input = screen.getByTestId("mfa-totp-input") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "111111" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("mfa-challenge-submit"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("mfa-challenge-error").textContent).toContain(
        "코드가 일치하지 않아요",
      );
    });
    expect(replaceMock).not.toHaveBeenCalled();
    expect(trackMock).toHaveBeenCalledWith("mfa_challenge_failed", {
      userId: USER_ID,
      mode: "totp",
      reason: "wrong_code",
    });
  });

  it("[4] 모드 토글 → backup mode + 8자리 input + submit (mode=backup)", async () => {
    verifyMock.mockResolvedValue({
      success: false,
      reason: "invalid_code",
      message: "백업 코드가 일치하지 않아요. 다른 코드를 사용해 주세요.",
      remainingBackupCodes: 4,
      analytics: { userId: USER_ID, mode: "backup" },
    });
    render(<MfaChallengeForm factorId={FACTOR_ID} next={NEXT_URL} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("mfa-toggle-mode"));
    });

    const form = screen.getByTestId("mfa-challenge-form");
    expect(form.getAttribute("data-mode")).toBe("backup");

    const input = screen.getByTestId("mfa-backup-input") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "ABCD1234" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("mfa-challenge-submit"));
    });

    await waitFor(() => {
      expect(verifyMock).toHaveBeenCalledWith({
        mode: "backup",
        code: "ABCD1234",
      });
    });
    await waitFor(() => {
      expect(
        screen.getByTestId("mfa-challenge-remaining").textContent,
      ).toContain("4");
    });
  });

  it("[5] backup 사용 성공 → trackEvent succeeded (mode='backup') + router.replace", async () => {
    verifyMock.mockResolvedValue({
      success: true,
      remainingBackupCodes: 7,
      analytics: { userId: USER_ID, mode: "backup" },
    });
    render(<MfaChallengeForm factorId={FACTOR_ID} next={NEXT_URL} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("mfa-toggle-mode"));
    });
    await act(async () => {
      fireEvent.change(screen.getByTestId("mfa-backup-input"), {
        target: { value: "ABCD1234" },
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("mfa-challenge-submit"));
    });

    await waitFor(() => {
      expect(trackMock).toHaveBeenCalledWith("mfa_challenge_succeeded", {
        userId: USER_ID,
        mode: "backup",
      });
    });
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(NEXT_URL);
    });
  });

  it("[6] backup 잔여 0 → '모두 사용' 안내 메시지", async () => {
    verifyMock.mockResolvedValue({
      success: false,
      reason: "invalid_code",
      message: "백업 코드가 일치하지 않아요.",
      remainingBackupCodes: 0,
      analytics: { userId: USER_ID, mode: "backup" },
    });
    render(<MfaChallengeForm factorId={FACTOR_ID} next={NEXT_URL} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("mfa-toggle-mode"));
    });
    await act(async () => {
      fireEvent.change(screen.getByTestId("mfa-backup-input"), {
        target: { value: "ZZZZ9999" },
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("mfa-challenge-submit"));
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("mfa-challenge-remaining").textContent,
      ).toContain("모두 사용");
    });
  });

  it("[7] CON-04 — UI 카피에 의료 금칙어 0건", () => {
    const { container } = render(
      <MfaChallengeForm factorId={FACTOR_ID} next={NEXT_URL} />,
    );
    for (const w of FORBIDDEN) {
      expect(container.textContent ?? "").not.toContain(w);
    }
  });
});

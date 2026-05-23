// FR-C-PARENT-ONBOARDING — OnboardingWizardClient 컴포넌트 통합 테스트.
//
// 격리:
//   - next/navigation useRouter mock (push 만 검증)
//   - @/app/actions/onboarding-save-child mock (saveChildInfo)
//   - @/lib/analytics trackEvent mock (이벤트 발송 검증)
//   - localStorage 는 happy-dom 실 사용 → lib/onboarding/state 의 마킹 동작 검증
//
// 검증 시나리오 (총 11건):
//   1) 초기 mount → Step1 노출 + onboarding_started 이벤트 1회 발송
//   2) Step1 다음 → Step2 + childAgeMonths slider 노출 + step_completed 발송
//   3) Step2 음소 다중 선택 (1~2개 제한)
//   4) Step2 "다음" → saveChildInfo 호출 + 성공 시 Step3 진입
//   5) Step2 Server Action 실패 시 에러 노출 + step 유지
//   6) Step3 → 마이크 권한 안내 노출 + "지금 시작하기" 클릭 → /diagnose 이동
//   7) Step3 "나중에 할게요" → Step4 진입 + skippedSteps 카운트 +1
//   8) Step4 → 보상 도감 / 미션 링크 노출 + finish 버튼
//   9) Step4 finish → markOnboardingCompleted + onboarding_completed 이벤트
//  10) "이번엔 건너뛰기" → markOnboardingSkipped + onboarding_skipped 이벤트 + 메인 redirect
//  11) CON-04 — 전체 wizard 카피에 금칙어 (치료/진단/장애) 0건

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

// useRouter mock — push / replace 캡처.
const routerPushMock = vi.fn();
const routerReplaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock, replace: routerReplaceMock }),
}));

// Server Action mock — saveChildInfo.
const saveChildInfoMock = vi.fn();
vi.mock("@/app/actions/onboarding-save-child", async () => {
  // 실 모듈에서 상수만 재export — Server Action 함수는 mock 으로 swap.
  const actual = await vi.importActual<
    typeof import("@/app/actions/onboarding-save-child")
  >("@/app/actions/onboarding-save-child");
  return {
    ...actual,
    saveChildInfo: (...args: unknown[]) => saveChildInfoMock(...args),
  };
});

// Server Action mock — markOnboardingCompletedInDb (follow-up PR).
const markCompletedInDbMock = vi.fn();
vi.mock("@/app/actions/mark-onboarding-completed", () => ({
  markOnboardingCompletedInDb: (...args: unknown[]) =>
    markCompletedInDbMock(...args),
}));

// trackEvent mock.
const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

import { OnboardingWizardClient } from "@/components/onboarding/OnboardingWizardClient";
import {
  STORAGE_KEY_COMPLETED,
  STORAGE_KEY_SKIPPED,
} from "@/lib/onboarding/state";

beforeEach(() => {
  window.localStorage.clear();
  routerPushMock.mockReset();
  routerReplaceMock.mockReset();
  saveChildInfoMock.mockReset();
  markCompletedInDbMock.mockReset();
  trackMock.mockReset();
  saveChildInfoMock.mockResolvedValue({
    success: true,
    userId: "u-1",
    childAgeMonths: 48,
    targetPhonemes: ["ㅅ"],
  });
  markCompletedInDbMock.mockResolvedValue({ success: true });
});

afterEach(() => {
  window.localStorage.clear();
});

const trackCalls = () =>
  (trackMock as Mock).mock.calls.map(([name, props]) => ({ name, props }));

describe("OnboardingWizardClient — FR-C-PARENT-ONBOARDING", () => {
  it("초기 mount → Step1 노출 + onboarding_started 이벤트 1회 발송", () => {
    render(<OnboardingWizardClient hasExistingChildInfo={false} />);
    expect(screen.getByTestId("onboarding-step-1")).toBeInTheDocument();
    expect(screen.getByText(/환영합니다/)).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-progress")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    // started 이벤트 1회.
    const started = trackCalls().filter((c) => c.name === "onboarding_started");
    expect(started).toHaveLength(1);
    expect(started[0].props).toEqual({ hasExistingChildInfo: false });
  });

  it("Step1 '시작하기' → Step2 + step_completed(1) 이벤트", () => {
    render(<OnboardingWizardClient />);
    fireEvent.click(screen.getByTestId("onboarding-next-btn"));
    expect(screen.getByTestId("onboarding-step-2")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-age-slider")).toBeInTheDocument();
    const completed = trackCalls().filter(
      (c) => c.name === "onboarding_step_completed",
    );
    expect(completed).toHaveLength(1);
    expect(completed[0].props.step).toBe(1);
    expect(completed[0].props.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("Step2 음소 토글 — 최대 2개 제한 + 최소 1개 유지", () => {
    render(<OnboardingWizardClient initialStep={2} />);
    // 초기 'ㅅ' 1개 선택.
    expect(screen.getByTestId("onboarding-phoneme-ㅅ")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // ㄴ 추가 → 2개.
    fireEvent.click(screen.getByTestId("onboarding-phoneme-ㄴ"));
    expect(screen.getByTestId("onboarding-phoneme-ㄴ")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // ㄱ 추가 → 가장 오래된 'ㅅ' 제거 + ㄴ/ㄱ 유지.
    fireEvent.click(screen.getByTestId("onboarding-phoneme-ㄱ"));
    expect(screen.getByTestId("onboarding-phoneme-ㄱ")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("onboarding-phoneme-ㅅ")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    // 마지막 1개 제거 시도 → 무시 (최소 1개 유지).
    fireEvent.click(screen.getByTestId("onboarding-phoneme-ㄴ"));
    fireEvent.click(screen.getByTestId("onboarding-phoneme-ㄱ"));
    // ㄱ 또는 ㄴ 중 하나는 여전히 pressed.
    const pressedCount = ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"].filter(
      (p) =>
        screen.getByTestId(`onboarding-phoneme-${p}`).getAttribute("aria-pressed") ===
        "true",
    ).length;
    expect(pressedCount).toBeGreaterThanOrEqual(1);
  });

  it("Step2 '다음' → saveChildInfo 호출 + 성공 시 Step3 진입", async () => {
    render(<OnboardingWizardClient initialStep={2} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("onboarding-next-btn"));
    });
    expect(saveChildInfoMock).toHaveBeenCalledTimes(1);
    const callArg = saveChildInfoMock.mock.calls[0][0];
    expect(callArg.childAgeMonths).toBeGreaterThanOrEqual(24);
    expect(callArg.childAgeMonths).toBeLessThanOrEqual(84);
    expect(Array.isArray(callArg.targetPhonemes)).toBe(true);
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-step-3")).toBeInTheDocument();
    });
  });

  it("Step2 Server Action 실패 → 에러 메시지 노출 + Step2 유지", async () => {
    saveChildInfoMock.mockResolvedValueOnce({
      success: false,
      reason: "db_failed",
      message: "저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
    });
    render(<OnboardingWizardClient initialStep={2} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("onboarding-next-btn"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-save-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("onboarding-step-2")).toBeInTheDocument();
    expect(screen.queryByTestId("onboarding-step-3")).toBeNull();
  });

  it("Step3 → 마이크 권한 안내 + '지금 시작하기' 클릭 → /diagnose 이동", () => {
    render(<OnboardingWizardClient initialStep={3} />);
    expect(screen.getByTestId("onboarding-step-3")).toBeInTheDocument();
    expect(screen.getByText("마이크 사용 안내")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("onboarding-step3-start-btn"));
    expect(routerPushMock).toHaveBeenCalledTimes(1);
    const pushArg = routerPushMock.mock.calls[0][0] as string;
    expect(pushArg.startsWith("/diagnose?")).toBe(true);
    expect(pushArg).toContain("onboarding=1");
    expect(pushArg).toContain("phoneme=");
    // step_completed(3) 이벤트 발송.
    const completed = trackCalls().filter(
      (c) => c.name === "onboarding_step_completed" && c.props.step === 3,
    );
    expect(completed.length).toBeGreaterThanOrEqual(1);
  });

  it("Step3 '나중에 할게요' → Step4 진입 (메인 이동 없음)", () => {
    render(<OnboardingWizardClient initialStep={3} />);
    fireEvent.click(screen.getByTestId("onboarding-step3-skip-now-btn"));
    expect(screen.getByTestId("onboarding-step-4")).toBeInTheDocument();
    // /diagnose 로 이동 안 함.
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("Step4 → 보상 도감 / 미션 링크 노출 + finish 버튼", () => {
    render(<OnboardingWizardClient initialStep={4} />);
    expect(screen.getByTestId("onboarding-step-4")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-step4-collection-link")).toHaveAttribute(
      "href",
      "/rewards/collection",
    );
    expect(screen.getByTestId("onboarding-step4-missions-link")).toHaveAttribute(
      "href",
      "/missions",
    );
    expect(screen.getByTestId("onboarding-finish-btn")).toBeInTheDocument();
  });

  it("Step4 finish → markOnboardingCompleted + DB 동기화 + onboarding_completed 이벤트 + 메인 이동", () => {
    render(<OnboardingWizardClient initialStep={4} />);
    fireEvent.click(screen.getByTestId("onboarding-finish-btn"));
    // localStorage 마킹.
    expect(window.localStorage.getItem(STORAGE_KEY_COMPLETED)).toBe("true");
    // DB 동기화 (Server Action) 호출.
    expect(markCompletedInDbMock).toHaveBeenCalledTimes(1);
    // 분석 이벤트.
    const completed = trackCalls().filter(
      (c) => c.name === "onboarding_completed",
    );
    expect(completed).toHaveLength(1);
    expect(completed[0].props.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(completed[0].props.skippedSteps).toBeGreaterThanOrEqual(0);
    // router push("/").
    expect(routerPushMock).toHaveBeenCalledWith("/");
  });

  it("initialDbCompleted=true → 마운트 시 즉시 /missions 로 router.replace", () => {
    render(
      <OnboardingWizardClient initialStep={1} initialDbCompleted={true} />,
    );
    expect(routerReplaceMock).toHaveBeenCalledWith("/missions");
    // localStorage 마킹 보충 (DB 만 완료된 user 의 device 동기화).
    expect(window.localStorage.getItem(STORAGE_KEY_COMPLETED)).toBe("true");
  });

  it("initialDbCompleted=false + localStorage completed → DB 동기화 + /missions replace", async () => {
    window.localStorage.setItem(STORAGE_KEY_COMPLETED, "true");
    render(
      <OnboardingWizardClient initialStep={1} initialDbCompleted={false} />,
    );
    expect(routerReplaceMock).toHaveBeenCalledWith("/missions");
    await waitFor(() => {
      expect(markCompletedInDbMock).toHaveBeenCalled();
    });
  });

  it("initialDbCompleted=null → 마운트 시 redirect 없음 (wizard 정상 노출)", () => {
    render(
      <OnboardingWizardClient initialStep={1} initialDbCompleted={null} />,
    );
    expect(routerReplaceMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("onboarding-step-1")).toBeInTheDocument();
  });

  it("'이번엔 건너뛰기' → markOnboardingSkipped + onboarding_skipped 이벤트 + 메인 redirect", () => {
    render(<OnboardingWizardClient initialStep={1} />);
    fireEvent.click(screen.getByTestId("onboarding-skip-btn"));
    expect(window.localStorage.getItem(STORAGE_KEY_SKIPPED)).toBe("true");
    const skipped = trackCalls().filter((c) => c.name === "onboarding_skipped");
    expect(skipped).toHaveLength(1);
    expect(skipped[0].props.atStep).toBe(1);
    expect(routerPushMock).toHaveBeenCalledWith("/");
  });

  it("CON-04 — wizard 전체 카피에 금칙어 (치료/진단/장애) 0건", () => {
    // 4 step 모두 렌더해서 innerHTML 합쳐 검사.
    const allHtml: string[] = [];
    for (const s of [1, 2, 3, 4] as const) {
      const { container, unmount } = render(
        <OnboardingWizardClient initialStep={s} />,
      );
      allHtml.push(container.innerHTML);
      unmount();
    }
    const combined = allHtml.join("\n");
    expect(combined).not.toMatch(/치료/);
    expect(combined).not.toMatch(/진단/);
    expect(combined).not.toMatch(/장애/);
  });
});

// FR-C-029 — PushNotificationToggle 컴포넌트 단위 테스트.
//
// 격리: @/lib/hooks/usePushSubscription mock (상태 주입). 렌더 분기 + 버튼 동작 검증.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { UsePushSubscriptionResult } from "@/lib/hooks/usePushSubscription";

const subscribeMock = vi.fn();
const unsubscribeMock = vi.fn();
const hookState: { current: Omit<UsePushSubscriptionResult, "subscribe" | "unsubscribe"> } = {
  current: {
    supported: true,
    needsHomeScreen: false,
    subscribed: false,
    busy: false,
    permission: "default",
    error: null,
  },
};

vi.mock("@/lib/hooks/usePushSubscription", () => ({
  usePushSubscription: () => ({
    ...hookState.current,
    subscribe: subscribeMock,
    unsubscribe: unsubscribeMock,
  }),
}));

import { PushNotificationToggle } from "@/components/settings/PushNotificationToggle";

function setHook(
  partial: Partial<Omit<UsePushSubscriptionResult, "subscribe" | "unsubscribe">>,
) {
  hookState.current = {
    supported: true,
    needsHomeScreen: false,
    subscribed: false,
    busy: false,
    permission: "default",
    error: null,
    ...partial,
  };
}

const FORBIDDEN_MEDICAL = ["치료", "진단", "장애"];

beforeEach(() => {
  subscribeMock.mockReset();
  unsubscribeMock.mockReset();
  setHook({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PushNotificationToggle — FR-C-029", () => {
  it("미지원 → unsupported 안내 + 구독 버튼 없음", () => {
    setHook({ supported: false });
    render(<PushNotificationToggle />);
    expect(screen.getByTestId("push-unsupported")).toBeTruthy();
    expect(screen.queryByTestId("push-subscribe")).toBeNull();
  });

  it("iOS 홈화면 미설치 → 설치 안내 + 토글 없음", () => {
    setHook({ supported: true, needsHomeScreen: true });
    render(<PushNotificationToggle />);
    expect(screen.getByTestId("push-needs-home-screen")).toBeTruthy();
    expect(screen.queryByTestId("push-subscribe")).toBeNull();
  });

  it("미구독 → '켜기' 버튼 → 클릭 시 subscribe()", () => {
    setHook({ subscribed: false });
    render(<PushNotificationToggle />);
    const btn = screen.getByTestId("push-subscribe");
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(subscribeMock).toHaveBeenCalledOnce();
  });

  it("구독 중 → '끄기' 버튼 → 클릭 시 unsubscribe()", () => {
    setHook({ subscribed: true });
    render(<PushNotificationToggle />);
    const btn = screen.getByTestId("push-unsubscribe");
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(unsubscribeMock).toHaveBeenCalledOnce();
  });

  it("busy → 버튼 disabled", () => {
    setHook({ subscribed: false, busy: true });
    render(<PushNotificationToggle />);
    expect((screen.getByTestId("push-subscribe") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("권한 거부 → 구독 버튼 disabled + 안내 노출", () => {
    setHook({ subscribed: false, permission: "denied" });
    render(<PushNotificationToggle />);
    expect((screen.getByTestId("push-subscribe") as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.getByTestId("push-permission-denied")).toBeTruthy();
  });

  it("error 상태 → push-error 노출", () => {
    setHook({ error: "홈 화면에 추가한 뒤 다시 시도해 주세요." });
    render(<PushNotificationToggle />);
    expect(screen.getByTestId("push-error")).toBeTruthy();
  });

  it("CON-04 — 렌더 카피에 의료 금칙어 0건", () => {
    setHook({ subscribed: true, error: "구독에 실패했어요." });
    const { container } = render(<PushNotificationToggle />);
    const text = container.textContent ?? "";
    for (const word of FORBIDDEN_MEDICAL) {
      expect(text.includes(word), `금칙어 노출: ${word}`).toBe(false);
    }
  });
});

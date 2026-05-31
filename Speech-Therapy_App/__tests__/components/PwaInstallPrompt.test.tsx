// FR-C-PWA-INSTALL-PROMPT — PwaInstallPrompt 단위 테스트.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...a: unknown[]) => trackMock(...a),
}));

import { PwaInstallPrompt } from "@/app/pwa-install-prompt";

type PromptEvent = Event & {
  prompt: ReturnType<typeof vi.fn>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function makePromptEvent(outcome: "accepted" | "dismissed" = "accepted"): PromptEvent {
  const e = new Event("beforeinstallprompt") as PromptEvent;
  e.prompt = vi.fn().mockResolvedValue(undefined);
  e.userChoice = Promise.resolve({ outcome });
  return e;
}

beforeEach(() => {
  trackMock.mockReset();
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
});

describe("PwaInstallPrompt — FR-C-PWA-INSTALL-PROMPT", () => {
  it("[1] 이벤트 없으면 미노출", () => {
    render(<PwaInstallPrompt />);
    expect(screen.queryByTestId("pwa-install-prompt")).toBeNull();
  });

  it("[2] beforeinstallprompt → 배너 노출 + shown 계측", () => {
    render(<PwaInstallPrompt />);
    act(() => {
      window.dispatchEvent(makePromptEvent());
    });
    expect(screen.getByTestId("pwa-install-prompt")).toBeInTheDocument();
    expect(trackMock).toHaveBeenCalledWith("pwa_install_prompt_shown", {});
  });

  it("[3] '추가' → prompt() 호출 + accepted 계측 + 배너 닫힘", async () => {
    render(<PwaInstallPrompt />);
    const ev = makePromptEvent("accepted");
    act(() => {
      window.dispatchEvent(ev);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "추가" }));
    });
    expect(ev.prompt).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("pwa_install_prompt_result", { outcome: "accepted" });
    expect(screen.queryByTestId("pwa-install-prompt")).toBeNull();
  });

  it("[4] '닫기' → dismissed 계측 + localStorage 플래그 + 배너 닫힘", () => {
    render(<PwaInstallPrompt />);
    act(() => {
      window.dispatchEvent(makePromptEvent());
    });
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(trackMock).toHaveBeenCalledWith("pwa_install_prompt_result", { outcome: "dismissed" });
    expect(localStorage.getItem("pwaInstallPromptDismissed")).toBe("1");
    expect(screen.queryByTestId("pwa-install-prompt")).toBeNull();
  });

  it("[5] 이미 닫음(localStorage) → 이벤트 와도 미노출 + 계측 0", () => {
    localStorage.setItem("pwaInstallPromptDismissed", "1");
    render(<PwaInstallPrompt />);
    act(() => {
      window.dispatchEvent(makePromptEvent());
    });
    expect(screen.queryByTestId("pwa-install-prompt")).toBeNull();
    expect(trackMock).not.toHaveBeenCalled();
  });
});

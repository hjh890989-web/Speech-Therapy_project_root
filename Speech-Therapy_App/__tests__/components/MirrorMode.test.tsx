// FR-Q-014 (#55) — MirrorMode + MirrorButton 컴포넌트 분기 + 통합 테스트.
//
// 시나리오:
//   1) active=false 시 nothing 렌더
//   2) active=true + 정상 stream → mirror-status-* 미노출 (active 상태)
//   3) active=true + NotAllowedError → 'denied' UI + 다시 시도 버튼 노출
//   4) active=true + NotFoundError → 'unavailable' UI
//   5) referenceOverlay='lips_open' → SVG <img> 렌더
//   6) onClose 호출 시 부모 콜백 트리거
//   7) MirrorButton 토글 → trackEvent("mirror_mode_activated") 1회 발송

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

import { MirrorMode } from "@/components/MirrorMode";
import { MirrorButton } from "@/components/MirrorButton";

// trackEvent mock 캡처.
const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

function installMediaDevices(getUserMedia: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
}

function uninstallMediaDevices() {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: undefined,
  });
}

function makeMockStream() {
  const stop = vi.fn();
  const stream = {
    getTracks: () => [{ stop, kind: "video" }],
  } as unknown as MediaStream;
  return { stream, stop };
}

beforeEach(() => {
  trackMock.mockClear();
  uninstallMediaDevices();
});

afterEach(() => {
  vi.restoreAllMocks();
  uninstallMediaDevices();
});

describe("MirrorMode component", () => {
  it("active=false → null 렌더 (DOM 비노출)", () => {
    const { container } = render(<MirrorMode active={false} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("mirror-mode")).toBeNull();
  });

  it("active=true + 정상 stream → video 노출 + 상태 메시지 미노출", async () => {
    const { stream } = makeMockStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);

    await act(async () => {
      render(<MirrorMode active={true} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("mirror-video")).toBeInTheDocument();
    });
    // 정상 상태에서는 denied/unavailable/error 메시지 분기 미노출.
    expect(screen.queryByTestId("mirror-status-denied")).toBeNull();
    expect(screen.queryByTestId("mirror-status-unavailable")).toBeNull();
    expect(screen.queryByTestId("mirror-status-error")).toBeNull();
    // video element 에 거울 반전 클래스 적용 확인.
    const video = screen.getByTestId("mirror-video");
    expect(video.className).toContain("scale-x-[-1]");
  });

  it("NotAllowedError → 'denied' UI + 다시 시도 버튼 노출", async () => {
    const err = Object.assign(new Error("denied"), { name: "NotAllowedError" });
    const getUserMedia = vi.fn().mockRejectedValue(err);
    installMediaDevices(getUserMedia);

    await act(async () => {
      render(<MirrorMode active={true} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("mirror-status-denied")).toBeInTheDocument();
    });
    expect(screen.getByTestId("mirror-retry")).toBeInTheDocument();
    // 부모용 도움말 — Safari/Chrome 권한 안내 1-line 포함.
    expect(screen.getByTestId("mirror-status-denied").textContent).toMatch(/Safari|Chrome/);
  });

  it("NotFoundError → 'unavailable' UI (미션 계속 진행 안내 포함)", async () => {
    const err = Object.assign(new Error("no device"), { name: "NotFoundError" });
    const getUserMedia = vi.fn().mockRejectedValue(err);
    installMediaDevices(getUserMedia);

    await act(async () => {
      render(<MirrorMode active={true} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("mirror-status-unavailable")).toBeInTheDocument();
    });
    // 미션 진행 안내 포함 (graceful fallback).
    expect(screen.getByTestId("mirror-status-unavailable").textContent).toMatch(/계속/);
  });

  it("getUserMedia 미지원 → 'unavailable' UI", async () => {
    // mediaDevices 미설치 상태.
    await act(async () => {
      render(<MirrorMode active={true} />);
    });
    await waitFor(() => {
      expect(screen.getByTestId("mirror-status-unavailable")).toBeInTheDocument();
    });
  });

  it("referenceOverlay='lips_open' → SVG <img> 렌더", async () => {
    const { stream } = makeMockStream();
    installMediaDevices(vi.fn().mockResolvedValue(stream));

    await act(async () => {
      render(<MirrorMode active={true} referenceOverlay="lips_open" />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("mirror-overlay-lips_open")).toBeInTheDocument();
    });
    const img = screen.getByTestId("mirror-overlay-lips_open") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/mirror/lips_open.svg");
  });

  it("onClose 버튼 클릭 → 콜백 호출", async () => {
    const { stream } = makeMockStream();
    installMediaDevices(vi.fn().mockResolvedValue(stream));
    const onClose = vi.fn();

    await act(async () => {
      render(<MirrorMode active={true} onClose={onClose} />);
    });

    fireEvent.click(screen.getByTestId("mirror-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("MirrorButton", () => {
  it("초기 닫힌 상태 → 토글 버튼만 노출", () => {
    render(<MirrorButton missionId="m1" />);
    expect(screen.getByTestId("mirror-toggle-open")).toBeInTheDocument();
    expect(screen.queryByTestId("mirror-mode")).toBeNull();
  });

  it("토글 버튼 클릭 → MirrorMode 노출 + trackEvent(mirror_mode_activated, manual)", async () => {
    const { stream } = makeMockStream();
    installMediaDevices(vi.fn().mockResolvedValue(stream));

    render(<MirrorButton missionId="m1" referenceOverlay="lips_open" />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("mirror-toggle-open"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("mirror-mode")).toBeInTheDocument();
    });
    expect(trackMock).toHaveBeenCalledWith("mirror_mode_activated", {
      missionId: "m1",
      trigger: "manual",
    });
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it("닫기 버튼 → MirrorMode 사라짐 + 토글 버튼 재노출", async () => {
    const { stream } = makeMockStream();
    installMediaDevices(vi.fn().mockResolvedValue(stream));

    render(<MirrorButton missionId="m1" />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("mirror-toggle-open"));
    });
    await waitFor(() => expect(screen.getByTestId("mirror-mode")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("mirror-close"));

    await waitFor(() => expect(screen.queryByTestId("mirror-mode")).toBeNull());
    expect(screen.getByTestId("mirror-toggle-open")).toBeInTheDocument();
  });
});

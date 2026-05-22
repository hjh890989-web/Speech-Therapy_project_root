// FR-Q-014 (#55) — useMirrorMode 단위 테스트.
//
// happy-dom 환경 — navigator.mediaDevices 미지원 → mock 으로 주입.
// 시나리오:
//   1) 초기 status="idle"
//   2) activate() 정상 → status="active" + videoRef.srcObject = stream
//   3) NotAllowedError → status="denied" + errorMessage
//   4) NotFoundError → status="unavailable"
//   5) 기타 에러 → status="error" + errorMessage
//   6) deactivate → tracks stop + status="idle"
//   7) unmount cleanup → tracks stop
//   8) activate() 재호출 (denied 후) → status="requesting" → "active"
//   9) getUserMedia 미지원 (SSR-like) → status="unavailable"

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMirrorMode } from "@/lib/hooks/useMirrorMode";

type MockTrack = MediaStreamTrack & { stop: ReturnType<typeof vi.fn> };

function makeMockStream(): { stream: MediaStream; stop: ReturnType<typeof vi.fn> } {
  const stop = vi.fn();
  const track = { stop, kind: "video" } as unknown as MockTrack;
  const stream = {
    getTracks: () => [track],
  } as unknown as MediaStream;
  return { stream, stop };
}

function installMediaDevices(getUserMedia: ReturnType<typeof vi.fn>) {
  // happy-dom 의 navigator.mediaDevices 는 부재 — defineProperty 로 mock 주입.
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
}

function uninstallMediaDevices() {
  // configurable: true 인 경우 delete 가능.
  // 일부 happy-dom 버전에서는 원래 undefined 였으므로 defineProperty 로 되돌림.
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: undefined,
  });
}

beforeEach(() => {
  uninstallMediaDevices();
});

afterEach(() => {
  vi.restoreAllMocks();
  uninstallMediaDevices();
});

describe("useMirrorMode", () => {
  it("초기 status='idle', errorMessage 없음", () => {
    const { result } = renderHook(() => useMirrorMode());
    expect(result.current.status).toBe("idle");
    expect(result.current.errorMessage).toBeUndefined();
  });

  it("getUserMedia 미지원 환경 → activate 시 status='unavailable'", async () => {
    // mediaDevices 미설치 상태 그대로.
    const { result } = renderHook(() => useMirrorMode());
    await act(async () => {
      await result.current.activate();
    });
    expect(result.current.status).toBe("unavailable");
    expect(result.current.errorMessage).toBeDefined();
  });

  it("정상 activate → status='active' + videoRef.srcObject 설정 시도", async () => {
    const { stream } = makeMockStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);

    const { result } = renderHook(() => useMirrorMode());
    // happy-dom 의 HTMLVideoElement.srcObject setter 가 mock MediaStream 을 reject 할 수
    // 있으므로 setter 자체를 spy 로 대체해 호출 사실을 검증.
    const fakeVideo = document.createElement("video") as HTMLVideoElement;
    const srcObjectSetter = vi.fn();
    Object.defineProperty(fakeVideo, "srcObject", {
      configurable: true,
      get: () => null,
      set: srcObjectSetter,
    });
    (result.current.videoRef as { current: HTMLVideoElement | null }).current = fakeVideo;

    await act(async () => {
      await result.current.activate();
    });

    expect(result.current.status).toBe("active");
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: "user" },
      audio: false,
    });
    expect(srcObjectSetter).toHaveBeenCalledWith(stream);
  });

  it("NotAllowedError → status='denied' + errorMessage", async () => {
    const err = Object.assign(new Error("denied"), { name: "NotAllowedError" });
    const getUserMedia = vi.fn().mockRejectedValue(err);
    installMediaDevices(getUserMedia);

    const { result } = renderHook(() => useMirrorMode());
    await act(async () => {
      await result.current.activate();
    });

    expect(result.current.status).toBe("denied");
    expect(result.current.errorMessage).toMatch(/카메라/);
  });

  it("NotFoundError → status='unavailable'", async () => {
    const err = Object.assign(new Error("no device"), { name: "NotFoundError" });
    const getUserMedia = vi.fn().mockRejectedValue(err);
    installMediaDevices(getUserMedia);

    const { result } = renderHook(() => useMirrorMode());
    await act(async () => {
      await result.current.activate();
    });

    expect(result.current.status).toBe("unavailable");
  });

  it("기타 에러 (이름 매핑 외) → status='error' + 메시지 보존", async () => {
    const err = Object.assign(new Error("random failure"), { name: "AbortError" });
    const getUserMedia = vi.fn().mockRejectedValue(err);
    installMediaDevices(getUserMedia);

    const { result } = renderHook(() => useMirrorMode());
    await act(async () => {
      await result.current.activate();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toContain("random failure");
  });

  it("deactivate → stream tracks stop 호출 + status='idle'", async () => {
    const { stream, stop } = makeMockStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);

    const { result } = renderHook(() => useMirrorMode());
    const fakeVideo = document.createElement("video") as HTMLVideoElement;
    const srcObjectSetter = vi.fn();
    Object.defineProperty(fakeVideo, "srcObject", {
      configurable: true,
      get: () => null,
      set: srcObjectSetter,
    });
    (result.current.videoRef as { current: HTMLVideoElement | null }).current = fakeVideo;

    await act(async () => {
      await result.current.activate();
    });
    expect(result.current.status).toBe("active");

    act(() => {
      result.current.deactivate();
    });

    expect(stop).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("idle");
    // deactivate 시 srcObject = null 시도 — setter spy 마지막 호출 확인.
    expect(srcObjectSetter).toHaveBeenLastCalledWith(null);
  });

  it("unmount cleanup → tracks stop", async () => {
    const { stream, stop } = makeMockStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);

    const { result, unmount } = renderHook(() => useMirrorMode());
    const fakeVideo = document.createElement("video") as HTMLVideoElement;
    (result.current.videoRef as { current: HTMLVideoElement | null }).current = fakeVideo;

    await act(async () => {
      await result.current.activate();
    });
    expect(stop).not.toHaveBeenCalled();

    unmount();

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("denied 후 activate 재호출 → status='active' 복구", async () => {
    const err = Object.assign(new Error("denied"), { name: "NotAllowedError" });
    const { stream } = makeMockStream();
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce(stream);
    installMediaDevices(getUserMedia);

    const { result } = renderHook(() => useMirrorMode());
    const fakeVideo = document.createElement("video") as HTMLVideoElement;
    (result.current.videoRef as { current: HTMLVideoElement | null }).current = fakeVideo;

    await act(async () => {
      await result.current.activate();
    });
    expect(result.current.status).toBe("denied");

    await act(async () => {
      await result.current.activate();
    });
    expect(result.current.status).toBe("active");
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });
});

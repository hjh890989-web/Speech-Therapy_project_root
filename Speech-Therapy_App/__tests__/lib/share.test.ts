// TEST-011 (Replace 67-D1) — lib/share.ts 단위 테스트.
//
// 5 시나리오:
//   1. navigator.share 지원 환경 → share() 호출 검증.
//   2. navigator.share 미지원 + clipboard 지원 → clipboard.writeText 호출.
//   3. 둘 다 미지원 → execCommand("copy") 폴백 + textarea 생성/제거.
//   4. Web Share user cancel (AbortError) → graceful (succeeded=false, 에러 throw 없음).
//   5. trackEvent("share_clicked") 통합 — 매 호출 1회 발송 + properties 검증.
//
// happy-dom 환경에서 navigator.share / navigator.clipboard / document.execCommand 를
// 테스트마다 mock 한다.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as analytics from "@/lib/analytics";
import { shareOrCopy } from "@/lib/share";

type NavWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

// happy-dom 의 navigator.clipboard 는 getter 로 항상 객체를 돌려주고,
// navigator.share 는 default undefined. Object.defineProperty 로 강제 override.
function setNavProp<K extends "share" | "clipboard">(
  key: K,
  value: NavWithShare[K] | undefined,
): void {
  Object.defineProperty(navigator, key, {
    value,
    configurable: true,
    writable: true,
  });
}

function setExecCommand(value: typeof document.execCommand | undefined): void {
  Object.defineProperty(document, "execCommand", {
    value,
    configurable: true,
    writable: true,
  });
}

const SAMPLE = {
  text: "우리 아이 발음 가이드 결과를 확인해 보세요.",
  url: "https://example.com/share/abc123",
  title: "Speech-Therapy 공유",
  surface: "result" as const,
};

describe("shareOrCopy", () => {
  let trackSpy: ReturnType<typeof vi.spyOn>;
  let originalShare: NavWithShare["share"];
  let originalClipboard: NavWithShare["clipboard"];
  let originalExecCommand: typeof document.execCommand | undefined;

  beforeEach(() => {
    // trackEvent 스파이 — dev 환경에서는 console.debug 만 호출되지만 호출 자체는 확인 가능.
    trackSpy = vi.spyOn(analytics, "trackEvent").mockImplementation(() => {});
    trackSpy.mockClear();

    const nav = navigator as NavWithShare;
    originalShare = nav.share;
    originalClipboard = nav.clipboard;
    originalExecCommand = document.execCommand;
  });

  afterEach(() => {
    // navigator.share / clipboard / execCommand 복원.
    setNavProp("share", originalShare);
    setNavProp("clipboard", originalClipboard);
    setExecCommand(originalExecCommand);
    trackSpy.mockRestore();
  });

  // === 시나리오 1: Web Share API 지원 환경 ===
  it("Scenario 1: navigator.share 지원 환경 → share() 호출 (text+url+title 전달)", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    setNavProp("share", shareMock as unknown as NavWithShare["share"]);

    const result = await shareOrCopy(SAMPLE);

    expect(shareMock).toHaveBeenCalledTimes(1);
    expect(shareMock).toHaveBeenCalledWith({
      title: SAMPLE.title,
      text: SAMPLE.text,
      url: SAMPLE.url,
    });
    expect(result).toEqual({ method: "web_share", succeeded: true });
  });

  // === 시나리오 2: 미지원 + clipboard 지원 ===
  it("Scenario 2: navigator.share 미지원 + clipboard 지원 → writeText 폴백", async () => {
    setNavProp("share", undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavProp("clipboard", { writeText } as unknown as NavWithShare["clipboard"]);

    const result = await shareOrCopy(SAMPLE);

    expect(writeText).toHaveBeenCalledTimes(1);
    // text + url 이 합쳐져서 복사되는지 검증.
    const payload = writeText.mock.calls[0][0] as string;
    expect(payload).toContain(SAMPLE.text);
    expect(payload).toContain(SAMPLE.url);
    expect(result.method).toBe("clipboard");
    expect(result.succeeded).toBe(true);
    expect(result.message).toBeTruthy();
  });

  // === 시나리오 3: 둘 다 미지원 → execCommand 폴백 ===
  it("Scenario 3: share + clipboard 미지원 → textarea + execCommand 폴백", async () => {
    setNavProp("share", undefined);
    setNavProp("clipboard", undefined);
    const execMock = vi.fn().mockReturnValue(true);
    setExecCommand(execMock as unknown as typeof document.execCommand);

    const result = await shareOrCopy(SAMPLE);

    expect(execMock).toHaveBeenCalledWith("copy");
    expect(result.method).toBe("clipboard");
    expect(result.succeeded).toBe(true);
    // textarea 가 제거되었는지 (DOM 누수 없음).
    expect(document.querySelectorAll("textarea").length).toBe(0);
  });

  it("Scenario 3b: 모든 수단 미지원 → unsupported + message 노출", async () => {
    setNavProp("share", undefined);
    setNavProp("clipboard", undefined);
    setExecCommand(undefined);

    const result = await shareOrCopy(SAMPLE);

    expect(result.method).toBe("unsupported");
    expect(result.succeeded).toBe(false);
    expect(result.message).toBeTruthy();
  });

  // === 시나리오 4: AbortError graceful ===
  it("Scenario 4: navigator.share user cancel (AbortError) → graceful (throw 없음, succeeded=false)", async () => {
    const abortErr = Object.assign(new Error("user canceled"), { name: "AbortError" });
    const shareMock = vi.fn().mockRejectedValue(abortErr);
    setNavProp("share", shareMock as unknown as NavWithShare["share"]);
    // clipboard 도 mock 해두지만 호출되지 말아야 함 (cancel 은 폴백 트리거 X).
    const writeText = vi.fn();
    setNavProp("clipboard", { writeText } as unknown as NavWithShare["clipboard"]);

    const result = await shareOrCopy(SAMPLE);

    expect(shareMock).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    expect(result).toEqual({ method: "web_share", succeeded: false });
  });

  it("Scenario 4b: share() 실패 (AbortError 아님) → clipboard 폴백 시도", async () => {
    const otherErr = new Error("network");
    const shareMock = vi.fn().mockRejectedValue(otherErr);
    setNavProp("share", shareMock as unknown as NavWithShare["share"]);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavProp("clipboard", { writeText } as unknown as NavWithShare["clipboard"]);

    const result = await shareOrCopy(SAMPLE);

    expect(shareMock).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(result.method).toBe("clipboard");
    expect(result.succeeded).toBe(true);
  });

  // === 시나리오 5: trackEvent 통합 ===
  it("Scenario 5a: trackEvent('share_clicked') 발송 — web_share success", async () => {
    setNavProp(
      "share",
      vi.fn().mockResolvedValue(undefined) as unknown as NavWithShare["share"],
    );

    await shareOrCopy(SAMPLE);

    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledWith("share_clicked", {
      method: "web_share",
      succeeded: true,
      surface: "result",
    });
  });

  it("Scenario 5b: trackEvent('share_clicked') 발송 — clipboard 폴백", async () => {
    setNavProp("share", undefined);
    setNavProp("clipboard", {
      writeText: vi.fn().mockResolvedValue(undefined),
    } as unknown as NavWithShare["clipboard"]);

    await shareOrCopy({ ...SAMPLE, surface: "reward" });

    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledWith("share_clicked", {
      method: "clipboard",
      succeeded: true,
      surface: "reward",
    });
  });

  it("Scenario 5c: trackEvent('share_clicked') 발송 — AbortError graceful", async () => {
    const abortErr = Object.assign(new Error("cancel"), { name: "AbortError" });
    setNavProp(
      "share",
      vi.fn().mockRejectedValue(abortErr) as unknown as NavWithShare["share"],
    );

    await shareOrCopy({ ...SAMPLE, surface: "weekly_report" });

    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledWith("share_clicked", {
      method: "web_share",
      succeeded: false,
      surface: "weekly_report",
    });
  });

  it("Scenario 5d: trackEvent('share_clicked') 발송 — unsupported", async () => {
    setNavProp("share", undefined);
    setNavProp("clipboard", undefined);
    setExecCommand(undefined);

    await shareOrCopy(SAMPLE);

    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledWith("share_clicked", {
      method: "unsupported",
      succeeded: false,
      surface: "result",
    });
  });
});

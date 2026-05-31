// FR-C-029 — usePushSubscription 순수 헬퍼 단위 테스트.
//
// 대상: urlBase64ToUint8Array (VAPID 키 변환) + detectNeedsHomeScreen (iOS 게이트).
// (subscribe/unsubscribe 오케스트레이션은 Server Action 테스트 + 컴포넌트 테스트가 커버.)

import { afterEach, describe, expect, it, vi } from "vitest";

// hook 모듈이 Server Action(→ prisma/supabase 체인)을 import 하므로 경량 mock 으로 차단.
// (본 테스트는 순수 헬퍼만 호출 — 액션은 미실행.)
vi.mock("@/app/actions/subscribe-push", () => ({ subscribePush: vi.fn() }));
vi.mock("@/app/actions/unsubscribe-push", () => ({ unsubscribePush: vi.fn() }));

import {
  detectNeedsHomeScreen,
  urlBase64ToUint8Array,
} from "@/lib/hooks/usePushSubscription";

describe("urlBase64ToUint8Array — VAPID 키 변환", () => {
  it("base64url(패딩 없음) → 올바른 바이트 ('SGVsbG8' = 'Hello')", () => {
    const out = urlBase64ToUint8Array("SGVsbG8");
    expect(out).toBeInstanceOf(Uint8Array);
    expect(Array.from(out)).toEqual([72, 101, 108, 108, 111]); // H e l l o
  });

  it("'-' / '_' (base64url) → '+' / '/' 치환 후 디코드", () => {
    // 표준 base64 'a+b/' 에 대응하는 base64url 'a-b_' (패딩 없이도 길이 4).
    const out = urlBase64ToUint8Array("a-b_");
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBe(3); // 4 base64 chars → 3 bytes.
  });

  it("빈 문자열 → 길이 0", () => {
    expect(urlBase64ToUint8Array("").length).toBe(0);
  });
});

describe("detectNeedsHomeScreen — iOS standalone 게이트", () => {
  const originalUA = Object.getOwnPropertyDescriptor(
    window.navigator,
    "userAgent",
  );
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    if (originalUA) {
      Object.defineProperty(window.navigator, "userAgent", originalUA);
    }
    window.matchMedia = originalMatchMedia;
  });

  function setUA(ua: string) {
    Object.defineProperty(window.navigator, "userAgent", {
      value: ua,
      configurable: true,
    });
  }
  function setStandalone(matches: boolean) {
    window.matchMedia = ((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  it("non-iOS UA → false (설치 안내 불필요)", () => {
    setUA("Mozilla/5.0 (Windows NT 10.0) Chrome/120");
    setStandalone(false);
    expect(detectNeedsHomeScreen()).toBe(false);
  });

  it("iOS UA + standalone 아님 → true (설치 필요)", () => {
    setUA("Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) Safari");
    setStandalone(false);
    expect(detectNeedsHomeScreen()).toBe(true);
  });

  it("iOS UA + standalone (display-mode) → false (이미 설치)", () => {
    setUA("Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) Safari");
    setStandalone(true);
    expect(detectNeedsHomeScreen()).toBe(false);
  });
});

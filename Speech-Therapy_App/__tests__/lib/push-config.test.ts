// API-020 — lib/push/config (F16 게이트 + VAPID 키) 단위 테스트.
//
// 게이트 진리표: isF16PushEnabled = (F16_PUSH_ENABLED==="true") AND (VAPID 키 쌍 존재).

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getVapidKeys, isF16PushEnabled } from "@/lib/push/config";

const ENV_KEYS = [
  "F16_PUSH_ENABLED",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
] as const;

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("lib/push/config — getVapidKeys", () => {
  it("키 미설정 → null", () => {
    expect(getVapidKeys()).toBeNull();
  });

  it("public 만 설정 → null (쌍 불완전)", () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    expect(getVapidKeys()).toBeNull();
  });

  it("private 만 설정 → null (쌍 불완전)", () => {
    process.env.VAPID_PRIVATE_KEY = "priv";
    expect(getVapidKeys()).toBeNull();
  });

  it("쌍 설정 → 객체 + subject default(mailto:)", () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    const keys = getVapidKeys();
    expect(keys).not.toBeNull();
    expect(keys!.publicKey).toBe("pub");
    expect(keys!.privateKey).toBe("priv");
    expect(keys!.subject).toMatch(/^mailto:/);
  });

  it("VAPID_SUBJECT 설정 시 그대로 사용", () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "https://example.app/contact";
    expect(getVapidKeys()!.subject).toBe("https://example.app/contact");
  });
});

describe("lib/push/config — isF16PushEnabled (게이트 진리표)", () => {
  it("flag off + 키 없음 → false", () => {
    expect(isF16PushEnabled()).toBe(false);
  });

  it("flag on + 키 없음 → false (발송 불가)", () => {
    process.env.F16_PUSH_ENABLED = "true";
    expect(isF16PushEnabled()).toBe(false);
  });

  it("키 있음 + flag off → false (명시 opt-in 필요)", () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    expect(isF16PushEnabled()).toBe(false);
  });

  it("flag 가 'true' 외 값(예: '1') → false", () => {
    process.env.F16_PUSH_ENABLED = "1";
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    expect(isF16PushEnabled()).toBe(false);
  });

  it("flag on + 키 쌍 → true (유일한 활성 조건)", () => {
    process.env.F16_PUSH_ENABLED = "true";
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    expect(isF16PushEnabled()).toBe(true);
  });
});

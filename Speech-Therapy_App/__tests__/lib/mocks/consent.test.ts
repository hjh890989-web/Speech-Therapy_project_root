// MOCK-003 — Consent mock 3종 단위 테스트 (E2 일반 웹폼, 카카오 미연동).
// AC: Scenario 4 (만료 시뮬) + Scenario 5 (Production 가드) + Scenario 6 (Schema 일치).

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ConsentCreateOutputSchema,
  ConsentConfirmOutputSchema,
} from "@/lib/schemas/consent";
import {
  mockConsentSent,
  mockConsentSigned,
  mockConsentExpired,
  getConsentCreateMock,
  getConsentConfirmMock,
} from "@/lib/mocks/consent";

describe("Consent mock fixtures — Schema 일치 (AC Scenario 6)", () => {
  it("mockConsentSent → ConsentCreateOutputSchema 통과 + expiresAt > now (유효)", () => {
    expect(() => ConsentCreateOutputSchema.parse(mockConsentSent)).not.toThrow();
    expect(new Date(mockConsentSent.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(mockConsentSent.signUrl).toMatch(/^https?:\/\//);
  });

  it("mockConsentExpired → schema 통과 + expiresAt < now (만료 시뮬, AC Scenario 4)", () => {
    expect(() => ConsentCreateOutputSchema.parse(mockConsentExpired)).not.toThrow();
    expect(new Date(mockConsentExpired.expiresAt).getTime()).toBeLessThan(Date.now());
  });

  it("mockConsentSent 와 mockConsentExpired 는 서로 다른 signatureToken", () => {
    expect(mockConsentSent.signatureToken).not.toBe(mockConsentExpired.signatureToken);
  });

  it("signatureToken 은 UUID 포맷", () => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(mockConsentSent.signatureToken).toMatch(uuid);
    expect(mockConsentExpired.signatureToken).toMatch(uuid);
  });

  it("mockConsentSigned → ConsentConfirmOutputSchema 통과 + confirmationEmailSent=true", () => {
    expect(() => ConsentConfirmOutputSchema.parse(mockConsentSigned)).not.toThrow();
    expect(mockConsentSigned.success).toBe(true);
    expect(mockConsentSigned.confirmationEmailSent).toBe(true);
  });
});

describe("getConsentCreateMock — searchParam 분기 + env 토글 (AC Scenario 4)", () => {
  const ORIGINAL_ENV = process.env.USE_MOCK_CONSENT;

  beforeEach(() => {
    process.env.USE_MOCK_CONSENT = "true";
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", "");
  });

  afterEach(() => {
    process.env.USE_MOCK_CONSENT = ORIGINAL_ENV;
    vi.unstubAllEnvs();
  });

  function sp(value: string | null) {
    return { get: (key: string) => (key === "mock-consent" ? value : null) };
  }

  it("?mock-consent=sent → mockConsentSent (유효)", () => {
    expect(getConsentCreateMock(sp("sent"))).toEqual(mockConsentSent);
  });

  it("?mock-consent=expired → mockConsentExpired (만료 안내, AC Scenario 4)", () => {
    const out = getConsentCreateMock(sp("expired"));
    expect(out).toEqual(mockConsentExpired);
    expect(new Date(out!.expiresAt).getTime()).toBeLessThan(Date.now());
  });

  it("searchParam 없음 → fallback mockConsentSent", () => {
    expect(getConsentCreateMock(sp(null))).toEqual(mockConsentSent);
  });

  it("알 수 없는 variant → fallback mockConsentSent", () => {
    expect(getConsentCreateMock(sp("nonsense-key"))).toEqual(mockConsentSent);
  });

  it("USE_MOCK_CONSENT=false → null (mock 비활성)", () => {
    process.env.USE_MOCK_CONSENT = "false";
    expect(getConsentCreateMock(sp("sent"))).toBeNull();
  });

  it("USE_MOCK_CONSENT 미설정 → null", () => {
    delete process.env.USE_MOCK_CONSENT;
    expect(getConsentCreateMock(sp("sent"))).toBeNull();
  });

  it("VERCEL_ENV=production → null (AC Scenario 5 Production 가드)", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(getConsentCreateMock(sp("expired"))).toBeNull();
  });

  it("NODE_ENV=production → null (AC Scenario 5 Production 가드)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "");
    expect(getConsentCreateMock(sp("expired"))).toBeNull();
  });
});

describe("getConsentConfirmMock — env 토글 + Production 가드 (AC Scenario 5)", () => {
  const ORIGINAL_ENV = process.env.USE_MOCK_CONSENT;

  beforeEach(() => {
    process.env.USE_MOCK_CONSENT = "true";
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", "");
  });

  afterEach(() => {
    process.env.USE_MOCK_CONSENT = ORIGINAL_ENV;
    vi.unstubAllEnvs();
  });

  it("USE_MOCK_CONSENT=true → mockConsentSigned", () => {
    expect(getConsentConfirmMock()).toEqual(mockConsentSigned);
  });

  it("USE_MOCK_CONSENT=false → null", () => {
    process.env.USE_MOCK_CONSENT = "false";
    expect(getConsentConfirmMock()).toBeNull();
  });

  it("VERCEL_ENV=production → null (Production 가드)", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(getConsentConfirmMock()).toBeNull();
  });
});

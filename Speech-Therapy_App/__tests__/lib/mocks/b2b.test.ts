// MOCK-003 — B2B 승인 mock 2종 단위 테스트 (D8 단순화 — 키즈노트 미연동, 클립보드).
// AC: Scenario 3 (B2B 승인 mock) + Scenario 5 (Production 가드) + Scenario 6 (Schema 일치).

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { B2bApprovalOutputSchema } from "@/lib/schemas/b2b";
import {
  mockApprovalSuccess,
  mockApprovalRejected,
  getB2bApprovalMock,
} from "@/lib/mocks/b2b";

describe("B2B mock fixtures — Schema 일치 (AC Scenario 6)", () => {
  it("mockApprovalSuccess → B2bApprovalOutputSchema 통과 + clipboardText 비어있지 않음 (D8)", () => {
    expect(() => B2bApprovalOutputSchema.parse(mockApprovalSuccess)).not.toThrow();
    expect(mockApprovalSuccess.success).toBe(true);
    expect(mockApprovalSuccess.clipboardText.length).toBeGreaterThan(0);
    expect(mockApprovalSuccess.wasEdited).toBe(false);
  });

  it("mockApprovalRejected → schema 통과 + success=false + clipboardText 빈문자열", () => {
    expect(() => B2bApprovalOutputSchema.parse(mockApprovalRejected)).not.toThrow();
    expect(mockApprovalRejected.success).toBe(false);
    expect(mockApprovalRejected.clipboardText).toBe("");
  });

  it("CON-04 — clipboardText 에 금칙어 (치료/진단/장애) 0건", () => {
    const txt = mockApprovalSuccess.clipboardText;
    expect(txt).not.toMatch(/치료|진단|장애/);
  });

  it("approvedAt 은 valid ISO datetime (schema z.string().datetime())", () => {
    expect(() => new Date(mockApprovalSuccess.approvedAt).toISOString()).not.toThrow();
  });
});

describe("getB2bApprovalMock — searchParam 분기 + env 토글 (AC Scenario 3)", () => {
  const ORIGINAL_ENV = process.env.USE_MOCK_B2B;

  beforeEach(() => {
    process.env.USE_MOCK_B2B = "true";
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", "");
  });

  afterEach(() => {
    process.env.USE_MOCK_B2B = ORIGINAL_ENV;
    vi.unstubAllEnvs();
  });

  function sp(value: string | null) {
    return { get: (key: string) => (key === "mock-b2b" ? value : null) };
  }

  it("?mock-b2b=success → mockApprovalSuccess (클립보드 텍스트 반환, D8)", () => {
    const out = getB2bApprovalMock(sp("success"));
    expect(out).toEqual(mockApprovalSuccess);
    expect(out?.clipboardText.length).toBeGreaterThan(0);
  });

  it("?mock-b2b=rejected → mockApprovalRejected", () => {
    const out = getB2bApprovalMock(sp("rejected"));
    expect(out).toEqual(mockApprovalRejected);
    expect(out?.success).toBe(false);
  });

  it("searchParam 없음 → fallback mockApprovalSuccess", () => {
    expect(getB2bApprovalMock(sp(null))).toEqual(mockApprovalSuccess);
  });

  it("알 수 없는 variant → fallback mockApprovalSuccess", () => {
    expect(getB2bApprovalMock(sp("nonsense-key"))).toEqual(mockApprovalSuccess);
  });

  it("USE_MOCK_B2B=false → null (mock 비활성)", () => {
    process.env.USE_MOCK_B2B = "false";
    expect(getB2bApprovalMock(sp("success"))).toBeNull();
  });

  it("USE_MOCK_B2B 미설정 → null", () => {
    delete process.env.USE_MOCK_B2B;
    expect(getB2bApprovalMock(sp("success"))).toBeNull();
  });

  it("VERCEL_ENV=production → null (AC Scenario 5 Production 가드)", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(getB2bApprovalMock(sp("success"))).toBeNull();
  });

  it("NODE_ENV=production → null (AC Scenario 5 Production 가드)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "");
    expect(getB2bApprovalMock(sp("success"))).toBeNull();
  });
});

// MOCK-002 — mocks/utils 단위 테스트.
// AC: Scenario 4 (Production 강제 비활성) + getMockBySearchParam edge cases.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isMockEnabled, getMockBySearchParam } from "@/lib/mocks/utils";

describe("isMockEnabled — Production 강제 비활성 (AC Scenario 4)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("VERCEL_ENV=production → 환경 변수와 무관하게 false", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NODE_ENV", "development");
    process.env.USE_MOCK_TEST = "true";
    expect(isMockEnabled("USE_MOCK_TEST")).toBe(false);
  });

  it("NODE_ENV=production → 환경 변수와 무관하게 false", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "");
    process.env.USE_MOCK_TEST = "true";
    expect(isMockEnabled("USE_MOCK_TEST")).toBe(false);
  });

  it("dev + USE_MOCK_*=true → true", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    process.env.USE_MOCK_TEST = "true";
    expect(isMockEnabled("USE_MOCK_TEST")).toBe(true);
  });

  it("dev + USE_MOCK_*=false → false", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    process.env.USE_MOCK_TEST = "false";
    expect(isMockEnabled("USE_MOCK_TEST")).toBe(false);
  });

  it("dev + 환경 변수 미설정 → false", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    delete process.env.USE_MOCK_TEST;
    expect(isMockEnabled("USE_MOCK_TEST")).toBe(false);
  });
});

describe("getMockBySearchParam — variant 매칭", () => {
  const variants = { a: { tag: "A" }, b: { tag: "B" } };
  const fallback = { tag: "FALLBACK" };

  function sp(value: string | null) {
    return { get: (_key: string) => value };
  }

  it("매칭 키 → 해당 variant", () => {
    expect(getMockBySearchParam(sp("a"), "mock", variants, fallback)).toEqual({ tag: "A" });
  });

  it("미매칭 키 → fallback", () => {
    expect(getMockBySearchParam(sp("xyz"), "mock", variants, fallback)).toEqual(fallback);
  });

  it("null searchParam → fallback", () => {
    expect(getMockBySearchParam(sp(null), "mock", variants, fallback)).toEqual(fallback);
  });

  it("prototype pollution 방어 — __proto__ 키 거부", () => {
    // Object.prototype.hasOwnProperty.call 사용 → __proto__ 같은 inherited 키는 매칭 안 됨.
    expect(getMockBySearchParam(sp("__proto__"), "mock", variants, fallback)).toEqual(fallback);
  });

  it("URLSearchParams 인스턴스 호환", () => {
    const url = new URLSearchParams("mock=a&other=x");
    expect(getMockBySearchParam(url, "mock", variants, fallback)).toEqual({ tag: "A" });
  });
});

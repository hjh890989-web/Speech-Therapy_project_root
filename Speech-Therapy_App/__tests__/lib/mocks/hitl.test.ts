// MOCK-003 — HITL mock 4종 단위 테스트 (D4 단순화).
// AC: Scenario 1 (HITL 큐 mock) + Scenario 2 (slack-failed graceful) + Scenario 5 (Production 가드) + Scenario 6 (Schema 일치).

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  HitlEnqueueOutputSchema,
  HitlCommentOutputSchema,
} from "@/lib/schemas/hitl";
import {
  mockQueueRegistered,
  mockQueueDuplicate,
  mockSlackFailed,
  mockExpertCommentSuccess,
  getHitlEnqueueMock,
  getHitlCommentMock,
} from "@/lib/mocks/hitl";

describe("HITL mock fixtures — Schema 일치 (AC Scenario 6)", () => {
  it("mockQueueRegistered → HitlEnqueueOutputSchema 통과 + success/slackNotified=true", () => {
    expect(() => HitlEnqueueOutputSchema.parse(mockQueueRegistered)).not.toThrow();
    expect(mockQueueRegistered.success).toBe(true);
    expect(mockQueueRegistered.slackNotified).toBe(true);
    expect(mockQueueRegistered.queueId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("mockQueueDuplicate → schema 통과 + success=false (409 Conflict 시뮬)", () => {
    expect(() => HitlEnqueueOutputSchema.parse(mockQueueDuplicate)).not.toThrow();
    expect(mockQueueDuplicate.success).toBe(false);
  });

  it("mockSlackFailed → schema 통과 + success=true + slackNotified=false (graceful degradation, AC Scenario 2)", () => {
    expect(() => HitlEnqueueOutputSchema.parse(mockSlackFailed)).not.toThrow();
    expect(mockSlackFailed.success).toBe(true);
    expect(mockSlackFailed.slackNotified).toBe(false);
  });

  it("mockExpertCommentSuccess → HitlCommentOutputSchema 통과 + userNotified=true", () => {
    expect(() => HitlCommentOutputSchema.parse(mockExpertCommentSuccess)).not.toThrow();
    expect(mockExpertCommentSuccess.success).toBe(true);
    expect(mockExpertCommentSuccess.userNotified).toBe(true);
  });

  it("slaDueAt 은 현재 시각 이후 (48시간 SLA)", () => {
    const sla = new Date(mockQueueRegistered.slaDueAt).getTime();
    expect(sla).toBeGreaterThan(Date.now());
  });
});

describe("getHitlEnqueueMock — searchParam 분기 + env 토글 (AC Scenario 1)", () => {
  const ORIGINAL_ENV = process.env.USE_MOCK_HITL;

  beforeEach(() => {
    process.env.USE_MOCK_HITL = "true";
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", "");
  });

  afterEach(() => {
    process.env.USE_MOCK_HITL = ORIGINAL_ENV;
    vi.unstubAllEnvs();
  });

  function sp(value: string | null) {
    return { get: (key: string) => (key === "mock-hitl" ? value : null) };
  }

  it("?mock-hitl=registered → mockQueueRegistered", () => {
    expect(getHitlEnqueueMock(sp("registered"))).toEqual(mockQueueRegistered);
  });

  it("?mock-hitl=duplicate → mockQueueDuplicate (409 시뮬)", () => {
    expect(getHitlEnqueueMock(sp("duplicate"))).toEqual(mockQueueDuplicate);
  });

  it("?mock-hitl=slack-failed → mockSlackFailed (AC Scenario 2)", () => {
    const out = getHitlEnqueueMock(sp("slack-failed"));
    expect(out).toEqual(mockSlackFailed);
    expect(out?.slackNotified).toBe(false);
  });

  it("searchParam 없음 → fallback mockQueueRegistered", () => {
    expect(getHitlEnqueueMock(sp(null))).toEqual(mockQueueRegistered);
  });

  it("알 수 없는 variant → fallback mockQueueRegistered", () => {
    expect(getHitlEnqueueMock(sp("nonsense-key"))).toEqual(mockQueueRegistered);
  });

  it("USE_MOCK_HITL=false → null (mock 비활성)", () => {
    process.env.USE_MOCK_HITL = "false";
    expect(getHitlEnqueueMock(sp("registered"))).toBeNull();
  });

  it("USE_MOCK_HITL 미설정 → null", () => {
    delete process.env.USE_MOCK_HITL;
    expect(getHitlEnqueueMock(sp("registered"))).toBeNull();
  });

  it("VERCEL_ENV=production → env 가 true 여도 null (AC Scenario 5 Production 가드)", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(getHitlEnqueueMock(sp("registered"))).toBeNull();
  });

  it("NODE_ENV=production → null (AC Scenario 5 Production 가드)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "");
    expect(getHitlEnqueueMock(sp("registered"))).toBeNull();
  });
});

describe("getHitlCommentMock — env 토글 + Production 가드 (AC Scenario 5)", () => {
  const ORIGINAL_ENV = process.env.USE_MOCK_HITL;

  beforeEach(() => {
    process.env.USE_MOCK_HITL = "true";
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", "");
  });

  afterEach(() => {
    process.env.USE_MOCK_HITL = ORIGINAL_ENV;
    vi.unstubAllEnvs();
  });

  it("USE_MOCK_HITL=true → mockExpertCommentSuccess", () => {
    expect(getHitlCommentMock()).toEqual(mockExpertCommentSuccess);
  });

  it("USE_MOCK_HITL=false → null", () => {
    process.env.USE_MOCK_HITL = "false";
    expect(getHitlCommentMock()).toBeNull();
  });

  it("VERCEL_ENV=production → null (Production 가드)", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(getHitlCommentMock()).toBeNull();
  });
});

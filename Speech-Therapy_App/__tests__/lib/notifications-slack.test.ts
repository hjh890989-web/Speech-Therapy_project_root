// FR-C-002 / API-005 — Slack 어댑터 단위 테스트.
// R4 검증: 메시지에 자녀 식별 정보 미포함.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildHITLAlertMessage,
  sendSlackMessage,
  notifyHITLBySlack,
} from "@/lib/notifications/slack";

describe("buildHITLAlertMessage", () => {
  const now = new Date("2026-05-12T12:00:00Z");
  const args = {
    sessionId: "session-abc",
    queueId: "queue-xyz",
    confidenceScore: 65.234,
    slaDueAt: now,
  };

  it("필수 정보 포함 (sessionId, queueId, confidence, SLA)", () => {
    const text = buildHITLAlertMessage(args);
    expect(text).toContain("HITL 검토 필요");
    expect(text).toContain("session-abc");
    expect(text).toContain("queue-xyz");
    expect(text).toContain("65.2"); // confidence toFixed(1)
    expect(text).toContain("2026-05-12T12:00:00.000Z");
  });

  it("R4: 자녀 식별 정보 키워드 절대 미포함", () => {
    const text = buildHITLAlertMessage({
      ...args,
      // 의도적으로 식별 키워드 누락 검증 (메시지 형식 자체가 sessionId 외 식별자 노출 안 함).
    });
    // 식별 키워드 가능성: userId, anonymousUserId, email, name
    const forbiddenKeywords = ["userId", "anonymousUserId", "email", "name"];
    for (const word of forbiddenKeywords) {
      expect(text).not.toContain(word);
    }
  });

  it("supabaseStudioUrl 옵션 시 링크 포함", () => {
    const text = buildHITLAlertMessage({
      ...args,
      supabaseStudioUrl: "https://supabase.com/dashboard/...",
    });
    expect(text).toContain("Supabase Studio");
  });
});

describe("sendSlackMessage", () => {
  const originalEnv = process.env.SLACK_WEBHOOK_URL;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    delete process.env.SLACK_WEBHOOK_URL;
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    process.env.SLACK_WEBHOOK_URL = originalEnv;
    globalThis.fetch = originalFetch;
  });

  it("환경 변수 부재 → skip 처리 (실 호출 0회)", async () => {
    const result = await sendSlackMessage("test");
    expect(result.skipped).toBe(true);
    expect(result.ok).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("정상 응답 → ok=true", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/mock";
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("ok", { status: 200 }),
    );
    const result = await sendSlackMessage("hello");
    expect(result.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it("HTTP 500 → ok=false + error", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/mock";
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("err", { status: 500 }),
    );
    const result = await sendSlackMessage("hello");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("500");
  });

  it("fetch reject → graceful ok=false", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/mock";
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network down"));
    const result = await sendSlackMessage("hello");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("network down");
  });
});

describe("notifyHITLBySlack 통합", () => {
  const originalEnv = process.env.SLACK_WEBHOOK_URL;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/mock";
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
  });

  afterEach(() => {
    process.env.SLACK_WEBHOOK_URL = originalEnv;
    globalThis.fetch = originalFetch;
  });

  it("정상 발송 → ok=true + 정확한 body 페이로드", async () => {
    const result = await notifyHITLBySlack({
      sessionId: "session-1",
      queueId: "queue-1",
      confidenceScore: 65,
      slaDueAt: new Date("2026-05-12T12:00:00Z"),
    });
    expect(result.ok).toBe(true);
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.text).toContain("session-1");
    expect(body.text).toContain("queue-1");
  });
});

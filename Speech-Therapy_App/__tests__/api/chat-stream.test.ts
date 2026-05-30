// TEST-NEW-F15-1 — POST /api/chat/stream 가드 (게이트 / auth / zod / 입력검열 / rate-limit / 스트림).
//
// NODE_ENV='test' → streamChatReply 강제 fallback(CHAT_FALLBACK_REPLY) — Gemini 실호출 없이 결정적.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { POST } from "@/app/api/chat/stream/route";
import { __resetRateLimitForTest, recordCall } from "@/lib/ratelimit";
import { CHAT_FALLBACK_REPLY } from "@/lib/ai/chat-stream";
import { SAFE_FALLBACK_MESSAGE } from "@/lib/ai/profanity-filter";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: () => getUserMock() },
  }),
}));

const assertConsentMock = vi.fn();
vi.mock("@/lib/policy/consent-guard", () => ({
  assertConsentedIfAuthenticated: () => assertConsentMock(),
  ConsentRequiredError: class ConsentRequiredError extends Error {
    code = "PIPA_CONSENT_REQUIRED";
  },
}));

function authed(id = "u1") {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}
function anon() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

function req(messages: unknown): Request {
  return new Request("http://localhost/api/chat/stream", {
    method: "POST",
    body: JSON.stringify({ messages }),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  __resetRateLimitForTest();
  getUserMock.mockReset();
  assertConsentMock.mockReset();
  assertConsentMock.mockResolvedValue(undefined); // 기본: 동의 완료
  vi.stubEnv("F15_CHAT_ENABLED", "true");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/chat/stream — F15 게이트", () => {
  it("F15_CHAT_ENABLED!=='true' → 403 (스트림 진입 전 차단)", async () => {
    vi.stubEnv("F15_CHAT_ENABLED", "false");
    authed();
    const res = await POST(req([{ role: "user", content: "안녕" }]));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("F15_DISABLED");
  });
});

describe("POST /api/chat/stream — 가드 (enabled)", () => {
  it("미인증 → 401", async () => {
    anon();
    const res = await POST(req([{ role: "user", content: "안녕" }]));
    expect(res.status).toBe(401);
  });

  it("PIPA 미동의 → 403 CONSENT_REQUIRED (Gemini 국외이전 전 차단)", async () => {
    authed();
    const { ConsentRequiredError } = await import("@/lib/policy/consent-guard");
    assertConsentMock.mockRejectedValue(new ConsentRequiredError());
    const res = await POST(req([{ role: "user", content: "안녕" }]));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("CONSENT_REQUIRED");
  });

  it("빈 messages → 400", async () => {
    authed();
    const res = await POST(req([]));
    expect(res.status).toBe(400);
  });

  it("정상 → 200 text/plain 스트림 (test 모드 fallback)", async () => {
    authed();
    const res = await POST(req([{ role: "user", content: "오늘 뭐 했어?" }]));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");
    expect(res.headers.get("X-Chat-Source")).toBe("streaming");
    expect(await res.text()).toBe(CHAT_FALLBACK_REPLY);
  });

  it("입력 금칙어(의료 화제) → Gemini 미호출 + 안전 멘트 graceful 전환", async () => {
    authed();
    const res = await POST(req([{ role: "user", content: "병원 가야 해?" }]));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Chat-Source")).toBe("input-guard");
    const body = await res.text();
    expect(body).toBe(SAFE_FALLBACK_MESSAGE);
    expect(body).not.toContain("병원");
  });

  it("rate-limit 초과 → 429 (SEC-004)", async () => {
    authed();
    for (let i = 0; i < 14; i++) recordCall("global-fill"); // 글로벌 RPM 14 채움
    const res = await POST(req([{ role: "user", content: "안녕" }]));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("RATE_LIMITED");
  });
});

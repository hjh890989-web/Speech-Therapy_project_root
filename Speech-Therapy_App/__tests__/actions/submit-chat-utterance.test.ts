// TEST-NEW-F15-1 — submitChatUtterance (PIPA 가드 + R4 마스킹 + 7일 + 금칙어 저장 거부).

import { describe, it, expect, vi, beforeEach } from "vitest";

const getUserMock = vi.fn();
const assertConsentMock = vi.fn();
const reportPipaMock = vi.fn();
const chatCreateMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({ auth: { getUser: () => getUserMock() } }),
}));
vi.mock("@/lib/policy/consent-guard", () => ({
  assertConsentedIfAuthenticated: () => assertConsentMock(),
  ConsentRequiredError: class ConsentRequiredError extends Error {
    code = "PIPA_CONSENT_REQUIRED";
    constructor() {
      super("PIPA_CONSENT_REQUIRED");
      this.name = "ConsentRequiredError";
    }
  },
}));
vi.mock("@/lib/monitoring/pipa-violation", () => ({
  reportPipaViolation: (...a: unknown[]) => reportPipaMock(...a),
}));
vi.mock("@/lib/db", () => ({
  prisma: { chatMessage: { create: (...a: unknown[]) => chatCreateMock(...a) } },
}));

import { submitChatUtterance } from "@/app/actions/submit-chat-utterance";
import { ConsentRequiredError } from "@/lib/policy/consent-guard";

beforeEach(() => {
  getUserMock.mockReset();
  assertConsentMock.mockReset();
  reportPipaMock.mockReset();
  chatCreateMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
  assertConsentMock.mockResolvedValue(undefined);
  chatCreateMock.mockResolvedValue({ id: "cm1", expiresAt: new Date("2026-06-06T00:00:00Z") });
});

describe("submitChatUtterance — PIPA 가드 배선", () => {
  it("미인증 → unauthorized (INSERT 0)", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const r = await submitChatUtterance({ role: "user", content: "안녕" });
    expect(r).toEqual({ success: false, reason: "unauthorized" });
    expect(chatCreateMock).not.toHaveBeenCalled();
  });

  it("PIPA 미동의 → consent_required + reportPipaViolation", async () => {
    assertConsentMock.mockRejectedValue(new ConsentRequiredError());
    const r = await submitChatUtterance({ role: "user", content: "안녕" });
    expect(r.reason).toBe("consent_required");
    expect(reportPipaMock).toHaveBeenCalled();
    expect(chatCreateMock).not.toHaveBeenCalled();
  });

  it("정상 → R4 마스킹 후 저장 + expiresAt(7일)", async () => {
    const r = await submitChatUtterance({ role: "user", content: "내 번호는 010-1234-5678이야" });
    expect(r.success).toBe(true);
    expect(r.messageId).toBe("cm1");
    const arg = chatCreateMock.mock.calls[0]?.[0] as { data: { content: string; role: string; expiresAt: Date } };
    expect(arg.data.content).not.toContain("010-1234"); // PII 마스킹됨
    expect(arg.data.content).toContain("[전화번호]");
    expect(arg.data.role).toBe("user");
    // expiresAt ≈ now + 7일.
    const ttlDays = (arg.data.expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(ttlDays).toBeGreaterThan(6.9);
    expect(ttlDays).toBeLessThan(7.1);
  });

  it("금칙어 발화 → forbidden_content (저장 거부)", async () => {
    const r = await submitChatUtterance({ role: "user", content: "병원 가야 해" });
    expect(r.reason).toBe("forbidden_content");
    expect(chatCreateMock).not.toHaveBeenCalled();
  });

  it("빈 내용 → invalid_input", async () => {
    const r = await submitChatUtterance({ role: "user", content: "" });
    expect(r.reason).toBe("invalid_input");
    expect(chatCreateMock).not.toHaveBeenCalled();
  });
});

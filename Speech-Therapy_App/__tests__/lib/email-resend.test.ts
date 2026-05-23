// API-012 (#13) — Resend 이메일 어댑터 단위 테스트.
// graceful 정책 + CON-04 금칙어 차단 + timeout / error 분기 검증.
//
// 시나리오 매핑 (TASK §7):
//   1. NODE_ENV='test' → auto-skip
//   2. RESEND_API_KEY 미설정 → skip
//   3. 정상 발송 → ok: true + id
//   4. CON-04 금칙어 (subject) → 차단 + warn
//   5. CON-04 금칙어 (html) → 차단
//   6. CON-04 금칙어 (text) → 차단
//   7. CON-04 화이트리스트 ("치료실") → 정상 발송
//   8. Resend SDK 응답 error 필드 → ok: false + error
//   9. SDK throw → graceful ok: false
//  10. timeout → ok: false + error: 'timeout'
//  11. body 부재 (html/text 모두 미설정) → ok: false + error: 'no_body'
//  12. to 배열 (다중 수신자) → SDK 위임
//  13. tags 정상 전달
//  14. getFromAddress 환경변수 패턴

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// SDK mock — 매 import 마다 fresh mock 보장.
// `class` 로 mock 해야 `new Resend(key)` 호출이 작동 (arrow vi.fn 은 not a constructor).
const mockSend = vi.fn();
vi.mock("resend", () => {
  class MockResend {
    emails = { send: mockSend };
    constructor(_key?: string) {}
  }
  return { Resend: MockResend };
});

import { sendEmail, __resetResendClientForTests } from "@/lib/email/resend";
import { getFromAddress, getFromEmailOnly } from "@/lib/email/from";

describe("sendEmail — graceful skip 분기", () => {
  const ORIG_NODE_ENV = process.env.NODE_ENV;
  const ORIG_API_KEY = process.env.RESEND_API_KEY;

  beforeEach(() => {
    mockSend.mockReset();
    __resetResendClientForTests();
  });

  afterEach(() => {
    vi.stubEnv("NODE_ENV", ORIG_NODE_ENV ?? "test");
    if (ORIG_API_KEY === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = ORIG_API_KEY;
  });

  it("NODE_ENV='test' → 자동 skip (실 발송 차단)", async () => {
    vi.stubEnv("NODE_ENV", "test");
    process.env.RESEND_API_KEY = "re_dummy";
    const result = await sendEmail({
      to: "parent@example.com",
      subject: "Hi",
      text: "body",
    });
    expect(result.skipped).toBe(true);
    expect(result.ok).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("RESEND_API_KEY 미설정 → skipped: true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.RESEND_API_KEY;
    const result = await sendEmail({
      to: "parent@example.com",
      subject: "Hi",
      text: "body",
    });
    expect(result.skipped).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("RESEND_API_KEY");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("RESEND_API_KEY 빈 문자열 → skipped: true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.RESEND_API_KEY = "   ";
    const result = await sendEmail({
      to: "parent@example.com",
      subject: "Hi",
      text: "body",
    });
    expect(result.skipped).toBe(true);
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe("sendEmail — 정상 발송 + Resend SDK 위임", () => {
  const ORIG_NODE_ENV = process.env.NODE_ENV;
  const ORIG_API_KEY = process.env.RESEND_API_KEY;

  beforeEach(() => {
    mockSend.mockReset();
    __resetResendClientForTests();
    vi.stubEnv("NODE_ENV", "production");
    process.env.RESEND_API_KEY = "re_test_key";
  });

  afterEach(() => {
    vi.stubEnv("NODE_ENV", ORIG_NODE_ENV ?? "test");
    if (ORIG_API_KEY === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = ORIG_API_KEY;
  });

  it("정상 응답 → ok: true + id 반환", async () => {
    mockSend.mockResolvedValue({
      data: { id: "email-abc-123" },
      error: null,
    });
    const result = await sendEmail({
      to: "parent@example.com",
      subject: "발음 발달 확인 안내",
      html: "<p>안녕하세요</p>",
      text: "안녕하세요",
    });
    expect(result.ok).toBe(true);
    expect(result.id).toBe("email-abc-123");
    expect(result.skipped).toBe(false);
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it("to: 배열 (다중 수신자) 정상 위임", async () => {
    mockSend.mockResolvedValue({
      data: { id: "email-id-1" },
      error: null,
    });
    const result = await sendEmail({
      to: ["a@example.com", "b@example.com"],
      subject: "공지",
      text: "본문",
    });
    expect(result.ok).toBe(true);
    const call = mockSend.mock.calls[0][0];
    expect(call.to).toEqual(["a@example.com", "b@example.com"]);
  });

  it("tags + replyTo 정상 전달", async () => {
    mockSend.mockResolvedValue({
      data: { id: "email-id-2" },
      error: null,
    });
    await sendEmail({
      to: "parent@example.com",
      subject: "안내",
      text: "본문",
      replyTo: "admin@example.com",
      tags: [{ name: "template", value: "parent_invite" }],
    });
    const call = mockSend.mock.calls[0][0];
    expect(call.replyTo).toBe("admin@example.com");
    expect(call.tags).toEqual([{ name: "template", value: "parent_invite" }]);
  });

  it("Resend 응답 error 필드 존재 → ok: false + error 메시지", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { message: "invalid from address" },
    });
    const result = await sendEmail({
      to: "parent@example.com",
      subject: "공지",
      text: "본문",
    });
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.error).toContain("invalid from address");
  });

  it("SDK throw → graceful ok: false (절대 throw 금지)", async () => {
    mockSend.mockRejectedValue(new Error("network down"));
    const result = await sendEmail({
      to: "parent@example.com",
      subject: "공지",
      text: "본문",
    });
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.error).toContain("network down");
  });

  it("SDK 응답에 id 없음 → ok: false + error: 'no_id_returned'", async () => {
    mockSend.mockResolvedValue({
      data: {},
      error: null,
    });
    const result = await sendEmail({
      to: "parent@example.com",
      subject: "공지",
      text: "본문",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("no_id_returned");
  });

  it("timeout (10s 초과) → ok: false + error: 'timeout'", async () => {
    vi.useFakeTimers();
    try {
      // 영원히 resolve 안 함 → AbortController timeout 가 reject.
      mockSend.mockImplementation(
        () => new Promise(() => { /* never resolves */ }),
      );
      const promise = sendEmail({
        to: "parent@example.com",
        subject: "공지",
        text: "본문",
      });
      await vi.advanceTimersByTimeAsync(10_001);
      const result = await promise;
      expect(result.ok).toBe(false);
      expect(result.error).toBe("timeout");
    } finally {
      vi.useRealTimers();
    }
  });

  it("body 부재 (html/text 모두 미설정) → ok: false + error: 'no_body'", async () => {
    const result = await sendEmail({
      to: "parent@example.com",
      subject: "공지",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("no_body");
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe("sendEmail — CON-04 금칙어 차단 + 화이트리스트", () => {
  const ORIG_NODE_ENV = process.env.NODE_ENV;
  const ORIG_API_KEY = process.env.RESEND_API_KEY;

  beforeEach(() => {
    mockSend.mockReset();
    __resetResendClientForTests();
    vi.stubEnv("NODE_ENV", "production");
    process.env.RESEND_API_KEY = "re_test_key";
  });

  afterEach(() => {
    vi.stubEnv("NODE_ENV", ORIG_NODE_ENV ?? "test");
    if (ORIG_API_KEY === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = ORIG_API_KEY;
  });

  it("subject 에 금칙어 ('진단') → 발송 차단 + warn log", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await sendEmail({
      to: "parent@example.com",
      subject: "[Speech-Therapy] 진단 결과 안내",
      text: "본문",
    });
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.error).toMatch(/^banned_term:subject:/);
    expect(mockSend).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("html 본문에 금칙어 ('장애') → 발송 차단", async () => {
    const result = await sendEmail({
      to: "parent@example.com",
      subject: "안내",
      html: "<p>장애 가능성이 있습니다</p>",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/^banned_term:html:/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("text 본문에 금칙어 ('치료') → 발송 차단", async () => {
    const result = await sendEmail({
      to: "parent@example.com",
      subject: "안내",
      text: "치료가 필요합니다",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/^banned_term:text:/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("화이트리스트 ('치료실/치료사') → 정상 발송", async () => {
    mockSend.mockResolvedValue({
      data: { id: "email-allowed" },
      error: null,
    });
    const result = await sendEmail({
      to: "parent@example.com",
      subject: "치료실 안내",
      text: "언어치료 과정 안내 — 치료사 선생님과 함께",
    });
    expect(result.ok).toBe(true);
    expect(result.id).toBe("email-allowed");
    expect(mockSend).toHaveBeenCalledOnce();
  });
});

describe("getFromAddress — 발송 주체 helper", () => {
  const ORIG_EMAIL = process.env.RESEND_FROM_EMAIL;
  const ORIG_NAME = process.env.RESEND_FROM_NAME;

  afterEach(() => {
    if (ORIG_EMAIL === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = ORIG_EMAIL;
    if (ORIG_NAME === undefined) delete process.env.RESEND_FROM_NAME;
    else process.env.RESEND_FROM_NAME = ORIG_NAME;
  });

  it("환경변수 미설정 → 기본값 placeholder", () => {
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.RESEND_FROM_NAME;
    const addr = getFromAddress();
    expect(addr).toContain("noreply@speech-therapy.example.com");
    expect(addr).toContain("Speech-Therapy");
  });

  it("RESEND_FROM_EMAIL + RESEND_FROM_NAME → friendly 형식", () => {
    process.env.RESEND_FROM_EMAIL = "hello@speech-therapy.app";
    process.env.RESEND_FROM_NAME = "Speech-Therapy Bot";
    expect(getFromAddress()).toBe("Speech-Therapy Bot <hello@speech-therapy.app>");
  });

  it("FROM_NAME 에 금칙어 ('치료') 포함 → 기본값으로 폴백", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.RESEND_FROM_EMAIL = "hello@speech-therapy.app";
    process.env.RESEND_FROM_NAME = "치료 알림";
    const addr = getFromAddress();
    expect(addr).toContain("Speech-Therapy <");
    expect(addr).not.toContain("치료");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("부적합 이메일 형식 → 기본값 폴백", () => {
    process.env.RESEND_FROM_EMAIL = "not-an-email";
    expect(getFromEmailOnly()).toBe("noreply@speech-therapy.example.com");
  });
});

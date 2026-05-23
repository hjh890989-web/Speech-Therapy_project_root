// FR-C-018 (#41) — POST /api/consent/sign route 단위 테스트.
//
// 시나리오:
//   1. CSRF Origin mismatch → 403 (DB 호출 0건)
//   2. Replay nonce 재사용 → 409
//   3. Rate Limit (USER_DAILY) → 429
//   4. Invalid input (XSS only nickname / bad email) → 400
//   5. 정상 발송 신규 → 201 + token + signUrl + emailSkipped=false
//   6. 멱등 — 같은 부모/자녀/타입 pending 재사용 → 200 + created=false
//   7. 이메일 발송 실패 (graceful) → 200 + emailSkipped=true
//   8. DB create 실패 → 500 INTERNAL_ERROR
//   9. nonce 없이 정상 통과 (하위 호환)

import { describe, it, expect, beforeEach, vi } from "vitest";

const verifyOriginMock = vi.fn();
const verifyReplayMock = vi.fn();
const recordNonceMock = vi.fn();
const checkRateLimitMock = vi.fn();
const createOrReturnPendingConsentMock = vi.fn();
const sendEmailMock = vi.fn();

vi.mock("@/lib/csrf", () => ({
  verifyOrigin: (...args: unknown[]) => verifyOriginMock(...args),
}));
vi.mock("@/lib/replay", () => ({
  verifyReplay: (...args: unknown[]) => verifyReplayMock(...args),
  recordNonce: (...args: unknown[]) => recordNonceMock(...args),
}));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
}));
vi.mock("@/lib/consent/repo", () => ({
  createOrReturnPendingConsent: (...args: unknown[]) =>
    createOrReturnPendingConsentMock(...args),
  CONSENT_EXPIRE_DAYS: 7,
}));
vi.mock("@/lib/email/resend", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

// next/headers cookies — happy-dom 에서도 안전한 mock.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
  }),
}));

import { POST } from "@/app/api/consent/sign/route";

function makeRequest(opts: {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
} = {}): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Origin: "http://localhost",
    ...opts.headers,
  };
  return new Request("http://localhost/api/consent/sign", {
    method: "POST",
    headers,
    body: JSON.stringify(opts.body ?? {}),
  });
}

const VALID_BODY = {
  // Zod 4 UUID 검증은 v1~v8 형식 강제 — 3번째 그룹의 첫 자리는 1~8 (version).
  institutionId: "11111111-1111-4111-8111-111111111111",
  parentEmail: "parent@example.com",
  parentPhone: "010-1234-5678",
  childNickname: "지우",
  childAgeMonths: 60,
};

function validRow() {
  return {
    id: "row-1",
    parentEmail: "parent@example.com",
    parentName: "parent",
    childNickname: "지우",
    consentType: "data_usage",
    status: "pending",
    token: "tok-uuid-1",
    sentAt: new Date("2026-05-23T00:00:00Z"),
    remindedAt: null,
    signedAt: null,
    expiredAt: null,
    institutionId: "11111111-1111-4111-8111-111111111111",
    createdAt: new Date("2026-05-23T00:00:00Z"),
    updatedAt: new Date("2026-05-23T00:00:00Z"),
  };
}

beforeEach(() => {
  verifyOriginMock.mockReset();
  verifyReplayMock.mockReset();
  recordNonceMock.mockReset();
  checkRateLimitMock.mockReset();
  createOrReturnPendingConsentMock.mockReset();
  sendEmailMock.mockReset();

  // 기본: 모든 보안 layer 통과.
  verifyOriginMock.mockReturnValue({ ok: true });
  verifyReplayMock.mockReturnValue({ ok: true });
  checkRateLimitMock.mockReturnValue({ allowed: true });
  createOrReturnPendingConsentMock.mockResolvedValue({
    created: true,
    row: validRow(),
  });
  sendEmailMock.mockResolvedValue({ ok: true, id: "email-1", skipped: false });
});

describe("POST /api/consent/sign — 4중 보안 layer 보존", () => {
  it("CSRF Origin mismatch → 403 + DB 호출 0건", async () => {
    verifyOriginMock.mockReturnValue({
      ok: false,
      reason: "CSRF_ORIGIN_MISMATCH",
    });
    const res = await POST(makeRequest({ body: VALID_BODY }));
    expect(res.status).toBe(403);
    expect(createOrReturnPendingConsentMock).not.toHaveBeenCalled();
  });

  it("Replay nonce 재사용 → 409 + DB 호출 0건", async () => {
    verifyReplayMock.mockReturnValue({ ok: false, reason: "replay" });
    const res = await POST(
      makeRequest({
        body: VALID_BODY,
        headers: { "X-Idempotency-Key": "nonce-1" },
      }),
    );
    expect(res.status).toBe(409);
    expect(createOrReturnPendingConsentMock).not.toHaveBeenCalled();
  });

  it("Rate Limit 차단 → 429 + Retry-After 헤더", async () => {
    checkRateLimitMock.mockReturnValue({
      allowed: false,
      reason: "USER_DAILY",
      retryAfterSec: 3600,
    });
    const res = await POST(makeRequest({ body: VALID_BODY }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
  });

  it("Schema 검증 실패 (잘못된 email) → 400", async () => {
    const res = await POST(
      makeRequest({
        body: { ...VALID_BODY, parentEmail: "not-an-email" },
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("INVALID_INPUT");
    expect(createOrReturnPendingConsentMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/consent/sign — 실 처리", () => {
  it("정상 신규 발급 → 201 + token + emailSkipped=false + nonce record", async () => {
    const res = await POST(
      makeRequest({
        body: VALID_BODY,
        headers: { "X-Idempotency-Key": "nonce-ok" },
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      signatureToken: string;
      signUrl: string;
      status: string;
      emailSkipped: boolean;
      created: boolean;
      expiresAt: string;
    };
    expect(body.id).toBe("row-1");
    expect(body.signatureToken).toBe("tok-uuid-1");
    expect(body.signUrl).toContain("/consent/tok-uuid-1");
    expect(body.status).toBe("pending");
    expect(body.emailSkipped).toBe(false);
    expect(body.created).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledOnce();
    const emailArgs = sendEmailMock.mock.calls[0][0];
    expect(emailArgs.to).toBe("parent@example.com");
    expect(emailArgs.tags).toEqual([{ name: "template", value: "consent_signature" }]);
    expect(recordNonceMock).toHaveBeenCalledWith("nonce-ok");
  });

  it("멱등 — 같은 부모/자녀 pending 재사용 → 200 + created=false", async () => {
    createOrReturnPendingConsentMock.mockResolvedValue({
      created: false,
      row: { ...validRow(), token: "existing-token" },
    });
    const res = await POST(makeRequest({ body: VALID_BODY }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { created: boolean; signatureToken: string };
    expect(body.created).toBe(false);
    expect(body.signatureToken).toBe("existing-token");
  });

  it("이메일 발송 실패 (skipped) → 200 + emailSkipped=true (graceful)", async () => {
    sendEmailMock.mockResolvedValue({
      ok: false,
      skipped: true,
      error: "RESEND_API_KEY not set",
    });
    const res = await POST(makeRequest({ body: VALID_BODY }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { emailSkipped: boolean; signatureToken: string };
    expect(body.emailSkipped).toBe(true);
    expect(body.signatureToken).toBe("tok-uuid-1"); // DB record 는 그대로
  });

  it("이메일 발송 SDK 실패 (skipped=false, ok=false) → 200 + emailSkipped=true", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    sendEmailMock.mockResolvedValue({
      ok: false,
      skipped: false,
      error: "resend_5xx",
    });
    const res = await POST(makeRequest({ body: VALID_BODY }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { emailSkipped: boolean };
    expect(body.emailSkipped).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("DB create 실패 → 500 INTERNAL_ERROR + 이메일 발송 0건", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    createOrReturnPendingConsentMock.mockRejectedValue(new Error("DB down"));
    const res = await POST(makeRequest({ body: VALID_BODY }));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("INTERNAL_ERROR");
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("nonce 헤더 없이 정상 통과 (하위 호환) + recordNonce 호출 0건", async () => {
    const res = await POST(makeRequest({ body: VALID_BODY }));
    expect(res.status).toBe(201);
    expect(verifyReplayMock).not.toHaveBeenCalled();
    expect(recordNonceMock).not.toHaveBeenCalled();
  });
});

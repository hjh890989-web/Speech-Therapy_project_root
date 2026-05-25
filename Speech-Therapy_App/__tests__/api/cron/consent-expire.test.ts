// FR-C-018 (#41) — /api/cron/consent-expire route 단위 테스트.
//
// 시나리오:
//   1. CRON_SECRET 실패 → 401
//   2. 0건 → 200 + expiredCount=0
//   3. N건 정상 → markExpired + sendEmail per item
//   4. markExpired 실패 → errors + sendEmail skip
//   5. sendEmail 실패 (skipped=false) → status 전환은 유지, errors 누적
//   6. sendEmail skipped (RESEND_API_KEY 미설정) → emailSkippedCount 누적, errors X
//   7. 멱등 — status='pending' 만 매칭 (이미 expired 는 자연 제외 — repo 책임)

import { describe, it, expect, beforeEach, vi } from "vitest";

const verifyCronSecretMock = vi.fn();
const findExpireCandidatesMock = vi.fn();
const markExpiredMock = vi.fn();
const sendEmailMock = vi.fn();

vi.mock("@/lib/cron-auth", () => ({
  verifyCronSecret: (...args: unknown[]) => verifyCronSecretMock(...args),
}));
vi.mock("@/lib/consent/repo", () => ({
  findExpireCandidates: (...args: unknown[]) => findExpireCandidatesMock(...args),
  markExpired: (...args: unknown[]) => markExpiredMock(...args),
  CONSENT_BATCH_LIMIT: 100,
}));
// FR-C-NOTIFICATION-PREFERENCE — cron 이 sendConsentEmailWithPreference 통해 우회.
//   본 단위 테스트에선 wrapper 를 mock 하여 cron 흐름만 검증.
vi.mock("@/lib/consent/email", () => ({
  sendConsentEmailWithPreference: (...args: unknown[]) => sendEmailMock(...args),
}));

import { GET } from "@/app/api/cron/consent-expire/route";

function makeRequest(): Request {
  return new Request("http://localhost/api/cron/consent-expire");
}

function makeRow(id: string) {
  return {
    id,
    parentEmail: `${id}@x.com`,
    parentName: id,
    childNickname: "지우",
    consentType: "data_usage",
    status: "pending",
    token: `tok-${id}`,
    sentAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8일 전
    remindedAt: null,
    signedAt: null,
    expiredAt: null,
    institutionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

beforeEach(() => {
  verifyCronSecretMock.mockReset();
  findExpireCandidatesMock.mockReset();
  markExpiredMock.mockReset();
  sendEmailMock.mockReset();
  verifyCronSecretMock.mockReturnValue({ ok: true });
  findExpireCandidatesMock.mockResolvedValue([]);
  markExpiredMock.mockResolvedValue(undefined);
  sendEmailMock.mockResolvedValue({ ok: true, id: "email-x", skipped: false });
});

describe("consent-expire cron — 인증 + 처리량", () => {
  it("CRON_SECRET 실패 → 401", async () => {
    verifyCronSecretMock.mockReturnValue({
      ok: false,
      reason: "invalid_authorization",
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(findExpireCandidatesMock).not.toHaveBeenCalled();
  });

  it("0건 → 200 + expiredCount=0", async () => {
    findExpireCandidatesMock.mockResolvedValue([]);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { expiredCount: number };
    expect(body.expiredCount).toBe(0);
    expect(markExpiredMock).not.toHaveBeenCalled();
  });

  it("3건 정상 → markExpired 3회 + sendEmail 3회", async () => {
    const rows = [makeRow("a"), makeRow("b"), makeRow("c")];
    findExpireCandidatesMock.mockResolvedValue(rows);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      expiredCount: number;
      emailSentCount: number;
    };
    expect(body.expiredCount).toBe(3);
    expect(body.emailSentCount).toBe(3);
    expect(markExpiredMock).toHaveBeenCalledTimes(3);
    expect(sendEmailMock).toHaveBeenCalledTimes(3);
    const lastEmail = sendEmailMock.mock.calls[2][0];
    expect(lastEmail.tags).toEqual([{ name: "template", value: "consent_expired" }]);
  });
});

describe("consent-expire cron — 멱등 / graceful", () => {
  it("markExpired 실패 → errors + sendEmail skip (다음 cron 재시도)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    findExpireCandidatesMock.mockResolvedValue([makeRow("a")]);
    markExpiredMock.mockRejectedValue(new Error("DB lock"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      expiredCount: number;
      errors: Array<{ consentId: string; reason: string }>;
    };
    expect(body.expiredCount).toBe(0);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].reason).toContain("db:");
    expect(sendEmailMock).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("이메일 발송 실패 (skipped=false) → status 전환은 유지, errors 누적", async () => {
    findExpireCandidatesMock.mockResolvedValue([makeRow("a")]);
    sendEmailMock.mockResolvedValue({
      ok: false,
      skipped: false,
      error: "resend_5xx",
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      expiredCount: number;
      emailSentCount: number;
      errors: Array<{ reason: string }>;
    };
    expect(body.expiredCount).toBe(1); // status 전환은 성공
    expect(body.emailSentCount).toBe(0);
    expect(body.errors[0].reason).toContain("email:");
  });

  it("이메일 skipped (RESEND_API_KEY 미설정) → emailSkippedCount 만 누적", async () => {
    findExpireCandidatesMock.mockResolvedValue([makeRow("a")]);
    sendEmailMock.mockResolvedValue({
      ok: false,
      skipped: true,
      error: "RESEND_API_KEY not set",
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      expiredCount: number;
      emailSentCount: number;
      emailSkippedCount: number;
      errors: unknown[];
    };
    expect(body.expiredCount).toBe(1);
    expect(body.emailSentCount).toBe(0);
    expect(body.emailSkippedCount).toBe(1);
    expect(body.errors).toHaveLength(0);
  });
});

describe("consent-expire cron — findExpireCandidates 실패", () => {
  it("DB 실패 → 500", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    findExpireCandidatesMock.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    expect(markExpiredMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

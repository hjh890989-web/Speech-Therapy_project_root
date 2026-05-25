// FR-C-018 (#41) — /api/cron/consent-reminder route 단위 테스트.
//
// 시나리오:
//   1. CRON_SECRET 실패 → 401 + DB 호출 0건
//   2. 0건 → 200 + sentCount=0
//   3. N건 정상 → per-item sendEmail + markReminded 호출
//   4. 발송 skip (RESEND_API_KEY 미설정) → markReminded 호출 0건 (다음 cron 재시도)
//   5. 발송 실패 (skipped=false) → errors[] 누적 + markReminded 호출 0건
//   6. 일부 실패 격리 → 다른 항목 계속 진행
//   7. findReminderCandidates 실패 → 500

import { describe, it, expect, beforeEach, vi } from "vitest";

const verifyCronSecretMock = vi.fn();
const findReminderCandidatesMock = vi.fn();
const markRemindedMock = vi.fn();
const sendEmailMock = vi.fn();

vi.mock("@/lib/cron-auth", () => ({
  verifyCronSecret: (...args: unknown[]) => verifyCronSecretMock(...args),
}));
vi.mock("@/lib/consent/repo", () => ({
  findReminderCandidates: (...args: unknown[]) => findReminderCandidatesMock(...args),
  markReminded: (...args: unknown[]) => markRemindedMock(...args),
  daysSince: (sentAt: Date, now: Date) =>
    Math.max(0, Math.round((now.getTime() - sentAt.getTime()) / (24 * 60 * 60 * 1000))),
  CONSENT_BATCH_LIMIT: 100,
}));
// FR-C-NOTIFICATION-PREFERENCE — cron 이 sendConsentEmailWithPreference 통해 우회.
//   본 단위 테스트에선 wrapper 를 mock 하여 cron 흐름만 검증.
vi.mock("@/lib/consent/email", () => ({
  sendConsentEmailWithPreference: (...args: unknown[]) => sendEmailMock(...args),
}));

import { GET } from "@/app/api/cron/consent-reminder/route";

function makeRequest(): Request {
  return new Request("http://localhost/api/cron/consent-reminder");
}

function makeRow(id: string, daysAgo = 3) {
  return {
    id,
    parentEmail: `${id}@x.com`,
    parentName: id,
    childNickname: "지우",
    consentType: "data_usage",
    status: "pending",
    token: `tok-${id}`,
    sentAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
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
  findReminderCandidatesMock.mockReset();
  markRemindedMock.mockReset();
  sendEmailMock.mockReset();
  verifyCronSecretMock.mockReturnValue({ ok: true });
  findReminderCandidatesMock.mockResolvedValue([]);
  sendEmailMock.mockResolvedValue({ ok: true, id: "email-x", skipped: false });
  markRemindedMock.mockResolvedValue(undefined);
});

describe("consent-reminder cron — 인증", () => {
  it("CRON_SECRET 실패 → 401 + DB 0건", async () => {
    verifyCronSecretMock.mockReturnValue({ ok: false, reason: "invalid_authorization" });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(findReminderCandidatesMock).not.toHaveBeenCalled();
  });
});

describe("consent-reminder cron — 처리량", () => {
  it("0건 → 200 + sentCount=0", async () => {
    findReminderCandidatesMock.mockResolvedValue([]);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      sentCount: number;
      scannedCount: number;
    };
    expect(body.sentCount).toBe(0);
    expect(body.scannedCount).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("3건 정상 → per-item sendEmail + markReminded 호출", async () => {
    const rows = [makeRow("a"), makeRow("b"), makeRow("c")];
    findReminderCandidatesMock.mockResolvedValue(rows);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sentCount: number };
    expect(body.sentCount).toBe(3);
    expect(sendEmailMock).toHaveBeenCalledTimes(3);
    expect(markRemindedMock).toHaveBeenCalledTimes(3);
    // 마지막 row 검증 — tag 정확성.
    const lastEmail = sendEmailMock.mock.calls[2][0];
    expect(lastEmail.tags).toEqual([{ name: "template", value: "consent_reminder" }]);
  });
});

describe("consent-reminder cron — 멱등 / graceful", () => {
  it("발송 skipped (RESEND_API_KEY 없음) → markReminded 호출 0건 (다음 cron 재시도)", async () => {
    findReminderCandidatesMock.mockResolvedValue([makeRow("a")]);
    sendEmailMock.mockResolvedValue({
      ok: false,
      skipped: true,
      error: "RESEND_API_KEY not set",
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { skippedCount: number; sentCount: number };
    expect(body.skippedCount).toBe(1);
    expect(body.sentCount).toBe(0);
    expect(markRemindedMock).not.toHaveBeenCalled();
  });

  it("발송 실패 (skipped=false, ok=false) → errors 누적 + markReminded 0건", async () => {
    findReminderCandidatesMock.mockResolvedValue([makeRow("a")]);
    sendEmailMock.mockResolvedValue({
      ok: false,
      skipped: false,
      error: "resend_5xx",
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      sentCount: number;
      errors: Array<{ consentId: string; reason: string }>;
    };
    expect(body.sentCount).toBe(0);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].consentId).toBe("a");
    expect(body.errors[0].reason).toBe("resend_5xx");
    expect(markRemindedMock).not.toHaveBeenCalled();
  });

  it("일부 실패 격리 — 1번째 fail, 2번째 ok → sentCount=1 + errors=1", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    findReminderCandidatesMock.mockResolvedValue([makeRow("a"), makeRow("b")]);
    sendEmailMock
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ ok: true, id: "email-b", skipped: false });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sentCount: number; errors: unknown[] };
    expect(body.sentCount).toBe(1);
    expect(body.errors).toHaveLength(1);
    expect(markRemindedMock).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });
});

describe("consent-reminder cron — findReminderCandidates 실패", () => {
  it("DB 실패 → 500 + sendEmail 호출 0건", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    findReminderCandidatesMock.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    expect(sendEmailMock).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

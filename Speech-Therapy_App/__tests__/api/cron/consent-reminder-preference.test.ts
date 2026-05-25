// FR-C-NOTIFICATION-PREFERENCE — /api/cron/consent-reminder 의 preference 통합 시나리오.
//
// 격리:
//   - @/lib/cron-auth (verifyCronSecret) mock
//   - @/lib/consent/repo (findReminderCandidates / markReminded / daysSince) mock
//   - @/lib/consent/email (sendConsentEmailWithPreference) mock
//
// 시나리오 (총 5건):
//   1. 정상 send → markReminded 호출 (회귀 검증)
//   2. opt-out 감지 (skipped + 'user_opt_out') → markReminded 호출 (spam 방지 정책)
//   3. RESEND_API_KEY 미설정 skip (skipped + 'RESEND_API_KEY not set') → markReminded 호출 X (재시도)
//   4. 일부 user opt-out + 나머지 정상 → 혼합 처리 (sentCount=1, skippedCount=1, markReminded=2회)
//   5. sendConsentEmailWithPreference 에 parentEmail 가 cron 의 row.parentEmail 로 전달됨

import { describe, it, expect, beforeEach, vi } from "vitest";

const verifyCronSecretMock = vi.fn();
const findReminderCandidatesMock = vi.fn();
const markRemindedMock = vi.fn();
const sendConsentEmailMock = vi.fn();

vi.mock("@/lib/cron-auth", () => ({
  verifyCronSecret: (...args: unknown[]) => verifyCronSecretMock(...args),
}));
vi.mock("@/lib/consent/repo", () => ({
  findReminderCandidates: (...args: unknown[]) =>
    findReminderCandidatesMock(...args),
  markReminded: (...args: unknown[]) => markRemindedMock(...args),
  daysSince: (sentAt: Date, now: Date) =>
    Math.max(
      0,
      Math.round((now.getTime() - sentAt.getTime()) / (24 * 60 * 60 * 1000)),
    ),
  CONSENT_BATCH_LIMIT: 100,
}));
vi.mock("@/lib/consent/email", () => ({
  sendConsentEmailWithPreference: (...args: unknown[]) =>
    sendConsentEmailMock(...args),
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
  sendConsentEmailMock.mockReset();
  verifyCronSecretMock.mockReturnValue({ ok: true });
  findReminderCandidatesMock.mockResolvedValue([]);
  sendConsentEmailMock.mockResolvedValue({
    ok: true,
    id: "email-x",
    skipped: false,
  });
  markRemindedMock.mockResolvedValue(undefined);
});

describe("consent-reminder cron + preference 통합", () => {
  it("[1] 정상 send → markReminded 호출 (회귀 검증)", async () => {
    findReminderCandidatesMock.mockResolvedValue([makeRow("a")]);
    sendConsentEmailMock.mockResolvedValue({
      ok: true,
      id: "email-a",
      skipped: false,
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      sentCount: number;
      skippedCount: number;
    };
    expect(body.sentCount).toBe(1);
    expect(body.skippedCount).toBe(0);
    expect(markRemindedMock).toHaveBeenCalledTimes(1);
  });

  it("[2] opt-out 감지 (skipped + 'user_opt_out') → markReminded 호출 (spam 방지)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    findReminderCandidatesMock.mockResolvedValue([makeRow("opt-out")]);
    sendConsentEmailMock.mockResolvedValue({
      ok: false,
      skipped: true,
      error: "user_opt_out",
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      sentCount: number;
      skippedCount: number;
      errors: unknown[];
    };
    expect(body.sentCount).toBe(0);
    expect(body.skippedCount).toBe(1);
    expect(body.errors).toHaveLength(0);
    // 핵심: opt-out user 도 markReminded 적용 (다음 cron 후보에서 제외 → spam 방지).
    expect(markRemindedMock).toHaveBeenCalledTimes(1);
    expect(markRemindedMock).toHaveBeenCalledWith("opt-out", expect.any(Date));
    logSpy.mockRestore();
  });

  it("[3] RESEND_API_KEY 미설정 skip → markReminded 호출 X (다음 cron 재시도)", async () => {
    findReminderCandidatesMock.mockResolvedValue([makeRow("a")]);
    sendConsentEmailMock.mockResolvedValue({
      ok: false,
      skipped: true,
      error: "RESEND_API_KEY not set",
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      sentCount: number;
      skippedCount: number;
    };
    expect(body.sentCount).toBe(0);
    expect(body.skippedCount).toBe(1);
    // 인프라성 skip 은 재시도 가능 — markReminded 적용 X.
    expect(markRemindedMock).not.toHaveBeenCalled();
  });

  it("[4] 일부 opt-out + 나머지 정상 → 혼합 처리 (sent=1, skipped=1, markReminded=2회)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    findReminderCandidatesMock.mockResolvedValue([
      makeRow("opt-out"),
      makeRow("ok"),
    ]);
    sendConsentEmailMock
      .mockResolvedValueOnce({
        ok: false,
        skipped: true,
        error: "user_opt_out",
      })
      .mockResolvedValueOnce({ ok: true, id: "email-ok", skipped: false });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      sentCount: number;
      skippedCount: number;
      errors: unknown[];
    };
    expect(body.sentCount).toBe(1);
    expect(body.skippedCount).toBe(1);
    expect(body.errors).toHaveLength(0);
    // opt-out + 정상 send 모두 markReminded 적용.
    expect(markRemindedMock).toHaveBeenCalledTimes(2);
    expect(markRemindedMock).toHaveBeenNthCalledWith(
      1,
      "opt-out",
      expect.any(Date),
    );
    expect(markRemindedMock).toHaveBeenNthCalledWith(
      2,
      "ok",
      expect.any(Date),
    );
    logSpy.mockRestore();
  });

  it("[5] sendConsentEmailWithPreference 에 row.parentEmail 가 전달됨 (lookup 키 보장)", async () => {
    const row = makeRow("p");
    findReminderCandidatesMock.mockResolvedValue([row]);
    sendConsentEmailMock.mockResolvedValue({
      ok: true,
      id: "email-p",
      skipped: false,
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const firstCall = sendConsentEmailMock.mock.calls[0][0];
    expect(firstCall.parentEmail).toBe(row.parentEmail);
    expect(firstCall.to).toBe(row.parentEmail);
    expect(firstCall.skipPreferenceCheck).toBe(false);
    expect(firstCall.tags).toEqual([
      { name: "template", value: "consent_reminder" },
    ]);
  });
});

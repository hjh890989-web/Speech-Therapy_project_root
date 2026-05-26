// FR-CONSENT-REMINDER-UI — resendConsentReminder Server Action 단위 테스트.
//
// 격리:
//   - @/lib/db Prisma mock (consentSignature.findUnique + update)
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/consent/email mock (sendConsentEmailWithPreference)
//
// 시나리오 (총 10건):
//   1. zod 검증 실패 (consentSignatureId 비-UUID) → invalid_input
//   2. 비로그인 → unauthorized
//   3. auth.getUser throw → unauthorized (graceful)
//   4. user.email null → not_found (cross-user 차단 + 정보 노출 최소화)
//   5. findUnique throw → db_failed
//   6. row 미존재 → not_found
//   7. R4 핵심 — 다른 parent 의 row (parentEmail !== user.email) → not_found (cross-user 차단)
//   8. row.status='signed' → not_pending
//   9. row.status='expired' → not_pending (재발급 안내 메시지)
//  10. 정상 (status='pending' + parentEmail 일치) → success + markReminded 호출 + analytics
//  11. send 실패 (result.ok=false, skipped=false) → send_failed (markReminded 호출 X)
//  12. send 호출 throw → send_failed (graceful)
//  13. send.skipped=true → success (emailSkipped=true) + markReminded 호출
//  14. CON-04 — 모든 실패 분기 message 에 의료 금칙어 0건

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const findUniqueMock = vi.fn();
const updateMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    consentSignature: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
    },
  },
}));

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
    },
  }),
}));

const sendConsentEmailMock = vi.fn();
vi.mock("@/lib/consent/email", () => ({
  sendConsentEmailWithPreference: (...args: unknown[]) =>
    sendConsentEmailMock(...args),
}));

import { resendConsentReminder } from "@/app/actions/resend-consent-reminder";

const USER_ID = "user-uuid-consent-aaaa";
const USER_EMAIL = "parent@example.com";
// Valid UUID v4 — zod v4 strict UUID 통과.
const CONSENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function setAuthUser(id: string, email: string | null = USER_EMAIL) {
  getUserMock.mockResolvedValue({
    data: { user: { id, email } },
    error: null,
  });
}
function setAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

function buildPendingRow(overrides: Partial<Record<string, unknown>> = {}) {
  const sentAt = new Date("2026-05-20T00:00:00Z");
  return {
    id: CONSENT_ID,
    parentEmail: USER_EMAIL,
    parentName: "홍길동",
    childNickname: "민지",
    consentType: "data_usage",
    status: "pending",
    token: "tok-uuid-resend",
    sentAt,
    remindedAt: null,
    signedAt: null,
    expiredAt: null,
    signedIp: null,
    signedUa: null,
    institutionId: null,
    createdAt: sentAt,
    updatedAt: sentAt,
    ...overrides,
  };
}

beforeEach(() => {
  findUniqueMock.mockReset();
  updateMock.mockReset();
  getUserMock.mockReset();
  sendConsentEmailMock.mockReset();
  // default: 이메일 발송 성공.
  sendConsentEmailMock.mockResolvedValue({ ok: true });
  // default: markReminded update 성공.
  updateMock.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resendConsentReminder — FR-CONSENT-REMINDER-UI 부모 self-service 재발송", () => {
  it("[1] zod 검증 실패 (비-UUID) → invalid_input", async () => {
    setAuthUser(USER_ID);
    const result = await resendConsentReminder({
      consentSignatureId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_input");
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(sendConsentEmailMock).not.toHaveBeenCalled();
  });

  it("[2] 비로그인 → unauthorized", async () => {
    setAnonymous();
    const result = await resendConsentReminder({
      consentSignatureId: CONSENT_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("[3] auth.getUser throw → unauthorized (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    const result = await resendConsentReminder({
      consentSignatureId: CONSENT_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
  });

  it("[4] user.email null → not_found (cross-user 차단 가드)", async () => {
    setAuthUser(USER_ID, null);
    const result = await resendConsentReminder({
      consentSignatureId: CONSENT_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("not_found");
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("[5] findUnique throw → db_failed", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockRejectedValueOnce(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await resendConsentReminder({
      consentSignatureId: CONSENT_ID,
    });
    errSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("db_failed");
  });

  it("[6] row 미존재 → not_found", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce(null);
    const result = await resendConsentReminder({
      consentSignatureId: CONSENT_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("not_found");
    expect(sendConsentEmailMock).not.toHaveBeenCalled();
  });

  it("[7] R4 — 다른 parent 의 row → not_found (cross-user 차단)", async () => {
    setAuthUser(USER_ID, "me@example.com");
    findUniqueMock.mockResolvedValueOnce(
      buildPendingRow({ parentEmail: "other-parent@example.com" }),
    );
    const result = await resendConsentReminder({
      consentSignatureId: CONSENT_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("not_found");
    // 핵심 — 이메일 발송 시도 0회 (cross-user 정보 절대 외부 자원 호출 X).
    expect(sendConsentEmailMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("[8] row.status='signed' → not_pending", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce(buildPendingRow({ status: "signed" }));
    const result = await resendConsentReminder({
      consentSignatureId: CONSENT_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("not_pending");
  });

  it("[9] row.status='expired' → not_pending + 재발급 안내 메시지", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce(
      buildPendingRow({ status: "expired" }),
    );
    const result = await resendConsentReminder({
      consentSignatureId: CONSENT_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("not_pending");
      expect(result.message).toMatch(/만료/);
    }
  });

  it("[10] 정상 → success + markReminded 호출 + analytics 메타", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce(buildPendingRow());
    sendConsentEmailMock.mockResolvedValueOnce({ ok: true });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await resendConsentReminder({
      consentSignatureId: CONSENT_ID,
    });
    logSpy.mockRestore();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.emailSkipped).toBe(false);
    expect(result.consentSuffix).toBe(CONSENT_ID.slice(-4));
    expect(result.analytics.userId).toBe(USER_ID);
    expect(result.analytics.consentSignatureId).toBe(CONSENT_ID);

    // markReminded 1회 호출 — id + remindedAt update.
    expect(updateMock).toHaveBeenCalledTimes(1);
    const updArgs = updateMock.mock.calls[0]![0] as {
      where: { id: string };
      data: { remindedAt: Date };
    };
    expect(updArgs.where.id).toBe(CONSENT_ID);
    expect(updArgs.data.remindedAt).toBeInstanceOf(Date);

    // sendConsentEmailWithPreference 1회 — parentEmail / subject 검증.
    expect(sendConsentEmailMock).toHaveBeenCalledTimes(1);
    const sendArg = sendConsentEmailMock.mock.calls[0]![0] as {
      to: string;
      parentEmail: string;
      subject: string;
      tags?: { name: string; value: string }[];
      skipPreferenceCheck: boolean;
    };
    expect(sendArg.to).toBe(USER_EMAIL);
    expect(sendArg.parentEmail).toBe(USER_EMAIL);
    expect(sendArg.skipPreferenceCheck).toBe(false);
    expect(sendArg.tags?.[0]?.value).toBe("consent_reminder_self_service");
  });

  it("[11] send 실패 (ok=false, skipped=false) → send_failed (markReminded 미호출)", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce(buildPendingRow());
    sendConsentEmailMock.mockResolvedValueOnce({
      ok: false,
      error: "resend_5xx",
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await resendConsentReminder({
      consentSignatureId: CONSENT_ID,
    });
    warnSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("send_failed");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("[12] send 호출 throw → send_failed (graceful)", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce(buildPendingRow());
    sendConsentEmailMock.mockImplementation(() => {
      throw new Error("network");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await resendConsentReminder({
      consentSignatureId: CONSENT_ID,
    });
    errSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("send_failed");
  });

  it("[13] send.skipped=true (RESEND env 미설정 / opt-out) → success + emailSkipped=true + markReminded", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce(buildPendingRow());
    sendConsentEmailMock.mockResolvedValueOnce({
      ok: false,
      skipped: true,
      error: "user_opt_out",
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await resendConsentReminder({
      consentSignatureId: CONSENT_ID,
    });
    logSpy.mockRestore();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.emailSkipped).toBe(true);
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("[14] CON-04 — 모든 실패 분기 message 에 의료 금칙어 0건", async () => {
    const cases: Array<() => Promise<unknown>> = [
      async () => {
        setAnonymous();
        return resendConsentReminder({ consentSignatureId: CONSENT_ID });
      },
      async () => {
        setAuthUser(USER_ID);
        return resendConsentReminder({ consentSignatureId: "not-a-uuid" });
      },
      async () => {
        setAuthUser(USER_ID);
        findUniqueMock.mockResolvedValueOnce(null);
        return resendConsentReminder({ consentSignatureId: CONSENT_ID });
      },
      async () => {
        setAuthUser(USER_ID);
        findUniqueMock.mockResolvedValueOnce(
          buildPendingRow({ status: "expired" }),
        );
        return resendConsentReminder({ consentSignatureId: CONSENT_ID });
      },
      async () => {
        setAuthUser(USER_ID);
        findUniqueMock.mockResolvedValueOnce(buildPendingRow());
        sendConsentEmailMock.mockResolvedValueOnce({
          ok: false,
          error: "send_failed",
        });
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
          return await resendConsentReminder({ consentSignatureId: CONSENT_ID });
        } finally {
          warnSpy.mockRestore();
        }
      },
    ];
    for (const run of cases) {
      const r = (await run()) as { success: boolean; message?: string };
      if (!r.success && r.message) {
        for (const w of FORBIDDEN_MEDICAL_WORDS) {
          expect(r.message).not.toContain(w);
        }
      }
    }
  });
});

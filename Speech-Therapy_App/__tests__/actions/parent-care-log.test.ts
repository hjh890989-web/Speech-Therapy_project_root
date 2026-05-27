// FR-C-030 단위 테스트 — submitParentCareLog Server Action (V07 신규).
//
// 격리:
//   - @/lib/supabase/server (auth.getUser)
//   - @/lib/policy/consent-guard (assertConsentedIfAuthenticated)
//   - @/lib/offline-entry/repo (createOfflineEntry)
//   - @/lib/monitoring/pipa-violation (reportPipaViolation)
//   - next/cache (revalidatePath) — setup.ts 가 글로벌 mock 제공
//
// 시나리오 (≥ 8):
//   1) 비로그인 (인증 user 부재) → unauthorized
//   2) PIPA 미동의 → consent_required + reportPipaViolation 호출
//   3) Zod 실패 (note 빈) → invalid_input
//   4) note 501자 → invalid_input
//   5) kind 부적합 (teacher 용 "practice") → invalid_input
//   6) CON-04 금칙어 ("치료") → forbidden_term
//   7) 정상 (parent_play) → success + createOfflineEntry author == userId
//   8) 정상 (parent_external_session + observedAt 지정) → success
//   9) Prisma INSERT 실패 → internal_error
//   10) Supabase getUser throw → unauthorized
//
// Refs: TASK_FR-C-030.md, app/actions/parent-care-log.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mocks
// ============================================================================
const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
  }),
}));

const assertConsentedMock = vi.fn();
vi.mock("@/lib/policy/consent-guard", () => {
  class ConsentRequiredError extends Error {
    readonly code = "PIPA_CONSENT_REQUIRED";
    constructor() {
      super("PIPA_CONSENT_REQUIRED");
      this.name = "ConsentRequiredError";
    }
  }
  return {
    assertConsentedIfAuthenticated: () => assertConsentedMock(),
    ConsentRequiredError,
  };
});

const createOfflineEntryMock = vi.fn();
vi.mock("@/lib/offline-entry/repo", () => ({
  createOfflineEntry: (...args: unknown[]) => createOfflineEntryMock(...args),
  OFFLINE_ENTRY_NOTE_MAX_LENGTH: 500,
  PARENT_CARE_LOG_KINDS: ["parent_play", "parent_external_session"] as const,
}));

const reportPipaViolationMock = vi.fn();
vi.mock("@/lib/monitoring/pipa-violation", () => ({
  reportPipaViolation: (args: unknown) => reportPipaViolationMock(args),
}));

import { submitParentCareLog } from "@/app/actions/parent-care-log";
import { ConsentRequiredError } from "@/lib/policy/consent-guard";

const PARENT_USER_ID = "pppppppp-pppp-4ppp-8ppp-pppppppppppp";

beforeEach(() => {
  getUserMock.mockReset();
  assertConsentedMock.mockReset();
  createOfflineEntryMock.mockReset();
  reportPipaViolationMock.mockReset();
  // default: 인증 user + PIPA 동의 OK.
  getUserMock.mockResolvedValue({ data: { user: { id: PARENT_USER_ID } }, error: null });
  assertConsentedMock.mockResolvedValue(undefined);
  reportPipaViolationMock.mockResolvedValue({ sent: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FR-C-030 — submitParentCareLog (F17 부모 케어로그)", () => {
  it("[1] 비로그인 → unauthorized", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const result = await submitParentCareLog({
      kind: "parent_play",
      note: "10분 함께 그림 그렸어요",
    });
    expect(result).toEqual({ success: false, reason: "unauthorized" });
    expect(createOfflineEntryMock).not.toHaveBeenCalled();
  });

  it("[2] PIPA 미동의 → consent_required + reportPipaViolation 호출", async () => {
    assertConsentedMock.mockRejectedValueOnce(new ConsentRequiredError());
    const result = await submitParentCareLog({
      kind: "parent_play",
      note: "ok",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("consent_required");
    expect(reportPipaViolationMock).toHaveBeenCalledTimes(1);
    expect(reportPipaViolationMock).toHaveBeenCalledWith({
      ctx: {
        layer: "2_analyze_authenticated",
        serverAction: "submitParentCareLog",
      },
    });
    expect(createOfflineEntryMock).not.toHaveBeenCalled();
  });

  it("[3] Zod 실패 (note 빈) → invalid_input", async () => {
    const result = await submitParentCareLog({
      kind: "parent_play",
      note: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("invalid_input");
      expect(result.issues?.length).toBeGreaterThan(0);
    }
  });

  it("[4] note 501자 → invalid_input", async () => {
    const result = await submitParentCareLog({
      kind: "parent_play",
      note: "a".repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_input");
  });

  it("[5] kind 부적합 (teacher 용 'practice') → invalid_input (Zod enum)", async () => {
    const result = await submitParentCareLog({
      // @ts-expect-error - 의도적으로 부적합 kind
      kind: "practice",
      note: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_input");
  });

  it("[6] CON-04 금칙어 ('치료') → forbidden_term", async () => {
    const result = await submitParentCareLog({
      kind: "parent_play",
      note: "오늘은 발음 치료 받고 왔어요",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("forbidden_term");
    expect(createOfflineEntryMock).not.toHaveBeenCalled();
  });

  it("[7] 정상 (parent_play) → success + author == userId == 인증 user.id", async () => {
    const fakeObservedAt = new Date("2026-05-27T10:00:00Z");
    createOfflineEntryMock.mockResolvedValueOnce({
      id: "entry-1",
      userId: PARENT_USER_ID,
      authorId: PARENT_USER_ID,
      kind: "parent_play",
      note: "10분 함께 그림 그렸어요",
      observedAt: fakeObservedAt,
      createdAt: fakeObservedAt,
      updatedAt: fakeObservedAt,
      institutionId: null,
    });

    const result = await submitParentCareLog({
      kind: "parent_play",
      note: "10분 함께 그림 그렸어요",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.entryId).toBe("entry-1");
      expect(result.observedAt).toBe(fakeObservedAt.toISOString());
    }
    expect(createOfflineEntryMock).toHaveBeenCalledTimes(1);
    const callArg = createOfflineEntryMock.mock.calls[0][0];
    expect(callArg.userId).toBe(PARENT_USER_ID);
    expect(callArg.authorId).toBe(PARENT_USER_ID);
    expect(callArg.institutionId).toBeNull();
  });

  it("[8] 정상 (parent_external_session + observedAt 지정) → success", async () => {
    const customAt = new Date("2026-05-26T15:00:00Z");
    createOfflineEntryMock.mockResolvedValueOnce({
      id: "entry-2",
      userId: PARENT_USER_ID,
      authorId: PARENT_USER_ID,
      kind: "parent_external_session",
      note: "어제 외부 센터에서 30분 진행",
      observedAt: customAt,
      createdAt: customAt,
      updatedAt: customAt,
      institutionId: null,
    });

    const result = await submitParentCareLog({
      kind: "parent_external_session",
      note: "어제 외부 센터에서 30분 진행",
      observedAt: "2026-05-26T15:00:00Z",
    });

    expect(result.success).toBe(true);
    const callArg = createOfflineEntryMock.mock.calls[0][0];
    expect(callArg.observedAt).toEqual(customAt);
    expect(callArg.kind).toBe("parent_external_session");
  });

  it("[9] Prisma INSERT 실패 → internal_error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    createOfflineEntryMock.mockRejectedValueOnce(new Error("DB connection lost"));
    const result = await submitParentCareLog({
      kind: "parent_play",
      note: "ok",
    });
    expect(result).toEqual({ success: false, reason: "internal_error" });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("[10] Supabase getUser throw → unauthorized", async () => {
    getUserMock.mockRejectedValueOnce(new Error("Supabase env missing"));
    const result = await submitParentCareLog({
      kind: "parent_play",
      note: "ok",
    });
    expect(result).toEqual({ success: false, reason: "unauthorized" });
  });

  it("[11] R4 정합 — telemetry properties 에 자녀 식별 정보 미노출", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    createOfflineEntryMock.mockResolvedValueOnce({
      id: "entry-3",
      userId: PARENT_USER_ID,
      authorId: PARENT_USER_ID,
      kind: "parent_play",
      note: "ok",
      observedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      institutionId: null,
    });

    await submitParentCareLog({ kind: "parent_play", note: "ok" });

    const logCalls = logSpy.mock.calls.map((c) => String(c[0]));
    const eventLog = logCalls.find((s) => s.includes("parent_care_log_created"));
    expect(eventLog).toBeDefined();
    // R4: userId / authorId / note 본문 미노출 — kind / noteLength 만
    expect(eventLog).not.toContain(PARENT_USER_ID);
    expect(eventLog).toContain("kind");
    expect(eventLog).toContain("noteLength");
    logSpy.mockRestore();
  });
});

// FR-C-ACCOUNT — exportUserData Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser)
//   - @/lib/db Prisma mock (각 모델 findMany / findUnique)
//
// 시나리오 (총 8건):
//   1. 비로그인 → unauthorized
//   2. auth getUser data.user 없음 → unauthorized
//   3. getSupabaseServerClient throw → unauthorized (graceful)
//   4. 정상 export → JSON 유효 + 모든 source 포함 + filename 패턴 정확
//   5. R4 — 외부 user id 입력 받지 않음 (input 자체에 인자 없음 — auth uid 만)
//   6. 빈 데이터 user → empty arrays + minimal JSON
//   7. User findUnique throw → db_failed (export 의 핵심)
//   8. 일부 source (rewardLogs) throw → 해당 source 만 빈 배열 + 나머지 정상 (best-effort)
//   9. CON-04 — 응답 메시지에 의료 금칙어 0건
//  10. filename 인젝션 방어 — userId 의 특수문자 제거

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
  }),
}));

const userFindUniqueMock = vi.fn();
const evaluationFindManyMock = vi.fn();
const sessionLogFindManyMock = vi.fn();
const rewardLogFindManyMock = vi.fn();
const weeklyReportFindManyMock = vi.fn();
const hitlFindManyMock = vi.fn();
const consentFindManyMock = vi.fn();
const offlineFindManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
    },
    evaluationResult: {
      findMany: (...args: unknown[]) => evaluationFindManyMock(...args),
    },
    sessionLog: {
      findMany: (...args: unknown[]) => sessionLogFindManyMock(...args),
    },
    rewardLog: {
      findMany: (...args: unknown[]) => rewardLogFindManyMock(...args),
    },
    weeklyReport: {
      findMany: (...args: unknown[]) => weeklyReportFindManyMock(...args),
    },
    hITLQueue: {
      findMany: (...args: unknown[]) => hitlFindManyMock(...args),
    },
    consentSignature: {
      findMany: (...args: unknown[]) => consentFindManyMock(...args),
    },
    offlineEntry: {
      findMany: (...args: unknown[]) => offlineFindManyMock(...args),
    },
  },
}));

import { exportUserData } from "@/app/actions/export-user-data";

const USER_ID = "user-uuid-export-1111";
const USER_EMAIL = "parent@example.com";
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

function defaultUserRow() {
  return {
    id: USER_ID,
    email: USER_EMAIL,
    role: "parent",
    childAgeMonths: 60,
    preferredPhonemes: ["ㅅ"],
    onboardingCompletedAt: new Date("2026-05-01T00:00:00Z"),
    subscriptionTier: "free",
    createdAt: new Date("2026-05-01T00:00:00Z"),
    institutionId: null,
    classId: null,
  };
}

beforeEach(() => {
  getUserMock.mockReset();
  userFindUniqueMock.mockReset();
  evaluationFindManyMock.mockReset();
  sessionLogFindManyMock.mockReset();
  rewardLogFindManyMock.mockReset();
  weeklyReportFindManyMock.mockReset();
  hitlFindManyMock.mockReset();
  consentFindManyMock.mockReset();
  offlineFindManyMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("exportUserData — FR-C-ACCOUNT 본인 데이터 JSON export", () => {
  it("[1] 비로그인 (getUser error) → unauthorized", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "no session" },
    });
    const result = await exportUserData();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("[2] auth data.user 없음 → unauthorized", async () => {
    setAnonymous();
    const result = await exportUserData();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
  });

  it("[3] getSupabaseServerClient throw → unauthorized (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    const result = await exportUserData();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
  });

  it("[4] 정상 export → 모든 source 포함 + JSON 유효 + filename 패턴 정확", async () => {
    setAuthUser(USER_ID);
    userFindUniqueMock.mockResolvedValueOnce(defaultUserRow());
    evaluationFindManyMock.mockResolvedValueOnce([
      { id: "eval-1", userId: USER_ID, articulationScore: 80 },
    ]);
    sessionLogFindManyMock.mockResolvedValueOnce([
      { id: "sess-1", userId: USER_ID, durationSec: 30 },
    ]);
    rewardLogFindManyMock.mockResolvedValueOnce([
      { id: "rew-1", userId: USER_ID, rewardType: "star", amount: 1 },
    ]);
    weeklyReportFindManyMock.mockResolvedValueOnce([
      { id: "wr-1", userId: USER_ID, weekNumber: 21, year: 2026 },
    ]);
    hitlFindManyMock.mockResolvedValueOnce([]);
    consentFindManyMock.mockResolvedValueOnce([
      { id: "con-1", parentEmail: USER_EMAIL, status: "signed" },
    ]);
    offlineFindManyMock.mockResolvedValueOnce([]);

    const result = await exportUserData();
    expect(result.success).toBe(true);
    if (!result.success) return;

    // filename 패턴.
    expect(result.filename).toMatch(
      /^speech-therapy-export-user-uuid-export-1111-\d{8}\.json$/,
    );

    // JSON 유효.
    const parsed = JSON.parse(result.json);
    expect(parsed.schemaVersion).toBe("1.0.0");
    expect(typeof parsed.exportedAt).toBe("string");
    expect(parsed.user.id).toBe(USER_ID);
    expect(parsed.user.email).toBe(USER_EMAIL);
    expect(parsed.evaluationResults).toHaveLength(1);
    expect(parsed.sessionLogs).toHaveLength(1);
    expect(parsed.rewardLogs).toHaveLength(1);
    expect(parsed.weeklyReports).toHaveLength(1);
    expect(parsed.hitlQueues).toHaveLength(0);
    expect(parsed.consentSignatures).toHaveLength(1);
    expect(parsed.offlineEntries).toHaveLength(0);

    // recordCounts.
    expect(result.recordCounts.evaluationResults).toBe(1);
    expect(result.recordCounts.consentSignatures).toBe(1);
    expect(result.recordCounts.hitlQueues).toBe(0);

    // 본인 userId 만 매칭에 사용.
    const evalCall = evaluationFindManyMock.mock.calls[0]![0] as {
      where: { userId: string };
      take: number;
    };
    expect(evalCall.where.userId).toBe(USER_ID);
    expect(evalCall.take).toBe(1000);
  });

  it("[5] R4 — exportUserData 는 외부 인자를 받지 않음 (auth uid 만 사용)", async () => {
    setAuthUser(USER_ID);
    userFindUniqueMock.mockResolvedValueOnce(defaultUserRow());
    evaluationFindManyMock.mockResolvedValueOnce([]);
    sessionLogFindManyMock.mockResolvedValueOnce([]);
    rewardLogFindManyMock.mockResolvedValueOnce([]);
    weeklyReportFindManyMock.mockResolvedValueOnce([]);
    hitlFindManyMock.mockResolvedValueOnce([]);
    consentFindManyMock.mockResolvedValueOnce([]);
    offlineFindManyMock.mockResolvedValueOnce([]);

    // 타입 시그니처에 인자 없음 — 호출 측이 어떤 값을 끼워 넣어도 무시.
    // @ts-expect-error 의도적 — Action 은 인자 무시.
    await exportUserData("malicious-other-user-id");

    const userCall = userFindUniqueMock.mock.calls[0]![0] as {
      where: { id: string };
    };
    expect(userCall.where.id).toBe(USER_ID);
  });

  it("[6] 빈 데이터 user → empty arrays + minimal JSON 정상", async () => {
    setAuthUser(USER_ID);
    userFindUniqueMock.mockResolvedValueOnce(defaultUserRow());
    evaluationFindManyMock.mockResolvedValueOnce([]);
    sessionLogFindManyMock.mockResolvedValueOnce([]);
    rewardLogFindManyMock.mockResolvedValueOnce([]);
    weeklyReportFindManyMock.mockResolvedValueOnce([]);
    hitlFindManyMock.mockResolvedValueOnce([]);
    consentFindManyMock.mockResolvedValueOnce([]);
    offlineFindManyMock.mockResolvedValueOnce([]);

    const result = await exportUserData();
    expect(result.success).toBe(true);
    if (!result.success) return;
    const parsed = JSON.parse(result.json);
    expect(parsed.evaluationResults).toEqual([]);
    expect(parsed.user.id).toBe(USER_ID);
    expect(result.recordCounts.evaluationResults).toBe(0);
  });

  it("[7] User findUnique throw → db_failed (export 핵심 실패)", async () => {
    setAuthUser(USER_ID);
    userFindUniqueMock.mockRejectedValueOnce(new Error("db connection lost"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await exportUserData();
    errSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("db_failed");
  });

  it("[8] 일부 source throw → 해당 source 빈 배열 + 나머지 정상 (best-effort)", async () => {
    setAuthUser(USER_ID);
    userFindUniqueMock.mockResolvedValueOnce(defaultUserRow());
    evaluationFindManyMock.mockResolvedValueOnce([
      { id: "eval-1", userId: USER_ID },
    ]);
    sessionLogFindManyMock.mockResolvedValueOnce([]);
    rewardLogFindManyMock.mockRejectedValueOnce(new Error("rewardLog table missing"));
    weeklyReportFindManyMock.mockResolvedValueOnce([]);
    hitlFindManyMock.mockResolvedValueOnce([]);
    consentFindManyMock.mockResolvedValueOnce([]);
    offlineFindManyMock.mockResolvedValueOnce([]);

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await exportUserData();
    errSpy.mockRestore();

    expect(result.success).toBe(true);
    if (!result.success) return;
    const parsed = JSON.parse(result.json);
    expect(parsed.evaluationResults).toHaveLength(1);
    expect(parsed.rewardLogs).toEqual([]); // graceful 빈 배열
    expect(result.recordCounts.rewardLogs).toBe(0);
    expect(result.recordCounts.evaluationResults).toBe(1);
  });

  it("[9] CON-04 — 응답 메시지에 의료 금칙어 0건", async () => {
    setAnonymous();
    const r1 = await exportUserData();
    if (!r1.success) {
      for (const w of FORBIDDEN_MEDICAL_WORDS) {
        expect(r1.message).not.toContain(w);
      }
    }
    setAuthUser(USER_ID);
    userFindUniqueMock.mockRejectedValueOnce(new Error("db error"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r2 = await exportUserData();
    errSpy.mockRestore();
    if (!r2.success) {
      for (const w of FORBIDDEN_MEDICAL_WORDS) {
        expect(r2.message).not.toContain(w);
      }
    }
  });

  it("[10] filename 인젝션 방어 — userId 의 특수문자 제거", async () => {
    // 비정상 user id (실제로는 Supabase auth uid 는 UUID 만이지만 방어 검증).
    setAuthUser('"; rm -rf /tmp; "');
    userFindUniqueMock.mockResolvedValueOnce(null); // user row 없음 — 빈 user
    evaluationFindManyMock.mockResolvedValueOnce([]);
    sessionLogFindManyMock.mockResolvedValueOnce([]);
    rewardLogFindManyMock.mockResolvedValueOnce([]);
    weeklyReportFindManyMock.mockResolvedValueOnce([]);
    hitlFindManyMock.mockResolvedValueOnce([]);
    consentFindManyMock.mockResolvedValueOnce([]);
    offlineFindManyMock.mockResolvedValueOnce([]);

    const result = await exportUserData();
    expect(result.success).toBe(true);
    if (!result.success) return;
    // filename 에 따옴표 / 세미콜론 / 슬래시 / 공백 미포함.
    expect(result.filename).toMatch(/^speech-therapy-export-[a-zA-Z0-9-]*-\d{8}\.json$/);
    expect(result.filename).not.toMatch(/[";/\s]/);
  });
});

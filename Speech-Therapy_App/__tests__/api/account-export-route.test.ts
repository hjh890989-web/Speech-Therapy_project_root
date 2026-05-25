// FR-C-ACCOUNT — GET /api/account/export Route Handler 단위 테스트.
//
// 격리:
//   - @/app/actions/export-user-data mock — exportUserData 호출 결과 controll
//
// 시나리오 (총 4건):
//   1. 정상 인증 user → 200 + Content-Type + Content-Disposition + JSON body
//   2. 비인증 → 401 + UNAUTHORIZED
//   3. db_failed → 500 + EXPORT_FAILED
//   4. R4 — Route 가 직접 user id 인자 받지 않음 (exportUserData 가 auth.getUser 만 사용)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const exportUserDataMock = vi.fn();
vi.mock("@/app/actions/export-user-data", () => ({
  exportUserData: (...args: unknown[]) => exportUserDataMock(...args),
}));

import { GET } from "@/app/api/account/export/route";

beforeEach(() => {
  exportUserDataMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/account/export — FR-C-ACCOUNT 데이터 다운로드 route", () => {
  it("[1] 정상 인증 user → 200 + Content-Type + Content-Disposition + JSON body", async () => {
    const fakeJson = JSON.stringify({
      schemaVersion: "1.0.0",
      exportedAt: "2026-05-25T00:00:00Z",
      user: { id: "u1" },
      evaluationResults: [],
      sessionLogs: [],
      rewardLogs: [],
      weeklyReports: [],
      hitlQueues: [],
      consentSignatures: [],
      offlineEntries: [],
    });
    exportUserDataMock.mockResolvedValueOnce({
      success: true,
      json: fakeJson,
      filename: "speech-therapy-export-u1-20260525.json",
      recordCounts: {
        evaluationResults: 0,
        sessionLogs: 0,
        rewardLogs: 0,
        weeklyReports: 0,
        hitlQueues: 0,
        consentSignatures: 0,
        offlineEntries: 0,
      },
    });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(
      /application\/json.*charset=utf-8/,
    );
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="speech-therapy-export-u1-20260525.json"',
    );
    expect(res.headers.get("Cache-Control")).toMatch(/no-store/);

    const body = await res.text();
    const parsed = JSON.parse(body);
    expect(parsed.schemaVersion).toBe("1.0.0");
    expect(parsed.user.id).toBe("u1");
  });

  it("[2] 비인증 (exportUserData unauthorized) → 401 + UNAUTHORIZED", async () => {
    exportUserDataMock.mockResolvedValueOnce({
      success: false,
      reason: "unauthorized",
      message: "로그인 후 다시 시도해 주세요.",
    });
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("UNAUTHORIZED");
    expect(body.message).toMatch(/로그인/);
  });

  it("[3] db_failed → 500 + EXPORT_FAILED", async () => {
    exportUserDataMock.mockResolvedValueOnce({
      success: false,
      reason: "db_failed",
      message: "데이터 추출에 실패했어요. 잠시 후 다시 시도해 주세요.",
    });
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("EXPORT_FAILED");
  });

  it("[4] R4 — Route 는 외부 인자 없이 exportUserData 만 호출 (auth.uid 만 신뢰)", async () => {
    exportUserDataMock.mockResolvedValueOnce({
      success: true,
      json: "{}",
      filename: "speech-therapy-export-u1-20260525.json",
      recordCounts: {
        evaluationResults: 0,
        sessionLogs: 0,
        rewardLogs: 0,
        weeklyReports: 0,
        hitlQueues: 0,
        consentSignatures: 0,
        offlineEntries: 0,
      },
    });
    await GET();
    expect(exportUserDataMock).toHaveBeenCalledTimes(1);
    // exportUserData 호출 시 인자 0개 (auth.getUser 가 server-side 에서 처리).
    expect(exportUserDataMock.mock.calls[0]).toEqual([]);
  });
});

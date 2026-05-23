// FR-Q-007 (#48) — lib/pdf/aggregator.ts 단위 테스트 (Prisma mock).
//
// 검증 시나리오:
//   1. 정상 — User + Institution + 평가 + 미션 → CenterReportLoadResult 정합
//   2. 빈 userId / null → null 반환 (Prisma 미호출)
//   3. user 미존재 → null 반환 (count/aggregate 미호출)
//   4. evaluationResult 0건 → 모든 평균 null + count 0
//   5. 음소 중복 제거 + 최대 5개
//   6. institution 미연결 (parent 직접 가입) → institutionId null, institutionName undefined

import { describe, it, expect, vi, beforeEach } from "vitest";

const userFindUniqueMock = vi.fn();
const evalCountMock = vi.fn();
const evalAggregateMock = vi.fn();
const evalFindManyMock = vi.fn();
const sessionCountMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) },
    evaluationResult: {
      count: (...args: unknown[]) => evalCountMock(...args),
      aggregate: (...args: unknown[]) => evalAggregateMock(...args),
      findMany: (...args: unknown[]) => evalFindManyMock(...args),
    },
    sessionLog: {
      count: (...args: unknown[]) => sessionCountMock(...args),
    },
  },
}));

import { loadCenterReportData } from "@/lib/pdf/aggregator";

const TARGET_USER_ID = "33333333-3333-4333-8333-333333333333";
const INSTITUTION_X = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  userFindUniqueMock.mockReset();
  evalCountMock.mockReset();
  evalAggregateMock.mockReset();
  evalFindManyMock.mockReset();
  sessionCountMock.mockReset();
});

describe("loadCenterReportData — FR-Q-007 집계", () => {
  it("[1] 정상 — 모든 필드가 채워진 정합 payload", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: TARGET_USER_ID,
      email: "parent@example.com",
      childAgeMonths: 48,
      institutionId: INSTITUTION_X,
      institution: { id: INSTITUTION_X, name: "햇님어린이집" },
    });
    evalCountMock.mockResolvedValueOnce(12);
    evalAggregateMock.mockResolvedValueOnce({
      _avg: {
        articulationScore: 75.4,
        linguisticScore: 68.1,
        acousticScore: 71.2,
      },
    });
    evalFindManyMock.mockResolvedValueOnce([
      { targetPhoneme: "ㅅ" },
      { targetPhoneme: "ㄹ" },
      { targetPhoneme: "ㅅ" }, // 중복.
      { targetPhoneme: "ㅈ" },
    ]);
    sessionCountMock.mockResolvedValueOnce(8);

    const result = await loadCenterReportData(TARGET_USER_ID);

    expect(result).not.toBeNull();
    expect(result!.institutionId).toBe(INSTITUTION_X);
    expect(result!.input.institutionName).toBe("햇님어린이집");
    expect(result!.input.childAgeMonths).toBe(48);
    expect(result!.input.stats.totalDiagnoseCount).toBe(12);
    expect(result!.input.stats.articulationAvg).toBe(75.4);
    expect(result!.input.stats.linguisticAvg).toBe(68.1);
    expect(result!.input.stats.acousticAvg).toBe(71.2);
    expect(result!.input.stats.missionCount).toBe(8);
    // 중복 제거 + 입력 순서 유지.
    expect(result!.input.stats.recentTargetPhonemes).toEqual(["ㅅ", "ㄹ", "ㅈ"]);
    // PDF 본문에는 childName 미노출 (schema 미보유).
    expect(result!.input.childName).toBeUndefined();
  });

  it("[2] 빈 userId → null (Prisma 미호출)", async () => {
    const result = await loadCenterReportData("");
    expect(result).toBeNull();
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("[3] user 미존재 → null + 평가/세션 미호출", async () => {
    userFindUniqueMock.mockResolvedValueOnce(null);
    const result = await loadCenterReportData(TARGET_USER_ID);
    expect(result).toBeNull();
    expect(evalCountMock).not.toHaveBeenCalled();
    expect(evalAggregateMock).not.toHaveBeenCalled();
    expect(sessionCountMock).not.toHaveBeenCalled();
  });

  it("[4] evaluationResult 0건 → 평균 null + count 0", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: TARGET_USER_ID,
      email: null,
      childAgeMonths: 36,
      institutionId: INSTITUTION_X,
      institution: { id: INSTITUTION_X, name: "달님어린이집" },
    });
    evalCountMock.mockResolvedValueOnce(0);
    evalAggregateMock.mockResolvedValueOnce({
      _avg: { articulationScore: null, linguisticScore: null, acousticScore: null },
    });
    evalFindManyMock.mockResolvedValueOnce([]);
    sessionCountMock.mockResolvedValueOnce(0);

    const result = await loadCenterReportData(TARGET_USER_ID);
    expect(result).not.toBeNull();
    expect(result!.input.stats.totalDiagnoseCount).toBe(0);
    expect(result!.input.stats.articulationAvg).toBeNull();
    expect(result!.input.stats.linguisticAvg).toBeNull();
    expect(result!.input.stats.acousticAvg).toBeNull();
    expect(result!.input.stats.recentTargetPhonemes).toEqual([]);
    expect(result!.input.stats.missionCount).toBe(0);
  });

  it("[5] 음소 중복 제거 + 최대 5개", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: TARGET_USER_ID,
      email: null,
      childAgeMonths: 60,
      institutionId: INSTITUTION_X,
      institution: { id: INSTITUTION_X, name: "별님반" },
    });
    evalCountMock.mockResolvedValueOnce(20);
    evalAggregateMock.mockResolvedValueOnce({
      _avg: { articulationScore: 70, linguisticScore: 60, acousticScore: 65 },
    });
    evalFindManyMock.mockResolvedValueOnce([
      { targetPhoneme: "ㅅ" },
      { targetPhoneme: "ㄹ" },
      { targetPhoneme: "ㅈ" },
      { targetPhoneme: "ㄱ" },
      { targetPhoneme: "ㄴ" },
      { targetPhoneme: "ㅂ" }, // 6번째 — cap.
      { targetPhoneme: "ㅅ" }, // 중복.
    ]);
    sessionCountMock.mockResolvedValueOnce(5);

    const result = await loadCenterReportData(TARGET_USER_ID);
    expect(result!.input.stats.recentTargetPhonemes).toHaveLength(5);
    expect(result!.input.stats.recentTargetPhonemes).toEqual([
      "ㅅ",
      "ㄹ",
      "ㅈ",
      "ㄱ",
      "ㄴ",
    ]);
  });

  it("[6] institution 미연결 (parent 직접 가입) → institutionId null", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: TARGET_USER_ID,
      email: null,
      childAgeMonths: 30,
      institutionId: null,
      institution: null,
    });
    evalCountMock.mockResolvedValueOnce(3);
    evalAggregateMock.mockResolvedValueOnce({
      _avg: { articulationScore: 80, linguisticScore: 75, acousticScore: 70 },
    });
    evalFindManyMock.mockResolvedValueOnce([{ targetPhoneme: "ㅅ" }]);
    sessionCountMock.mockResolvedValueOnce(1);

    const result = await loadCenterReportData(TARGET_USER_ID);
    expect(result).not.toBeNull();
    expect(result!.institutionId).toBeNull();
    expect(result!.input.institutionName).toBeUndefined();
  });
});

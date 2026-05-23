// FR-C-008 (#31) — 적응형 난이도 자동 하향 helper 단위 테스트.
//
// 검사 대상:
//   lib/missions/adaptive-difficulty.ts
//     - checkAdaptiveDifficulty()
//     - applyAdjustmentWithFloor()
//     - FAILURE_THRESHOLD / CONSECUTIVE_FAILURE_WINDOW 상수
//
// 격리: Prisma findMany 만 mock. 실 DB / 네트워크 호출 0건.
// "은밀히" 검증: 본 파일은 helper 단위 테스트 — UI 알림 부재는 호출 측 (Server Action)
//   의 책임이라 본 테스트의 expect 범위는 helper 반환값 + Prisma 인자 형태만.
//
// 시나리오 매핑 (Task 명세 §5):
//   sc1: 3연속 실패 (score < 50) → shouldLower: true, -1
//   sc2: 3개 중 1개 성공 (가운데) → shouldLower: false
//   sc3: 3개 중 마지막 (가장 최근) 만 성공 → shouldLower: false
//   sc4: 3연속 실패 + 4번째 성공 → 최근 3개만 보므로 shouldLower: true
//        (Prisma take=3 + orderBy desc — 4번째는 query 에 포함 안 됨)
//   sc5: 미션 0개 (신규 user) → shouldLower: false
//   sc6: 미션 1개 (실패) → 조건 미충족, shouldLower: false
//   sc7: 다른 phoneme 결과는 무시 — phoneme 필터 (Prisma where) 정확성
//   sc8: 다른 user 결과는 무시 — userId 필터 (Prisma where) 정확성
//   sc9: difficultyLevel 1 인 user → applyAdjustmentWithFloor 가 1 로 clamp
//   sc10: 경계 score = 50 → 성공으로 분류 (< 50 만 실패)
//   sc11 (보조): take = CONSECUTIVE_FAILURE_WINDOW 가 정확히 3 인지 (계약 가드)
//   sc12 (보조): orderBy createdAt desc 로 시간 역순 조회 보장
//   sc13 (보조): mission.targetPhoneme 필터로 진단 세션 (missionId null) 자동 제외
//   sc14 (보조): applyAdjustmentWithFloor 다양한 입력 조합

import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    evaluationResult: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

beforeEach(() => {
  findManyMock.mockReset();
});

// 헬퍼 — Prisma select 결과 한 줄 생성 (articulationScore 만 사용).
function row(articulationScore: number): { articulationScore: number } {
  return { articulationScore };
}

const USER = "11111111-1111-4111-8111-111111111111";

describe("FAILURE_THRESHOLD / CONSECUTIVE_FAILURE_WINDOW — 상수 계약", () => {
  it("FAILURE_THRESHOLD = 50 (HITL gate 와 동일)", async () => {
    const mod = await import("@/lib/missions/adaptive-difficulty");
    expect(mod.FAILURE_THRESHOLD).toBe(50);
  });

  it("CONSECUTIVE_FAILURE_WINDOW = 3 (REQ-FUNC-021 사양)", async () => {
    const mod = await import("@/lib/missions/adaptive-difficulty");
    expect(mod.CONSECUTIVE_FAILURE_WINDOW).toBe(3);
  });
});

describe("checkAdaptiveDifficulty / sc1 — 3연속 실패 → -1", () => {
  it("최근 3건 모두 articulationScore < 50 → shouldLower: true, -1", async () => {
    findManyMock.mockResolvedValueOnce([row(20), row(30), row(40)]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    const out = await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㅅ" });

    expect(out).toEqual({
      shouldLower: true,
      consecutiveFailures: 3,
      recommendedAdjustment: -1,
    });
  });
});

describe("checkAdaptiveDifficulty / sc2 — 가운데 1개 성공 → 하향 없음", () => {
  it("[실패, 성공, 실패] → shouldLower: false", async () => {
    findManyMock.mockResolvedValueOnce([row(20), row(60), row(40)]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    const out = await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㅅ" });

    expect(out.shouldLower).toBe(false);
    expect(out.recommendedAdjustment).toBe(0);
    expect(out.consecutiveFailures).toBe(2);
  });
});

describe("checkAdaptiveDifficulty / sc3 — 마지막 (최신) 만 성공 → 하향 없음", () => {
  it("[성공(최신), 실패, 실패] → shouldLower: false", async () => {
    // Prisma orderBy desc → 인덱스 0 이 최신.
    findManyMock.mockResolvedValueOnce([row(75), row(20), row(30)]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    const out = await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㅅ" });

    expect(out.shouldLower).toBe(false);
    expect(out.recommendedAdjustment).toBe(0);
    expect(out.consecutiveFailures).toBe(2);
  });
});

describe("checkAdaptiveDifficulty / sc4 — 3연속 실패 + 4번째 성공 (윈도우 밖)", () => {
  it("Prisma take=3 가 4번째를 자동 제외 → shouldLower: true", async () => {
    // Helper 가 Prisma 에 take: 3 전달 — 4번째는 mock 결과에 포함되지 않은 상태로
    // 시뮬레이션. 실 DB 처럼 3건만 반환.
    findManyMock.mockResolvedValueOnce([row(15), row(25), row(35)]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    const out = await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㅅ" });

    expect(out.shouldLower).toBe(true);
    expect(out.recommendedAdjustment).toBe(-1);

    // 부수 검증 — Prisma 가 정확히 take: 3 + orderBy desc 로 호출되었는지.
    const call = findManyMock.mock.calls[0]?.[0];
    expect(call.take).toBe(3);
    expect(call.orderBy).toEqual({ createdAt: "desc" });
  });
});

describe("checkAdaptiveDifficulty / sc5 — 신규 user (미션 0건)", () => {
  it("findMany 빈 배열 → shouldLower: false, 0 adjustment", async () => {
    findManyMock.mockResolvedValueOnce([]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    const out = await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㅈ" });

    expect(out).toEqual({
      shouldLower: false,
      consecutiveFailures: 0,
      recommendedAdjustment: 0,
    });
  });
});

describe("checkAdaptiveDifficulty / sc6 — 미션 1건 (실패)", () => {
  it("3건 미충족 → shouldLower: false (조건 미만)", async () => {
    findManyMock.mockResolvedValueOnce([row(10)]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    const out = await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㅅ" });

    expect(out.shouldLower).toBe(false);
    expect(out.recommendedAdjustment).toBe(0);
    // consecutiveFailures 는 윈도우 미달이라도 카운트는 반환 (텔레메트리용).
    expect(out.consecutiveFailures).toBe(1);
  });

  it("2건만 있고 둘 다 실패도 윈도우 미달 → shouldLower: false", async () => {
    findManyMock.mockResolvedValueOnce([row(10), row(20)]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    const out = await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㅅ" });

    expect(out.shouldLower).toBe(false);
    expect(out.consecutiveFailures).toBe(2);
  });
});

describe("checkAdaptiveDifficulty / sc7 — 다른 phoneme 결과는 무시", () => {
  it("Prisma where 에 sessionLog.mission.targetPhoneme 필터 전달", async () => {
    findManyMock.mockResolvedValueOnce([]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㅈ" });

    const call = findManyMock.mock.calls[0]?.[0];
    expect(call.where.sessionLog.mission.targetPhoneme).toBe("ㅈ");
  });

  it("다른 음소 (ㄹ) 호출 시 where 분기 정확", async () => {
    findManyMock.mockResolvedValueOnce([]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㄹ" });

    const call = findManyMock.mock.calls[0]?.[0];
    expect(call.where.sessionLog.mission.targetPhoneme).toBe("ㄹ");
  });
});

describe("checkAdaptiveDifficulty / sc8 — 다른 user 결과는 무시 (R4)", () => {
  it("Prisma where 에 userId 직접 필터 전달", async () => {
    findManyMock.mockResolvedValueOnce([]);
    const OTHER = "22222222-2222-4222-8222-222222222222";
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    await checkAdaptiveDifficulty({ userId: OTHER, targetPhoneme: "ㅅ" });

    const call = findManyMock.mock.calls[0]?.[0];
    expect(call.where.userId).toBe(OTHER);
  });
});

describe("checkAdaptiveDifficulty / sc10 — 경계 score = 50 (>= 50 = 성공)", () => {
  it("[50, 50, 50] → shouldLower: false (< 50 만 실패)", async () => {
    findManyMock.mockResolvedValueOnce([row(50), row(50), row(50)]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    const out = await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㅅ" });

    expect(out.shouldLower).toBe(false);
    expect(out.consecutiveFailures).toBe(0);
  });

  it("[49, 49, 50] → shouldLower: false (마지막이 50 = 성공)", async () => {
    findManyMock.mockResolvedValueOnce([row(49), row(49), row(50)]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    const out = await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㅅ" });

    expect(out.shouldLower).toBe(false);
    expect(out.consecutiveFailures).toBe(2);
  });

  it("[49, 49, 49] → shouldLower: true (모두 50 미만)", async () => {
    findManyMock.mockResolvedValueOnce([row(49), row(49), row(49)]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    const out = await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㅅ" });

    expect(out.shouldLower).toBe(true);
    expect(out.recommendedAdjustment).toBe(-1);
  });

  it("[0, 0, 0] (모두 0점) → shouldLower: true", async () => {
    findManyMock.mockResolvedValueOnce([row(0), row(0), row(0)]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    const out = await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㅅ" });

    expect(out.shouldLower).toBe(true);
    expect(out.consecutiveFailures).toBe(3);
  });
});

describe("applyAdjustmentWithFloor / sc9 — 하한 clamp (difficulty >= 1)", () => {
  it("level 1 + (-1) → 1 (하한 clamp)", async () => {
    const { applyAdjustmentWithFloor } = await import("@/lib/missions/adaptive-difficulty");
    expect(applyAdjustmentWithFloor(1, -1)).toBe(1);
  });

  it("level 3 + (-1) → 2", async () => {
    const { applyAdjustmentWithFloor } = await import("@/lib/missions/adaptive-difficulty");
    expect(applyAdjustmentWithFloor(3, -1)).toBe(2);
  });

  it("level 2 + 0 → 2 (변동 없음)", async () => {
    const { applyAdjustmentWithFloor } = await import("@/lib/missions/adaptive-difficulty");
    expect(applyAdjustmentWithFloor(2, 0)).toBe(2);
  });

  it("level 5 + (-1) → 4", async () => {
    const { applyAdjustmentWithFloor } = await import("@/lib/missions/adaptive-difficulty");
    expect(applyAdjustmentWithFloor(5, -1)).toBe(4);
  });

  it("level 0 (이론적 입력) + (-1) → 1 (하한 강제)", async () => {
    const { applyAdjustmentWithFloor } = await import("@/lib/missions/adaptive-difficulty");
    expect(applyAdjustmentWithFloor(0, -1)).toBe(1);
  });

  it("custom minLevel 지원 (예: 2)", async () => {
    const { applyAdjustmentWithFloor } = await import("@/lib/missions/adaptive-difficulty");
    expect(applyAdjustmentWithFloor(2, -1, 2)).toBe(2);
  });
});

describe("checkAdaptiveDifficulty / sc12-13 — Prisma 쿼리 계약", () => {
  it("orderBy createdAt desc (시간 역순) 호출", async () => {
    findManyMock.mockResolvedValueOnce([]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㄱ" });

    const call = findManyMock.mock.calls[0]?.[0];
    expect(call.orderBy).toEqual({ createdAt: "desc" });
  });

  it("select 에 articulationScore 만 포함 (PII 최소화)", async () => {
    findManyMock.mockResolvedValueOnce([]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㄴ" });

    const call = findManyMock.mock.calls[0]?.[0];
    expect(call.select).toEqual({ articulationScore: true });
  });

  it("sessionLog.mission 필터로 진단 세션 (missionId null) 자동 제외", async () => {
    findManyMock.mockResolvedValueOnce([]);
    const { checkAdaptiveDifficulty } = await import("@/lib/missions/adaptive-difficulty");

    await checkAdaptiveDifficulty({ userId: USER, targetPhoneme: "ㅅ" });

    const call = findManyMock.mock.calls[0]?.[0];
    // sessionLog.mission.is null 인 row 는 Prisma 가 자동 제외 (mission 관계 필터).
    expect(call.where.sessionLog).toBeDefined();
    expect(call.where.sessionLog.mission).toBeDefined();
  });
});

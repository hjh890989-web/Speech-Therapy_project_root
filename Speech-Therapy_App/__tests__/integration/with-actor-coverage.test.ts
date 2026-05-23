// DB-011 후속 마이그레이션 — withActor 호출처 커버리지 검증.
//
// 배경:
//   commit 6fb9e5c 의 lib/db/with-actor.ts 가 시범 적용된 2곳 (submitExpertComment,
//   /api/hitl/[id]/escalate) 외, rewards/users mutation 호출처에 일괄 적용된 후
//   _각 위치에서_ withActor 가 실제로 호출되는지 (set_config 발화) 보장하는 회귀 가드.
//
// 검증 매트릭스 (≥ 4):
//   1. lib/reward.ts grantReward — User upsert + RewardLog INSERT 둘 다 withActor 안.
//      → set_config('audit.actor_id', userId, true) 가 2회 발화 (각 트랜잭션).
//   2. app/actions/diagnosis.ts analyzeDiagnosis (익명 흐름) — 익명 user.upsert
//      가 withActor 안 (resolved anonymous userId 주입).
//   3. actor=null 폴백 — withActor 직접 호출 시 set_config 호출 0회 (TRIGGER 'system').
//   4. actorId 형식 부적합 (SQL injection 페이로드) — withActor 가 throw + 트랜잭션 미시작.
//   5. fn throw → rollback semantics — 호출 측에 동일 에러 전파.
//
// 본 테스트는 prisma.$transaction 을 _capturing_ mock 으로 감싸 tx.$queryRaw
// 호출을 기록 → 마이그레이션 후 회귀 (withActor 누락) 발생 시 본 테스트가 실패.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mock @/lib/db — capturing $transaction + 각 모델 표면.
// ============================================================================
const setConfigCalls: Array<{ actorId: string }> = [];
const txQueryRawMock = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
  // set_config 호출 캡처 — values[0] 가 actorId.
  if (typeof values[0] === "string") {
    setConfigCalls.push({ actorId: values[0] });
  }
  return Promise.resolve([{ set_config: "" }]);
});

const userUpsertMock = vi.fn();
const rewardLogCreateMock = vi.fn();
const rewardProgressUpsertMock = vi.fn();
const rewardProgressFindUniqueMock = vi.fn();
const sessionLogCreateMock = vi.fn();
const hitlFindUniqueMock = vi.fn();
const hitlCreateMock = vi.fn();
const hitlCountMock = vi.fn();
const cookieGetMock = vi.fn();

// transactionInvocations: $transaction 호출 횟수 + 인자.
const transactionInvocations: number[] = [];

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      upsert: (...args: unknown[]) => userUpsertMock(...args),
    },
    rewardLog: {
      create: (...args: unknown[]) => rewardLogCreateMock(...args),
    },
    rewardProgress: {
      upsert: (...args: unknown[]) => rewardProgressUpsertMock(...args),
      findUnique: (...args: unknown[]) => rewardProgressFindUniqueMock(...args),
    },
    sessionLog: {
      create: (...args: unknown[]) => sessionLogCreateMock(...args),
    },
    hITLQueue: {
      findUnique: (...args: unknown[]) => hitlFindUniqueMock(...args),
      create: (...args: unknown[]) => hitlCreateMock(...args),
      count: (...args: unknown[]) => hitlCountMock(...args),
    },
    evaluationResult: {
      findUnique: vi.fn(),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      transactionInvocations.push(Date.now());
      const tx = {
        $queryRaw: (...args: unknown[]) =>
          txQueryRawMock(args[0] as TemplateStringsArray, ...args.slice(1)),
        user: {
          upsert: (...args: unknown[]) => userUpsertMock(...args),
        },
        rewardLog: {
          create: (...args: unknown[]) => rewardLogCreateMock(...args),
        },
      };
      return fn(tx);
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieGetMock(name),
  }),
}));

vi.mock("@/lib/peer-percentile", async () => {
  const actual = await vi.importActual<typeof import("@/lib/peer-percentile")>(
    "@/lib/peer-percentile",
  );
  return {
    ...actual,
    computePeerPercentile: vi.fn().mockResolvedValue(50),
  };
});

// imports after vi.mock hoist.
import { grantReward } from "@/lib/reward";
import { analyzeDiagnosis } from "@/app/actions/diagnosis";
import { withActor } from "@/lib/db/with-actor";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ANON_USER_ID = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  setConfigCalls.length = 0;
  transactionInvocations.length = 0;
  txQueryRawMock.mockClear();
  userUpsertMock.mockReset();
  rewardLogCreateMock.mockReset();
  rewardProgressUpsertMock.mockReset();
  rewardProgressFindUniqueMock.mockReset();
  sessionLogCreateMock.mockReset();
  hitlFindUniqueMock.mockReset();
  hitlCreateMock.mockReset();
  hitlCountMock.mockReset();
  cookieGetMock.mockReset();
  cookieGetMock.mockReturnValue(undefined);

  userUpsertMock.mockResolvedValue({ id: USER_ID });
  rewardLogCreateMock.mockResolvedValue({ id: "log-1" });
  rewardProgressUpsertMock.mockResolvedValue({
    cumulativeStars: 1,
    treeGrowthLevel: 0,
    aiDrawingCount: 0,
  });
  sessionLogCreateMock.mockResolvedValue({ id: "mocked-session" });
  hitlFindUniqueMock.mockResolvedValue(null);
  hitlCountMock.mockResolvedValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// 시나리오 1: grantReward — User upsert + RewardLog INSERT 둘 다 withActor 안.
// ============================================================================

describe("[DB-011 마이그레이션] lib/reward.ts grantReward — withActor 적용", () => {
  it("[시나리오 1] User upsert + RewardLog INSERT 각각 별도 $transaction + set_config 발화", async () => {
    const result = await grantReward({
      userId: USER_ID,
      rewardType: "star",
      amount: 1,
      idempotencyKey: "session-xyz-star-1",
    });

    // 정상 흐름 — wasSkipped=false.
    expect(result.success).toBe(true);
    expect(result.wasSkipped).toBe(false);

    // $transaction 2회 호출 (User upsert + RewardLog create 분리).
    expect(transactionInvocations).toHaveLength(2);

    // set_config 2회 호출 — actorId = input.userId.
    expect(setConfigCalls).toHaveLength(2);
    expect(setConfigCalls[0].actorId).toBe(USER_ID);
    expect(setConfigCalls[1].actorId).toBe(USER_ID);

    // 실 mutation 호출도 1회씩.
    expect(userUpsertMock).toHaveBeenCalledTimes(1);
    expect(rewardLogCreateMock).toHaveBeenCalledTimes(1);
  });

  it("[시나리오 1-b] anonymous_user_id (UUID 아닌 영숫자) 도 withActor 통과", async () => {
    const ANON = "anon_user_2026_test";
    await grantReward({
      userId: ANON,
      rewardType: "tree",
      amount: 1,
      idempotencyKey: "anon-tree-1",
    });

    expect(setConfigCalls.map((c) => c.actorId)).toEqual([ANON, ANON]);
  });
});

// ============================================================================
// 시나리오 2: analyzeDiagnosis (익명 흐름) — 익명 user.upsert 가 withActor 안.
// ============================================================================

describe("[DB-011 마이그레이션] app/actions/diagnosis.ts analyzeDiagnosis — 익명 user.upsert withActor 적용", () => {
  it("[시나리오 2] 익명 흐름에서 user.upsert 호출 시 set_config 발화 (cookie 기반 userId)", async () => {
    cookieGetMock.mockReturnValue({ value: ANON_USER_ID });

    await analyzeDiagnosis({
      intendedWord: "사과",
      transcript: "사과",
      childAgeMonths: 36,
      targetPhoneme: "ㅅ",
    });

    // user.upsert 가 withActor 안에서 호출됨 → $transaction 1회 + set_config 1회.
    expect(userUpsertMock).toHaveBeenCalledTimes(1);
    // set_config 호출 중 user.upsert 트랜잭션의 것 (actorId=ANON_USER_ID) 존재.
    const userTxActorIds = setConfigCalls.map((c) => c.actorId);
    expect(userTxActorIds).toContain(ANON_USER_ID);
  });

  it("[시나리오 2-b] 인증 사용자 흐름 (isAnonymous=false) — user.upsert 미호출", async () => {
    // input.userId 가 제공되면 isAnonymous=false → user.upsert skip.
    await analyzeDiagnosis({
      userId: USER_ID,
      intendedWord: "사과",
      transcript: "사과",
      childAgeMonths: 36,
      targetPhoneme: "ㅅ",
    });

    expect(userUpsertMock).not.toHaveBeenCalled();
    // user 흐름 set_config 도 호출 X — sessionLog 등 다른 비-withActor 호출만 발생.
  });
});

// ============================================================================
// 시나리오 3: withActor 직접 — actor=null 폴백 검증.
// ============================================================================

describe("[DB-011] withActor actor=null → set_config 호출 0회 (system fallback)", () => {
  it("[시나리오 3a] actorId null → tx 안에서 set_config 호출 0회 + fn 실행", async () => {
    const fn = vi.fn(async () => "system-flow-result");
    const result = await withActor(null, fn);

    expect(result).toBe("system-flow-result");
    expect(transactionInvocations).toHaveLength(1);
    expect(setConfigCalls).toHaveLength(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("[시나리오 3b] actorId undefined → 동일 (system fallback)", async () => {
    const fn = vi.fn(async () => "ok");
    await withActor(undefined, fn);

    expect(setConfigCalls).toHaveLength(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("[시나리오 3c] actorId 빈 문자열 → 동일", async () => {
    const fn = vi.fn(async () => "ok");
    await withActor("", fn);

    expect(setConfigCalls).toHaveLength(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// 시나리오 4: SQL injection 페이로드 거부 + 트랜잭션 미시작.
// ============================================================================

describe("[DB-011] withActor 형식 부적합 actorId — throw + 트랜잭션 미시작", () => {
  it("[시나리오 4a] '; DROP TABLE — throw + $transaction 호출 0회", async () => {
    const fn = vi.fn();

    await expect(
      withActor("x'; DROP TABLE AuditLog; --", fn),
    ).rejects.toThrow(/invalid actorId/);

    expect(transactionInvocations).toHaveLength(0);
    expect(setConfigCalls).toHaveLength(0);
    expect(fn).not.toHaveBeenCalled();
  });

  it("[시나리오 4b] 공백 포함 actorId — throw", async () => {
    const fn = vi.fn();

    await expect(withActor("foo bar", fn)).rejects.toThrow(/invalid actorId/);
    expect(transactionInvocations).toHaveLength(0);
    expect(fn).not.toHaveBeenCalled();
  });
});

// ============================================================================
// 시나리오 5: fn throw — rollback semantics (에러 전파).
// ============================================================================

describe("[DB-011] withActor fn throw → rollback + 에러 전파", () => {
  it("[시나리오 5] fn 안에서 throw → withActor 가 동일 에러 reject (rollback Prisma 책임)", async () => {
    const error = new Error("Prisma update P2025 — row not found");
    const fn = vi.fn(async () => {
      throw error;
    });

    await expect(withActor(USER_ID, fn)).rejects.toThrow(/row not found/);

    // set_config 는 호출됨 (트랜잭션 시작 후 fn 진입 전).
    expect(transactionInvocations).toHaveLength(1);
    expect(setConfigCalls).toHaveLength(1);
    expect(setConfigCalls[0].actorId).toBe(USER_ID);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

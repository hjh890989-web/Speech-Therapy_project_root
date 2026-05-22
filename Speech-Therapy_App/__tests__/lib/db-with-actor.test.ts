// DB-011 후속 — lib/db/with-actor.ts 단위 테스트.
//
// 검증 시나리오 (≥ 8):
//   1. 정상 actorId (UUID v4) 주입 → set_config 호출 + fn 실행 + 결과 반환
//   2. actorId null → set_config 호출 0회 (TRIGGER 'system' 폴백)
//   3. actorId undefined → set_config 호출 0회
//   4. actorId 빈 문자열 → set_config 호출 0회
//   5. SQL injection 시도 ("' OR 1=1 --") → throw + 트랜잭션 미시작
//   6. SQL injection — 세미콜론 + DROP → throw
//   7. SQL injection — 공백 포함 → throw
//   8. actorId 129자 (한계 초과) → throw
//   9. UUID v4 형식 — 정상 통과
//  10. 영숫자 + 하이픈/언더스코어 (anonymous_user_id 패턴) → 정상 통과
//  11. fn throw → 호출 측에 동일 에러 전파 (트랜잭션 rollback 보장 — Prisma 측)
//  12. set_config 호출 시 인자 검증 — Prisma.sql tagged template 의 strings/values
//
// 본 테스트는 prisma.$transaction 을 mock 하여 트랜잭션 안 흐름을 검증.
// 실 DB 통합은 후속 통합 테스트 (audit-actor-id.test.ts 등) 에서 별도.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mock @/lib/db — prisma.$transaction 만 정의 (with-actor 가 필요로 하는 표면).
// ============================================================================
const txQueryRawMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

// vi.mock hoist 후 import — 본 모듈이 prisma 를 mock 통해 받음.
import { withActor } from "@/lib/db/with-actor";

// ============================================================================
// Lifecycle — mock 초기화 + 기본 동작 설정.
// ============================================================================

/**
 * transactionMock 의 기본 구현:
 *   fn(tx) 호출 — tx 는 $queryRaw mock 만 노출.
 *   fn 의 반환값을 그대로 반환 (실 prisma 와 동일).
 */
function defaultTransactionImpl<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
  return fn({ $queryRaw: txQueryRawMock });
}

beforeEach(() => {
  txQueryRawMock.mockReset();
  txQueryRawMock.mockResolvedValue([{ set_config: "" }]);
  transactionMock.mockReset();
  transactionMock.mockImplementation(defaultTransactionImpl);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// 상수 — 형식 검증 매트릭스.
// ============================================================================
const VALID_UUID_V4 = "a1b2c3d4-1234-4567-8901-abcdef012345";
const VALID_ANON_ID = "anon_user_2026_05_22_xyz";

// SQL injection 페이로드 모음 — 모두 throw 되어야 함.
const SQL_INJECTION_PAYLOADS = [
  "' OR 1=1 --",
  "x'; DROP TABLE AuditLog; --",
  "foo bar", // 공백
  "foo;bar", // 세미콜론
  "foo'bar", // 따옴표
  "foo\"bar", // 큰따옴표
  "foo\nbar", // 개행
  "foo\\bar", // 백슬래시
];

// ============================================================================
// 시나리오 1: 정상 actorId 주입
// ============================================================================

describe("withActor — 시나리오 1: 정상 actorId (UUID v4) 주입", () => {
  it("set_config 호출 + fn 실행 + 반환값 전달", async () => {
    const fn = vi.fn(async () => "result-value");

    const result = await withActor(VALID_UUID_V4, fn);

    expect(result).toBe("result-value");
    // $transaction 1회 호출.
    expect(transactionMock).toHaveBeenCalledTimes(1);
    // tx.$queryRaw 1회 호출 — set_config 쿼리.
    expect(txQueryRawMock).toHaveBeenCalledTimes(1);
    // Prisma tagged template — 첫 인자는 strings array 형태.
    const callArgs = txQueryRawMock.mock.calls[0];
    // tagged template 호출은 (TemplateStringsArray, ...values) 형태.
    const strings = callArgs[0] as TemplateStringsArray;
    expect(Array.isArray(strings)).toBe(true);
    const joined = strings.join("?");
    expect(joined).toContain("set_config");
    expect(joined).toContain("audit.actor_id");
    // 2번째 인자 (parameterize 된 actorId).
    expect(callArgs[1]).toBe(VALID_UUID_V4);
    // 3번째 인자 (LOCAL flag) — true 가 SQL 안에 inline (parameter 아님).
    expect(joined).toContain("true");
    // fn 호출 — tx 인자 전달.
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// 시나리오 2~4: actorId 없을 때 set_config 생략
// ============================================================================

describe("withActor — 시나리오 2~4: actorId 부재 → set_config 호출 0회", () => {
  it("[2] actorId null → fn 실행, set_config 호출 0회 (system 폴백)", async () => {
    const fn = vi.fn(async () => 42);
    const result = await withActor(null, fn);

    expect(result).toBe(42);
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(txQueryRawMock).not.toHaveBeenCalled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("[3] actorId undefined → set_config 호출 0회", async () => {
    const fn = vi.fn(async () => 42);
    await withActor(undefined, fn);

    expect(txQueryRawMock).not.toHaveBeenCalled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("[4] actorId 빈 문자열 → set_config 호출 0회 (null 과 동일 처리)", async () => {
    const fn = vi.fn(async () => 42);
    await withActor("", fn);

    expect(txQueryRawMock).not.toHaveBeenCalled();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// 시나리오 5~8: SQL injection 방어 + 길이 제한
// ============================================================================

describe("withActor — 시나리오 5~7: SQL injection 시도 차단", () => {
  for (const payload of SQL_INJECTION_PAYLOADS) {
    it(`잘못된 actorId 차단 (payload: ${JSON.stringify(payload)}) — throw + 트랜잭션 미시작`, async () => {
      const fn = vi.fn();

      await expect(withActor(payload, fn)).rejects.toThrow(/invalid actorId/);

      // 트랜잭션 시작 _전_ 에 throw — $transaction 미호출.
      expect(transactionMock).not.toHaveBeenCalled();
      expect(fn).not.toHaveBeenCalled();
    });
  }
});

describe("withActor — 시나리오 8: actorId 길이 한계 (129자 초과)", () => {
  it("129자 actorId → throw", async () => {
    const tooLong = "a".repeat(129);
    const fn = vi.fn();

    await expect(withActor(tooLong, fn)).rejects.toThrow(/invalid actorId/);
    expect(transactionMock).not.toHaveBeenCalled();
    expect(fn).not.toHaveBeenCalled();
  });

  it("128자 actorId (경계) → 정상 통과", async () => {
    const exactLimit = "a".repeat(128);
    const fn = vi.fn(async () => "ok");

    const result = await withActor(exactLimit, fn);

    expect(result).toBe("ok");
    expect(txQueryRawMock).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// 시나리오 9~10: 정상 형식 매트릭스
// ============================================================================

describe("withActor — 시나리오 9~10: 정상 actorId 형식 매트릭스", () => {
  it("[9] UUID v4 형식 → 정상 통과", async () => {
    const fn = vi.fn(async () => "ok");
    await withActor(VALID_UUID_V4, fn);
    expect(txQueryRawMock).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("[10] 영숫자 + 하이픈/언더스코어 (anonymous_user_id) → 정상 통과", async () => {
    const fn = vi.fn(async () => "ok");
    await withActor(VALID_ANON_ID, fn);
    expect(txQueryRawMock).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("1자 actorId (최소 경계) → 정상 통과", async () => {
    const fn = vi.fn(async () => "ok");
    await withActor("a", fn);
    expect(txQueryRawMock).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// 시나리오 11: fn throw → 에러 전파 (트랜잭션 rollback 은 Prisma 책임)
// ============================================================================

describe("withActor — 시나리오 11: fn throw → 에러 전파", () => {
  it("fn 안에서 throw → withActor 가 동일 에러 reject", async () => {
    const error = new Error("Prisma update P2025 row not found");
    const fn = vi.fn(async () => {
      throw error;
    });

    await expect(withActor(VALID_UUID_V4, fn)).rejects.toThrow(
      /row not found/,
    );
    // set_config 는 호출됨 (트랜잭션 시작 후 fn 진입 전).
    expect(txQueryRawMock).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("$transaction 자체 reject (DB 연결 오류) → 호출 측 전파", async () => {
    transactionMock.mockRejectedValueOnce(new Error("DB connection lost"));
    const fn = vi.fn();

    await expect(withActor(VALID_UUID_V4, fn)).rejects.toThrow(
      /DB connection lost/,
    );
    // fn 실행 자체 안 됨.
    expect(fn).not.toHaveBeenCalled();
  });
});

// ============================================================================
// 시나리오 12: tagged template 인자 구조 보장 (회귀 방어)
// ============================================================================

describe("withActor — 시나리오 12: Prisma tagged template 인자 구조 검증", () => {
  it("set_config name 은 literal, value 는 parameter, LOCAL=true 는 literal", async () => {
    const fn = vi.fn(async () => "ok");
    await withActor(VALID_UUID_V4, fn);

    const [strings, ...values] = txQueryRawMock.mock.calls[0];
    const stringsArr = strings as TemplateStringsArray;

    // 정확한 parameter 개수 = 1 (actorId 만).
    expect(values).toHaveLength(1);
    expect(values[0]).toBe(VALID_UUID_V4);

    // strings 첫 토큰에 set_config + audit.actor_id literal 포함.
    expect(stringsArr[0]).toContain("set_config");
    expect(stringsArr[0]).toContain("audit.actor_id");
    // strings 마지막 토큰에 LOCAL true 포함 — parameterize 안 됨.
    expect(stringsArr[stringsArr.length - 1]).toContain("true");
  });
});

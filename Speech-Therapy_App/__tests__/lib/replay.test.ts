// SEC-003 (2차 패치) — Replay 방어 nonce store 단위 테스트.
//
// 검증 시나리오 (Task 명세):
//   1) 첫 호출 → ok:true
//   2) 동일 nonce 재호출 → ok:false, reason="replay"
//   3) 24h+ 경과 → 자동 expire, 재사용 가능
//   4) 환경 prefix 격리 (production / preview / development / test 별 독립)
//
// 추가 회귀 sentinel:
//   - 빈 / 비-string nonce → ok:false (방어적)
//   - 폭주 가드 (MAX_ENTRIES 10k FIFO eviction) — 시간 비용 비례 → 압축 시나리오만
//   - getReplayStats shape

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  verifyReplay,
  recordNonce,
  getReplayStats,
  __resetReplayForTest,
} from "@/lib/replay";

const NONCE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NONCE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

beforeEach(() => {
  __resetReplayForTest();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-15T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  __resetReplayForTest();
});

describe("verifyReplay — 시나리오 1: 첫 호출", () => {
  it("ok:true 반환 + record 안 됨 (verify 자체는 부작용 없음)", () => {
    const r = verifyReplay(NONCE_A);
    expect(r.ok).toBe(true);
    expect(r.reason).toBeUndefined();
    // record 안 됐으므로 재호출도 ok:true 여야 함.
    const r2 = verifyReplay(NONCE_A);
    expect(r2.ok).toBe(true);
  });

  it("다른 nonce 들은 독립", () => {
    expect(verifyReplay(NONCE_A).ok).toBe(true);
    expect(verifyReplay(NONCE_B).ok).toBe(true);
  });
});

describe("verifyReplay — 시나리오 2: 동일 nonce 재호출", () => {
  it("record 후 동일 nonce verify → ok:false, reason='replay'", () => {
    expect(verifyReplay(NONCE_A).ok).toBe(true);
    recordNonce(NONCE_A);

    const r = verifyReplay(NONCE_A);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("replay");
  });

  it("다른 nonce 는 영향 없음 (per-nonce 독립)", () => {
    recordNonce(NONCE_A);
    expect(verifyReplay(NONCE_A).ok).toBe(false);
    expect(verifyReplay(NONCE_B).ok).toBe(true);
  });

  it("recordNonce 멱등 — 같은 nonce 2회 record 해도 replay 동작 동일", () => {
    recordNonce(NONCE_A);
    recordNonce(NONCE_A);
    const r = verifyReplay(NONCE_A);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("replay");
  });
});

describe("verifyReplay — 시나리오 3: 24h+ 경과 → 자동 expire", () => {
  it("23h59m → 여전히 replay 차단", () => {
    recordNonce(NONCE_A);
    vi.advanceTimersByTime(23 * 60 * 60 * 1000 + 59 * 60 * 1000); // 23h59m
    const r = verifyReplay(NONCE_A);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("replay");
  });

  it("24h+ 경과 → 자동 expire, 재사용 가능 (ok:true)", () => {
    recordNonce(NONCE_A);
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000); // 24h + 1s
    const r = verifyReplay(NONCE_A);
    expect(r.ok).toBe(true);
  });

  it("expire 후 재 record → 새 24h 윈도우 시작", () => {
    recordNonce(NONCE_A);
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000);
    expect(verifyReplay(NONCE_A).ok).toBe(true);
    recordNonce(NONCE_A);
    // 새 윈도우 — 즉시 재호출은 차단.
    expect(verifyReplay(NONCE_A).ok).toBe(false);
  });

  it("lazy GC — 만료된 entry 가 store 에서 제거됨 (stats 검증)", () => {
    recordNonce(NONCE_A);
    recordNonce(NONCE_B);
    expect(getReplayStats().entryCount).toBe(2);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000);
    // verify 호출 시 lazy GC trigger.
    verifyReplay(NONCE_A);
    // 만료된 자신 entry 가 GC 됨 → store 에 NONCE_B 만 (혹은 모두) 만료 제거.
    expect(getReplayStats().entryCount).toBeLessThanOrEqual(1);
  });
});

describe("verifyReplay — 시나리오 4: 환경 prefix 격리", () => {
  it("production 에서 record 한 nonce 가 preview 에서는 첫 사용으로 취급", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    recordNonce(NONCE_A);
    expect(verifyReplay(NONCE_A).ok).toBe(false); // prod 내부 replay.

    vi.stubEnv("VERCEL_ENV", "preview");
    expect(verifyReplay(NONCE_A).ok).toBe(true); // preview 입장에선 새 nonce.
  });

  it("development 에서 record 한 nonce 가 production 에서 차단되지 않음", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "development");
    recordNonce(NONCE_A);
    expect(verifyReplay(NONCE_A).ok).toBe(false);

    vi.stubEnv("VERCEL_ENV", "production");
    expect(verifyReplay(NONCE_A).ok).toBe(true);
  });

  it("동일 환경 (test) 에서는 격리 안 됨 — 동일 prefix 키", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "test");
    recordNonce(NONCE_A);
    expect(verifyReplay(NONCE_A).ok).toBe(false);
    // env 변경 없이 재검사 → 여전히 차단.
    expect(verifyReplay(NONCE_A).ok).toBe(false);
  });
});

describe("verifyReplay — 방어적 입력 (빈/비-string)", () => {
  it("빈 string → ok:false, reason='replay' (호출 측 책임 회피)", () => {
    const r = verifyReplay("");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("replay");
  });

  it("undefined / null cast → ok:false (방어)", () => {
    // 호출 측이 헤더 부재 시 null 을 cast 해 전달하는 케이스.
    const r = verifyReplay(null as unknown as string);
    expect(r.ok).toBe(false);
  });
});

describe("getReplayStats — 모니터링 shape", () => {
  it("초기 상태 — entryCount=0 + ttlMs=24h + maxEntries=10000", () => {
    const stats = getReplayStats();
    expect(stats).toMatchObject({
      entryCount: 0,
      ttlMs: 24 * 60 * 60 * 1000,
      maxEntries: 10_000,
    });
    expect(typeof stats.envPrefix).toBe("string");
  });

  it("recordNonce 1회 → entryCount=1", () => {
    recordNonce(NONCE_A);
    expect(getReplayStats().entryCount).toBe(1);
  });

  it("envPrefix — VERCEL_ENV 우선 반영", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(getReplayStats().envPrefix).toBe("production");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(getReplayStats().envPrefix).toBe("preview");
  });
});

describe("__resetReplayForTest — 격리", () => {
  it("모든 entry 비움 + env prefix 무관", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    recordNonce(NONCE_A);
    vi.stubEnv("VERCEL_ENV", "preview");
    recordNonce(NONCE_B);
    expect(getReplayStats().entryCount).toBeGreaterThanOrEqual(1);

    __resetReplayForTest();
    expect(getReplayStats().entryCount).toBe(0);
    // 양 환경 모두 ok:true.
    vi.stubEnv("VERCEL_ENV", "production");
    expect(verifyReplay(NONCE_A).ok).toBe(true);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(verifyReplay(NONCE_B).ok).toBe(true);
  });
});

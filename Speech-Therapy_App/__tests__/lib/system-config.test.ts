// ADR-13 — lib/config/system-config 단위 테스트.
//
// 격리: @/lib/db prisma.systemConfig mock. getCurrentPhase 하이브리드 + 멱등성 윈도우 검증.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.fn();
const upsertMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    systemConfig: {
      findUnique: (...a: unknown[]) => findUniqueMock(...a),
      upsert: (...a: unknown[]) => upsertMock(...a),
    },
  },
}));

import {
  getCurrentPhase,
  getSystemConfig,
  isWithinIdempotencyWindow,
  setSystemConfig,
} from "@/lib/config/system-config";

beforeEach(() => {
  findUniqueMock.mockReset();
  upsertMock.mockReset();
  delete process.env.HITL_DIVERSITY_PHASE;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.HITL_DIVERSITY_PHASE;
});

describe("getSystemConfig", () => {
  it("값 존재 → value", async () => {
    findUniqueMock.mockResolvedValue({ value: "x" });
    expect(await getSystemConfig("k")).toBe("x");
  });
  it("미존재 → null", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect(await getSystemConfig("k")).toBeNull();
  });
  it("DB error → null (graceful)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    findUniqueMock.mockRejectedValue(new Error("db"));
    expect(await getSystemConfig("k")).toBeNull();
    spy.mockRestore();
  });
});

describe("setSystemConfig", () => {
  it("upsert(key, value)", async () => {
    upsertMock.mockResolvedValue({});
    await setSystemConfig("k", "v");
    expect(upsertMock).toHaveBeenCalledWith({
      where: { key: "k" },
      create: { key: "k", value: "v" },
      update: { value: "v" },
    });
  });
});

describe("getCurrentPhase — ADR-13 하이브리드 (env → DB → default)", () => {
  it("env=phase2 → phase2 (DB 미조회)", async () => {
    process.env.HITL_DIVERSITY_PHASE = "phase2";
    expect(await getCurrentPhase()).toBe("phase2");
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
  it("env=phase1 → phase1", async () => {
    process.env.HITL_DIVERSITY_PHASE = "phase1";
    expect(await getCurrentPhase()).toBe("phase1");
  });
  it("env 없음 + DB=phase2 → phase2", async () => {
    findUniqueMock.mockResolvedValue({ value: "phase2" });
    expect(await getCurrentPhase()).toBe("phase2");
  });
  it("env 없음 + DB 없음 → phase1 default", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect(await getCurrentPhase()).toBe("phase1");
  });
});

describe("isWithinIdempotencyWindow", () => {
  const NOW = new Date("2026-05-31T00:00:00.000Z");
  const DAY = 24 * 60 * 60 * 1000;

  it("키 미설정 → false (진행 허용)", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect(await isWithinIdempotencyWindow("k", 7, NOW)).toBe(false);
  });
  it("3일 전 → true (윈도우 이내 = skip)", async () => {
    findUniqueMock.mockResolvedValue({
      value: new Date(NOW.getTime() - 3 * DAY).toISOString(),
    });
    expect(await isWithinIdempotencyWindow("k", 7, NOW)).toBe(true);
  });
  it("10일 전 → false (윈도우 밖)", async () => {
    findUniqueMock.mockResolvedValue({
      value: new Date(NOW.getTime() - 10 * DAY).toISOString(),
    });
    expect(await isWithinIdempotencyWindow("k", 7, NOW)).toBe(false);
  });
  it("파싱 불가 값 → false", async () => {
    findUniqueMock.mockResolvedValue({ value: "not-a-date" });
    expect(await isWithinIdempotencyWindow("k", 7, NOW)).toBe(false);
  });
});

// FR-C-REENGAGE-BANNER — getResumableMission 단위 테스트.
//
// 검증: 오늘 시작·미완료 미션 중 최신 1건 반환 + '오늘 완료한 미션' suppression + graceful.

import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: { sessionLog: { findMany: (...a: unknown[]) => findManyMock(...a) } },
}));

import { getResumableMission } from "@/lib/missions/resumable";

const NOW = new Date("2026-06-03T05:00:00.000Z");

/// completed(durationSec>0) / pending(durationSec<=0) 쿼리를 where.durationSec 로 분기.
/// pending 은 호출 측 orderBy desc 가정 → 배열 순서 = 최신순.
function setup({ completed, pending }: { completed: string[]; pending: string[] }) {
  findManyMock.mockImplementation((arg: { where?: { durationSec?: { gt?: number; lte?: number } } }) => {
    const d = arg?.where?.durationSec;
    if (d && typeof d.gt === "number") {
      return Promise.resolve(completed.map((missionId) => ({ missionId })));
    }
    if (d && typeof d.lte === "number") {
      return Promise.resolve(pending.map((missionId) => ({ missionId })));
    }
    return Promise.resolve([]);
  });
}

beforeEach(() => {
  findManyMock.mockReset();
});

describe("getResumableMission — 오늘 시작·미완료 + suppression", () => {
  it("pending 1건 + 완료 없음 → 그 missionId 반환", async () => {
    setup({ completed: [], pending: ["m-A"] });
    expect(await getResumableMission("u1", NOW)).toBe("m-A");
  });

  it("pending 이 오늘 이미 완료됨 → suppression(undefined)", async () => {
    setup({ completed: ["m-A"], pending: ["m-A"] });
    expect(await getResumableMission("u1", NOW)).toBeUndefined();
  });

  it("최신 pending 이 완료됨 → 다음 미완료 미션 반환", async () => {
    // 최신순 [m-A, m-B], m-A 는 오늘 완료 → m-B 반환.
    setup({ completed: ["m-A"], pending: ["m-A", "m-B"] });
    expect(await getResumableMission("u1", NOW)).toBe("m-B");
  });

  it("pending 없음 → undefined", async () => {
    setup({ completed: [], pending: [] });
    expect(await getResumableMission("u1", NOW)).toBeUndefined();
  });

  it("DB throw → undefined (graceful, 페이지 차단 0)", async () => {
    findManyMock.mockRejectedValue(new Error("db down"));
    expect(await getResumableMission("u1", NOW)).toBeUndefined();
  });
});

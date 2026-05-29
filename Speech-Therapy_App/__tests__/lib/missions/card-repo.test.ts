// FR-C-003-2 — card-repo (MissionCard DB 조회 + graceful fallback) 단위 테스트.

import { describe, it, expect, beforeEach, vi } from "vitest";

// Prisma mock — factory 안에서 vi.fn() (consent-repo.test 패턴).
vi.mock("@/lib/db", () => ({
  prisma: {
    missionCard: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { getMissionCards, getMissionCardById } from "@/lib/missions/card-repo";
import { dailyMissionFixtures } from "@/lib/mocks/missions";

const mc = prisma.missionCard as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "mock-s-3",
    targetPhoneme: "ㅅ",
    difficultyLevel: 3,
    rewardType: "star",
    title: "ㅅ 소리 단어 따라하기",
    instructionText: "ㅅ 소리로 단어 따라하기 활동을 해보세요.",
    mediaUri: null,
    ageRangeMin: 48,
    ageRangeMax: 60,
    createdAt: new Date(0),
    ...overrides,
  };
}

beforeEach(() => {
  mc.findMany.mockReset();
  mc.findUnique.mockReset();
});

describe("getMissionCards", () => {
  it("DB rows → fixture-shape + 음운 위계 정렬", async () => {
    mc.findMany.mockResolvedValue([
      row({ id: "mock-l-1", targetPhoneme: "ㄹ", difficultyLevel: 1 }),
      row({ id: "mock-g-2", targetPhoneme: "ㄱ", difficultyLevel: 2 }),
    ]);
    const cards = await getMissionCards();
    // ㄱ(위계 0) 이 ㄹ(위계 4) 보다 앞.
    expect(cards.map((c) => c.targetPhoneme)).toEqual(["ㄱ", "ㄹ"]);
    // fixture shape — createdAt/mediaUri 제외.
    expect(cards[0]).not.toHaveProperty("createdAt");
    expect(cards[0]).not.toHaveProperty("mediaUri");
  });

  it("DB empty → fixtures 폴백 (값 동등, 새 배열 복사)", async () => {
    mc.findMany.mockResolvedValue([]);
    const cards = await getMissionCards();
    expect(cards).toEqual(dailyMissionFixtures);
    expect(cards).not.toBe(dailyMissionFixtures); // 복사본 — 공유 mutation 방지
  });

  it("DB throw → fixtures 폴백 (값 동등, 새 배열 복사)", async () => {
    mc.findMany.mockRejectedValue(new Error("no db"));
    const cards = await getMissionCards();
    expect(cards).toEqual(dailyMissionFixtures);
    expect(cards).not.toBe(dailyMissionFixtures);
  });

  it("위계 밖 음소(미지수)는 끝으로 정렬 (idx -1 → 끝)", async () => {
    mc.findMany.mockResolvedValue([
      row({ id: "mock-x-1", targetPhoneme: "ㅋ", difficultyLevel: 1 }), // PHONEME_ORDER 밖
      row({ id: "mock-g-1", targetPhoneme: "ㄱ", difficultyLevel: 1 }),
    ]);
    const cards = await getMissionCards();
    expect(cards.map((c) => c.targetPhoneme)).toEqual(["ㄱ", "ㅋ"]);
  });

  it("부분 시드(일부 카드만) → 폴백 없이 해당 부분만 정렬 반환", async () => {
    mc.findMany.mockResolvedValue([
      row({ id: "mock-s-2", targetPhoneme: "ㅅ", difficultyLevel: 2 }),
      row({ id: "mock-s-1", targetPhoneme: "ㅅ", difficultyLevel: 1 }),
      row({ id: "mock-g-1", targetPhoneme: "ㄱ", difficultyLevel: 1 }),
    ]);
    const cards = await getMissionCards();
    expect(cards).toHaveLength(3); // fixtures 30개로 폴백 안 함
    expect(cards.map((c) => c.id)).toEqual(["mock-g-1", "mock-s-1", "mock-s-2"]);
  });
});

describe("getMissionCardById", () => {
  it("DB hit → fixture-shape 반환", async () => {
    mc.findUnique.mockResolvedValue(row());
    const card = await getMissionCardById("mock-s-3");
    expect(card?.id).toBe("mock-s-3");
    expect(card?.targetPhoneme).toBe("ㅅ");
    expect(card?.difficultyLevel).toBe(3);
  });

  it("DB null(미시드) → 유효 slug 면 fixtures 폴백", async () => {
    mc.findUnique.mockResolvedValue(null);
    const card = await getMissionCardById("mock-s-3");
    expect(card?.id).toBe("mock-s-3"); // fixtures 에 존재
  });

  it("DB throw → fixtures 폴백", async () => {
    mc.findUnique.mockRejectedValue(new Error("no db"));
    const card = await getMissionCardById("mock-s-3");
    expect(card?.id).toBe("mock-s-3");
  });

  it("미존재 id → null", async () => {
    mc.findUnique.mockResolvedValue(null);
    expect(await getMissionCardById("does-not-exist")).toBeNull();
  });
});

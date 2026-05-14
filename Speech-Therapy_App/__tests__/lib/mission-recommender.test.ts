// FR-C-008 UI 통합 — 추천 fixture 매칭 + 격려 카피 단위 테스트.

import { describe, it, expect } from "vitest";
import {
  pickRecommendedMission,
  findMostFrequentPhoneme,
} from "@/lib/mission-recommender";
import { dailyMissionFixtures } from "@/lib/mocks/missions";

describe("pickRecommendedMission — fixture 매칭", () => {
  it("정확 매칭 (phoneme + difficulty) → 해당 카드", () => {
    const out = pickRecommendedMission(
      { phoneme: "ㅅ", difficulty: 2, reason: "continue" },
      dailyMissionFixtures,
    );
    expect(out).not.toBeNull();
    expect(out!.mission.targetPhoneme).toBe("ㅅ");
    expect(out!.mission.difficultyLevel).toBe(2);
    expect(out!.copy).toBe("오늘의 추천");
  });

  it("정확 매칭 없으면 같은 phoneme 의 가장 가까운 difficulty", () => {
    // ㅅ 은 1~3 단계만 fixture 에 있음. 5 요청 시 가장 가까운 3 반환.
    const out = pickRecommendedMission(
      { phoneme: "ㅅ", difficulty: 5, reason: "level_up" },
      dailyMissionFixtures,
    );
    expect(out!.mission.targetPhoneme).toBe("ㅅ");
    expect(out!.mission.difficultyLevel).toBe(3);
    expect(out!.copy).toBe("더 멋진 발음에 도전해볼까요?");
  });

  it("같은 phoneme 없으면 같은 difficulty 의 임의 phoneme", () => {
    // ㄹ 은 fixture 에 없음. ㄹ + 2 요청 시 다른 phoneme 의 난이도 2 반환.
    const out = pickRecommendedMission(
      { phoneme: "ㄹ", difficulty: 2, reason: "continue" },
      dailyMissionFixtures,
    );
    expect(out!.mission.difficultyLevel).toBe(2);
  });

  it("level_down 격려 카피", () => {
    const out = pickRecommendedMission(
      { phoneme: "ㅅ", difficulty: 1, reason: "level_down" },
      dailyMissionFixtures,
    );
    expect(out!.copy).toBe("조금 익숙한 발음부터 시작해볼까요?");
    // 실패 어휘 미포함 검증.
    expect(out!.copy).not.toContain("실패");
    expect(out!.copy).not.toContain("X");
  });

  it("phoneme_switch 격려 카피", () => {
    const out = pickRecommendedMission(
      { phoneme: "ㅈ", difficulty: 1, reason: "phoneme_switch" },
      dailyMissionFixtures,
    );
    expect(out!.copy).toBe("새로운 발음을 만나볼까요?");
  });

  it("fixture 0개 → null", () => {
    expect(pickRecommendedMission({ phoneme: "ㅅ", difficulty: 1, reason: "continue" }, [])).toBeNull();
  });
});

describe("findMostFrequentPhoneme", () => {
  it("빈 배열 → null", () => {
    expect(findMostFrequentPhoneme([])).toBeNull();
  });

  it("단일 phoneme", () => {
    expect(findMostFrequentPhoneme(["ㅅ"])).toBe("ㅅ");
  });

  it("최빈 phoneme 반환", () => {
    expect(findMostFrequentPhoneme(["ㅅ", "ㅈ", "ㅅ", "ㅈ", "ㅅ"])).toBe("ㅅ");
  });

  it("동률 시 첫 번째", () => {
    const out = findMostFrequentPhoneme(["ㅅ", "ㅈ"]);
    expect(out).toBe("ㅅ");
  });
});

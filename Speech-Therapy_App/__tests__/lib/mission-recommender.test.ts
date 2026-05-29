// FR-C-008 UI 통합 — 추천 fixture 매칭 + 격려 카피 단위 테스트.

import { describe, it, expect } from "vitest";
import {
  pickRecommendedMission,
  findMostFrequentPhoneme,
  shouldRecommendRest,
  type RecentActivity,
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
    // REQ-FUNC-CL-05 — ㅅ 은 1~6 단계 fixture 존재. 범위 밖(7) 요청 시 가장 가까운 6 반환.
    const out = pickRecommendedMission(
      { phoneme: "ㅅ", difficulty: 7, reason: "level_up" },
      dailyMissionFixtures,
    );
    expect(out!.mission.targetPhoneme).toBe("ㅅ");
    expect(out!.mission.difficultyLevel).toBe(6);
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

describe("shouldRecommendRest — FR-Q-003 Scenario 5 (NO_MISSIONS_AVAILABLE)", () => {
  const NOW = new Date("2026-05-20T12:00:00Z").getTime();
  const HOUR = 60 * 60_000;

  function mk(success: boolean, hoursAgo: number, phoneme = "ㅅ"): RecentActivity {
    return {
      success,
      timestamp: new Date(NOW - hoursAgo * HOUR).toISOString(),
      targetPhoneme: phoneme,
    };
  }

  it("빈 활동 → rest=false", () => {
    expect(shouldRecommendRest([], { nowMs: NOW })).toEqual({ rest: false });
  });

  it("성공 4건 < threshold 5 → rest=false", () => {
    const activity = Array.from({ length: 4 }, () => mk(true, 1));
    expect(shouldRecommendRest(activity, { nowMs: NOW })).toEqual({ rest: false });
  });

  it("성공 5건 ≥ threshold 5 → rest=true + 시도 안 한 음소 추천", () => {
    const activity = [
      mk(true, 0.5, "ㅅ"),
      mk(true, 1, "ㅅ"),
      mk(true, 1.5, "ㅈ"),
      mk(true, 2, "ㅈ"),
      mk(true, 3, "ㅅ"),
    ];
    const out = shouldRecommendRest(activity, { nowMs: NOW });
    expect(out.rest).toBe(true);
    // 시도 안 한 음소: ㄱ/ㄴ/ㄹ 중 첫 번째 = ㄱ.
    expect(out.alternativePhoneme).toBe("ㄱ");
  });

  it("윈도우 밖 (4시간 초과) 성공은 카운트 안 됨", () => {
    const activity = [
      mk(true, 0.5, "ㅅ"),
      mk(true, 1, "ㅅ"),
      mk(true, 5, "ㅈ"),  // 5시간 전 — 윈도우 밖
      mk(true, 6, "ㅈ"),  // 6시간 전 — 윈도우 밖
      mk(true, 7, "ㅅ"),  // 7시간 전 — 윈도우 밖
    ];
    expect(shouldRecommendRest(activity, { nowMs: NOW })).toEqual({ rest: false });
  });

  it("실패 세션은 카운트 안 됨", () => {
    const activity = [
      mk(true, 0.5, "ㅅ"),
      mk(false, 1, "ㅅ"),
      mk(false, 1.5, "ㅈ"),
      mk(true, 2, "ㅈ"),
      mk(false, 3, "ㅅ"),
    ];
    expect(shouldRecommendRest(activity, { nowMs: NOW })).toEqual({ rest: false });
  });

  it("모든 음소 시도 완료 시 alternativePhoneme=undefined", () => {
    const activity = [
      mk(true, 0.5, "ㅅ"),
      mk(true, 1, "ㅈ"),
      mk(true, 1.5, "ㄱ"),
      mk(true, 2, "ㄴ"),
      mk(true, 2.5, "ㄹ"),
    ];
    const out = shouldRecommendRest(activity, { nowMs: NOW });
    expect(out.rest).toBe(true);
    expect(out.alternativePhoneme).toBeUndefined();
  });

  it("커스텀 threshold (minSuccessful=3) 적용", () => {
    const activity = Array.from({ length: 3 }, (_, i) => mk(true, i + 0.5, "ㅅ"));
    expect(shouldRecommendRest(activity, { nowMs: NOW, minSuccessful: 3 })).toMatchObject({
      rest: true,
    });
  });
});

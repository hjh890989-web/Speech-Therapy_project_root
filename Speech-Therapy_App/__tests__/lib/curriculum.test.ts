// FR-C-008 — analyzeStreaks / decideRecommendation / resolveMission 단위 테스트.

import { describe, it, expect } from "vitest";
import {
  analyzeStreaks,
  decideRecommendation,
  resolveMission,
} from "@/lib/curriculum";
import type { SessionResult, CurriculumInput } from "@/lib/schemas/curriculum";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const MISSION = (id: string) => `mission-${id}`;

function session(id: string, missionId: string, success: boolean, isoMinusMinutes: number): SessionResult {
  return {
    sessionId: id,
    missionId,
    success,
    timestamp: new Date(Date.now() - isoMinusMinutes * 60_000).toISOString(),
  };
}

describe("analyzeStreaks", () => {
  it("최근 3건 모두 실패 → trailingFailures=3", () => {
    const sessions = [
      session("22222222-2222-4222-8222-222222222222", MISSION("a"), false, 1),
      session("33333333-3333-4333-8333-333333333333", MISSION("a"), false, 2),
      session("44444444-4444-4444-8444-444444444444", MISSION("a"), false, 3),
      session("55555555-5555-4555-8555-555555555555", MISSION("a"), true, 4),
    ];
    const streak = analyzeStreaks(sessions, 3, "ㅅ");
    expect(streak.trailingFailures).toBe(3);
    expect(streak.trailingSuccesses).toBe(0);
    expect(streak.failureCount).toBe(3);
    expect(streak.successCount).toBe(1);
  });

  it("최근 5건 모두 성공 → trailingSuccesses=5", () => {
    const sessions = Array.from({ length: 5 }, (_, i) =>
      session(`aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`, MISSION("b"), true, i + 1),
    );
    const streak = analyzeStreaks(sessions, 2, "ㅅ");
    expect(streak.trailingSuccesses).toBe(5);
    expect(streak.trailingFailures).toBe(0);
  });

  it("입력 순서 무관 — timestamp 역순 정렬 보장", () => {
    const sessions = [
      session("66666666-6666-4666-8666-666666666666", MISSION("c"), true, 10),
      session("77777777-7777-4777-8777-777777777777", MISSION("c"), false, 1),
    ];
    const streak = analyzeStreaks(sessions);
    expect(streak.trailingFailures).toBe(1);
  });
});

describe("decideRecommendation", () => {
  const baseStreak = analyzeStreaks([], 3, "ㅅ");

  it("3연속 실패 → level_down (-1)", () => {
    const streak = { ...baseStreak, trailingFailures: 3 };
    const decision = decideRecommendation(streak, 1, "ㅅ");
    expect(decision.reason).toBe("level_down");
    expect(decision.difficulty).toBe(2);
  });

  it("level_down 시 최소 난이도 1 미만 안 됨", () => {
    const streak = { ...baseStreak, recentDifficulty: 1, trailingFailures: 5 };
    const decision = decideRecommendation(streak, 1, "ㅅ");
    expect(decision.difficulty).toBe(1);
  });

  it("5연속 성공 → level_up (+1)", () => {
    const streak = { ...baseStreak, trailingSuccesses: 5 };
    const decision = decideRecommendation(streak, 1, "ㅅ");
    expect(decision.reason).toBe("level_up");
    expect(decision.difficulty).toBe(4);
  });

  it("그 외 → continue (현 난이도 유지)", () => {
    const streak = { ...baseStreak, trailingFailures: 1, trailingSuccesses: 0 };
    const decision = decideRecommendation(streak, 1, "ㅅ");
    expect(decision.reason).toBe("continue");
    expect(decision.difficulty).toBe(3);
  });

  it("동일 음소 6단계 마스터 + 최근 성공 → phoneme_switch (난이도 1 + 다음 음소)", () => {
    // REQ-FUNC-CL-05 — MAX_DIFFICULTY 6 (대화 단계 마스터 시 음소 전환).
    const streak = { ...baseStreak, recentDifficulty: 6, recentPhoneme: "ㅅ", trailingSuccesses: 2 };
    const decision = decideRecommendation(streak, 1, "ㅅ");
    expect(decision.reason).toBe("phoneme_switch");
    expect(decision.difficulty).toBe(1);
    expect(decision.suggestedNextPhoneme).toBe("ㅈ");
  });
});

describe("resolveMission", () => {
  it("후보 0건 → null 반환", async () => {
    const out = await resolveMission(
      {
        userId: USER_ID,
        recentSessions: [],
        childAgeMonths: 36,
      } as CurriculumInput,
      { difficulty: 2, phoneme: "ㅅ", reason: "continue" },
      { findCandidates: async () => [] },
    );
    expect(out).toBeNull();
  });

  it("동일 입력 → 동일 출력 (결정적 시드 선택)", async () => {
    const input: CurriculumInput = {
      userId: USER_ID,
      recentSessions: [
        session("88888888-8888-4888-8888-888888888888", MISSION("d"), true, 1),
      ],
      childAgeMonths: 36,
    };
    const decision = { difficulty: 2, phoneme: "ㅅ", reason: "continue" as const };
    const candidates = [{ id: "m-1" }, { id: "m-2" }, { id: "m-3" }];

    const a = await resolveMission(input, decision, { findCandidates: async () => candidates });
    const b = await resolveMission(input, decision, { findCandidates: async () => candidates });
    expect(a).toBe(b);
    expect(candidates.map((c) => c.id)).toContain(a);
  });
});

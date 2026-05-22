// TEST-007 — 적응형 난이도 은밀성 + 난이도 전환 latency 단위 검증.
//
// REQ-FUNC-021: 3연속 실패 → -1, X표시 0회, 전환 < 0.5초 (은밀한 level_down).
// REQ-FUNC-022: 5연속 성공 → +1 / 5단계 마스터 → phoneme_switch (양방향 적응).
//
// 본 파일은 기존 curriculum.test.ts / mission-recommender.test.ts 의 동작 테스트와
// 겹치지 않는 "정서 보호 + 성능" 회귀 가드를 추가한다:
//   sc1: 3연속 실패 → analyzeStreaks + decideRecommendation 합산 → reason=level_down
//   sc2: REASON_COPY[level_down] 부정 어휘 (실패/X/❌/다시/안돼/못/틀렸/오답 등) 0건
//   sc3: pickRecommendedMission 4종 reason 의 모든 카피 부정 어휘 0건
//   sc4: decide+pick 합산 latency ≤ 500ms (100회 평균/최대) — deterministic 측정
//   sc5: 5연속 성공 → level_up + 격려 카피 (양방향 적응)
//   sc6: dailyMissionFixtures 전 텍스트 + REASON_COPY 전 텍스트 정적 스캔 — 부정 마커 0건
//
// 격리: 실 DB / 네트워크 0건. 순수 함수 + fixture.
// 결정성: performance.now() 기반 측정은 환경 의존이라 평균/최대 둘 다 검증
//        (CI runner 노이즈 흡수) — 500ms 는 REQ-FUNC-021 명세값.

import { describe, it, expect } from "vitest";
import { analyzeStreaks, decideRecommendation } from "@/lib/curriculum";
import { pickRecommendedMission } from "@/lib/mission-recommender";
import { dailyMissionFixtures } from "@/lib/mocks/missions";
import type { SessionResult } from "@/lib/schemas/curriculum";

// === 정서 보호 — 부정 어휘 사전 (CON-04 + REQ-FUNC-021) ===
//
// 자녀가 "내가 못했구나" 로 해석할 수 있는 모든 표현. UI/카피/fixture 어디에도
// 등장 금지. 영어/한글/이모지/특수기호 혼용 전부 검사.
const NEGATIVE_MARKERS = [
  "실패",
  "오답",
  "틀렸",
  "틀린",
  "X", // 영문 대문자 X (실패 마커)
  "❌",
  "✗",
  "✘",
  "다시",
  "다시 해",
  "재시도",
  "안돼",
  "안 돼",
  "못했",
  "못 했",
  "어려워요",
  "어렵",
  "잘못",
  "에러",
  "오류",
  "fail",
  "Fail",
  "FAIL",
  "wrong",
  "error",
] as const;

function findNegativeMarkers(text: string): string[] {
  return NEGATIVE_MARKERS.filter((m) => text.includes(m));
}

// === 세션 픽스처 헬퍼 ===
function session(
  uuidSeed: number,
  missionSeed: number,
  success: boolean,
  isoMinusMinutes: number,
): SessionResult {
  const pad = (n: number, w: number) => n.toString(16).padStart(w, "0");
  const sid = `${pad(uuidSeed, 8)}-${pad(uuidSeed, 4)}-4${pad(uuidSeed, 3)}-8${pad(uuidSeed, 3)}-${pad(uuidSeed, 12)}`;
  const mid = `${pad(missionSeed, 8)}-${pad(missionSeed, 4)}-4${pad(missionSeed, 3)}-8${pad(missionSeed, 3)}-${pad(missionSeed, 12)}`;
  return {
    sessionId: sid,
    missionId: mid,
    success,
    timestamp: new Date(Date.now() - isoMinusMinutes * 60_000).toISOString(),
  };
}

describe("TEST-007 / 시나리오 1 — 3연속 실패 → level_down (REQ-FUNC-021)", () => {
  it("analyzeStreaks + decideRecommendation 합산 → reason=level_down, difficulty=-1", () => {
    const sessions: SessionResult[] = [
      session(0x111, 0xaaa, false, 1),
      session(0x222, 0xaaa, false, 2),
      session(0x333, 0xaaa, false, 3),
      session(0x444, 0xaaa, true, 4),
    ];
    const streak = analyzeStreaks(sessions, 3, "ㅅ");
    const decision = decideRecommendation(streak, 3, "ㅅ");
    expect(streak.trailingFailures).toBe(3);
    expect(decision.reason).toBe("level_down");
    expect(decision.difficulty).toBe(2); // 3 - 1
    // suggestedNextPhoneme 는 phoneme_switch 에서만 채워짐.
    expect(decision.suggestedNextPhoneme).toBeUndefined();
  });

  it("4연속 실패에도 reason=level_down 유지 (한 번에 -2 분기 없음)", () => {
    const sessions: SessionResult[] = Array.from({ length: 4 }, (_, i) =>
      session(0x500 + i, 0xbbb, false, i + 1),
    );
    const streak = analyzeStreaks(sessions, 4, "ㅅ");
    const decision = decideRecommendation(streak, 3, "ㅅ");
    expect(decision.reason).toBe("level_down");
    expect(decision.difficulty).toBe(3); // 4 - 1
  });
});

describe("TEST-007 / 시나리오 2 — level_down 카피 은밀성 (REQ-FUNC-021)", () => {
  it("정확한 격려 카피 노출", () => {
    const out = pickRecommendedMission(
      { phoneme: "ㅅ", difficulty: 1, reason: "level_down" },
      dailyMissionFixtures,
    );
    expect(out).not.toBeNull();
    expect(out!.copy).toBe("조금 익숙한 발음부터 시작해볼까요?");
  });

  it("부정 어휘 0건 (실패/X/❌/다시/안돼/못 등)", () => {
    const out = pickRecommendedMission(
      { phoneme: "ㅅ", difficulty: 1, reason: "level_down" },
      dailyMissionFixtures,
    );
    const hits = findNegativeMarkers(out!.copy);
    expect(hits).toEqual([]);
  });
});

describe("TEST-007 / 시나리오 3 — 4종 reason 카피 정서 보호 (CON-04 + REQ-FUNC-021)", () => {
  const REASONS = ["continue", "level_down", "level_up", "phoneme_switch"] as const;

  it.each(REASONS)("reason=%s 카피에 부정 어휘 0건", (reason) => {
    const out = pickRecommendedMission(
      { phoneme: "ㅅ", difficulty: 1, reason },
      dailyMissionFixtures,
    );
    expect(out).not.toBeNull();
    const hits = findNegativeMarkers(out!.copy);
    expect(hits).toEqual([]);
  });

  it("4종 카피 전부 정의됨 + 길이 1자 이상", () => {
    for (const reason of REASONS) {
      const out = pickRecommendedMission(
        { phoneme: "ㅅ", difficulty: 1, reason },
        dailyMissionFixtures,
      );
      expect(out!.copy.length).toBeGreaterThan(0);
    }
  });
});

describe("TEST-007 / 시나리오 4 — 난이도 전환 latency ≤ 500ms (REQ-FUNC-022)", () => {
  it("decideRecommendation + pickRecommendedMission 합산 100회 — 평균/최대 < 500ms", () => {
    const baseSessions: SessionResult[] = [
      session(0x701, 0xccc, false, 1),
      session(0x702, 0xccc, false, 2),
      session(0x703, 0xccc, false, 3),
    ];
    const ITER = 100;
    const samples: number[] = [];
    for (let i = 0; i < ITER; i += 1) {
      const t0 = performance.now();
      const streak = analyzeStreaks(baseSessions, 3, "ㅅ");
      const decision = decideRecommendation(streak, 3, "ㅅ");
      const out = pickRecommendedMission(decision, dailyMissionFixtures);
      const t1 = performance.now();
      // 결과 사용 (dead-code elimination 방지).
      expect(out).not.toBeNull();
      samples.push(t1 - t0);
    }
    const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
    const max = Math.max(...samples);
    // REQ-FUNC-021 명세값 = 500ms. 본 단위 테스트는 ms 단위로 통과해야 (실제 < 10ms 예상).
    expect(avg).toBeLessThan(500);
    expect(max).toBeLessThan(500);
    // 보조 가드 — 평균이 의외로 100ms 넘으면 회귀 신호.
    expect(avg).toBeLessThan(100);
  });

  it("4종 reason 모두 latency < 500ms (분기별 회귀 가드)", () => {
    const REASONS = ["continue", "level_down", "level_up", "phoneme_switch"] as const;
    for (const reason of REASONS) {
      const t0 = performance.now();
      const out = pickRecommendedMission(
        { phoneme: "ㅅ", difficulty: 1, reason },
        dailyMissionFixtures,
      );
      const t1 = performance.now();
      expect(out).not.toBeNull();
      expect(t1 - t0).toBeLessThan(500);
    }
  });
});

describe("TEST-007 / 시나리오 5 — 5연속 성공 → level_up + 격려 카피 (REQ-FUNC-022)", () => {
  it("5연속 성공 → reason=level_up + 난이도 +1", () => {
    const sessions: SessionResult[] = Array.from({ length: 5 }, (_, i) =>
      session(0x800 + i, 0xddd, true, i + 1),
    );
    const streak = analyzeStreaks(sessions, 2, "ㅅ");
    const decision = decideRecommendation(streak, 2, "ㅅ");
    expect(streak.trailingSuccesses).toBe(5);
    expect(decision.reason).toBe("level_up");
    expect(decision.difficulty).toBe(3); // 2 + 1
  });

  it("level_up 카피 = '더 멋진 발음에 도전해볼까요?' + 부정 어휘 0건", () => {
    const out = pickRecommendedMission(
      { phoneme: "ㅅ", difficulty: 3, reason: "level_up" },
      dailyMissionFixtures,
    );
    expect(out!.copy).toBe("더 멋진 발음에 도전해볼까요?");
    expect(findNegativeMarkers(out!.copy)).toEqual([]);
  });

  it("난이도 5 도달 후 5연속 성공도 cap=5 (over-shoot 방지)", () => {
    const sessions: SessionResult[] = Array.from({ length: 5 }, (_, i) =>
      session(0x900 + i, 0xeee, true, i + 1),
    );
    // recentPhoneme 를 preferredPhoneme 와 다르게 설정 → phoneme_switch 분기 회피.
    const streak = analyzeStreaks(sessions, 5, "ㅈ");
    const decision = decideRecommendation(streak, 5, "ㅅ");
    expect(decision.reason).toBe("level_up");
    expect(decision.difficulty).toBe(5); // cap
  });
});

describe("TEST-007 / 시나리오 6 — 정적 스캔: fixtures + REASON_COPY 전 텍스트 부정 마커 0건", () => {
  it("dailyMissionFixtures 의 title + instructionText 에 부정 어휘 0건", () => {
    const violations: Array<{ id: string; field: string; hits: string[] }> = [];
    for (const m of dailyMissionFixtures) {
      const titleHits = findNegativeMarkers(m.title);
      if (titleHits.length > 0) violations.push({ id: m.id, field: "title", hits: titleHits });
      const instructionHits = findNegativeMarkers(m.instructionText);
      if (instructionHits.length > 0) {
        violations.push({ id: m.id, field: "instructionText", hits: instructionHits });
      }
    }
    expect(violations).toEqual([]);
  });

  it("4종 REASON_COPY 합산 텍스트에 부정 어휘 0건", () => {
    const REASONS = ["continue", "level_down", "level_up", "phoneme_switch"] as const;
    const allCopies: string[] = [];
    for (const reason of REASONS) {
      const out = pickRecommendedMission(
        { phoneme: "ㅅ", difficulty: 1, reason },
        dailyMissionFixtures,
      );
      allCopies.push(out!.copy);
    }
    const combined = allCopies.join(" | ");
    expect(findNegativeMarkers(combined)).toEqual([]);
  });

  it("fixtures 개수 ≥ 12 + 모든 fixture 가 phoneme + difficulty 보유 (스캔 누락 방지)", () => {
    expect(dailyMissionFixtures.length).toBeGreaterThanOrEqual(12);
    for (const m of dailyMissionFixtures) {
      expect(m.targetPhoneme).toBeTruthy();
      expect(m.difficultyLevel).toBeGreaterThan(0);
    }
  });
});

// literacy 레지스트리(허브 카탈로그) 단위 테스트 — 무결성 + 금칙어 + 플래그 필터.

import { describe, it, expect, afterEach } from "vitest";
import {
  LITERACY_GAMES,
  enabledLiteracyGames,
  enabledGamesForStage,
  enabledGamesForAge,
} from "@/lib/literacy/registry";
import { LITERACY_STAGES } from "@/lib/literacy/stages";

const BANNED = ["치료", "진단", "장애", "지연", "지체", "난독"];

// 라우트 디렉터리와 1:1 매칭되는 slug 집합.
const KNOWN_SLUGS = new Set([
  "vocabulary",
  "phonological-awareness",
  "nonword-repetition",
  "decoding",
  "phono-rules",
  "spelling",
  "read-rules",
  "ran",
  "reading-fluency",
  "reading-comprehension",
  "inference",
  "inference-reading",
  "morphology",
  "narrative",
]);

describe("literacy registry — 무결성", () => {
  it("14개 게임, slug 유일 + 알려진 라우트와 매칭, 모든 필드 채움", () => {
    expect(LITERACY_GAMES.length).toBe(14);
    expect(new Set(LITERACY_GAMES.map((g) => g.slug)).size).toBe(LITERACY_GAMES.length);
    for (const g of LITERACY_GAMES) {
      expect(KNOWN_SLUGS.has(g.slug), `미지의 slug ${g.slug}`).toBe(true);
      expect(g.title.length).toBeGreaterThan(0);
      expect(g.emoji.length).toBeGreaterThan(0);
      expect(g.blurb.length).toBeGreaterThan(0);
      expect(typeof g.isEnabled).toBe("function");
      // CR-2026-009: 모든 게임은 유효한 발달 단계로 태깅됨.
      expect(LITERACY_STAGES.map((s) => s.id)).toContain(g.stage);
    }
  });

  it("제목·소개에 의료 금칙어 0건", () => {
    const corpus = LITERACY_GAMES.flatMap((g) => [g.title, g.blurb]).join(" ");
    for (const w of BANNED) expect(corpus, `금칙어 "${w}"`).not.toContain(w);
  });
});

describe("enabledLiteracyGames — 플래그 필터", () => {
  const FLAGS = [
    "LITERACY_PA_ENABLED",
    "LITERACY_DECODING_ENABLED",
    "LITERACY_RAN_ENABLED",
    "LITERACY_FLUENCY_ENABLED",
    "LITERACY_INFERENCE_ENABLED",
    "LITERACY_VOCAB_ENABLED",
    "LITERACY_NWR_ENABLED",
    "LITERACY_NARRATIVE_ENABLED",
    "LITERACY_PHONO_RULES_ENABLED",
    "LITERACY_SPELLING_ENABLED",
    "LITERACY_READ_RULES_ENABLED",
    "LITERACY_COMPREHENSION_ENABLED",
    "LITERACY_INFERENCE_READING_ENABLED",
    "LITERACY_MORPHOLOGY_ENABLED",
  ];
  const saved: Record<string, string | undefined> = {};
  for (const f of FLAGS) saved[f] = process.env[f];

  afterEach(() => {
    for (const f of FLAGS) {
      if (saved[f] === undefined) delete process.env[f];
      else process.env[f] = saved[f];
    }
  });

  it("전부 off → 빈 목록", () => {
    for (const f of FLAGS) delete process.env[f];
    expect(enabledLiteracyGames()).toEqual([]);
  });

  it("일부 on → 해당 게임만, 레지스트리 순서 보존", () => {
    for (const f of FLAGS) delete process.env[f];
    process.env.LITERACY_VOCAB_ENABLED = "true";
    process.env.LITERACY_NARRATIVE_ENABLED = "true";
    const slugs = enabledLiteracyGames().map((g) => g.slug);
    expect(slugs).toEqual(["vocabulary", "narrative"]); // 레지스트리 순서대로
  });
});

describe("stage 라우팅 — enabledGamesForStage / enabledGamesForAge", () => {
  const FLAGS = [
    "LITERACY_PA_ENABLED",
    "LITERACY_DECODING_ENABLED",
    "LITERACY_RAN_ENABLED",
    "LITERACY_FLUENCY_ENABLED",
    "LITERACY_INFERENCE_ENABLED",
    "LITERACY_VOCAB_ENABLED",
    "LITERACY_NWR_ENABLED",
    "LITERACY_NARRATIVE_ENABLED",
    "LITERACY_PHONO_RULES_ENABLED",
    "LITERACY_SPELLING_ENABLED",
    "LITERACY_READ_RULES_ENABLED",
    "LITERACY_COMPREHENSION_ENABLED",
    "LITERACY_INFERENCE_READING_ENABLED",
    "LITERACY_MORPHOLOGY_ENABLED",
  ];
  const saved: Record<string, string | undefined> = {};
  for (const f of FLAGS) saved[f] = process.env[f];

  afterEach(() => {
    for (const f of FLAGS) {
      if (saved[f] === undefined) delete process.env[f];
      else process.env[f] = saved[f];
    }
  });

  it("플래그 off → 단계별 빈 목록", () => {
    for (const f of FLAGS) delete process.env[f];
    for (const s of LITERACY_STAGES) {
      expect(enabledGamesForStage(s.id)).toEqual([]);
    }
  });

  it("S0 게임 on → 해당 단계만 노출, 다른 단계는 비노출", () => {
    for (const f of FLAGS) delete process.env[f];
    process.env.LITERACY_VOCAB_ENABLED = "true"; // S0
    expect(enabledGamesForStage("S0").map((g) => g.slug)).toEqual(["vocabulary"]);
    expect(enabledGamesForStage("S1")).toEqual([]);
  });

  it("enabledGamesForAge 는 게임 실제 연령적격으로 라우팅(stage 태그 아님)", () => {
    for (const f of FLAGS) delete process.env[f];
    process.env.LITERACY_VOCAB_ENABLED = "true"; // gate 24~84
    process.env.LITERACY_INFERENCE_READING_ENABLED = "true"; // 학령기 gate 132~144
    // vocab 은 24~84 적격 — stage 태그(S0) 무관하게 72 에서도 노출.
    expect(enabledGamesForAge(36).map((g) => g.slug)).toEqual(["vocabulary"]);
    expect(enabledGamesForAge(72).map((g) => g.slug)).toEqual(["vocabulary"]);
    expect(enabledGamesForAge(90)).toEqual([]); // vocab 상한(84) 초과 + 학령기 게임 하한(132) 미만
    expect(enabledGamesForAge(138).map((g) => g.slug)).toEqual(["inference-reading"]);
  });

  it("도메인 밖 월령 → 빈 목록", () => {
    process.env.LITERACY_VOCAB_ENABLED = "true";
    expect(enabledGamesForAge(12)).toEqual([]); // 만 1세 (vocab 하한 24 미만)
    expect(enabledGamesForAge(200)).toEqual([]);
  });

  it("clin-1 불변식: 라우팅된 모든 게임은 해당 월령에 isAgeEligible (dead-end 0)", () => {
    for (const f of FLAGS) process.env[f] = "true"; // 전부 on
    for (let m = 24; m <= 144; m += 3) {
      for (const g of enabledGamesForAge(m)) {
        expect(g.isAgeEligible(m), `${g.slug} routed at ${m}m but not age-eligible`).toBe(true);
      }
    }
  });
});

// literacy 레지스트리(허브 카탈로그) 단위 테스트 — 무결성 + 금칙어 + 플래그 필터.

import { describe, it, expect, afterEach } from "vitest";
import { LITERACY_GAMES, enabledLiteracyGames } from "@/lib/literacy/registry";

const BANNED = ["치료", "진단", "장애", "지연", "지체", "난독"];

// 라우트 디렉터리와 1:1 매칭되는 slug 집합.
const KNOWN_SLUGS = new Set([
  "vocabulary",
  "phonological-awareness",
  "nonword-repetition",
  "decoding",
  "phono-rules",
  "ran",
  "reading-fluency",
  "inference",
  "narrative",
]);

describe("literacy registry — 무결성", () => {
  it("9개 게임, slug 유일 + 알려진 라우트와 매칭, 모든 필드 채움", () => {
    expect(LITERACY_GAMES.length).toBe(9);
    expect(new Set(LITERACY_GAMES.map((g) => g.slug)).size).toBe(LITERACY_GAMES.length);
    for (const g of LITERACY_GAMES) {
      expect(KNOWN_SLUGS.has(g.slug), `미지의 slug ${g.slug}`).toBe(true);
      expect(g.title.length).toBeGreaterThan(0);
      expect(g.emoji.length).toBeGreaterThan(0);
      expect(g.blurb.length).toBeGreaterThan(0);
      expect(typeof g.isEnabled).toBe("function");
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

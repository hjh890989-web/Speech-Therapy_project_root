// 문해력 시작 헬퍼 — 월령 유무에 따른 단계별/전체 활성 놀이 선택 (CR-2026-009).
import { describe, it, expect, afterEach } from "vitest";
import { enabledGamesForAgeOrAll } from "@/lib/literacy/start";

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

describe("enabledGamesForAgeOrAll", () => {
  it("월령 null(익명) → 전체 활성 놀이", () => {
    for (const f of FLAGS) delete process.env[f];
    process.env.LITERACY_VOCAB_ENABLED = "true"; // S0
    process.env.LITERACY_INFERENCE_ENABLED = "true"; // S4
    const slugs = enabledGamesForAgeOrAll(null).map((g) => g.slug);
    expect(slugs).toEqual(["vocabulary", "inference"]); // 레지스트리 순서
  });

  it("월령 알면 그 단계 놀이만", () => {
    for (const f of FLAGS) delete process.env[f];
    process.env.LITERACY_VOCAB_ENABLED = "true"; // S0
    process.env.LITERACY_INFERENCE_ENABLED = "true"; // S4
    expect(enabledGamesForAgeOrAll(36).map((g) => g.slug)).toEqual(["vocabulary"]); // 만3 → S0
    expect(enabledGamesForAgeOrAll(138).map((g) => g.slug)).toEqual(["inference"]); // 만11.5 → S4
  });

  it("월령 알지만 도메인 밖 → 빈 목록(전체 fallback 아님)", () => {
    for (const f of FLAGS) delete process.env[f];
    process.env.LITERACY_VOCAB_ENABLED = "true";
    expect(enabledGamesForAgeOrAll(12)).toEqual([]);
    expect(enabledGamesForAgeOrAll(200)).toEqual([]);
  });

  it("전부 off → 빈 목록", () => {
    for (const f of FLAGS) delete process.env[f];
    expect(enabledGamesForAgeOrAll(null)).toEqual([]);
    expect(enabledGamesForAgeOrAll(36)).toEqual([]);
  });
});

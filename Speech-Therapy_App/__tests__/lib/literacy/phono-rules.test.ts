// 소리 변신 놀이(phono-rules) 단위 테스트 — 콘텐츠 무결성 + 원본성/금칙어 + 세션/보기 + 연령/플래그.
// 연습 활동(채점 없음) — 세션·보기 구성 순수 함수의 결정성만 검증.

import { describe, it, expect, afterEach } from "vitest";
import {
  PHONO_RULE_ITEMS,
  PHONO_RULES,
  PHONO_RULE_LABEL,
  phonoItemsByRule,
} from "@/lib/literacy/phono-rules-content";
import {
  isPhonoRulesEnabled,
  isPhonoRulesAgeEligible,
  buildPhonoRulesSession,
  buildPhonoChoices,
} from "@/lib/literacy/phono-rules";
import {
  CLINICAL_PLAY_AGE_MIN_MONTHS,
  CLINICAL_PLAY_AGE_MAX_MONTHS,
} from "@/lib/literacy/vocabulary";

const BANNED = [
  "NISE", "기초학습", "학습장애", "난독", "B·ACT", "BACT",
  "치료", "진단", "장애", "지연", "지체",
];

describe("MOCK-LIT-PHONO — 소리 변신 콘텐츠 무결성", () => {
  it("아이템 ≥8, id 유일, written≠spoken(변동 존재), literal=written", () => {
    expect(PHONO_RULE_ITEMS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(PHONO_RULE_ITEMS.map((i) => i.id)).size).toBe(PHONO_RULE_ITEMS.length);
    for (const i of PHONO_RULE_ITEMS) {
      expect(PHONO_RULES).toContain(i.rule);
      expect(i.spoken).not.toBe(i.written); // 실제 소리는 글자와 다름(음운변동)
      expect(i.literal).toBe(i.written); // 글자 그대로 읽은 보기
    }
  });

  it("모든 규칙에 라벨 + 아이템 ≥2 보유", () => {
    for (const r of PHONO_RULES) {
      expect(PHONO_RULE_LABEL[r].length).toBeGreaterThan(0);
      expect(phonoItemsByRule(r).length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("원본성·금칙어 lint (콘텐츠)", () => {
  it("낱말·발음·규칙 라벨에 표준화 검사/난독 + 의료 금칙어 0건", () => {
    const corpus = [
      ...PHONO_RULE_ITEMS.flatMap((i) => [i.written, i.spoken, i.literal]),
      ...Object.values(PHONO_RULE_LABEL),
    ].join(" ");
    for (const w of BANNED) expect(corpus, `금칙어 "${w}"`).not.toContain(w);
  });
});

describe("세션·보기 구성 (결정적 순수 함수, 채점 없음)", () => {
  it("buildPhonoRulesSession — 결정적 + 규칙별 perRule 개수", () => {
    expect(buildPhonoRulesSession()).toEqual(buildPhonoRulesSession());
    const s = buildPhonoRulesSession(2);
    expect(s.length).toBe(PHONO_RULES.length * 2);
    for (const r of PHONO_RULES) {
      expect(s.filter((i) => i.rule === r).length).toBe(2);
    }
  });

  it("buildPhonoChoices — 정답(natural)+보기 2개, index 짝/홀로 위치 교차", () => {
    const item = PHONO_RULE_ITEMS[0];
    const even = buildPhonoChoices(item, 0);
    const odd = buildPhonoChoices(item, 1);
    // 두 보기 모두 자연스러운 소리/글자 그대로를 정확히 1개씩 포함
    expect(even.filter((c) => c.natural).length).toBe(1);
    expect(even.map((c) => c.text).sort()).toEqual([item.literal, item.spoken].sort());
    // 정답 위치가 index 짝/홀로 교차(항상 같은 자리 아님)
    expect(even[0].natural).toBe(true);
    expect(odd[0].natural).toBe(false);
  });
});

describe("연령 게이트 / 플래그", () => {
  it("연령 — 만 2~7세(24~84) 적격, 경계 밖 부적격", () => {
    expect(isPhonoRulesAgeEligible(CLINICAL_PLAY_AGE_MIN_MONTHS)).toBe(true);
    expect(isPhonoRulesAgeEligible(CLINICAL_PLAY_AGE_MAX_MONTHS)).toBe(true);
    expect(isPhonoRulesAgeEligible(CLINICAL_PLAY_AGE_MIN_MONTHS - 1)).toBe(false);
    expect(isPhonoRulesAgeEligible(CLINICAL_PLAY_AGE_MAX_MONTHS + 1)).toBe(false);
    expect(isPhonoRulesAgeEligible(Number.NaN)).toBe(false);
  });

  const original = process.env.LITERACY_PHONO_RULES_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.LITERACY_PHONO_RULES_ENABLED;
    else process.env.LITERACY_PHONO_RULES_ENABLED = original;
  });

  it("플래그 — 미설정 off, 'true' on", () => {
    delete process.env.LITERACY_PHONO_RULES_ENABLED;
    expect(isPhonoRulesEnabled()).toBe(false);
    process.env.LITERACY_PHONO_RULES_ENABLED = "true";
    expect(isPhonoRulesEnabled()).toBe(true);
  });
});

// 이야기 놀이(narrative) 단위 테스트 — 콘텐츠 무결성 + 원본성/금칙어 + 다시말하기/순서 + 연령/플래그.
// 연습 활동(채점 없음) — 7요소 거시구조 정본성 + 순수 함수 결정성만 검증.

import { describe, it, expect, afterEach } from "vitest";
import {
  NARRATIVE_STORIES,
  STORY_ELEMENTS,
  STORY_ELEMENT_LABEL,
  pickNarrativeStory,
} from "@/lib/literacy/narrative-content";
import {
  isNarrativeEnabled,
  isNarrativeAgeEligible,
  buildRetellSteps,
  presentedScenes,
} from "@/lib/literacy/narrative";
import {
  CLINICAL_PLAY_AGE_MIN_MONTHS,
  CLINICAL_PLAY_AGE_MAX_MONTHS,
} from "@/lib/literacy/vocabulary";

const BANNED = [
  "NISE", "기초학습", "학습장애", "난독", "B·ACT", "BACT",
  "치료", "진단", "장애", "지연", "지체",
];

describe("MOCK-LIT-NARR — 이야기 콘텐츠 무결성", () => {
  it("7요소 위계 = 배경→계기→내적반응→계획→시도→결과→반응", () => {
    expect(STORY_ELEMENTS).toEqual([
      "setting",
      "initiating",
      "internalResponse",
      "internalPlan",
      "attempt",
      "consequence",
      "reaction",
    ]);
  });

  it("이야기 ≥3, id 유일, 각 7장면이 7요소를 정본 순서로 모두 포함", () => {
    expect(NARRATIVE_STORIES.length).toBeGreaterThanOrEqual(3);
    expect(new Set(NARRATIVE_STORIES.map((s) => s.id)).size).toBe(NARRATIVE_STORIES.length);
    for (const story of NARRATIVE_STORIES) {
      expect(story.title.length).toBeGreaterThan(0);
      expect(story.scenes.map((sc) => sc.element)).toEqual([...STORY_ELEMENTS]);
      for (const sc of story.scenes) {
        expect(sc.caption.length).toBeGreaterThan(0);
        expect(sc.emoji.length).toBeGreaterThan(0);
      }
    }
  });

  it("pickNarrativeStory 결정적 + 범위 clamp", () => {
    expect(pickNarrativeStory(0)).toBe(NARRATIVE_STORIES[0]);
    expect(pickNarrativeStory(999)).toBe(NARRATIVE_STORIES[NARRATIVE_STORIES.length - 1]);
    expect(pickNarrativeStory(-5)).toBe(NARRATIVE_STORIES[0]);
  });
});

describe("원본성·금칙어 lint (콘텐츠)", () => {
  it("제목·장면·요소 라벨에 표준화 검사/난독 + 의료 금칙어 0건", () => {
    const corpus = [
      ...NARRATIVE_STORIES.flatMap((s) => [s.title, ...s.scenes.map((sc) => sc.caption)]),
      ...Object.values(STORY_ELEMENT_LABEL),
    ].join(" ");
    for (const w of BANNED) expect(corpus, `금칙어 "${w}"`).not.toContain(w);
  });
});

describe("다시말하기 / 순서 (결정적 순수 함수, 채점 없음)", () => {
  it("buildRetellSteps — 7요소 정본 순서 + 라벨/단서 채움", () => {
    const story = NARRATIVE_STORIES[0];
    const steps = buildRetellSteps(story);
    expect(steps.map((s) => s.element)).toEqual([...STORY_ELEMENTS]);
    for (const s of steps) {
      expect(s.label).toBe(STORY_ELEMENT_LABEL[s.element]);
      expect(s.caption.length).toBeGreaterThan(0);
    }
  });

  it("presentedScenes — 정본의 순열(permutation)이며 정본과 다른 순서", () => {
    const story = NARRATIVE_STORIES[0];
    const presented = presentedScenes(story);
    expect(presented.length).toBe(story.scenes.length);
    // 같은 장면 집합(순열)
    expect(new Set(presented.map((s) => s.element))).toEqual(
      new Set(story.scenes.map((s) => s.element)),
    );
    // 순서는 정본과 다름(순서 잇기 놀이 성립)
    expect(presented.map((s) => s.element)).not.toEqual(story.scenes.map((s) => s.element));
    // 결정적
    expect(presentedScenes(story)).toEqual(presented);
  });
});

describe("연령 게이트 / 플래그", () => {
  it("연령 — 만 2~7세(24~84) 적격, 경계 밖 부적격", () => {
    expect(isNarrativeAgeEligible(CLINICAL_PLAY_AGE_MIN_MONTHS)).toBe(true);
    expect(isNarrativeAgeEligible(CLINICAL_PLAY_AGE_MAX_MONTHS)).toBe(true);
    expect(isNarrativeAgeEligible(CLINICAL_PLAY_AGE_MIN_MONTHS - 1)).toBe(false);
    expect(isNarrativeAgeEligible(CLINICAL_PLAY_AGE_MAX_MONTHS + 1)).toBe(false);
    expect(isNarrativeAgeEligible(Number.NaN)).toBe(false);
  });

  const original = process.env.LITERACY_NARRATIVE_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.LITERACY_NARRATIVE_ENABLED;
    else process.env.LITERACY_NARRATIVE_ENABLED = original;
  });

  it("플래그 — 미설정 off, 'true' on", () => {
    delete process.env.LITERACY_NARRATIVE_ENABLED;
    expect(isNarrativeEnabled()).toBe(false);
    process.env.LITERACY_NARRATIVE_ENABLED = "true";
    expect(isNarrativeEnabled()).toBe(true);
  });
});

// 다중 단어/위치 조음 프로브 단위 테스트 — 단어셋 무결성 + 위치별 집계 + 연령/플래그 + 금칙어.
// **additive 독립 프로브** — 집계는 결정적 순수 함수, 판정/규준 없음.

import { describe, it, expect, afterEach } from "vitest";
import {
  ARTICULATION_PROBE_WORDS,
  PROBE_PHONEMES,
  PROBE_POSITION_LABEL,
  getProbeWords,
} from "@/lib/diagnose/articulation-probe-content";
import {
  isArticulationProbeEnabled,
  isArticulationProbeAgeEligible,
  aggregateArticulationProbe,
  ARTICULATION_PROBE_AGE_MIN_MONTHS,
  ARTICULATION_PROBE_AGE_MAX_MONTHS,
  type ProbeWordResult,
} from "@/lib/diagnose/articulation-probe";

const BANNED = ["치료", "진단", "장애", "지연", "지체"];

describe("조음 프로브 콘텐츠 — 위치 태깅 단어셋", () => {
  it("앱 진단 음소 5종(ㄱ/ㄴ/ㅅ/ㅈ/ㄹ) 모두 존재", () => {
    expect([...PROBE_PHONEMES]).toEqual(["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"]);
    for (const p of PROBE_PHONEMES) {
      expect(ARTICULATION_PROBE_WORDS[p]).toBeTruthy();
    }
  });

  it("각 음소: 단어 ≥3 + 어두(initial)·어중(medial) 위치 둘 다 포함", () => {
    for (const p of PROBE_PHONEMES) {
      const words = getProbeWords(p);
      expect(words.length).toBeGreaterThanOrEqual(3);
      expect(words.some((w) => w.position === "initial")).toBe(true);
      expect(words.some((w) => w.position === "medial")).toBe(true);
      for (const w of words) expect(w.word.length).toBeGreaterThan(0);
    }
  });

  it("getProbeWords — 미지원 음소 → 빈 배열", () => {
    expect(getProbeWords("ㅎ")).toEqual([]);
  });

  it("단어·위치 라벨에 의료 금칙어 0건", () => {
    const corpus = [
      ...PROBE_PHONEMES.flatMap((p) => getProbeWords(p).map((w) => w.word)),
      ...Object.values(PROBE_POSITION_LABEL),
    ].join(" ");
    for (const w of BANNED) expect(corpus, `금칙어 "${w}"`).not.toContain(w);
  });
});

describe("aggregateArticulationProbe — 전체/위치별 평균(결정적, 판정 없음)", () => {
  const results: ProbeWordResult[] = [
    { word: "사과", position: "initial", score: 80 },
    { word: "사자", position: "initial", score: 90 },
    { word: "가수", position: "medial", score: 60 },
    { word: "약속", position: "medial", score: 50 },
  ];

  it("전체 평균 + 위치별 평균", () => {
    const agg = aggregateArticulationProbe(results);
    expect(agg.count).toBe(4);
    expect(agg.overallMean).toBe(70); // (80+90+60+50)/4
    expect(agg.byPosition.initial).toBe(85); // (80+90)/2
    expect(agg.byPosition.medial).toBe(55); // (60+50)/2
  });

  it("결정적 — 동일 입력 동일 출력", () => {
    expect(aggregateArticulationProbe(results)).toEqual(aggregateArticulationProbe(results));
  });

  it("빈 입력 → count 0, 평균 null", () => {
    expect(aggregateArticulationProbe([])).toEqual({
      count: 0,
      overallMean: null,
      byPosition: { initial: null, medial: null },
    });
  });

  it("한 위치만 측정 → 다른 위치 null", () => {
    const onlyInitial = aggregateArticulationProbe([
      { word: "가방", position: "initial", score: 100 },
    ]);
    expect(onlyInitial.byPosition.initial).toBe(100);
    expect(onlyInitial.byPosition.medial).toBeNull();
  });

  it("비정상 점수(NaN)는 집계에서 제외", () => {
    const agg = aggregateArticulationProbe([
      { word: "사과", position: "initial", score: 80 },
      { word: "사자", position: "initial", score: Number.NaN },
    ]);
    expect(agg.count).toBe(1);
    expect(agg.byPosition.initial).toBe(80);
  });
});

describe("연령 게이트 / 플래그", () => {
  it("연령 — 만 2~7세(24~84) 적격, 경계 밖 부적격", () => {
    expect(isArticulationProbeAgeEligible(ARTICULATION_PROBE_AGE_MIN_MONTHS)).toBe(true);
    expect(isArticulationProbeAgeEligible(ARTICULATION_PROBE_AGE_MAX_MONTHS)).toBe(true);
    expect(isArticulationProbeAgeEligible(ARTICULATION_PROBE_AGE_MIN_MONTHS - 1)).toBe(false);
    expect(isArticulationProbeAgeEligible(ARTICULATION_PROBE_AGE_MAX_MONTHS + 1)).toBe(false);
    expect(isArticulationProbeAgeEligible(Number.NaN)).toBe(false);
  });

  const original = process.env.ARTICULATION_PROBE_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.ARTICULATION_PROBE_ENABLED;
    else process.env.ARTICULATION_PROBE_ENABLED = original;
  });

  it("플래그 — 미설정 off, 'true' on", () => {
    delete process.env.ARTICULATION_PROBE_ENABLED;
    expect(isArticulationProbeEnabled()).toBe(false);
    process.env.ARTICULATION_PROBE_ENABLED = "true";
    expect(isArticulationProbeEnabled()).toBe(true);
  });
});

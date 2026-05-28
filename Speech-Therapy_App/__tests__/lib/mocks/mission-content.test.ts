// FR-Q-003-CONTENT — 미션 콘텐츠 데이터 무결성 테스트.
//
// 검증:
//   - 5 자모 × 3 난이도 = 15 sets 모두 존재 (FR-Q-003-CONTENT-V2: 난이도 1 추가)
//   - 각 set 의 단어/문장 4~5개
//   - blank 마스킹 표기 (`_`) 포함 (난이도 2)
//   - reading 음절 분리 표기 (`·`) 포함 (난이도 1, 3)
//   - CON-04 금칙어 (치료/진단/장애) 0건

import { describe, it, expect } from "vitest";
import {
  missionContentByPhonemeLevel,
  getMissionContent,
  type MissionContentSet,
} from "@/lib/mocks/mission-content";

const SUPPORTED_PHONEMES = ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"] as const;
const SUPPORTED_LEVELS = [1, 2, 3] as const;
const FORBIDDEN_WORDS = ["치료", "진단", "장애", "환자", "병원", "증상"];

function collectText(set: MissionContentSet): string {
  if (set.difficultyLevel === 1) {
    return set.words.map((w) => `${w.text} ${w.reading}`).join(" ");
  }
  if (set.difficultyLevel === 2) {
    return set.words
      .map((w) => `${w.full} ${w.blank} ${w.hint}`)
      .join(" ");
  }
  return set.sentences
    .map((s) => `${s.template} ${s.focusWord} ${s.reading}`)
    .join(" ");
}

describe("mission-content: 데이터 무결성", () => {
  it("5 자모 × 3 난이도 = 15 sets 존재", () => {
    expect(missionContentByPhonemeLevel.size).toBe(15);
    for (const phoneme of SUPPORTED_PHONEMES) {
      for (const level of SUPPORTED_LEVELS) {
        const key = `${phoneme}-${level}`;
        expect(
          missionContentByPhonemeLevel.has(key),
          `${key} 누락`,
        ).toBe(true);
      }
    }
  });

  it("각 난이도 1 set: 단어 4~5개 + reading 음절 분리(·) 포함 + text 비어있지 않음", () => {
    for (const phoneme of SUPPORTED_PHONEMES) {
      const set = getMissionContent(phoneme, 1);
      expect(set).toBeDefined();
      if (!set || set.difficultyLevel !== 1) throw new Error("type guard");
      expect(set.words.length).toBeGreaterThanOrEqual(4);
      expect(set.words.length).toBeLessThanOrEqual(5);
      for (const w of set.words) {
        expect(w.text.length).toBeGreaterThan(0);
        expect(w.reading.length).toBeGreaterThan(0);
        expect(w.reading).toMatch(/·/);
      }
    }
  });

  it("각 난이도 2 set: 단어 4~5개 + blank 마스킹(_) 포함 + full/hint 비어있지 않음", () => {
    for (const phoneme of SUPPORTED_PHONEMES) {
      const set = getMissionContent(phoneme, 2);
      expect(set).toBeDefined();
      if (!set || set.difficultyLevel !== 2) throw new Error("type guard");
      expect(set.words.length).toBeGreaterThanOrEqual(4);
      expect(set.words.length).toBeLessThanOrEqual(5);
      for (const w of set.words) {
        expect(w.full.length).toBeGreaterThan(0);
        expect(w.blank).toMatch(/_/);
        expect(w.hint.length).toBeGreaterThan(0);
      }
    }
  });

  it("각 난이도 3 set: 문장 4~5개 + reading 음절 분리(·) 포함 + focusWord 가 template 안에 존재", () => {
    for (const phoneme of SUPPORTED_PHONEMES) {
      const set = getMissionContent(phoneme, 3);
      expect(set).toBeDefined();
      if (!set || set.difficultyLevel !== 3) throw new Error("type guard");
      expect(set.sentences.length).toBeGreaterThanOrEqual(4);
      expect(set.sentences.length).toBeLessThanOrEqual(5);
      for (const s of set.sentences) {
        expect(s.template.length).toBeGreaterThan(0);
        expect(s.focusWord.length).toBeGreaterThan(0);
        expect(s.template.includes(s.focusWord)).toBe(true);
        expect(s.reading).toMatch(/·/);
      }
    }
  });

  it("CON-04 금칙어 0건 (모든 자모 × 난이도)", () => {
    for (const set of missionContentByPhonemeLevel.values()) {
      const text = collectText(set);
      for (const w of FORBIDDEN_WORDS) {
        expect(text, `forbidden "${w}" in ${set.phoneme}-${set.difficultyLevel}`).not.toContain(w);
      }
    }
  });

  it("getMissionContent: 미지원 조합은 undefined", () => {
    expect(getMissionContent("ㅎ", 2)).toBeUndefined();
    expect(getMissionContent("ㅅ", 0)).toBeUndefined();
    expect(getMissionContent("ㅅ", 99)).toBeUndefined();
  });

  it("getMissionContent: 지원 조합은 매칭 phoneme/level 반환", () => {
    const set = getMissionContent("ㅅ", 2);
    expect(set?.phoneme).toBe("ㅅ");
    expect(set?.difficultyLevel).toBe(2);
  });

  it("getMissionContent: 난이도 1 매칭 (FR-Q-003-CONTENT-V2)", () => {
    const set = getMissionContent("ㅅ", 1);
    expect(set?.phoneme).toBe("ㅅ");
    expect(set?.difficultyLevel).toBe(1);
    if (set?.difficultyLevel === 1) {
      expect(set.words.length).toBeGreaterThan(0);
      expect(set.words[0].text.length).toBeGreaterThan(0);
    }
  });
});

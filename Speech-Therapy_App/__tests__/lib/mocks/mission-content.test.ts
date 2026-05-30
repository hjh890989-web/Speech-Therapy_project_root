// REQ-FUNC-CL-05 — 미션 콘텐츠 데이터 무결성 테스트 (6단계 임상 위계).
//
// 위계 (CL-05-0 확정): 1 단독음소 → 2 음절 → 3 단어 → 4 구 → 5 문장 → 6 대화.
// 검증:
//   - 5 자모 × 6 단계 = 30 sets 모두 존재
//   - 각 단계 타입별 구조 + 개수 + reading(·) / focusWord 포함 규칙
//   - 빈칸(MissionWordFill) = L3 단어 변형으로 보존 (getWordFillVariant)
//   - CON-04 금칙어 (치료/진단/장애 등) 0건

import { describe, it, expect } from "vitest";
import {
  missionContentByPhonemeLevel,
  getMissionContent,
  getWordFillVariant,
  type MissionContentSet,
} from "@/lib/mocks/mission-content";
import { dailyMissionFixtures } from "@/lib/mocks/missions";

const SUPPORTED_PHONEMES = ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"] as const;
const SUPPORTED_LEVELS = [1, 2, 3, 4, 5, 6] as const;
const FORBIDDEN_WORDS = ["치료", "진단", "장애", "환자", "병원", "증상"];

function collectText(set: MissionContentSet): string {
  switch (set.difficultyLevel) {
    case 1:
      return `${set.isolation.phoneme} ${set.isolation.mouthHint}`;
    case 2:
      return set.syllables.map((s) => s.text).join(" ");
    case 3:
      return set.words.map((w) => `${w.text} ${w.reading}`).join(" ");
    case 4:
      return set.phrases.map((p) => `${p.phrase} ${p.focusWord} ${p.reading}`).join(" ");
    case 5:
      return set.sentences.map((s) => `${s.template} ${s.focusWord} ${s.reading}`).join(" ");
    case 6:
      return set.conversations
        .map((c) => `${c.prompt} ${c.focusWord} ${c.turnHint}`)
        .join(" ");
  }
}

describe("mission-content: 6단계 데이터 무결성 (REQ-FUNC-CL-05)", () => {
  it("5 자모 × 6 단계 = 30 sets 존재", () => {
    expect(missionContentByPhonemeLevel.size).toBe(30);
    for (const phoneme of SUPPORTED_PHONEMES) {
      for (const level of SUPPORTED_LEVELS) {
        const key = `${phoneme}-${level}`;
        expect(missionContentByPhonemeLevel.has(key), `${key} 누락`).toBe(true);
      }
    }
  });

  it("L1 단독 음소: phoneme + mouthHint 비어있지 않음", () => {
    for (const phoneme of SUPPORTED_PHONEMES) {
      const set = getMissionContent(phoneme, 1);
      if (!set || set.difficultyLevel !== 1) throw new Error("type guard");
      expect(set.isolation.phoneme.length).toBeGreaterThan(0);
      expect(set.isolation.mouthHint.length).toBeGreaterThan(0);
    }
  });

  it("L2 음절: 음절 4~5개 + 각 text 비어있지 않음", () => {
    for (const phoneme of SUPPORTED_PHONEMES) {
      const set = getMissionContent(phoneme, 2);
      if (!set || set.difficultyLevel !== 2) throw new Error("type guard");
      expect(set.syllables.length).toBeGreaterThanOrEqual(4);
      expect(set.syllables.length).toBeLessThanOrEqual(5);
      for (const s of set.syllables) expect(s.text.length).toBeGreaterThan(0);
    }
  });

  it("L3 단어: 단어 4~5개 + reading 음절 분리(·) 포함", () => {
    for (const phoneme of SUPPORTED_PHONEMES) {
      const set = getMissionContent(phoneme, 3);
      if (!set || set.difficultyLevel !== 3) throw new Error("type guard");
      expect(set.words.length).toBeGreaterThanOrEqual(4);
      expect(set.words.length).toBeLessThanOrEqual(5);
      for (const w of set.words) {
        expect(w.text.length).toBeGreaterThan(0);
        expect(w.reading).toMatch(/·/);
      }
    }
  });

  it("L4 구: 구 3~5개 + focusWord 가 phrase 안에 존재 + reading(·) 포함", () => {
    for (const phoneme of SUPPORTED_PHONEMES) {
      const set = getMissionContent(phoneme, 4);
      if (!set || set.difficultyLevel !== 4) throw new Error("type guard");
      expect(set.phrases.length).toBeGreaterThanOrEqual(3);
      expect(set.phrases.length).toBeLessThanOrEqual(5);
      for (const p of set.phrases) {
        expect(p.phrase.length).toBeGreaterThan(0);
        expect(p.phrase.includes(p.focusWord)).toBe(true);
        expect(p.reading).toMatch(/·/);
      }
    }
  });

  it("L5 문장: 문장 4~5개 + focusWord 가 template 안에 존재 + reading(·) 포함", () => {
    for (const phoneme of SUPPORTED_PHONEMES) {
      const set = getMissionContent(phoneme, 5);
      if (!set || set.difficultyLevel !== 5) throw new Error("type guard");
      expect(set.sentences.length).toBeGreaterThanOrEqual(4);
      expect(set.sentences.length).toBeLessThanOrEqual(5);
      for (const s of set.sentences) {
        expect(s.template.length).toBeGreaterThan(0);
        expect(s.template.includes(s.focusWord)).toBe(true);
        expect(s.reading).toMatch(/·/);
      }
    }
  });

  it("L6 대화: 대화 2~4개 + prompt/focusWord/turnHint 비어있지 않음", () => {
    for (const phoneme of SUPPORTED_PHONEMES) {
      const set = getMissionContent(phoneme, 6);
      if (!set || set.difficultyLevel !== 6) throw new Error("type guard");
      expect(set.conversations.length).toBeGreaterThanOrEqual(2);
      expect(set.conversations.length).toBeLessThanOrEqual(4);
      for (const c of set.conversations) {
        expect(c.prompt.length).toBeGreaterThan(0);
        expect(c.focusWord.length).toBeGreaterThan(0);
        expect(c.turnHint.length).toBeGreaterThan(0);
      }
    }
  });

  it("빈칸 변형 보존 (getWordFillVariant): 단어 4~5개 + blank 마스킹(_) + hint", () => {
    for (const phoneme of SUPPORTED_PHONEMES) {
      const words = getWordFillVariant(phoneme);
      expect(words, `${phoneme} 빈칸 변형 누락`).toBeDefined();
      if (!words) throw new Error("type guard");
      expect(words.length).toBeGreaterThanOrEqual(4);
      expect(words.length).toBeLessThanOrEqual(5);
      for (const w of words) {
        expect(w.full.length).toBeGreaterThan(0);
        expect(w.blank).toMatch(/_/);
        expect(w.hint.length).toBeGreaterThan(0);
      }
    }
    expect(getWordFillVariant("ㅎ")).toBeUndefined();
  });

  it("CON-04 금칙어 0건 (모든 자모 × 단계 + 빈칸 변형)", () => {
    for (const set of missionContentByPhonemeLevel.values()) {
      const text = collectText(set);
      for (const w of FORBIDDEN_WORDS) {
        expect(text, `forbidden "${w}" in ${set.phoneme}-${set.difficultyLevel}`).not.toContain(w);
      }
    }
    for (const phoneme of SUPPORTED_PHONEMES) {
      const words = getWordFillVariant(phoneme) ?? [];
      const text = words.map((w) => `${w.full} ${w.blank} ${w.hint}`).join(" ");
      for (const w of FORBIDDEN_WORDS) {
        expect(text, `forbidden "${w}" in 빈칸 ${phoneme}`).not.toContain(w);
      }
    }
  });

  it("getMissionContent: 미지원 조합은 undefined", () => {
    expect(getMissionContent("ㅎ", 2)).toBeUndefined();
    expect(getMissionContent("ㅅ", 0)).toBeUndefined();
    expect(getMissionContent("ㅅ", 7)).toBeUndefined();
  });

  it("getMissionContent: 지원 조합은 매칭 phoneme/level 반환", () => {
    const set = getMissionContent("ㅅ", 4);
    expect(set?.phoneme).toBe("ㅅ");
    expect(set?.difficultyLevel).toBe(4);
  });

  // 불변성 (감사 w07imwxde) — 모든 fixture 카드가 콘텐츠 보유 → /play 빈 렌더 방지.
  it("모든 dailyMissionFixtures 카드가 콘텐츠 보유 (fixtures↔content 정합)", () => {
    expect(dailyMissionFixtures).toHaveLength(30);
    for (const card of dailyMissionFixtures) {
      const content = getMissionContent(card.targetPhoneme, card.difficultyLevel);
      expect(content, `${card.id} (${card.targetPhoneme}-${card.difficultyLevel}) 콘텐츠 누락`).toBeDefined();
    }
  });
});

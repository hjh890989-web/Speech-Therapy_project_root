// Sprint 2 §2 — 한국어 발음 유사도 측정 단위 테스트.

import { describe, it, expect } from "vitest";

import {
  computePhoneticSimilarity,
  decomposeHangul,
  decomposeSyllables,
  analyzePhoneticDiff,
} from "@/lib/phonetic-similarity";

describe("decomposeSyllables (CL-04 슬롯 보존)", () => {
  it("초/중/종 슬롯 보존 — 종성 'ㅇ' vs null onset 'ㅇ' 구분", () => {
    expect(decomposeSyllables("강")).toEqual([
      { cho: "ㄱ", jung: "ㅏ", jong: "ㅇ", raw: "강", isHangul: true },
    ]);
    // '아' = null onset 'ㅇ'(초성) + 받침 없음('').
    expect(decomposeSyllables("아")).toEqual([
      { cho: "ㅇ", jung: "ㅏ", jong: "", raw: "아", isHangul: true },
    ]);
  });

  it("받침 없는 음절은 jong='' (idx0 보존)", () => {
    expect(decomposeSyllables("가")).toEqual([
      { cho: "ㄱ", jung: "ㅏ", jong: "", raw: "가", isHangul: true },
    ]);
  });

  it("다음절 단어 — 음절 단위 배열", () => {
    expect(decomposeSyllables("호랑이")).toEqual([
      { cho: "ㅎ", jung: "ㅗ", jong: "", raw: "호", isHangul: true },
      { cho: "ㄹ", jung: "ㅏ", jong: "ㅇ", raw: "랑", isHangul: true },
      { cho: "ㅇ", jung: "ㅣ", jong: "", raw: "이", isHangul: true },
    ]);
  });

  it("비한글은 raw 만(isHangul=false), 공백/구두점 제외", () => {
    expect(decomposeSyllables("a")).toEqual([
      { cho: "", jung: "", jong: "", raw: "a", isHangul: false },
    ]);
    expect(decomposeSyllables("가 나").every((s) => s.isHangul)).toBe(true);
    expect(decomposeSyllables("가 나")).toHaveLength(2); // 공백 제외
  });
});

describe("decomposeHangul", () => {
  it("기본 음절 분해 (초성+중성)", () => {
    expect(decomposeHangul("가")).toEqual(["ㄱ", "ㅏ"]);
    expect(decomposeHangul("사")).toEqual(["ㅅ", "ㅏ"]);
  });

  it("초성+중성+종성 분해", () => {
    expect(decomposeHangul("강")).toEqual(["ㄱ", "ㅏ", "ㅇ"]);
    expect(decomposeHangul("닭")).toEqual(["ㄷ", "ㅏ", "ㄺ"]);
  });

  it("여러 음절 단어 분해 (ㅘ 는 단일 중성 자모)", () => {
    // "과" = ㄱ + ㅘ (ㅘ 는 JUNG_LIST 의 단일 자모, ㅗ+ㅏ 합자가 아님).
    expect(decomposeHangul("사과")).toEqual(["ㅅ", "ㅏ", "ㄱ", "ㅘ"]);
    expect(decomposeHangul("고양이")).toEqual([
      "ㄱ", "ㅗ",
      "ㅇ", "ㅑ", "ㅇ",
      "ㅇ", "ㅣ",
    ]);
  });

  it("공백/구두점 제거", () => {
    expect(decomposeHangul("사 과")).toEqual(["ㅅ", "ㅏ", "ㄱ", "ㅘ"]);
    expect(decomposeHangul("사과.")).toEqual(["ㅅ", "ㅏ", "ㄱ", "ㅘ"]);
  });
});

describe("computePhoneticSimilarity", () => {
  it("완전 일치 → 100", () => {
    expect(computePhoneticSimilarity("사과", "사과")).toBe(100);
    expect(computePhoneticSimilarity("고양이", "고양이")).toBe(100);
  });

  it("완전 다름 → 50 이하 (음운 가중치 없으면 더 낮음)", () => {
    // "사과" vs "타파" — ㅅ↔ㅌ (다른 그룹), ㄱ↔ㅍ (다른 그룹)
    const score = computePhoneticSimilarity("사과", "타파");
    expect(score).toBeLessThan(80);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("음운 그룹 내 치환 (ㅅ↔ㅈ) → 그룹 외 치환보다 높은 점수", () => {
    // 같은 그룹 (ㅅ↔ㅈ): 페널티 0.5
    const sameGroup = computePhoneticSimilarity("사과", "자과");
    // 다른 그룹 (ㅅ↔ㄱ): 페널티 1.0
    const diffGroup = computePhoneticSimilarity("사과", "가과");
    expect(sameGroup).toBeGreaterThan(diffGroup);
  });

  it("이중모음 첨가 (ㅏ→ㅑ) → 부분 감점", () => {
    const score = computePhoneticSimilarity("사과", "샤과");
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThan(100);
  });

  it("빈 문자열 → 0", () => {
    expect(computePhoneticSimilarity("", "사과")).toBe(0);
    expect(computePhoneticSimilarity("사과", "")).toBe(0);
  });

  it("길이 차이 큰 경우 (단어 1개 vs 5개) → 낮은 점수", () => {
    const score = computePhoneticSimilarity("사", "사과주스라면");
    expect(score).toBeLessThan(50);
  });

  it("결정적 (동일 입력 → 동일 출력)", () => {
    const a = computePhoneticSimilarity("사과", "샤과");
    const b = computePhoneticSimilarity("사과", "샤과");
    const c = computePhoneticSimilarity("사과", "샤과");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

describe("analyzePhoneticDiff", () => {
  it("완전 일치 → isPerfectMatch: true", () => {
    const diff = analyzePhoneticDiff("사과", "사과");
    expect(diff.isPerfectMatch).toBe(true);
    expect(diff.similarity).toBe(100);
    expect(diff.intendedJamos).toEqual(diff.transcribedJamos);
  });

  it("자모 차이 1개 → isPerfectMatch: false + 자모 배열 반환", () => {
    const diff = analyzePhoneticDiff("사과", "샤과");
    expect(diff.isPerfectMatch).toBe(false);
    expect(diff.intendedJamos).toEqual(["ㅅ", "ㅏ", "ㄱ", "ㅘ"]);
    expect(diff.transcribedJamos).toEqual(["ㅅ", "ㅑ", "ㄱ", "ㅘ"]);
  });
});

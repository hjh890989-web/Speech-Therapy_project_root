// TEST-005 근간 — forbidden-words 정규식 + 화이트리스트 단위 테스트.
// REQ-FUNC-013, REQ-FUNC-HITL-002, CON-04, ADR-04.

import { describe, it, expect } from "vitest";
import {
  findBannedTerms,
  hasBannedTerm,
  PRIMARY_BANNED,
  SECONDARY_BANNED,
} from "@/lib/forbidden-words";

describe("forbidden-words: PRIMARY 1차 정규식", () => {
  it.each([
    ["진단을 받았다", "진단"],
    ["언어 장애", "장애"],
    ["환자 사례", "환자"],
    ["병이 깊어졌다", "병"],
    ["증상이 나타났다", "증상"],
  ])("'%s' 안의 '%s' 매칭", (text, _expected) => {
    expect(PRIMARY_BANNED.test(text)).toBe(true);
  });
});

describe("forbidden-words: SECONDARY 2차 정규식", () => {
  it.each([
    ["아프다고 했어요", "아프"],
    ["문제아 라고 부르지 마세요", "문제아"],
    ["이상하네요", "이상"],
  ])("'%s' 안의 '%s' 매칭", (text, _expected) => {
    expect(SECONDARY_BANNED.test(text)).toBe(true);
  });
});

describe("forbidden-words: 화이트리스트 예외 (직업/장소)", () => {
  it.each([
    "치료사 선생님과 상담했어요",
    "치료실 위치는 어디인가요",
    "언어치료 과정 안내",
    "병행 활동도 좋아요",
    "병아리를 보았어요",
    "이상해 보이는 단어",
  ])("'%s' 는 차단되지 않아야 함", (text) => {
    expect(hasBannedTerm(text)).toBe(false);
  });
});

describe("forbidden-words: findBannedTerms 위치·tier 정보", () => {
  it("PRIMARY + SECONDARY 동시 발견 시 위치 순 정렬", () => {
    const text = "아프다고 진단을 받았어요";
    const matches = findBannedTerms(text);
    // 매칭 두 건, '아프' (secondary) 가 '진단' (primary) 보다 앞.
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches[0].index).toBeLessThan(matches[1].index);
    const tiers = matches.map((m) => m.tier);
    expect(tiers).toContain("primary");
    expect(tiers).toContain("secondary");
  });

  it("화이트리스트로 덮인 매칭은 제외", () => {
    const text = "치료실에서 치료사를 만났어요";
    expect(findBannedTerms(text)).toEqual([]);
  });

  it("화이트리스트 외 영역 + 화이트리스트 영역 혼합", () => {
    const text = "병이 있어서 치료실에 갔어요"; // '병'은 매칭, '치료실'은 제외.
    const matches = findBannedTerms(text);
    expect(matches.some((m) => m.match === "병")).toBe(true);
    expect(matches.some((m) => m.match === "치료")).toBe(false);
  });

  it("빈 문자열 → 매칭 0건", () => {
    expect(findBannedTerms("")).toEqual([]);
    expect(hasBannedTerm("")).toBe(false);
  });
});

describe("forbidden-words: 성능 (TEST-005 §AC Scenario 5)", () => {
  it("50KB 본문 스캔 ≤ 50ms", () => {
    // 정상 단어 반복 + 끝부분에 금칙어 1개 삽입. UTF-16 기준 40K 자 이상 보장.
    const filler = "또래 발음 발달 확인 도구. ".repeat(5000);
    const text = `${filler} 진단이 아닙니다.`;
    expect(text.length).toBeGreaterThan(40_000);
    const start = performance.now();
    const matches = findBannedTerms(text);
    const elapsed = performance.now() - start;
    expect(matches.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThanOrEqual(50);
  });
});

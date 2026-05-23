// TEST-005 근간 — forbidden-words 정규식 + 화이트리스트 단위 테스트.
// REQ-FUNC-013, REQ-FUNC-HITL-002, CON-04, ADR-04.

import { describe, it, expect } from "vitest";
import {
  findBannedTerms,
  hasBannedTerm,
  PRIMARY_BANNED,
  SCANNED_SEARCH_PARAM_KEYS,
  SECONDARY_BANNED,
  scanSearchParams,
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

describe("forbidden-words: scanSearchParams (FR-C-005 #28)", () => {
  it("스캔 대상 key 의 value 에 금칙어가 있으면 hit + removedKeys", () => {
    const params = new URLSearchParams("q=치료");
    const result = scanSearchParams(params);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].key).toBe("q");
    expect(result.hits[0].value).toBe("치료");
    expect(result.hits[0].matches.length).toBeGreaterThan(0);
    expect(result.removedKeys).toEqual(["q"]);
  });

  it("화이트리스트 값 (`?q=치료사`) 은 hit 없음", () => {
    const params = new URLSearchParams("q=치료사");
    const result = scanSearchParams(params);
    expect(result.hits).toEqual([]);
    expect(result.removedKeys).toEqual([]);
  });

  it("정상 값 (`?q=발음`) 은 hit 없음", () => {
    const params = new URLSearchParams("q=발음");
    const result = scanSearchParams(params);
    expect(result.hits).toEqual([]);
  });

  it("빈 query → hit 없음", () => {
    const params = new URLSearchParams("");
    const result = scanSearchParams(params);
    expect(result.hits).toEqual([]);
    expect(result.removedKeys).toEqual([]);
  });

  it("스캔 대상 외 key (`?code=...&next=...`) 는 금칙어가 있어도 무시", () => {
    // oauth callback / RBAC redirect 흐름 보존 — 시스템 key 는 검사 대상 아님.
    const params = new URLSearchParams("code=치료-abc&next=/admin/장애-page");
    const result = scanSearchParams(params);
    expect(result.hits).toEqual([]);
    expect(result.removedKeys).toEqual([]);
  });

  it("다중 스캔 key 동시 hit (`?q=치료&note=장애`) → removedKeys 2개", () => {
    const params = new URLSearchParams("q=치료&note=장애");
    const result = scanSearchParams(params);
    expect(result.hits).toHaveLength(2);
    expect(result.removedKeys).toEqual(expect.arrayContaining(["q", "note"]));
    expect(result.removedKeys).toHaveLength(2);
  });

  it("같은 key 의 다중 value (`?q=정상&q=치료`) — 한 건이라도 hit 면 key 제거", () => {
    const params = new URLSearchParams("q=정상&q=치료");
    const result = scanSearchParams(params);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].value).toBe("치료");
    expect(result.removedKeys).toEqual(["q"]);
  });

  it("빈 value (`?q=`) 는 무시 (false positive 방지)", () => {
    const params = new URLSearchParams("q=");
    const result = scanSearchParams(params);
    expect(result.hits).toEqual([]);
  });

  it("scanKeys 옵션으로 검사 대상 key 를 직접 지정 가능", () => {
    const params = new URLSearchParams("custom=치료&q=치료");
    const result = scanSearchParams(params, { scanKeys: ["custom"] });
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].key).toBe("custom");
    expect(result.removedKeys).toEqual(["custom"]);
  });

  it("기본 SCANNED_SEARCH_PARAM_KEYS 에 q/query/search/title/name/note 포함", () => {
    // proxy.ts 의 search-box / form input 으로 흘러올 가능성 있는 표준 key.
    expect(SCANNED_SEARCH_PARAM_KEYS).toEqual(
      expect.arrayContaining(["q", "query", "search", "title", "name", "note"]),
    );
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

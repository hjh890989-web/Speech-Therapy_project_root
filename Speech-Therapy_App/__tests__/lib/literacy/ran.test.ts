// FR-C-LIT-01 / MOCK-LIT-03 (CR-2026-007 / CL-10) — RAN 미니게임 단위 테스트.
// 배열판 생성기(인접 중복 0) + 자극 무결성 + 완료시간→속도 + 원본성/금칙어 + 연령/플래그.

import { describe, it, expect, afterEach } from "vitest";
import {
  RAN_COLORS,
  RAN_OBJECTS,
  RAN_STIMULUS_LABEL,
  RAN_ROWS,
  RAN_COLS,
  RAN_BOARD_SIZE,
  generateRanBoardIndices,
} from "@/lib/literacy/ran-content";
import {
  computeRanResult,
  formatRanSeconds,
  isRanAgeEligible,
  isRanEnabled,
} from "@/lib/literacy/ran";

describe("MOCK-LIT-03 — 자극 세트", () => {
  it("색깔/그림 각 5종, key 유일", () => {
    expect(RAN_COLORS).toHaveLength(5);
    expect(RAN_OBJECTS).toHaveLength(5);
    expect(new Set(RAN_COLORS.map((c) => c.key)).size).toBe(5);
    expect(new Set(RAN_OBJECTS.map((o) => o.key)).size).toBe(5);
    for (const o of RAN_OBJECTS) expect(o.emoji.length).toBeGreaterThan(0);
  });
});

describe("MOCK-LIT-03 — 배열판 생성기", () => {
  it("크기 = rows*cols, 인덱스 범위 내, 결정적", () => {
    const board = generateRanBoardIndices(5);
    expect(board).toHaveLength(RAN_BOARD_SIZE);
    expect(board.every((i) => i >= 0 && i < 5)).toBe(true);
    expect(generateRanBoardIndices(5)).toEqual(board); // 결정적
  });

  it("인접 중복 0 (가로·세로)", () => {
    const board = generateRanBoardIndices(5, RAN_ROWS, RAN_COLS);
    for (let r = 0; r < RAN_ROWS; r++) {
      for (let c = 0; c < RAN_COLS; c++) {
        const cur = board[r * RAN_COLS + c];
        if (c < RAN_COLS - 1) expect(cur, `가로 ${r},${c}`).not.toBe(board[r * RAN_COLS + c + 1]);
        if (r < RAN_ROWS - 1) expect(cur, `세로 ${r},${c}`).not.toBe(board[(r + 1) * RAN_COLS + c]);
      }
    }
  });

  it("자극 3종 미만 → throw (인접 회피 불가)", () => {
    expect(() => generateRanBoardIndices(2)).toThrow();
  });
});

describe("원본성·금칙어 lint (CL-12 / ADR-04)", () => {
  it("표준화 검사/난독/학습장애 + 의료 금칙어 0건", () => {
    const banned = [
      "NISE", "기초학습", "학습장애", "난독", "B·ACT", "BACT",
      "치료", "진단", "장애", "지연", "지체",
    ];
    const corpus = [
      ...RAN_COLORS.map((c) => c.label),
      ...RAN_OBJECTS.map((o) => o.label),
      ...Object.values(RAN_STIMULUS_LABEL),
    ].join(" ");
    for (const w of banned) expect(corpus).not.toContain(w);
  });
});

describe("FR-C-LIT-01 — computeRanResult (완료시간 → 속도)", () => {
  it("25개 10초 → 400ms/item, 2.5 items/sec", () => {
    expect(computeRanResult(25, 10_000)).toEqual({
      itemCount: 25,
      elapsedMs: 10_000,
      msPerItem: 400,
      itemsPerSec: 2.5,
    });
  });

  it("elapsed 0 / item 0 → 속도 0 (0 나눗셈 방지)", () => {
    expect(computeRanResult(25, 0)).toMatchObject({ msPerItem: 0, itemsPerSec: 0 });
    expect(computeRanResult(0, 5_000)).toMatchObject({ msPerItem: 0, itemsPerSec: 0 });
  });

  it("음수 입력 방어 → clamp 0", () => {
    expect(computeRanResult(-5, -100)).toMatchObject({ itemCount: 0, elapsedMs: 0 });
  });

  it("formatRanSeconds — 소수점 1자리", () => {
    expect(formatRanSeconds(12_345)).toBe("12.3");
    expect(formatRanSeconds(0)).toBe("0.0");
  });
});

describe("연령 게이트 / 플래그", () => {
  it("연령 — 만 5~7세(60~84) 적격 (literacy 공통)", () => {
    expect(isRanAgeEligible(60)).toBe(true);
    expect(isRanAgeEligible(84)).toBe(true);
    expect(isRanAgeEligible(48)).toBe(false);
  });

  const original = process.env.LITERACY_RAN_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.LITERACY_RAN_ENABLED;
    else process.env.LITERACY_RAN_ENABLED = original;
  });

  it("플래그 — 미설정 off, 'true' on", () => {
    delete process.env.LITERACY_RAN_ENABLED;
    expect(isRanEnabled()).toBe(false);
    process.env.LITERACY_RAN_ENABLED = "true";
    expect(isRanEnabled()).toBe(true);
  });
});

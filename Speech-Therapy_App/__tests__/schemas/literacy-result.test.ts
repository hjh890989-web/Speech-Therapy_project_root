// CR-2026-009 — LiteracyResultInputSchema 검증 단위 테스트.
// childAgeMonths/stage 는 입력이 아니라 서버 파생(조회) — 스키마는 gameSlug + raw 만 검증.
import { describe, it, expect } from "vitest";
import { LiteracyResultInputSchema } from "@/lib/schemas/literacy-result";

const base = { gameSlug: "vocabulary", rawScore: 5 };

describe("LiteracyResultInputSchema", () => {
  it("정상 최소 입력 통과", () => {
    expect(LiteracyResultInputSchema.safeParse(base).success).toBe(true);
  });

  it("rawTotal 선택 — 있어도 통과", () => {
    expect(
      LiteracyResultInputSchema.safeParse({ ...base, rawTotal: 10 }).success,
    ).toBe(true);
  });

  it("rawScore 0 통과(가이드형 0점 가능)", () => {
    expect(
      LiteracyResultInputSchema.safeParse({ ...base, rawScore: 0 }).success,
    ).toBe(true);
  });

  it("gameSlug 빈 문자열 → 실패", () => {
    expect(
      LiteracyResultInputSchema.safeParse({ ...base, gameSlug: "" }).success,
    ).toBe(false);
  });

  it("rawScore 음수 → 실패", () => {
    expect(
      LiteracyResultInputSchema.safeParse({ ...base, rawScore: -1 }).success,
    ).toBe(false);
  });

  it("rawScore 비유한(Infinity/NaN) → 실패", () => {
    expect(
      LiteracyResultInputSchema.safeParse({ ...base, rawScore: Infinity }).success,
    ).toBe(false);
    expect(
      LiteracyResultInputSchema.safeParse({ ...base, rawScore: Number.NaN }).success,
    ).toBe(false);
  });

  it("입력의 childAgeMonths/userId 등 미지 키는 무시(서버 파생) — 파싱은 통과", () => {
    const parsed = LiteracyResultInputSchema.safeParse({
      ...base,
      childAgeMonths: 999, // 무시됨
      userId: "x", // 무시됨
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("childAgeMonths");
      expect(parsed.data).not.toHaveProperty("userId");
    }
  });
});

// FR-C-001 §3단계 — peer-percentile 정규분포 모델 단위 테스트.
// Sprint 1 초기엔 시드 부족이라 모델 기반 fallback 만 검증.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// prisma.evaluationResult.findMany 가 빈 배열 반환하도록 mock (모델 fallback 강제).
const findManyMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    evaluationResult: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

beforeEach(() => {
  findManyMock.mockReset();
  findManyMock.mockResolvedValue([]); // 시드 0건 → 모델 fallback.
});

describe("compositeScore", () => {
  it("3축 평균", async () => {
    const { compositeScore } = await import("@/lib/peer-percentile");
    expect(
      compositeScore({ articulationScore: 60, linguisticScore: 70, acousticScore: 80 }),
    ).toBe(70);
  });
});

describe("computePeerPercentile (모델 기반 fallback)", () => {
  it("36개월 발달 평균(=49점)과 같은 점수 → 백분위 50%", async () => {
    const { computePeerPercentile } = await import("@/lib/peer-percentile");
    const p = await computePeerPercentile({
      childAgeMonths: 36,
      targetPhoneme: "ㅅ",
      compositeScore: 49,
    });
    // 평균(40 + (36-24)/60 * 45 = 40 + 9 = 49)과 동일 점수 → ~50%.
    expect(p).toBeGreaterThanOrEqual(45);
    expect(p).toBeLessThanOrEqual(55);
  });

  it("평균보다 훨씬 높은 점수 → 백분위 80% 이상", async () => {
    const { computePeerPercentile } = await import("@/lib/peer-percentile");
    const p = await computePeerPercentile({
      childAgeMonths: 36,
      targetPhoneme: "ㅅ",
      compositeScore: 90,
    });
    expect(p).toBeGreaterThan(80);
  });

  it("평균보다 훨씬 낮은 점수 → 백분위 20% 이하", async () => {
    const { computePeerPercentile } = await import("@/lib/peer-percentile");
    const p = await computePeerPercentile({
      childAgeMonths: 36,
      targetPhoneme: "ㅅ",
      compositeScore: 15,
    });
    expect(p).toBeLessThan(20);
  });

  it("월령 24개월(=40점 평균) → 같은 점수에서 더 높은 백분위", async () => {
    const { computePeerPercentile } = await import("@/lib/peer-percentile");
    const p36 = await computePeerPercentile({
      childAgeMonths: 36,
      targetPhoneme: "ㅅ",
      compositeScore: 50,
    });
    const p24 = await computePeerPercentile({
      childAgeMonths: 24,
      targetPhoneme: "ㅅ",
      compositeScore: 50,
    });
    // 24개월 평균(40)이 36개월 평균(49) 보다 낮으므로 같은 점수 50 은 24개월 또래에서 더 우수.
    expect(p24).toBeGreaterThan(p36);
  });

  it("0~100 범위 보장 (극단값)", async () => {
    const { computePeerPercentile } = await import("@/lib/peer-percentile");
    expect(
      await computePeerPercentile({ childAgeMonths: 36, targetPhoneme: "ㅅ", compositeScore: 0 }),
    ).toBeGreaterThanOrEqual(0);
    expect(
      await computePeerPercentile({ childAgeMonths: 36, targetPhoneme: "ㅅ", compositeScore: 100 }),
    ).toBeLessThanOrEqual(100);
  });
});

describe("computePeerPercentile (실측 fallback — 30+ 표본 시)", () => {
  it("표본 30건 이상이면 실측 기반 (compositeScore 보다 낮은 비율)", async () => {
    findManyMock.mockResolvedValue(
      Array.from({ length: 100 }, (_, i) => ({
        articulationScore: i, // 0~99
        linguisticScore: i,
        acousticScore: i,
      })),
    );
    const { computePeerPercentile } = await import("@/lib/peer-percentile");
    // composite 점수 50 → 0~49 까지 50건이 더 낮음 → 50%.
    const p = await computePeerPercentile({
      childAgeMonths: 36,
      targetPhoneme: "ㅅ",
      compositeScore: 50,
    });
    expect(p).toBe(50);
  });
});

describe("CL-13 — isNormReferenceSample (정상발달 참고표본 proxy)", () => {
  it("confidence≥70 && articulation≥50 → true, 경계 밖 → false", async () => {
    const { isNormReferenceSample } = await import("@/lib/peer-percentile");
    expect(isNormReferenceSample({ confidence: 70, articulationScore: 50 })).toBe(true);
    expect(isNormReferenceSample({ confidence: 95, articulationScore: 90 })).toBe(true);
    expect(isNormReferenceSample({ confidence: 69, articulationScore: 90 })).toBe(false);
    expect(isNormReferenceSample({ confidence: 90, articulationScore: 49 })).toBe(false);
    expect(isNormReferenceSample({ confidence: Number.NaN, articulationScore: 90 })).toBe(false);
  });
});

describe("CL-13 — PEER_NORM_REFERENCE_FILTER 정상표본 필터", () => {
  const original = process.env.PEER_NORM_REFERENCE_FILTER;
  afterEach(() => {
    if (original === undefined) delete process.env.PEER_NORM_REFERENCE_FILTER;
    else process.env.PEER_NORM_REFERENCE_FILTER = original;
  });

  // 정상표본 50건(composite 90, 미발화) + 비정상표본 50건(composite 10, 발화).
  function mixedSamples() {
    return [
      ...Array.from({ length: 50 }, () => ({
        articulationScore: 90,
        linguisticScore: 90,
        acousticScore: 90,
        confidence: 90,
      })),
      ...Array.from({ length: 50 }, () => ({
        articulationScore: 10,
        linguisticScore: 10,
        acousticScore: 10,
        confidence: 10,
      })),
    ];
  }

  it("OFF(기본) → 전체 pooling (composite 50 → 50% : 절반이 더 낮음)", async () => {
    delete process.env.PEER_NORM_REFERENCE_FILTER;
    findManyMock.mockResolvedValue(mixedSamples());
    const { computePeerPercentile } = await import("@/lib/peer-percentile");
    const p = await computePeerPercentile({ childAgeMonths: 36, targetPhoneme: "ㅅ", compositeScore: 50 });
    expect(p).toBe(50);
  });

  it("ON → 정상표본(composite 90)만 집계 (composite 50 → 0% : 더 낮은 정상표본 0)", async () => {
    process.env.PEER_NORM_REFERENCE_FILTER = "true";
    findManyMock.mockResolvedValue(mixedSamples());
    const { computePeerPercentile } = await import("@/lib/peer-percentile");
    // 정상표본 50건 전부 composite 90 → 50보다 낮은 표본 0 → 0%.
    const p = await computePeerPercentile({ childAgeMonths: 36, targetPhoneme: "ㅅ", compositeScore: 50 });
    expect(p).toBe(0);
  });
});
